document.addEventListener("DOMContentLoaded", () => {
    // Dynamic Year for Footer
    const yearSpan = document.getElementById('year');
    if(yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // High-performance scramble decode effect for Hero
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const heroTitle = document.querySelector(".hero-title");
    
    if (heroTitle) {
        // Extract plain text parts, split by line break <br>
        const originalHTML = heroTitle.innerHTML;
        const textLines = originalHTML.split(/<br\s*[\/]?>/i);
        
        let processedHTML = textLines.map(line => {
            return line.split('').map(char => {
                // Keep spaces strictly spaces
                if(char === ' ' || char === '\n') return char;
                return `<span class="scramble" data-char="${char}">${char}</span>`;
            }).join('');
        }).join('<br>'); // rejoin lines with <br>
        
        heroTitle.innerHTML = processedHTML;
        
        const scrambleElements = document.querySelectorAll('.scramble');
        scrambleElements.forEach((el, index) => {
            const originalChar = el.getAttribute('data-char');
            let iterations = 0;
            // Shorter execution, fast staggering to look strictly mechanical and snappy
            const maxIterations = 5 + Math.random() * 10;
            
            const interval = setInterval(() => {
                el.innerText = characters[Math.floor(Math.random() * characters.length)];
                
                if(iterations >= maxIterations) {
                    clearInterval(interval);
                    el.innerText = originalChar;
                }
                iterations++;
            }, 30 + (index * 1.5)); // tightly controlled interval
        });
    }
});
