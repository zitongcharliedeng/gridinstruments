# Gamification PoC — MIDI Import + Sequential Glow Game (#73)

## TL;DR

> **Quick Summary**: Add a play-along game mode where users drop a MIDI file and keys glow white sequentially — press the right key to advance, score = speed. Teaches grid SHAPES, not absolute pitches.
> 
> **Deliverables**:
> - Inline MIDI parser (`src/lib/midi-parser.ts`)
> - Game state machine (`src/machines/gameMachine.ts`)
> - Target note glow on grid canvas (white, separate from active/sustained)
> - File drop handler on canvas
> - Auto-set 12-TET on MIDI load + tuning warning
> - D-ref auto-centering (median note)
> - Range-aware song cropping (based on keyboard layout)
> - Ghost note in note history visualizer
> - EDO vs TET explanation in About dialog
> - TDD with StateInvariant tests
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: MIDI Parser → Game Machine → Visual Integration → Wiring + Polish

---

## Context

### Original Request
Issue #73: Build a gamification/song-learning PoC. Users drop a MIDI file and play along on the isomorphic grid in a sequential glow mode.

### Interview Summary
**Key Discussions**:
- Data model: Extensive debate. MIDI note numbers as storage (what files give you), `midiToCoord()` at game time. The game teaches SHAPES, not absolute pitches — changing tuning doesn't change which keys light up.
- The grid is a Tonnetz (2D pitch lattice, rank-2 temperament). JI is rank-3 (3D lattice projected onto 2D). The fifth slider selects the projection. Commas = curvature.
- Sequential glow: keys glow white one at a time (chord groups glow together). Press any correct key to advance. Extra notes don't invalidate. Score = speed.
- No new npm dependencies. Inline MIDI parser (~200 lines).
- Range calibration mode: before game, user plays every reachable note on their device(s). Keys light up white as pressed. Multi-input works (keyboard + MIDI + touch all contribute). User confirms "done." Exact set of reachable keys saved to localStorage. Previewable anytime (last saved range). Song import uses saved range to auto-transpose and crop. Handles broken keys, irregular ranges, any input device.
- Tuning warning is a feature: "Play Merry Christmas in Pythagorean tuning."

**Research Findings**:
- Every existing project (Linthesia, Rexiano, MuseScore, tonal.js, Magenta) uses MIDI numbers + seconds timing
- BitMIDI: 113k+ free MIDI files. Lakh: 178k. VGMusic: 45k.
- `midiToCoord()` exists in note-colors.ts. `getCellIdsForMidiNotes()` exists in keyboard-visualizer.ts.
- `drawCell()` has 4-state union: `active | sustained | white | black`. Need to add `target`.
- No existing file drop or mode concept in the codebase.

### Metis Review
**Identified Gaps** (all addressed in plan):
- Chord handling: simultaneous notes glow together, any-one-advances
- Repeated note feedback: brief visual pulse on advancement
- `targetNotes` must be separate from `activeNotes` (can't reuse)
- MIDI parser must handle: running status, Note On vel=0 as Note Off, channel 10 drums filtering
- Visual priority: active > target > sustained > white/black
- D-ref auto-centering needs clarification (frequency shift, not visual — use median MIDI note)

---

## Work Objectives

### Core Objective
Add a play-along game mode that imports standard MIDI files and guides users through songs via sequential key highlighting on the isomorphic grid.

### Concrete Deliverables
- `src/lib/midi-parser.ts` — Inline MIDI file parser (Type 0 + Type 1)
- `src/machines/gameMachine.ts` — XState v5 game lifecycle machine
- `src/lib/game-engine.ts` — Game logic: note queue, matching, scoring, range-aware transposition
- Modified `src/lib/keyboard-visualizer.ts` — `targetNotes` set + `'target'` draw state
- Modified `src/lib/note-colors.ts` — `cellColors()` target state (white glow)
- Modified `src/lib/note-history-visualizer.ts` — Ghost note display
- Modified `src/main.ts` — File drop handler, game actor wiring, tuning warning
- Modified `index.html` — Game overlay section (GAME heading in overlay), drop zone styling, EDO vs TET in About
- Test fixtures: `.mid` files for parser tests
- StateInvariant tests in `tests/machines/invariant-checks.ts`

### Definition of Done
- [ ] User can drag-drop a .mid file onto the canvas
- [ ] Keys glow white sequentially; pressing correct key advances
- [ ] Score (elapsed time) shown on completion
- [ ] Tuning auto-sets to 12-TET on file load; warning on tuning change
- [ ] D-ref auto-centers on median note of song
- [ ] Notes outside keyboard layout range are cropped
- [ ] All new tests pass (structural invariants + graph-generated)
- [ ] Build exits 0
- [ ] No new npm dependencies

### Must Have
- Inline MIDI parser handling Type 0, Type 1, running status, vel=0 Note Off, channel 10 filtering
- Sequential glow with chord group support (simultaneous notes glow together)
- Extra keypresses don't invalidate — only correct key advances
- File drop on canvas element (not a file picker button)
- Tuning warning (informational, not blocking)
- EDO vs TET explanation somewhere visible
- TDD: StateInvariant objects for every component

### Must NOT Have (Guardrails)
- No rhythm/timing scoring (just speed)
- No song browser/search (file drop only for PoC)
- No audio playback from MIDI file (user plays the notes themselves)
- No falling-note Synthesia waterfall animation
- No pause/resume (press keys to advance, that's it)
- No score persistence/leaderboards
- No track selection UI (use all non-drum tracks)
- No difficulty levels
- No npm dependencies
- No modification to render pipeline when game mode is off
- No blocking tuning changes during game
- No `as any`, `@ts-ignore`, `!` non-null assertions
- No auto-play/demo mode

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (XState + Playwright)
- **Automated tests**: TDD
- **Framework**: Playwright with XState graph-generated tests
- **Approach**: RED (write StateInvariant) → GREEN (implement) → REFACTOR

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Canvas glow**: Playwright screenshots — compare target state rendering
- **MIDI parser**: Bash — run parser on test fixtures, assert note counts/values
- **Game flow**: Playwright — simulate file drop + key presses, assert state transitions
- **Integration**: Playwright — full flow from drop to completion

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all independent, start immediately):
├── Task 1: MIDI parser module [deep]
├── Task 2: Game state machine (XState) [deep]
├── Task 3: Target note visual system (keyboard-visualizer + note-colors) [visual-engineering]
├── Task 4: EDO vs TET explanation + About dialog update [quick]
└── Task 5: Test fixtures — create .mid files for parser tests [quick]

Wave 2 (Core logic — depends on Wave 1):
├── Task 6: Game engine logic (depends: 1, 2) [deep]
├── Task 7: Ghost note in note history visualizer (depends: 3) [visual-engineering]
└── Task 8: File drop handler + drop zone styling (depends: 2) [unspecified-high]

Wave 3 (Integration — depends on Wave 2):
├── Task 9: Main.ts wiring — game actor, render pipeline, tuning warning (depends: 2, 3, 6, 8) [deep]
├── Task 10: Overlay GAME section UI (depends: 8, 9) [visual-engineering]
└── Task 11: Range detection + D-ref auto-centering (depends: 6) [unspecified-high]

Wave 4 (Verification):
├── Task 12: Integration tests — full drop-to-completion flow (depends: 9) [deep]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 6 → Task 9 → Task 12 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 6, 12 | 1 |
| 2 | — | 6, 8, 9 | 1 |
| 3 | — | 7, 9 | 1 |
| 4 | — | — | 1 |
| 5 | — | 6, 12 | 1 |
| 6 | 1, 2, 5 | 9, 11, 12 | 2 |
| 7 | 3 | 12 | 2 |
| 8 | 2 | 9, 10 | 2 |
| 9 | 2, 3, 6, 8 | 10, 12 | 3 |
| 10 | 8, 9 | 12 | 3 |
| 11 | 6 | 12 | 3 |
| 12 | 9, 10, 11 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: 5 tasks — T1 `deep`, T2 `deep`, T3 `visual-engineering`, T4 `quick`, T5 `quick`
- **Wave 2**: 3 tasks — T6 `deep`, T7 `visual-engineering`, T8 `unspecified-high`
- **Wave 3**: 3 tasks — T9 `deep`, T10 `visual-engineering`, T11 `unspecified-high`
- **Wave 4**: 1 task — T12 `deep`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `nix develop --command npx playwright test --project=firefox --workers=1`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Drop a real MIDI file (Twinkle Twinkle or similar). Play through the entire sequence. Verify: keys glow white, correct key advances, wrong key does nothing, score appears at end. Test tuning warning. Test with 60% layout (range cropping). Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Tasks | Message | Files |
|--------|-------|---------|-------|
| 1 | 1, 5 | `feat(game): add inline MIDI parser with test fixtures` | `src/lib/midi-parser.ts`, `tests/fixtures/*.mid` |
| 2 | 2 | `feat(game): add game state machine (XState)` | `src/machines/gameMachine.ts` |
| 3 | 3 | `feat(game): add target note glow system to grid canvas` | `src/lib/keyboard-visualizer.ts`, `src/lib/note-colors.ts` |
| 4 | 4 | `docs: add EDO vs TET explanation to About dialog` | `index.html` |
| 5 | 6, 7 | `feat(game): add game engine logic + ghost note display` | `src/lib/game-engine.ts`, `src/lib/note-history-visualizer.ts` |
| 6 | 8, 9, 10, 11 | `feat(game): wire game mode — file drop, overlay, tuning warning, range detection` | `src/main.ts`, `index.html` |
| 7 | 12 | `test(game): add integration tests for game flow` | `tests/machines/invariant-checks.ts` |

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npm run build                                    # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: all pass
nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"  # Expected: all pass including new game invariants
```

### Final Checklist
- [ ] All "Must Have" present (inline MIDI parser, sequential glow, chord groups, file drop, tuning warning, EDO vs TET, TDD)
- [ ] All "Must NOT Have" absent (no npm deps, no rhythm scoring, no Synthesia waterfall, no auto-play, no leaderboards)
- [ ] All tests pass (existing 177 + new game invariants)
- [ ] Build exits 0
- [ ] No `as any`, `@ts-ignore`, `!` non-null assertions
