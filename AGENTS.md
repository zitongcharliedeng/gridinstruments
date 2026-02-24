# DCompose Web — Agent Instructions

This file tells AI agents how to work on and test this project.

## Project Overview

DCompose Web is a browser-based isomorphic keyboard synthesizer. It uses Web Audio API for sound, Web MIDI API for MIDI input, and Canvas 2D for rendering the keyboard grid and note history.

- **Stack**: TypeScript, Vite, Canvas 2D, Web Audio, Web MIDI
- **Build**: `npm run build` (tsc + vite build)
- **Dev**: `npm run dev` (Vite dev server, default http://localhost:5173)
- **No framework** — vanilla TS, single-page app, all rendering via Canvas

## Key Files

| File | Purpose |
|------|---------|
| `FEATURES.md` | Source of truth for all features and design decisions |
| `VISUAL-TESTS.md` | Exhaustive visual invariant checklist for regression testing |
| `index.html` | UI structure, all CSS inline in `<style>` block |
| `src/main.ts` | App wiring — event listeners, DOM bindings |
| `src/lib/keyboard-visualizer.ts` | Canvas keyboard grid — geometry, rendering, hit detection |
| `src/lib/note-colors.ts` | OKLCH color system for notes |
| `src/lib/keyboard-layouts.ts` | Isomorphic coordinate formulas |
| `src/lib/synth.ts` | Web Audio synth, tuning markers |
| `src/lib/note-history-visualizer.ts` | Staff + waterfall + chord panel |
| `src/lib/midi-input.ts` | Web MIDI device management |
| `src/lib/chord-detector.ts` | Chord name detection |
| `src/lib/mpe-service.ts` | MPE service (replaces mpe-output.ts for new code) |

## Visual Regression Testing Workflow

### Purpose
Every design decision is documented as an atomic invariant in `VISUAL-TESTS.md`. Agents should verify these invariants using screenshots + vision analysis after any code change.

### How to Run Visual Tests

**Step 1: Start the dev server**
```bash
cd /home/firstinstallusername/dcompose-web
npm run dev &
# Wait for "Local: http://localhost:5173" in output
```

**Step 2: Take a screenshot**
Use Playwright, Puppeteer, or any headless browser tool:
```bash
# Example with Playwright CLI (if installed)
npx playwright screenshot http://localhost:5173 --viewport-size=1920,1080 /tmp/dcompose-default.png
```

Or use the `playwright` skill / `dev-browser` skill to navigate to the URL and take a screenshot.

**Step 3: Verify invariants**
Read `VISUAL-TESTS.md` and check each invariant against the screenshot using your vision capabilities.

For **State 1** (default): Just load the page and screenshot.
For **State 2** (MidiMech): Set `#skew-slider` to 0.0, then screenshot.
For **State 3** (Mid-Skew): Set `#skew-slider` to 0.5, then screenshot.
For **State 4** (TET variants): Click TET preset buttons or set `#tuning-slider` values, then screenshot.

### Interacting with Sliders Programmatically
```javascript
// In browser console or via Playwright evaluate:
const slider = document.getElementById('skew-slider');
slider.value = '0.0';
slider.dispatchEvent(new Event('input'));
```

### Report Format
For each invariant, report:
```
[PASS] GS-01: Background is pure black
[FAIL] TB-03: Title bar takes its own row instead of floating
[SKIP] IB-01: Requires audio verification (cannot test via screenshot)
```

## Constraints for Code Changes

See the Playwright tests in `tests/` — they are the source of truth for all design constraints.
Each test has `@reason` and `@design-intent` JSDoc explaining the design decision it protects.
Key constraints: JetBrains Mono only, #000 background, #fff text, no border-radius, no gradients.

## Development Workflow

1. Read `FEATURES.md` to understand current state
2. Make changes
3. Run `npm run build` — must exit 0
4. Run dev server and take screenshot
5. Verify changed invariants from `VISUAL-TESTS.md`
6. Report results
