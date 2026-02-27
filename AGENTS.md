# DCompose Web — Agent Instructions

This file tells AI agents how to work on and test this project.

## Project Overview

DCompose Web is a browser-based isomorphic keyboard synthesizer. It uses Web Audio API for sound, Web MIDI API for MIDI input, and Canvas 2D for rendering the keyboard grid and note history.

- **Stack**: TypeScript, Vite, Canvas 2D, Web Audio, Web MIDI
- **Build**: `npm run build` (tsc + vite build)
- **Dev**: `npm run dev` (Vite dev server, default http://localhost:5173)
- **Tests**: `npx playwright test --project=firefox` (Firefox only — Chromium fails on NixOS)
- **No framework** — vanilla TS, single-page app, all rendering via Canvas

## Key Files

| File | Purpose |
|------|---------|
| `tests/behavioral.spec.ts` | **Source of truth** — behavioral test invariants with `@reason` and `@design-intent` docs |
| `tests/visual-regression.spec.ts` | Visual regression tests with golden screenshots |
| `index.html` | UI structure, all CSS inline in `<style>` block |
| `src/main.ts` | App wiring — event listeners, DOM bindings |
| `src/lib/keyboard-visualizer.ts` | Canvas keyboard grid — geometry, rendering, hit detection |
| `src/lib/note-colors.ts` | OKLCH color system for notes |
| `src/lib/keyboard-layouts.ts` | Isomorphic coordinate formulas, note naming |
| `src/lib/synth.ts` | Web Audio synth, tuning markers |
| `src/lib/note-history-visualizer.ts` | Staff + waterfall + chord panel |
| `src/lib/midi-input.ts` | Web MIDI device management |
| `src/lib/chord-detector.ts` | Chord name detection |
| `src/lib/mpe-service.ts` | MPE service |
| `src/lib/chord-graffiti.ts` | Yellow chord shape hints (roughjs SVG overlay) |

## Testing

**Playwright tests are the single source of truth for all design constraints.**

Each test has `@reason` and `@design-intent` JSDoc explaining the design decision it protects.

```bash
# All tests (Firefox)
npx playwright test --project=firefox

# Behavioral only (faster)
npx playwright test --project=firefox tests/behavioral.spec.ts
```

The dev server auto-starts via `playwright.config.ts` webServer config on port 5173.

## Constraints for Code Changes

- **JetBrains Mono** is the ONLY allowed font
- **#000 background, #fff text, no border-radius**
- **No `as any`, `@ts-ignore`, `@ts-expect-error`** — strict TypeScript
- **Shift** = vibrato (hold), **Space** = sustain (hold), **R** is a note key
- **Ctrl** passes through to browser (no synth shortcuts)
- Modifiers are hold-on, off-by-default (not toggle)

## Development Workflow

1. Make changes
2. Run `npm run build` — must exit 0
3. Run `npx playwright test --project=firefox tests/behavioral.spec.ts`
4. All 24 behavioral tests must pass
