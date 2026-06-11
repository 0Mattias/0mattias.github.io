/*
    WhalEmu mini: a teaching-sized slice of a real-mode x86 emulator.
    Two-pass assembler, eight 16-bit registers, four flags, a stack,
    and two dozen instructions. No dependencies.

    The full WhalEmu encodes and decodes real instruction bytes; this
    slice executes the assembled listing by index, which is the part
    that matters for stepping and flag-watching.
*/

(() => {
    'use strict';

    const REGS = ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP'];
    const SP_INIT = 0xFFFE;
    const STEP_LIMIT = 100000;
    const RUN_INTERVAL_MS = 90;

    const SAMPLES = {
        fib: [
            '; the first ten Fibonacci numbers',
            '        MOV AX, 0',
            '        MOV BX, 1',
            '        MOV CX, 10',
            'next:   OUT AX',
            '        MOV DX, AX',
            '        ADD AX, BX',
            '        MOV BX, DX',
            '        LOOP next',
            '        HLT'
        ].join('\n'),
        countdown: [
            '; count down from five',
            '        MOV CX, 5',
            'top:    OUT CX',
            '        LOOP top',
            '        HLT'
        ].join('\n'),
        gcd: [
            '; gcd(1071, 462) by repeated subtraction',
            '        MOV AX, 1071',
            '        MOV BX, 462',
            'again:  CMP AX, BX',
            '        JE  done',
            '        JA  bigger',
            '        SUB BX, AX',
            '        JMP again',
            'bigger: SUB AX, BX',
            '        JMP again',
            'done:   OUT AX',
            '        HLT'
        ].join('\n'),
        stack: [
            '; swap AX and BX through the stack',
            '        MOV AX, 0xAAAA',
            '        MOV BX, 0xBBBB',
            '        PUSH AX',
            '        PUSH BX',
            '        POP AX',
            '        POP BX',
            '        HLT'
        ].join('\n')
    };

    /* ── Assembler ── */

    const COND = {
        JE: f => f.ZF === 1, JZ: f => f.ZF === 1,
        JNE: f => f.ZF === 0, JNZ: f => f.ZF === 0,
        JG: f => f.ZF === 0 && f.SF === f.OF,
        JGE: f => f.SF === f.OF,
        JL: f => f.SF !== f.OF,
        JLE: f => f.ZF === 1 || f.SF !== f.OF,
        JA: f => f.CF === 0 && f.ZF === 0,
        JAE: f => f.CF === 0,
        JB: f => f.CF === 1,
        JBE: f => f.CF === 1 || f.ZF === 1
    };

    const TWO_OP = ['MOV', 'ADD', 'SUB', 'AND', 'OR', 'XOR', 'CMP'];
    const SHIFTS = ['SHL', 'SHR'];
    const ONE_REG = ['INC', 'DEC', 'POP', 'OUT'];
    const JUMPS = Object.keys(COND).concat(['JMP', 'LOOP']);

    function parseNumber(token) {
        if (/^-?\d+$/.test(token)) return parseInt(token, 10);
        if (/^0x[0-9a-f]+$/i.test(token)) return parseInt(token, 16);
        if (/^[0-9a-f]+h$/i.test(token)) return parseInt(token.slice(0, -1), 16);
        return null;
    }

    function parseOperand(token, lineNo) {
        const up = token.toUpperCase();
        if (REGS.indexOf(up) !== -1) return { type: 'reg', name: up };
        const num = parseNumber(token);
        if (num === null) throw { line: lineNo, msg: 'bad operand "' + token + '"' };
        if (num < -32768 || num > 0xFFFF) throw { line: lineNo, msg: 'immediate out of 16-bit range: ' + token };
        return { type: 'imm', value: num & 0xFFFF };
    }

    function assemble(source) {
        const prog = [];
        const labels = {};
        const pendingLabels = [];

        source.split('\n').forEach((raw, idx) => {
            const lineNo = idx + 1;
            let line = raw.replace(/;.*$/, '').trim();
            if (!line) return;

            const labelMatch = line.match(/^([A-Za-z_]\w*):\s*(.*)$/);
            let labelText = '';
            if (labelMatch) {
                const name = labelMatch[1].toUpperCase();
                if (REGS.indexOf(name) !== -1) throw { line: lineNo, msg: 'label "' + labelMatch[1] + '" shadows a register' };
                if (labels[name] !== undefined) throw { line: lineNo, msg: 'duplicate label "' + labelMatch[1] + '"' };
                labels[name] = prog.length;
                labelText = labelMatch[1] + ':';
                line = labelMatch[2].trim();
                if (!line) { pendingLabels.push(labelText); return; }
            }

            const space = line.search(/\s/);
            const mnemonic = (space === -1 ? line : line.slice(0, space)).toUpperCase();
            const rest = space === -1 ? '' : line.slice(space).trim();
            const ops = rest ? rest.split(',').map(s => s.trim()) : [];

            const ins = { op: mnemonic, line: lineNo, text: raw.replace(/\s+$/, '') };
            if (pendingLabels.length) {
                ins.text = pendingLabels.join(' ') + ' ' + ins.text.trim();
                pendingLabels.length = 0;
            }

            if (TWO_OP.indexOf(mnemonic) !== -1) {
                if (ops.length !== 2) throw { line: lineNo, msg: mnemonic + ' needs two operands' };
                ins.dst = parseOperand(ops[0], lineNo);
                if (ins.dst.type !== 'reg') throw { line: lineNo, msg: mnemonic + ' destination must be a register' };
                ins.src = parseOperand(ops[1], lineNo);
            } else if (SHIFTS.indexOf(mnemonic) !== -1) {
                if (ops.length !== 2) throw { line: lineNo, msg: mnemonic + ' needs a register and a count' };
                ins.dst = parseOperand(ops[0], lineNo);
                ins.src = parseOperand(ops[1], lineNo);
                if (ins.dst.type !== 'reg' || ins.src.type !== 'imm') throw { line: lineNo, msg: mnemonic + ' takes reg, count' };
                if (ins.src.value < 1 || ins.src.value > 15) throw { line: lineNo, msg: 'shift count must be 1 to 15' };
            } else if (ONE_REG.indexOf(mnemonic) !== -1) {
                if (ops.length !== 1) throw { line: lineNo, msg: mnemonic + ' needs one register' };
                ins.dst = parseOperand(ops[0], lineNo);
                if (ins.dst.type !== 'reg') throw { line: lineNo, msg: mnemonic + ' takes a register' };
            } else if (mnemonic === 'PUSH') {
                if (ops.length !== 1) throw { line: lineNo, msg: 'PUSH needs one operand' };
                ins.dst = parseOperand(ops[0], lineNo);
            } else if (JUMPS.indexOf(mnemonic) !== -1) {
                if (ops.length !== 1) throw { line: lineNo, msg: mnemonic + ' needs a label' };
                ins.target = ops[0].toUpperCase();
            } else if (mnemonic === 'HLT' || mnemonic === 'NOP') {
                if (ops.length) throw { line: lineNo, msg: mnemonic + ' takes no operands' };
            } else {
                throw { line: lineNo, msg: 'unknown instruction "' + mnemonic + '"' };
            }

            prog.push(ins);
        });

        prog.forEach(ins => {
            if (ins.target === undefined) return;
            if (labels[ins.target] === undefined) throw { line: ins.line, msg: 'undefined label "' + ins.target + '"' };
            ins.targetIndex = labels[ins.target];
        });

        return prog;
    }

    /* ── CPU ── */

    function freshCpu() {
        const regs = {};
        REGS.forEach(r => { regs[r] = 0; });
        regs.SP = SP_INIT;
        return {
            regs,
            ip: 0,
            flags: { ZF: 0, SF: 0, CF: 0, OF: 0 },
            mem: new Uint8Array(0x10000),
            out: [],
            halted: false,
            steps: 0
        };
    }

    function setSZ(f, r) {
        f.ZF = (r & 0xFFFF) === 0 ? 1 : 0;
        f.SF = (r >> 15) & 1;
    }

    function add(f, a, b) {
        const raw = a + b;
        const r = raw & 0xFFFF;
        f.CF = raw > 0xFFFF ? 1 : 0;
        f.OF = (~(a ^ b) & (a ^ r) & 0x8000) ? 1 : 0;
        setSZ(f, r);
        return r;
    }

    function sub(f, a, b) {
        const r = (a - b) & 0xFFFF;
        f.CF = b > a ? 1 : 0;
        f.OF = ((a ^ b) & (a ^ r) & 0x8000) ? 1 : 0;
        setSZ(f, r);
        return r;
    }

    function logic(f, r) {
        f.CF = 0;
        f.OF = 0;
        setSZ(f, r & 0xFFFF);
        return r & 0xFFFF;
    }

    function srcValue(cpu, operand) {
        return operand.type === 'reg' ? cpu.regs[operand.name] : operand.value;
    }

    function writeWord(cpu, addr, val) {
        cpu.mem[addr & 0xFFFF] = val & 0xFF;
        cpu.mem[(addr + 1) & 0xFFFF] = (val >> 8) & 0xFF;
    }

    function readWord(cpu, addr) {
        return cpu.mem[addr & 0xFFFF] | (cpu.mem[(addr + 1) & 0xFFFF] << 8);
    }

    function step(cpu, prog) {
        if (cpu.halted) return;
        if (cpu.ip >= prog.length) { cpu.halted = true; return; }

        const ins = prog[cpu.ip];
        const f = cpu.flags;
        cpu.ip += 1;
        cpu.steps += 1;

        const op = ins.op;
        if (op === 'NOP') return;
        if (op === 'HLT') { cpu.halted = true; return; }

        if (op === 'JMP') { cpu.ip = ins.targetIndex; return; }
        if (op === 'LOOP') {
            cpu.regs.CX = (cpu.regs.CX - 1) & 0xFFFF;
            if (cpu.regs.CX !== 0) cpu.ip = ins.targetIndex;
            return;
        }
        if (COND[op]) {
            if (COND[op](f)) cpu.ip = ins.targetIndex;
            return;
        }

        if (op === 'PUSH') {
            cpu.regs.SP = (cpu.regs.SP - 2) & 0xFFFF;
            writeWord(cpu, cpu.regs.SP, srcValue(cpu, ins.dst));
            return;
        }
        if (op === 'POP') {
            cpu.regs[ins.dst.name] = readWord(cpu, cpu.regs.SP);
            cpu.regs.SP = (cpu.regs.SP + 2) & 0xFFFF;
            return;
        }
        if (op === 'OUT') {
            cpu.out.push(String(cpu.regs[ins.dst.name]));
            return;
        }

        const reg = ins.dst.name;
        const a = cpu.regs[reg];

        if (op === 'INC' || op === 'DEC') {
            const savedCF = f.CF;
            cpu.regs[reg] = op === 'INC' ? add(f, a, 1) : sub(f, a, 1);
            f.CF = savedCF;
            return;
        }

        const b = srcValue(cpu, ins.src);
        switch (op) {
            case 'MOV': cpu.regs[reg] = b; break;
            case 'ADD': cpu.regs[reg] = add(f, a, b); break;
            case 'SUB': cpu.regs[reg] = sub(f, a, b); break;
            case 'CMP': sub(f, a, b); break;
            case 'AND': cpu.regs[reg] = logic(f, a & b); break;
            case 'OR': cpu.regs[reg] = logic(f, a | b); break;
            case 'XOR': cpu.regs[reg] = logic(f, a ^ b); break;
            case 'SHL': {
                const r = logic(f, (a << b) & 0xFFFF);
                f.CF = (a >> (16 - b)) & 1;
                cpu.regs[reg] = r;
                break;
            }
            case 'SHR': {
                const r = logic(f, a >>> b);
                f.CF = (a >> (b - 1)) & 1;
                cpu.regs[reg] = r;
                break;
            }
        }
    }

    /* ── UI ── */

    const el = id => document.getElementById(id);
    const asmBox = el('asm');
    const sampleSel = el('sample');
    const statusEl = el('emu-status');
    const listingEl = el('listing');

    if (!asmBox) return;

    let prog = null;
    let cpu = freshCpu();
    let prevRegs = {};
    let runTimer = null;

    const hex = v => v.toString(16).toUpperCase().padStart(4, '0');

    function setStatus(msg, isError) {
        statusEl.textContent = msg;
        statusEl.classList.toggle('err', !!isError);
    }

    function stopRun() {
        if (runTimer !== null) {
            clearInterval(runTimer);
            runTimer = null;
            el('btn-run').textContent = 'Run';
        }
    }

    function renderListing() {
        listingEl.innerHTML = '';
        if (!prog) return;
        prog.forEach(ins => {
            const li = document.createElement('li');
            li.textContent = ins.text;
            listingEl.appendChild(li);
        });
    }

    function render() {
        REGS.forEach(r => {
            const cell = el('r-' + r);
            cell.textContent = hex(cpu.regs[r]);
            cell.classList.toggle('chg', prevRegs[r] !== undefined && prevRegs[r] !== cpu.regs[r]);
        });
        el('r-IP').textContent = String(cpu.ip);
        prevRegs = Object.assign({}, cpu.regs);

        const f = cpu.flags;
        el('flags').textContent = 'ZF=' + f.ZF + ' SF=' + f.SF + ' CF=' + f.CF + ' OF=' + f.OF;

        const words = [];
        for (let addr = cpu.regs.SP; addr < SP_INIT; addr += 2) {
            words.push(hex(addr) + ': ' + hex(readWord(cpu, addr)));
        }
        el('stack').textContent = words.length ? words.join('\n') : '(empty)';

        el('out').textContent = cpu.out.length ? cpu.out.join('\n') : '(no output)';

        const items = listingEl.children;
        for (let i = 0; i < items.length; i++) {
            items[i].classList.toggle('cur', !cpu.halted && i === cpu.ip);
        }
        if (!cpu.halted && items[cpu.ip]) items[cpu.ip].scrollIntoView({ block: 'nearest' });
    }

    function doAssemble() {
        stopRun();
        try {
            const assembled = assemble(asmBox.value);
            if (!assembled.length) {
                prog = null;
                renderListing();
                setStatus('Nothing to assemble.', true);
                return false;
            }
            prog = assembled;
            cpu = freshCpu();
            prevRegs = {};
            renderListing();
            render();
            setStatus('Assembled ' + prog.length + ' instructions. Step or Run.');
            return true;
        } catch (err) {
            prog = null;
            renderListing();
            setStatus('Line ' + err.line + ': ' + err.msg, true);
            return false;
        }
    }

    function ensureProgram() {
        if (prog) return true;
        return doAssemble();
    }

    function afterStep() {
        render();
        if (cpu.halted) {
            stopRun();
            setStatus('Halted after ' + cpu.steps + ' steps.');
        } else if (cpu.steps >= STEP_LIMIT) {
            stopRun();
            cpu.halted = true;
            setStatus('Stopped: hit the ' + STEP_LIMIT + ' step limit.', true);
        }
    }

    function doStep() {
        if (!ensureProgram()) return;
        if (cpu.halted) { setStatus('Halted. Assemble to reset.'); return; }
        step(cpu, prog);
        if (!cpu.halted) setStatus('Step ' + cpu.steps + '.');
        afterStep();
    }

    function doRun() {
        if (runTimer !== null) { stopRun(); setStatus('Paused at step ' + cpu.steps + '.'); return; }
        if (!ensureProgram()) return;
        if (cpu.halted) { setStatus('Halted. Assemble to reset.'); return; }
        el('btn-run').textContent = 'Stop';
        setStatus('Running.');
        runTimer = setInterval(() => {
            step(cpu, prog);
            afterStep();
        }, RUN_INTERVAL_MS);
    }

    function loadSample(name) {
        stopRun();
        asmBox.value = SAMPLES[name];
        prog = null;
        cpu = freshCpu();
        prevRegs = {};
        renderListing();
        render();
        setStatus('Loaded "' + sampleSel.options[sampleSel.selectedIndex].text + '". Assemble when ready.');
    }

    el('btn-asm').addEventListener('click', doAssemble);
    el('btn-step').addEventListener('click', doStep);
    el('btn-run').addEventListener('click', doRun);
    sampleSel.addEventListener('change', () => loadSample(sampleSel.value));
    asmBox.addEventListener('input', () => { prog = null; });

    loadSample(sampleSel.value);
})();
