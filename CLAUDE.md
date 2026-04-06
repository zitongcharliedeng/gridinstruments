# GridInstruments

A browser synthesizer built on the [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout) isomorphic keyboard layout — discovered through [WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html) by Piers Titus van der Torren, the [MIDImech](https://github.com/flipcoder/midimech) visualizer by flipcoder, and the physical [Striso board](https://www.striso.org/the-note-layout/) by Piers Titus van der Torren.

**[Try it live](https://gridinstruments.xyz)** · [Star on GitHub](https://github.com/zitongcharliedeng/gridinstruments) · [PolyForm NC License](LICENSE) -- open source, always free. Donations welcome but never required.

![GridInstruments screenshot](tests/xstate-graph.spec.ts-snapshots/full-page-firefox-linux.png)

---

## Mission

Make isomorphic grid keyboard layouts -- especially Wicki-Hayden and DCompose -- mainstream and accessible. Harmonic literacy for everyone: an instrument that makes music theory intuitive, runs in the browser with zero install, works on as many hardware inputs as possible, and is free forever.

We want to gamify music theory through grid layouts that make intervals and chords visually obvious. Tutorials, easy multi-hardware input support, and zero-friction web access are how we spread this instrument and harmonic literacy to as many people as possible.

---

## What It Does

- **Isomorphic grid keyboard** -- DCompose and Wicki-Hayden layouts where every chord shape is the same in every key
- **Web-first synthesizer** -- runs in any modern browser, no install, Web Audio for zero-latency sound
- **Microtonal** -- continuous tuning via a fifth-size slider, from 5-TET through 7-TET and beyond, with equal temperament reference markers
- **Multi-hardware input** -- computer keyboard, MIDI controllers, touchscreen, and MPE devices
- **Expressive playing** -- MPE support, vibrato, sustain, velocity-sensitive timbre
- **Visual feedback** -- note history waterfall, staff notation, chord detection, pitch-class colors (chromesthesia in OKLCH)
- **Continuous layout morphing** -- skew slider smoothly blends between DCompose and MidiMech geometries

---

## Controls

| Control | Action |
|---------|--------|
| Letter/number keys | Play notes |
| `Shift` hold | Vibrato |
| `Space` hold | Sustain |
| Skew slider | DCompose <-> MidiMech layout morph |
| Fifth slider | Tune the generator interval (double-click = nearest TET) |
| Volume slider | Master volume |
| Zoom slider | Key size |

---

## Credits

- **[Wicki-Hayden layout](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout)** by Kaspar Wicki and Brian Hayden -- the isomorphic keyboard layout this is built on
- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren -- original browser synthesizer for this layout; the gateway to finding it
- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder -- isomorphic layout visualizer and engine
- **[Striso board](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren -- physical isomorphic instrument with the same layout
- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** by Xenharmonic Devs -- keyboard coordinate library

---

## Tuning

**EDO** (Equal Division of the Octave) and **TET** (Tone Equal Temperament) are the same thing for integer tunings -- 12-EDO = 12-TET. The distinction only matters for non-octave-repeating tunings (rare). This app uses EDO consistently.

The grid is a **rank-2 pitch lattice**: the x-axis follows the circle of fifths (each step = a fifth), the y-axis follows octaves. Every isomorphic keyboard -- [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout), DCompose, [Striso](https://www.striso.org/the-note-layout/), MidiMech -- is a 2D slice of this lattice.

**Just intonation** lives in a 3D lattice (three generators: 2/1 octave, 3/2 fifth, 5/4 major third). The grid is a 2D projection of that 3D space. **The fifth slider selects which projection**: 700 cents = 12-TET, 701.96 cents = Pythagorean (pure fifths), 696.58 cents = meantone (pure major thirds). Commas -- like the syntonic comma (81/80, about 21.5 cents) -- measure the "curvature" that equal temperament eliminates.

**Isomorphism**: every chord has the same shape in every key. Learn one chord fingering; it works everywhere on the grid, in any key, in any tuning.

---

## Development

Everything below this heading is for AI agents and contributors -- it does not appear in the app's About dialog.

---

## Architecture

### Technical Stack

TypeScript, Vite, Canvas 2D, Web Audio, Web MIDI. Vanilla TS single-page app -- no framework. All rendering via Canvas.

### Literate Programming

The codebase uses [Entangled](https://entangled.github.io/) for literate programming. This is the most important architectural decision in the project.

- **Source of truth**: `literate.lit.mdx/*.lit.mdx` files (Markdown with embedded TypeScript code blocks)
- **Generated output**: `*.ts` files -- these are BUILD ARTIFACTS (like `node_modules/` or `dist/`)
- **Generated files are**:
  - Gitignored -- not in git, cannot be committed
  - chmod 444 -- read-only, OS blocks edits (Claude Code `Edit`/`Write` will get EACCES)
  - Deleted and regenerated on every `npm run build` and `npm test`

**CRITICAL: To make code changes, edit `.lit.mdx` files -- NEVER edit `*.ts` files directly.**

The tangling pipeline: `literate.lit.mdx/*.lit.mdx` --> `entangled tangle` --> `*.ts` --> `tsc && vite build` --> `dist/`

### XState Machines

All UI state is modeled as XState v5 state machines in `literate.lit.mdx/machines/*.lit.mdx`. The machines define:
- State transitions (events, guards, actions)
- Spawned actors (input actors, MIDI actors, panel machines)
- Context types (typed via `literate.lit.mdx/machines/types.lit.mdx`)

The test suite uses `getAdjacencyMap` to auto-generate one test per `(state, event)` pair per machine. This means adding a state or event automatically adds test coverage.

### Effect-TS

The `effect` npm package is allowed ONLY in `services/` (tangled from `literate.lit.mdx/services/`). It provides typed browser API dependency injection (AudioContext, MIDI, Canvas).

Effect-TS is **banned from**: synth hot path, render loop, pure math, state machines.

### Key Files

| Source (edit these) | Generated output | Purpose |
|---------------------|-----------------|---------|
| `literate.lit.mdx/main.lit.mdx` | `main.ts` | App wiring -- event listeners, DOM bindings |
| `literate.lit.mdx/keyboard-visualizer.lit.mdx` | `lib/keyboard-visualizer.ts` | Canvas keyboard grid -- geometry, rendering, hit detection |
| `literate.lit.mdx/note-colors.lit.mdx` | `lib/note-colors.ts` | OKLCH color system for notes |
| `literate.lit.mdx/keyboard-layouts.lit.mdx` | `lib/keyboard-layouts.ts` | Isomorphic coordinate formulas, note naming |
| `literate.lit.mdx/synth.lit.mdx` | `lib/synth.ts` | Web Audio synth, tuning markers |
| `literate.lit.mdx/note-history-visualizer.lit.mdx` | `lib/note-history-visualizer.ts` | Staff + waterfall + chord panel |
| `literate.lit.mdx/midi-input.lit.mdx` | `lib/midi-input.ts` | Web MIDI device management |
| `literate.lit.mdx/chord-detector.lit.mdx` | `lib/chord-detector.ts` | Chord name detection |
| `literate.lit.mdx/mpe-service.lit.mdx` | `lib/mpe-service.ts` | MPE service |
| `literate.lit.mdx/chord-graffiti.lit.mdx` | `lib/chord-graffiti.ts` | Yellow chord shape hints (roughjs SVG overlay) |
| `literate.lit.mdx/game-engine.lit.mdx` | `lib/game-engine.ts` | Game engine for Piano Tiles mode |
| `index.html` | (not generated) | UI structure, all CSS inline in `<style>` block |

| Test file | Purpose |
|-----------|---------|
| `tests/xstate-graph.spec.ts` | **Only spec file** -- XState graph-generated tests + structural invariants |
| `tests/machines/invariant-checks.ts` | All `StateInvariant` objects -- the source of truth for design constraints |
| `tests/machines/uiMachine.ts` | UI state machine definitions + DOM assertions |
| `tests/machines/types.ts` | `StateInvariant` interface |

---

## Dev Commands

All commands must be run through the Nix devshell. Never use bare `npm` or `npx` -- the flake is the only sanctioned entry point.

```bash
# Enter the devshell (auto-tangles on entry)
nix develop

# Build (prebuild hook auto-tangles)
nix develop --command npm run build

# Dev server on :3000
nix develop --command npm run dev

# Run all tests
nix develop --command npx playwright test --project=firefox --workers=1

# Run structural invariants only
nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"

# Tangle only (generate .ts from .lit.mdx)
literate-state-machine-wiki build

# Force tangle (overwrite existing)
literate-state-machine-wiki build

# Stitch (sync .ts edits back to .lit.mdx -- bidirectional)
# stitch not available in store-based workflow

# Watch mode (live tangle daemon)
# watch not available in store-based workflow

# AST-grep structural lint
nix develop --command npx ast-grep scan

# ESLint
nix develop --command npm run lint
```

The `flake.nix` devshell provides the correct nixpkgs Firefox matching the npm `@playwright/test` version. The dev server auto-starts via `playwright.config.ts` webServer config.

Entangled CLI: `managed by literate-state-machine-wiki` (Python, installed via venv in Nix devshell, see `requirements.txt`).

### Development Workflow

1. Edit `literate.lit.mdx/<module>.lit.mdx`
2. `literate-state-machine-wiki build` -- generate `.ts`
3. `nix develop --command npm run build` -- build (auto-tangles via prebuild hook)
4. `nix develop --command npx playwright test --project=firefox --workers=1` -- test (auto-tangles via pretest hook)

---

## Ideal State Criteria

The project defines "done" through machine-verifiable invariants in `tests/machines/invariant-checks.ts`. If ALL structural invariants pass, the project is in ideal state. The test suite is the specification.

### Structural requirements (enforced by tests)

- Zero duplicate element IDs in the DOM
- No "D4" text visible in non-grid UI elements (labels, overlays, headers must say "D-ref")
- MIDI settings has EXPRESSION subtitle and logical grouping
- Exactly one flat-sound-toggle checkbox
- All invariants in `invariant-checks.ts` pass

### Build requirements

- `tsc` exits 0 with zero type errors
- `vite build` produces `dist/` successfully
- `ast-grep scan` reports zero violations (rules in `ast-grep-rules/`)
- All Playwright tests pass on Firefox with `--workers=1`

### Design requirements

- The instrument is playable immediately on load with zero configuration
- Every chord shape is the same in every key (isomorphism preserved across all tunings)
- Touch, QWERTY keyboard, and MIDI all produce sound through the same synth pipeline
- No scroll on the page -- the entire instrument is visible at once

---

## Heavenly Restrictions

These rules are structurally enforced -- by the build, by ast-grep rules, by the test suite, or by file permissions. They are not suggestions.

| Restriction | Enforcement |
|-------------|-------------|
| Never edit `*.ts` directly | immutable in nix store; `Edit`/`Write` will EACCES; ast-grep `no-direct-generated-edit` |
| No `as any`, `@ts-ignore`, `@ts-expect-error` | `tsc --strict`; ast-grep `no-ts-comments` |
| No `!` non-null assertions | ast-grep `no-type-assertion`; use `if (!x) throw new Error(msg)` or optional chaining |
| No standalone `test()` calls outside the spec file | ast-grep `no-imperative-test-files` |
| No `Effect` imports outside `services/` | ast-grep `no-effect-outside-services` |
| No native `<select>` elements in HTML | ast-grep `no-native-select-in-html` (use slim-select) |
| No raw `title=` tooltip attributes in HTML | ast-grep `no-raw-tooltips` (use InfoButton component) |
| No raw `setAttribute` calls | ast-grep `no-raw-setattribute` (go through machine actions) |
| No raw `textContent` mutations | ast-grep `no-raw-textcontent` (go through machine actions) |
| No raw `innerHTML` mutations | ast-grep `no-raw-innerhtml` (go through machine actions) |
| No raw `style.*` mutations | ast-grep `no-raw-style-mutation` (go through machine actions) |
| No raw `classList.add` | ast-grep `no-raw-classlist-add` (go through machine actions) |
| No raw `classList.remove` | ast-grep `no-raw-classlist-remove` (go through machine actions) |
| No raw `classList.toggle` | ast-grep `no-raw-classlist-toggle` (go through machine actions) |
| No raw `.hidden =` mutations | ast-grep `no-raw-hidden` (go through machine actions) |
| No raw `.disabled =` mutations | ast-grep `no-raw-disabled` (go through machine actions) |
| No raw slider value/step manipulation | ast-grep `no-raw-slider-manipulation` (use app-slider helpers) |
| No ad-hoc icon styling | ast-grep `no-adhoc-icon-styling` (use icon-btn/icon-md classes) |
| No naked browser API calls | ast-grep `no-naked-browser-api` (inject via Effect services) |
| No imperative `page.goto()` in tests | ast-grep `no-raw-goto-in-specs` |
| No raw `dispatchEvent` in tests | ast-grep `no-raw-dispatchevent-in-specs` |
| Tests only in `tests/xstate-graph.spec.ts` | `testMatch` in playwright config |
| New tests must be `StateInvariant` objects | Wired into `[Structural]` block in spec file |

---

## Priority Order

When multiple things need attention, work on them in this order:

1. **System** -- build breaks, type errors, test infrastructure failures
2. **Structure** -- state machine correctness, literate programming integrity, ast-grep rule violations
3. **Bugs** -- user-facing regressions, broken inputs, rendering glitches
4. **Features** -- new functionality, new instruments, new visualizations
5. **Docs** -- AGENTS.md, literate prose, code comments

A build break blocks everything. A structural problem blocks feature work. A bug blocks new features. Documentation is always last priority.

---

## Agent Behavioral Rules (ENFORCED — read before every task)

These rules exist because the agent repeatedly made the same mistakes across multiple sessions. They are not suggestions — they are hard constraints.

1. **NEVER label an issue "ready for review" without browsing the DEPLOYED site** (`gridinstruments.xyz/dev`) with Playwright, taking a screenshot, and viewing it with Read tool. localhost tests are insufficient — they miss OverlayScrollbars positioning, SolidJS reactivity, and mobile rendering issues.

2. **NEVER claim a fix works without checking `getBoundingClientRect()` on the DEPLOYED site.** Elements with `isVisible()=true` can still be at `top: 676px` (off-screen). Always check position, not just visibility.

3. **Fix the testing harness BEFORE fixing individual bugs.** The user has said this 20+ times. Framework fixes come first because they change how everything else gets verified.

4. **The agent IS the test harness.** The agent takes screenshots, views them with Read tool, and judges "does this look correct?" Coded Playwright assertions that check CSS classes are NOT real tests.

5. **NEVER output empty heartbeat messages.** Every response must contain actual code changes, verified screenshots, or concrete progress. Echoing "Active" or "Working" is not work.

6. **NEVER rename a function more than once.** Pick a descriptive name and commit to it immediately.

7. **Read the FULL issue thread** (`gh issue view NUMBER --comments`) before ANY coding. The issue thread IS the spec.

8. **Use the PAI Algorithm** (`~/.claude/PAI/Algorithm/v3.7.0.md`) for every complex task. It's installed and working — just never invoked.

9. **OverlayScrollbars overrides position:absolute.** Always add `position: absolute !important` in `ui-overrides.css` for overlay elements wrapped by OverlayScrollbars.

10. **SolidJS template literal class is NOT reactive.** Use `classList={{ hidden: !props.visible() }}`, never `class={\`...\${expr}\`}`.

---

## Anti-patterns (Banned Behaviors)

These are not structurally enforced but are project policy. Violating them creates technical debt.

- **Adding npm dependencies** -- the only allowed runtime deps beyond the current set are `xstate` and `effect`. Everything else must be vendored or avoided.
- **Using `grim`** for screenshots -- use Playwright's built-in screenshot API
- **Closing GitHub issues** -- only label them "ready for review"; the maintainer closes
- **Using `gh issue comment` directly** -- always use `scripts/gh-comment.sh` which prefixes with `🤖 [Agent]` so agent comments are distinguishable from user comments
- **Reading agent comments as user intent** -- on GitHub issues, only trust informal/complaint language as the user's voice. Comments starting with "Fixed in commit" or "Verified:" are agent comments and are often wrong
- **Toggle modifiers** -- `Shift` (vibrato) and `Space` (sustain) are hold-on, release-off. Never toggle.
- **Binding `R` to non-note actions** -- `R` is a note key on the grid
- **Binding `Ctrl+*` to synth shortcuts** -- `Ctrl` passes through to the browser
- **Using any font other than JetBrains Mono** -- it is the ONLY allowed font
- **Using `border-radius`** -- the design language is sharp corners only
- **Using colors other than `#000` background and `#fff` text** -- except for note-color chromesthesia
- **Scroll on the page** -- `overflow: hidden` at page level, always
- **Placing drag handles on `grid-area` or `keyboard-canvas`** -- handles live on the inner border of panels
- **Auto-deploying from `main`** -- deploys are tag-triggered only (see Deploy Strategy)
- **Editing generated files** -- edit `literate.lit.mdx/*.lit.mdx`, never `*.ts`

---

## The D-ref Naming Convention

The center note of the DCompose layout is at grid coordinate `[0, 0]`, defaulting to MIDI 62 (293.66 Hz). This note is called **D-ref**, not "D4".

Why: the reference pitch is adjustable -- the user can retune it to any frequency. Calling it "D4" implies it is locked to the standard D4 frequency, which is false. The API uses `setD4Hz`/`getD4Hz` for historical reasons (this is a known naming debt in the codebase), but all user-facing text must say **D-ref**.

Rules:
- UI labels, overlays, headers: always "D-ref", never "D4"
- Code APIs: `setD4Hz`/`getD4Hz`/`_d4Hz` are the current names (legacy; do not rename without a coordinated migration)
- The `IDEAL-NO-D4` test invariant enforces that "D4" does not appear in UI text (excluding grid cell note names where "D4" is a valid note name)
- D-ref octave notation: `D-ref = MIDI 62`, octave 0 is D-ref to C# above, octave +1 uses `'`, octave -1 uses `,`

---

## Deploy Strategy

Deploys are **tag-triggered only**. Pushing to `main` runs CI (build + test) but does NOT deploy.

- **To deploy**: push a version tag matching `v*` (e.g., `git tag v1.2.0 && git push --tags`)
- **CI on main**: `.github/workflows/test.yml` runs on every push to `main` and every PR -- builds, tangles, lints (informational), and runs Playwright tests
- **Deploy workflow**: `.github/workflows/deploy.yml` triggers on `v*` tags only -- builds, tests, then deploys `dist/` to GitHub Pages at `gridinstruments.xyz`
- **Emergency deploy**: `workflow_dispatch` allows manual deploy from the GitHub Actions UI
- **No auto-deploy from main** -- this is deliberate. A green `main` does not mean "ship it"; only an explicit version tag triggers a production deploy

---

## UI Structure

- `#grid-settings-btn` -- cog button (top-left of keyboard-container, z-index 15)
- `#grid-overlay` -- per-grid settings overlay; toggle via cog; `hidden` class = closed; `padding-left: 48px` clears the cog
- `#visualiser-panel` -- top panel with drag handle at its bottom border
- `#pedals-panel` -- bottom panel with drag handle at its top border
- Panels use `position: relative; overflow: visible` so handles can straddle the seam
- Overlay sections use `.overlay-section-title` (greyish via `var(--dim)`) for category headings, white for individual setting labels

---

## Testing

All tests live in a single spec file (`tests/xstate-graph.spec.ts`). It is the only spec file Playwright runs (enforced via `testMatch` in config).

- **Structural invariants** -- state-independent checks (DOM structure, library contracts, visual properties). All new tests must be `StateInvariant` objects in `tests/machines/invariant-checks.ts`, wired into the `[Structural]` block in the spec file.
- **Graph-generated tests** -- XState `getAdjacencyMap` generates one test per `(state, event)` pair per machine. Adding a state or event to a machine automatically adds test coverage.
- **Ideal state invariants** -- a special category of structural invariants (prefixed `IDEAL-*`) that define what "correct" looks like. If all pass, the project is in ideal state.

No standalone `test()` calls in any other file -- enforced by the `no-imperative-test-files` ast-grep rule.

---

## Atomic Checkpoint Protocol (MANDATORY for orchestrators)

**The #1 failure mode**: completing work but not tracking it. This protocol is a BLOCKING GATE, not a suggestion.

After EVERY subagent task completion:

```
STEP 1: VERIFY  -- Read changed files, run lsp_diagnostics, confirm work is correct
STEP 2: MARK    -- Edit plan file: change `- [ ]` to `- [x]` for the completed task
STEP 3: BOULDER -- Update boulder.json: append task ID to completed_tasks array, add commit hash to completed_evidence
STEP 4: NEXT    -- ONLY NOW may you delegate the next task
```

These four steps are ATOMIC. You MUST NOT skip to STEP 4 without completing STEPS 2-3.

### boulder.json schema (required fields)

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
- On cold-start / session resume: read boulder.json to know exactly what is done without git forensics
- `/start-work` hook reads boulder.json and validates plan checkboxes match `completed_tasks`
- If drift detected: reconcile BEFORE proceeding
- NEVER delegate a new task if the previous task's checkpoint is incomplete
