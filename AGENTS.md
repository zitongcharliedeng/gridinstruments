# GridInstruments — Agent Instructions

This file tells AI agents how to work on and test this project.

## Project Overview

GridInstruments is a browser-based isomorphic keyboard synthesizer. It uses Web Audio API for sound, Web MIDI API for MIDI input, and Canvas 2D for rendering the keyboard grid and note history.

- **Stack**: TypeScript, Vite, Canvas 2D, Web Audio, Web MIDI
- **Build**: `npm run build` (tsc + vite build)
- **Dev**: `npm run dev` (Vite dev server, default http://localhost:3000)
- **Tests**: `nix develop --command npx playwright test --project=firefox` (must use nix devshell — NixOS system playwright binary is broken)
- **No framework** — vanilla TS, single-page app, all rendering via Canvas

## Key Files

| File | Purpose |
|------|---------|
| `tests/behavioral.spec.ts` | **Source of truth** — behavioral test invariants with `@reason` and `@design-intent` docs |
| `tests/panel-resize.spec.ts` | Drag handle regression tests — 19 deterministic tests |
| `tests/contracts.spec.ts` | Pure function invariants — library contract tests |
| `tests/overlay-regression.spec.ts` | Overlay + issue regression tests |
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

## NixOS / Playwright Setup

The project has a `flake.nix` devshell that provides the correct nixpkgs Firefox matching the npm `@playwright/test` version.

```bash
# Enter devshell (sets PLAYWRIGHT_BROWSERS_PATH automatically)
nix develop

# Run all tests inside the devshell
nix develop --command npx playwright test --project=firefox

# Or enter interactive shell first
nix develop
npx playwright test --project=firefox tests/behavioral.spec.ts
```

**Never** use the bare system `npx playwright test` — it will fail on NixOS due to missing browser binaries.

## Testing

**Playwright tests are the single source of truth for all design constraints.**

Each test has `@reason` and `@design-intent` JSDoc explaining the design decision it protects.

```bash
# All behavioral tests (fastest)
nix develop --command npx playwright test --project=firefox tests/behavioral.spec.ts

# Panel resize / drag handle tests
nix develop --command npx playwright test --project=firefox tests/panel-resize.spec.ts

# Library contract invariants
nix develop --command npx playwright test --project=firefox tests/contracts.spec.ts

# Overlay + issue regressions
nix develop --command npx playwright test --project=firefox tests/overlay-regression.spec.ts

# Full suite
nix develop --command npx playwright test --project=firefox
```

The dev server auto-starts via `playwright.config.ts` webServer config on port 3000.

## Constraints for Code Changes

- **JetBrains Mono** is the ONLY allowed font
- **#000 background, #fff text, no border-radius**
- **No `as any`, `@ts-ignore`, `@ts-expect-error`** — strict TypeScript
- **Shift** = vibrato (hold), **Space** = sustain (hold), **R** is a note key
- **Ctrl** passes through to browser (no synth shortcuts)
- Modifiers are hold-on, off-by-default (not toggle)
- **No new npm dependencies** beyond `xstate`
- **No scroll on the site** — overflow must be hidden at page level
- **Drag handles** live on the inner border of panels — never touch the grid-area element or keyboard-canvas
- **Never close GitHub issues** — only label "ready for review"
- **`grim` is banned** for screenshots

## UI Structure

- `#grid-settings-btn` — cog button (top-left of keyboard-container, z-index 15)
- `#grid-overlay` — per-grid settings overlay (replaces old sidebar); toggle via cog; `hidden` class = closed
- `#visualiser-panel` — top panel with drag handle at its bottom border
- `#pedals-panel` — bottom panel with drag handle at its top border
- Panels use `position: relative; overflow: visible` so handles can straddle the seam

## Development Workflow

1. Make changes
2. Run `npm run build` — must exit 0
3. Run `nix develop --command npx playwright test --project=firefox tests/behavioral.spec.ts`
4. All 38 behavioral tests must pass
5. Run panel-resize, contracts, and overlay-regression suites — all must pass
