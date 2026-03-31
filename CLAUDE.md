# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page portfolio website for Mattias R. (GitHub: 0Mattias). Built with vanilla HTML, CSS, and JavaScript — no build system, no package manager, no frameworks.

## Development

Serve files directly with any static server:
```
python3 -m http.server 8000
```

No build, lint, or test commands exist. Deployed via GitHub Pages at 0mattias.github.io.

## Architecture

Three source files:

- **index.html** — Single-page layout: hero (video bg), tech marquee, featured project, project grid, about with stats, contact
- **style.css** — Design system with CSS custom properties, scroll-reveal animations, responsive at 1024px/768px breakpoints
- **script.js** — Scramble decode animation on hero title, scroll-triggered reveal (IntersectionObserver), hide-on-scroll nav, mobile menu toggle, cursor glow follower, magnetic button hover, count-up stat animation

## Design Constraints

- Monochromatic palette: `--bg: #050505`, `--fg: #fff`, `--fg-muted: #777`, `--fg-dim: #444`, `--border: #1a1a1a`
- Only accent color is `#00ff88` used for the "open to work" pulse and "world's first" badges
- Fonts: Inter (headings/body) + JetBrains Mono (UI/labels) via Google Fonts CDN
- All transitions use `cubic-bezier(0.16, 1, 0.3, 1)` easing
- Film grain overlay via inline SVG noise filter
- `hero.mp4` is a ~23MB background video rendered grayscale via CSS filter
- No external JS dependencies
