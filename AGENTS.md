# GridInstruments

A browser synthesizer built on the [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout) isomorphic keyboard layout — discovered through [WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html) by Piers Titus van der Torren, the [MIDImech](https://github.com/flipcoder/midimech) visualizer by flipcoder, and the physical [Striso board](https://www.striso.org/the-note-layout/) by Piers Titus van der Torren.

**[Try it live](https://gridinstruments.xyz)** · [⭐ Star on GitHub](https://github.com/zitongcharliedeng/gridinstruments) · [PolyForm NC License](LICENSE) — open source, always free. Donations welcome but never required.

![GridInstruments screenshot](tests/xstate-graph.spec.ts-snapshots/full-page-firefox-linux.png)

---

## Mission

Make isomorphic grid keyboard layouts — especially Wicki-Hayden and DCompose — mainstream and accessible. Harmonic literacy for everyone: an instrument that makes music theory intuitive, runs in the browser with zero install, works on as many hardware inputs as possible, and is free forever.

We want to gamify music theory through grid layouts that make intervals and chords visually obvious. Tutorials, easy multi-hardware input support, and zero-friction web access are how we spread this instrument and harmonic literacy to as many people as possible.

---

## What It Does

- **Isomorphic grid keyboard** — DCompose and Wicki-Hayden layouts where every chord shape is the same in every key
- **Web-first synthesizer** — runs in any modern browser, no install, Web Audio for zero-latency sound
- **Microtonal** — continuous tuning via a fifth-size slider, from 5-TET through 7-TET and beyond, with equal temperament reference markers
- **Multi-hardware input** — computer keyboard, MIDI controllers, touchscreen, and MPE devices
- **Expressive playing** — MPE support, vibrato, sustain, velocity-sensitive timbre
- **Visual feedback** — note history waterfall, staff notation, chord detection, pitch-class colors (chromesthesia in OKLCH)
- **Continuous layout morphing** — skew slider smoothly blends between DCompose and MidiMech geometries

---

## Controls

| Control | Action |
|---------|--------|
| Letter/number keys | Play notes |
| `Shift` hold | Vibrato |
| `Space` hold | Sustain |
| Skew slider | DCompose ↔ MidiMech layout morph |
| Fifth slider | Tune the generator interval (double-click = nearest TET) |
| Volume slider | Master volume |
| Zoom slider | Key size |

---

## Credits

- **[Wicki-Hayden layout](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout)** by Kaspar Wicki and Brian Hayden — the isomorphic keyboard layout this is built on
- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren — original browser synthesizer for this layout; the gateway to finding it
- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder — isomorphic layout visualizer and engine
- **[Striso board](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren — physical isomorphic instrument with the same layout
- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** by Xenharmonic Devs — keyboard coordinate library

---

## Tuning

**EDO** (Equal Division of the Octave) and **TET** (Tone Equal Temperament) are the same thing for integer tunings — 12-EDO = 12-TET. The distinction only matters for non-octave-repeating tunings (rare). This app uses EDO consistently.

The grid is a **rank-2 pitch lattice**: the x-axis follows the circle of fifths (each step = a fifth), the y-axis follows octaves. Every isomorphic keyboard — [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout), DCompose, [Striso](https://www.striso.org/the-note-layout/), MidiMech — is a 2D slice of this lattice.

**Just intonation** lives in a 3D lattice (three generators: 2/1 octave, 3/2 fifth, 5/4 major third). The grid is a 2D projection of that 3D space. **The fifth slider selects which projection**: 700¢ = 12-TET, 701.96¢ = Pythagorean (pure fifths), 696.58¢ = meantone (pure major thirds). Commas — like the syntonic comma (81/80 ≈ 21.5¢) — measure the "curvature" that equal temperament eliminates.

**Isomorphism**: every chord has the same shape in every key. Learn one chord fingering; it works everywhere on the grid, in any key, in any tuning.

---

## Development

Everything below this heading is for AI agents and contributors — it does not appear in the app's About dialog.

---

### Technical Stack

TypeScript, Vite, Canvas 2D, Web Audio, Web MIDI. Vanilla TS single-page app — no framework. All rendering via Canvas.

### Build & Test

All commands must be run through the Nix devshell. Never use bare `npm` or `npx` — the flake is the only sanctioned entry point.

```bash
nix develop --command npm run build
nix develop --command npm run dev                # Vite dev server on :3000
nix develop --command npx playwright test --project=firefox --workers=1
nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"
```

The `flake.nix` devshell provides the correct nixpkgs Firefox matching the npm `@playwright/test` version. The dev server auto-starts via `playwright.config.ts` webServer config.

### Key Files

| File | Purpose |
|------|---------|
| `tests/xstate-graph.spec.ts` | **Only spec file** — XState graph-generated tests + structural invariants |
| `tests/machines/invariant-checks.ts` | All `StateInvariant` objects — the source of truth for design constraints |
| `tests/machines/uiMachine.ts` | UI state machine definitions + DOM assertions |
| `tests/machines/types.ts` | `StateInvariant` interface |
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

### Testing

All tests live in a single spec file. It is the only spec file Playwright runs (enforced via `testMatch` in config).

- **Structural invariants** — state-independent checks (DOM structure, library contracts, visual properties)
- **Graph-generated tests** — XState `getAdjacencyMap` generates one test per `(state, event)` pair per machine

All new tests must be `StateInvariant` objects in the invariant-checks file, wired into the `[Structural]` block in the spec file. No standalone `test()` calls in any other file — enforced by ast-grep CI rules.

### Constraints for Code Changes

- **JetBrains Mono** is the ONLY allowed font
- **#000 background, #fff text, no border-radius**
- **No `as any`, `@ts-ignore`, `@ts-expect-error`** — strict TypeScript
- **No `!` non-null assertions** — use `if (!x) throw new Error(msg)` or optional chaining
- **Shift** = vibrato (hold), **Space** = sustain (hold), **R** is a note key
- **Ctrl** passes through to browser (no synth shortcuts)
- Modifiers are hold-on, off-by-default (not toggle)
- **No new npm dependencies** beyond `xstate` and `effect` (Effect-TS, for `src/services/` only — see Literate Programming section below)
- **No scroll on the site** — overflow must be hidden at page level
- **Drag handles** live on the inner border of panels — never touch the grid-area element or keyboard-canvas
- **Never close GitHub issues** — only label "ready for review"
- **`grim` is banned** for screenshots
- **Overlay style**: greyish (`var(--dim)`) for macro category headings, white for individual setting labels

### UI Structure

- `#grid-settings-btn` — cog button (top-left of keyboard-container, z-index 15)
- `#grid-overlay` — per-grid settings overlay; toggle via cog; `hidden` class = closed; `padding-left: 48px` clears the cog
- `#visualiser-panel` — top panel with drag handle at its bottom border
- `#pedals-panel` — bottom panel with drag handle at its top border
- Panels use `position: relative; overflow: visible` so handles can straddle the seam
- Overlay sections use `.overlay-section-title` (greyish) for category headings

### Development Workflow

1. Make changes
2. Build — must exit 0
3. Run structural tests — all must pass
4. Run full suite to confirm nothing regressed

### Literate Programming

The codebase uses [Entangled](https://entangled.github.io/) for literate programming:

- **Source of truth**: `literate/*.lit.md` files (Markdown with embedded TypeScript code blocks)
- **Generated output**: `src/*.ts` files — these are BUILD ARTIFACTS (like `node_modules/` or `dist/`)
- **Generated files are**:
  - Gitignored — not in git, cannot be committed
  - chmod 444 — read-only, OS blocks edits (Claude Code `Edit`/`Write` → EACCES error)
  - Deleted + regenerated on every `npm run build` and `npm test`

**CRITICAL: To make code changes, edit `.lit.md` files — NEVER edit `.ts` files directly.**

**Entangled commands** (always via `nix develop --command`):
- `entangled tangle` — generate all `.ts` from `.lit.md` source
- `entangled tangle --force` — force overwrite
- `entangled stitch` — sync `.ts` edits back to `.lit.md` (bidirectional)
- `entangled watch` — continuous daemon for live sync during development

**Development workflow**:
1. Edit `literate/<module>.lit.md`
2. `nix develop --command entangled tangle` — generate `.ts`
3. `nix develop --command npm run build` — build (auto-tangles via prebuild hook)
4. `nix develop --command npx playwright test` — test (auto-tangles via pretest hook)

**Effect-TS** (`effect` npm package):
- Allowed ONLY in `src/services/` directory
- Banned from: synth hot path, render loop, pure math, state machines
- Purpose: typed browser API DI (AudioContext, MIDI, Canvas)
- Python tool: `entangled-cli==2.4.2` (installed via Python venv in Nix devshell, see `requirements.txt`)

### Atomic Checkpoint Protocol (MANDATORY for orchestrators)

**The #1 failure mode**: completing work but not tracking it. This protocol is a BLOCKING GATE, not a suggestion.

After EVERY subagent task completion:

```
STEP 1: VERIFY  — Read changed files, run lsp_diagnostics, confirm work is correct
STEP 2: MARK    — Edit plan file: change `- [ ]` to `- [x]` for the completed task
STEP 3: BOULDER — Update boulder.json: append task ID to completed_tasks array, add commit hash to completed_evidence
STEP 4: NEXT    — ONLY NOW may you delegate the next task
```

These four steps are ATOMIC. You MUST NOT skip to STEP 4 without completing STEPS 2-3.

#### boulder.json schema (required fields):

```json
{
  "active_plan": "/absolute/path/to/plan.md",
  "plan_name": "plan-name",
  "status": "in_progress | complete",
  "started_at": "ISO_TIMESTAMP",
  "last_verified_at": "ISO_TIMESTAMP",
  "session_ids": ["ses_..."],
  "completed_tasks": [1, 2, 3, "F1"],
  "completed_evidence": {
    "1": "commit-hash-or-disposition",
    "2": "commit-hash-or-disposition"
  }
}
```

- Plan file checkboxes and boulder.json are TWO tracking systems that MUST stay in sync
- `completed_tasks` in boulder.json is the machine-readable source of truth
- `completed_evidence` maps each task to its commit hash (or "no-change-needed", "verified-current", etc.)
- On cold-start / session resume: read boulder.json → know exactly what's done without git forensics
- `/start-work` hook reads boulder.json and validates plan checkboxes match `completed_tasks`
- If drift detected: reconcile BEFORE proceeding
- NEVER delegate a new task if the previous task's checkpoint is incomplete
