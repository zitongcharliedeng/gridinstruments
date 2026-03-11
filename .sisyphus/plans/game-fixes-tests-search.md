# Game Logic Fixes, Comprehensive Tests, and MIDI Search Explorer

## TL;DR

> **Quick Summary**: Fix 5 critical game bugs (frequency-based matching, chord completion, calibration visual feedback, drop zone UX, progress/timer), add note quantization as a difficulty system (1/4, 1/8, 1/16 grids — Piano Tiles meets music education), comprehensive test coverage for ALL game behaviors, then build a MIDI search explorer with adapter pattern for in-app song discovery.
> 
> **Deliverables**:
> - Frequency-based note matching (all enharmonic equivalents valid)
> - Chord completion requiring ALL notes pressed (sequential accumulate)
> - Calibration grey-out of unreachable grid cells
> - Visible game drop zone + instructions on canvas
> - Progress bar + elapsed timer visible during play
> - Note quantization with difficulty levels (1/4, 1/8, 1/16 grid)
> - Tempo map + time signature extraction from MIDI parser
> - ~35+ behavioral StateInvariant tests covering all game logic
> - MIDI search UI with GitHub + midishare.dev adapters (~4k songs)
> 
> **Estimated Effort**: XL
> **Parallel Execution**: YES — 8 waves, max 5 concurrent tasks
> **Critical Path**: T1 → T2 → T3 → T6-T10 → T11 → T13/T14 → T15 → F1-F4

---

## Context

### Original Request
Fix broken game logic (coordinate-based matching instead of frequency-based, single-note chord advancement), fix invisible UX (calibration has zero visual feedback, game section buried with no affordance), add comprehensive test coverage (currently 37%), then build a MIDI search explorer so users can find and load songs without manual file download.

### Interview Summary
**Key Discussions**:
- Target note matching uses cellId (one coordinate), not MIDI note (frequency) — on isomorphic grids the same pitch appears at multiple positions. B and Cb are the same frequency but different cells — pressing either should count as correct.
- Chord groups advance on ANY single correct press — should require ALL notes (sequential accumulate: press each in any order, advance when all hit)
- Calibration saves to localStorage but gives ZERO visual feedback on the grid. User wants: all cells grey during calibration → played cells un-grey/activate → unreachable cells stay grey permanently after calibration
- GAME section buried at bottom of overlay with only "Calibrate range" button. No instructions, no "drop a MIDI file" prompt, no drop zone affordance on the canvas
- Progress bar + elapsed timer must be visible during play (on canvas, not just in overlay)
- MIDI search: adapter pattern, CORS-only sources first (GitHub repos + midishare.dev), search UI in overlay, invisible to users (just a source ID badge)
- Chord completion: sequential accumulate (no NOTE_RELEASED needed)
- User plans future game module extraction — needs clean code and tests now
- **Literate programming**: tests should serve as the spec. Test comments should capture design intent and rationale. Plan + tests maintain parity.

**Quantization & Rhythm Design** (Piano Tiles inspiration):
- Current game throws away ALL rhythmic information — whole notes and 16th notes are both "one press." This means playing at constant pace does NOT reproduce original tempo.
- **Solution: quantization as a difficulty setting**:
  - Beginner (1/4 note grid): All notes snap to quarter note grid. Trills → single chords. Ornaments flattened. Dotted notes snap to nearest quarter. Syncopation simplified. Massive licks become simple chord sequences.
  - Intermediate (1/8 note grid): Most melodic detail preserved. Fast ornaments simplified.
  - Advanced (1/16 note grid): Full detail including fast runs, grace notes, trills.
- **Long notes as repeated taps**: A half note at 1/8 quantization = 4 consecutive taps of the same chord. This preserves rhythmic density so "constant pace = original tempo" comes naturally — group density matches the quantized rhythm.
- **Time signature awareness**: The quantization grid must adapt to the time signature. 4/4 = 4 quarters per measure. 3/4 = 3. 7/8 = 7 eighth notes. Odd meters (Tigran Hamasyan, etc.) are still quantizable — the grid has different divisions, not a different concept.
- **Tempo changes**: Beat grid follows the MIDI tempo map. Ritardando = grid spreads out = fewer groups per second at that point.
- **Dotted notes in coarse quantization**: Snap to nearest grid point. Beginners lose the dot — that's the simplification. They're learning shapes, not rhythm notation.
- **Syncopation in coarse quantization**: "And" of beat 2 snaps to beat 2 or beat 3 in 1/4 grid. Beginners lose syncopation — acceptable for shape learning.
- **Non-common time**: 5/4, 7/8, etc. still work because quantization is grid-point-based, not bar-based. A 7/8 bar has 7 eighth-note grid points.
- **Implementation**: New `quantizeNotes()` function between parseMidi and buildNoteGroups:
  ```
  parseMidi(buffer) → { events: NoteEvent[], tempoMap, timeSigMap }
  quantizeNotes(events, tempoMap, timeSigMap, level) → QuantizedEvent[]
  buildNoteGroups(quantizedEvents) → NoteGroup[]
  ```

**Research Findings**:
- `getCellIdsForMidiNotes()` exists in keyboard-visualizer.ts but is never called for game targets
- `NoteGroup.midiNotes` exists on `GameNoteGroup` but not on base `NoteGroup` type
- `isCorrectNote` guard: `cellIds.includes(event.cellId)` — coordinate-only
- `playing` state has no `FILE_DROPPED` transition — new songs can't load during play
- MIDI parser already collects tempo map (`midi-parser.ts:236-252`), outputs NoteEvent with `startMs` + `durationMs`
- GitHub raw.githubusercontent.com has CORS — zero infrastructure needed
- thewildwestmidis/midis (~1,700 files) + MutopiaProject (~2,124 classical) = ~3,800 songs
- midishare.dev has JSON API but marked "unstable" — secondary source
- Reference implementations: osu!mania, StepMania, Etterna use beat-grid snapping for chart generation. Piano Tiles uses constant-speed note scrolling. Synthesia preserves MIDI timing exactly.

### Metis Review
**Identified Gaps** (addressed):
- NoteGroup type mismatch — base `NoteGroup` lacks `midiNotes`, only `GameNoteGroup` has it. Added as prerequisite task.
- Two existing test invariants create NoteGroups without `midiNotes` — must update mocks.
- `playing` state ignores `FILE_DROPPED` — must add transition for search results to work during play.
- Golden screenshots will break after visual changes — explicit update step added.
- Fifth slider movable during game — must lock controls during play.
- Chord completion mechanic resolved: sequential accumulate (no NOTE_RELEASED needed).

---

## Work Objectives

### Core Objective
Fix all game logic and UX bugs so the gamification feature actually works as intended on an isomorphic grid, add comprehensive behavioral test coverage that would catch regressions, then build a MIDI search explorer for in-app song discovery.

### Concrete Deliverables
- Fixed `gameMachine.ts` with frequency-based matching and chord accumulation
- Fixed `keyboard-visualizer.ts` with calibration grey-out and multi-cell target highlighting
- New game UI: canvas drop zone, instructions, progress bar, timer
- ~30+ new `StateInvariant` tests in `invariant-checks.ts`
- New `src/lib/midi-search.ts` with adapter interface
- New GitHub + midishare.dev adapters
- Search UI in overlay panel

### Definition of Done
- [ ] `nix develop --command npx playwright test --project=firefox --workers=1` — ALL tests pass
- [ ] `nix develop --command npm run build` — exits 0
- [ ] Pressing Cb when target is B advances the game
- [ ] Chord with 3 notes requires all 3 pressed before advancing
- [ ] After calibration, unreachable cells are visually grey on grid
- [ ] Search "twinkle" returns results, clicking one loads the game

### Must Have
- Frequency-based matching (MIDI note, not cellId)
- Chord completion via sequential accumulation
- Calibration grey-out on grid
- Drop zone affordance visible on canvas
- Progress bar + timer visible during play (not just in overlay)
- Note quantization function with 3 levels (1/4, 1/8, 1/16 grid)
- Tempo map + time signature extraction from MIDI parser output
- Quantization difficulty selector in game UI
- Long notes split into repeated taps at quantization resolution
- Comprehensive StateInvariant tests for ALL game behaviors (with literate comments explaining design intent)
- MIDI search with at least GitHub adapter working
- All existing 65 tests still passing

### Must NOT Have (Guardrails)
- No leaderboards, high scores, or persistent game statistics
- No MIDI file preview/playback before starting game
- No GitHub API authentication or token management
- No search result caching in localStorage or IndexedDB
- No offline support or service worker
- No additional MIDI sources beyond GitHub repos (2) + midishare.dev
- No abstract "plugin system" — concrete adapter functions only
- No separate game module extraction (future goal, not this plan)
- No changes to tuning system, layout system, or MPE system
- No difficulty levels, game modes, or scoring algorithms
- No new npm dependencies beyond xstate
- No `as any`, `@ts-ignore`, `@ts-expect-error`, `!` non-null assertions

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright + XState graph tests)
- **Automated tests**: TDD — failing tests written WITH each fix task
- **Framework**: Playwright + XState StateInvariant objects
- **Pattern**: Each bug fix includes a test that FAILS before the fix and PASSES after

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Game Logic**: Use Bash (node/bun REPL) — import game machine, create actor, send events, assert state
- **Visual/UI**: Use Playwright (playwright skill) — navigate, interact, screenshot, assert DOM
- **MIDI Search**: Use Playwright — open overlay, type search, verify results, click result, verify game loads

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Prerequisite — type foundation):
└── Task 1: NoteGroup type change + mock updates [quick]

Wave 2 (Core game logic fix — critical path):
└── Task 2: Frequency-based matching + chord completion [deep]

Wave 3 (Fan-out — 3 parallel, different areas):
├── Task 3: Target highlight expansion + FILE_DROPPED + controls lock [deep]
├── Task 4: Calibration visual feedback on grid [visual-engineering]
└── Task 5: Game UI overhaul (drop zone, instructions, progress bar, timer) [visual-engineering]

Wave 4 (Test coverage — 5 parallel, all independent):
├── Task 6: Game engine function tests [unspecified-high]
├── Task 7: MIDI parser edge case tests [unspecified-high]
├── Task 8: Game machine state transition tests [unspecified-high]
├── Task 9: Input integration + edge case tests [unspecified-high]
└── Task 10: Update golden screenshots [quick]

Wave 5 (Search adapters — 2 parallel):
├── Task 11: Adapter interface + GitHub adapter [unspecified-high]
└── Task 12: midishare.dev adapter [quick]

Wave 6 (Search + Quantization — 3 parallel):
├── Task 13: Search UI + integration wiring [visual-engineering]
├── Task 14: Tempo/time-sig extraction + quantize function [deep]
└── Task 15: Search feature tests [unspecified-high]

Wave 7 (Quantization UI + final tests):
├── Task 16: Quantization difficulty UI + wiring [visual-engineering]
└── Task 17: Quantization tests [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T3 → T6-T10 → T11 → T13/T14 → T16 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Waves 3, 4)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | T2 | 1 |
| T2 | T1 | T3, T4, T5, T6-T10 | 2 |
| T3 | T2 | T6, T9, T10 | 3 |
| T4 | T2 | T10 | 3 |
| T5 | T2 | T10 | 3 |
| T6 | T3 | F1-F4 | 4 |
| T7 | T1 | F1-F4 | 4 |
| T8 | T2 | F1-F4 | 4 |
| T9 | T3 | F1-F4 | 4 |
| T10 | T4, T5 | F1-F4 | 4 |
| T11 | — | T13, T15 | 5 |
| T12 | — | T13, T15 | 5 |
| T13 | T11, T12 | T15, F1-F4 | 6 |
| T14 | T2 | T16, T17 | 6 |
| T15 | T13 | F1-F4 | 6 |
| T16 | T14 | T17, F1-F4 | 7 |
| T17 | T14, T16 | F1-F4 | 7 |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 1 task — T2 → `deep`
- **Wave 3**: 3 tasks — T3 → `deep`, T4 → `visual-engineering`, T5 → `visual-engineering`
- **Wave 4**: 5 tasks — T6-T9 → `unspecified-high`, T10 → `quick`
- **Wave 5**: 2 tasks — T11 → `unspecified-high`, T12 → `quick`
- **Wave 6**: 3 tasks — T13 → `visual-engineering`, T14 → `deep`, T15 → `unspecified-high`
- **Wave 7**: 2 tasks — T16 → `visual-engineering`, T17 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. NoteGroup Type Prerequisite + Mock Updates

  **What to do**:
  - Add `midiNotes: number[]` to the base `NoteGroup` interface in `src/machines/gameMachine.ts:31-36`
  - Add `midiNote: number` field to the `NOTE_PRESSED` event type in `GameEvent` union (`gameMachine.ts:56-63`)
  - Update `buildNoteGroups()` in `src/lib/game-engine.ts` — it already populates `midiNotes` on `GameNoteGroup`, ensure the base interface now includes it
  - Update ALL mock `NoteGroup` constructions in `tests/machines/invariant-checks.ts` — at minimum lines ~1993-1996 and ~2027 where `NoteGroup[]` arrays are created without `midiNotes`
  - Use `ast_grep_search` for `{ cellIds: [` in TypeScript to find ALL NoteGroup literal constructions
  - Use `lsp_find_references` on `NoteGroup` to verify all consumption sites are updated
  - Run full test suite to confirm nothing breaks

  **Must NOT do**:
  - Do NOT change matching logic (isCorrectNote guard) — that's Task 2
  - Do NOT change the render pipeline
  - Do NOT change any NOTE_PRESSED dispatch sites yet — only the type definition

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Pure type/interface change, no business logic

  **Parallelization**:
  - **Can Run In Parallel**: NO (prerequisite for everything)
  - **Parallel Group**: Wave 1 (alone)
  - **Blocks**: T2, T3, T4, T5, T6, T7, T8, T9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/machines/gameMachine.ts:31-36` — Current `NoteGroup` interface (lacks `midiNotes`)
  - `src/machines/gameMachine.ts:56-63` — Current `GameEvent` union (NOTE_PRESSED has only `cellId`)
  - `src/lib/game-engine.ts:19-21` — `GameNoteGroup extends NoteGroup` with `midiNotes: number[]`
  - `src/lib/game-engine.ts:44-68` — `buildNoteGroups()` already populates `midiNotes`

  **Test References**:
  - `tests/machines/invariant-checks.ts:~1993-1996` — Mock NoteGroups without `midiNotes` (WILL BREAK)
  - `tests/machines/invariant-checks.ts:~2027` — Another mock NoteGroup (WILL BREAK)

  **WHY Each Reference Matters**:
  - `gameMachine.ts:31-36`: This is THE interface to modify — add `midiNotes: number[]`
  - `gameMachine.ts:56-63`: Must add `midiNote: number` to NOTE_PRESSED event so T2 can use it
  - `game-engine.ts:19-21`: `GameNoteGroup` already extends NoteGroup with midiNotes — after base type change, the `extends` may become redundant for that field
  - `invariant-checks.ts:~1993,~2027`: These mock constructions WILL fail TypeScript checks after the type change

  **Acceptance Criteria**:
  - [ ] `NoteGroup` interface includes `midiNotes: number[]`
  - [ ] `NOTE_PRESSED` event type includes `midiNote: number`
  - [ ] `nix develop --command npm run build` exits 0
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1` — ALL 65 tests pass

  **QA Scenarios**:

  ```
  Scenario: Build succeeds with updated types
    Tool: Bash
    Preconditions: Type changes applied, mocks updated
    Steps:
      1. Run: nix develop --command npm run build
      2. Assert: exit code 0, no TypeScript errors
    Expected Result: Clean build with no type errors
    Failure Indicators: TS2741 (missing property), TS2345 (type mismatch)
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: All existing tests still pass
    Tool: Bash
    Preconditions: Build succeeds
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1
      2. Assert: 65 tests pass, 0 failures
    Expected Result: Zero regressions from type change
    Failure Indicators: Any test failure mentioning NoteGroup or midiNotes
    Evidence: .sisyphus/evidence/task-1-tests.txt
  ```

  **Commit**: YES
  - Message: `refactor(game): add midiNotes to base NoteGroup interface`
  - Files: `src/machines/gameMachine.ts`, `src/lib/game-engine.ts`, `tests/machines/invariant-checks.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [x] 2. Frequency-Based Matching + Chord Completion

  **What to do**:
  - **Frequency-based matching**: Modify `isCorrectNote` guard in `src/machines/gameMachine.ts:108-110` to check `context.noteGroups[context.currentGroupIndex]?.midiNotes.includes(event.midiNote)` instead of `cellIds.includes(event.cellId)`
  - **Chord completion (sequential accumulate)**: Add `pressedMidiNotes: number[]` (or Set) to `GameContext`. When a correct note is pressed, add it to `pressedMidiNotes`. Only advance (call `advanceGroup`) when ALL `midiNotes` in the current group have been pressed. Reset `pressedMidiNotes` on group advance.
  - **Update guards**: Split into two: `isCorrectNote` (is this midiNote in the current group?) and `isChordComplete` (have all midiNotes been pressed?). Transition logic: correct note + chord complete → advance. Correct note + chord incomplete → add to pressed set (stay in playing). Wrong note → no-op.
  - **Update advanceGroup action** (`gameMachine.ts:86-94`): Clear `pressedMidiNotes` when advancing to next group.
  - Write StateInvariant tests:
    - `GAME-FREQ-1`: Pressing a midiNote that IS in the group's midiNotes (but different cellId) counts as correct
    - `GAME-FREQ-2`: Pressing a midiNote NOT in the group's midiNotes does NOT advance
    - `GAME-CHORD-1`: Pressing only 1 of 2 notes in a chord does NOT advance to next group
    - `GAME-CHORD-2`: Pressing both notes in a chord (sequentially) advances to next group
    - `GAME-CHORD-3`: Pressing same correct note twice doesn't double-count

  **Must NOT do**:
  - Do NOT change the render/highlight pipeline (that's T3)
  - Do NOT change NOTE_PRESSED dispatch sites in main.ts (that's T3)
  - Do NOT add NOTE_RELEASED — sequential accumulate doesn't need it
  - Do NOT change midiToCoord, coordToMidiNote, or any mapping functions

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Core state machine logic change requiring careful guard/transition design

  **Parallelization**:
  - **Can Run In Parallel**: NO (critical path)
  - **Parallel Group**: Wave 2 (alone)
  - **Blocks**: T3, T4, T5, T6, T8, T9
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `src/machines/gameMachine.ts:108-110` — Current `isCorrectNote` guard (cellId-based — THE BUG)
  - `src/machines/gameMachine.ts:86-94` — `advanceGroup` action (must also clear pressedMidiNotes)
  - `src/machines/gameMachine.ts:140-160` — `playing` state transitions (must restructure for chord logic)
  - `src/machines/gameMachine.ts:38-48` — `GameContext` (must add `pressedMidiNotes`)

  **Test References**:
  - `tests/machines/invariant-checks.ts:~1985-2050` — Existing GAME-INT-3 and GAME-INT-4 invariants (follow this pattern for new tests)
  - The existing `gameMachineTransitions` invariant creates actors and sends events — follow this exact pattern

  **WHY Each Reference Matters**:
  - `gameMachine.ts:108-110`: THE BUG — `cellIds.includes(event.cellId)` must become `midiNotes.includes(event.midiNote)`
  - `gameMachine.ts:86-94`: Must clear `pressedMidiNotes` array when advancing
  - `gameMachine.ts:140-160`: Transition structure must split into "correct + complete → advance" vs "correct + incomplete → accumulate"
  - `gameMachine.ts:38-48`: Context must grow with `pressedMidiNotes: number[]`

  **Acceptance Criteria**:
  - [ ] `isCorrectNote` checks `midiNote`, not `cellId`
  - [ ] Chord with 2 notes requires both pressed before advancing
  - [ ] Pressing wrong midiNote is a no-op
  - [ ] GAME-FREQ-1, GAME-FREQ-2, GAME-CHORD-1, GAME-CHORD-2, GAME-CHORD-3 all pass
  - [ ] All 65 existing tests still pass

  **QA Scenarios**:

  ```
  Scenario: Frequency-based matching — enharmonic equivalent accepted
    Tool: Bash (node REPL or inline test)
    Preconditions: Game machine with updated isCorrectNote guard
    Steps:
      1. Create gameMachine actor
      2. Send FILE_DROPPED, then SONG_LOADED with noteGroups containing midiNotes [59] (B3) and cellIds ["3_-2"]
      3. Send NOTE_PRESSED with midiNote 59 but cellId "10_-3" (different position, same pitch)
      4. Assert: actor state advances (currentGroupIndex incremented or state is 'complete')
    Expected Result: Game accepts the note because midiNote matches, regardless of cellId
    Failure Indicators: State stays on same group (isCorrectNote returned false)
    Evidence: .sisyphus/evidence/task-2-freq-matching.txt

  Scenario: Chord requires all notes — single press doesn't advance
    Tool: Bash (inline test)
    Preconditions: Game machine with chord completion logic
    Steps:
      1. Create gameMachine actor
      2. Send SONG_LOADED with noteGroups: [{ cellIds: ["0_0","1_0"], midiNotes: [60, 64], startMs: 0 }, { cellIds: ["2_0"], midiNotes: [67], startMs: 500 }]
      3. Send NOTE_PRESSED with midiNote 60
      4. Assert: currentGroupIndex is still 0 (did NOT advance)
      5. Send NOTE_PRESSED with midiNote 64
      6. Assert: currentGroupIndex is now 1 (advanced after both pressed)
    Expected Result: First press accumulates, second press completes chord and advances
    Failure Indicators: Game advances after first press (old behavior)
    Evidence: .sisyphus/evidence/task-2-chord-completion.txt

  Scenario: Wrong note is no-op
    Tool: Bash (inline test)
    Preconditions: Game machine running
    Steps:
      1. Create actor, send SONG_LOADED with midiNotes [60]
      2. Send NOTE_PRESSED with midiNote 61 (wrong note)
      3. Assert: currentGroupIndex unchanged, state still 'playing'
    Expected Result: Wrong note ignored, no advancement
    Evidence: .sisyphus/evidence/task-2-wrong-note.txt
  ```

  **Commit**: YES
  - Message: `fix(game): frequency-based matching + sequential chord completion`
  - Files: `src/machines/gameMachine.ts`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [x] 3. Target Highlight Expansion + FILE_DROPPED from Playing + Controls Lock

  **What to do**:
  - **Expand target highlights**: In `src/main.ts` gameActor subscription (~line 1338), replace `this.visualizer?.setTargetNotes(ctx.targetCellIds)` with: get `midiNotes` from current group → call `this.visualizer.getCellIdsForMidiNotes(new Set(midiNotes))` → pass ALL returned cellIds to `setTargetNotes()`. This makes every cell on the grid that produces the target frequency glow white.
  - **Update NOTE_PRESSED dispatch sites** (3 locations in main.ts): Add `midiNote` to every `NOTE_PRESSED` event. Keyboard (~line 1529): compute midiNote from `coordToMidiNote(effectiveCoordX, effectiveCoordY)`. Pointer (~line 1650): same computation. MIDI (~line 538): midiNote is already available directly.
  - **Add FILE_DROPPED transition to `playing` state** in `gameMachine.ts:140-160`: `FILE_DROPPED: { target: 'loading', actions: 'resetGame' }` — allows loading a new song during play (needed for search results AND drag-drop during game)
  - **Lock controls during game**: Disable fifth slider, transpose offset, and octave offset changes while game state is `playing`. In gameActor subscription, when state === 'playing', add `disabled` attribute to `#tuning-slider`. On state !== 'playing', remove it. Prevents coordinate-to-pitch mapping from changing mid-game.
  - **Ghost note expansion**: Also expand ghost note to use midiNote from the current group's first note (already works via `coordToMidiNote`, but verify)
  - Write StateInvariant tests:
    - `GAME-HIGHLIGHT-1`: setTargetNotes is called with cell count > 1 when a single-note group is loaded (multiple grid positions for same frequency)
    - `GAME-LOCK-1`: Tuning slider is disabled when game state is 'playing'

  **Must NOT do**:
  - Do NOT modify `gameMachine.ts` matching logic (done in T2)
  - Do NOT change `getCellIdsForMidiNotes()` implementation
  - Do NOT change `midiToCoord()` or `coordToMidiNote()`
  - Do NOT disable sliders permanently — only during `playing` state

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Touches main.ts wiring in multiple places, requires understanding of the full render pipeline

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4, T5)
  - **Parallel Group**: Wave 3
  - **Blocks**: T6, T9, T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `src/main.ts:1338` — Current `setTargetNotes(ctx.targetCellIds)` call (must expand)
  - `src/main.ts:1529-1531` — Keyboard NOTE_PRESSED dispatch (add midiNote)
  - `src/main.ts:1650-1651` — Pointer NOTE_PRESSED dispatch (add midiNote)
  - `src/main.ts:538-540` — MIDI NOTE_PRESSED dispatch (midiNote already available)
  - `src/main.ts:1873` — `getCellIdsForMidiNotes()` already called for active notes — follow this pattern for target notes
  - `src/lib/keyboard-visualizer.ts:328-337` — `getCellIdsForMidiNotes()` implementation (scans all visible buttons)

  **Test References**:
  - `tests/machines/invariant-checks.ts` — Follow GAME-INT-* pattern for new invariants

  **WHY Each Reference Matters**:
  - `main.ts:1338`: THE line that must change — expand single cellId to all same-frequency cellIds
  - `main.ts:1529,1650,538`: Three dispatch sites that must add `midiNote` field
  - `main.ts:1873`: Proves `getCellIdsForMidiNotes` is already called in render pipeline — reuse pattern
  - `keyboard-visualizer.ts:328-337`: The helper function that does MIDI→all-cells expansion

  **Acceptance Criteria**:
  - [ ] All cells with same frequency as target glow (not just one cell)
  - [ ] NOTE_PRESSED events include midiNote from all 3 input sources
  - [ ] Dropping a file during active game resets and loads new song
  - [ ] Tuning slider disabled during playing state, re-enabled on idle/complete
  - [ ] All existing tests pass

  **QA Scenarios**:

  ```
  Scenario: Multiple cells highlight for single target note
    Tool: Playwright (playwright skill)
    Preconditions: App loaded, dev server running
    Steps:
      1. Navigate to http://localhost:3000
      2. Drop tests/fixtures/twinkle-type0.mid onto #keyboard-canvas
      3. Wait for game state 'playing'
      4. Screenshot #keyboard-canvas
      5. Count cells with target highlight color (oklch ~0.96 lightness)
      6. Assert: more than 1 cell is highlighted (same pitch at multiple positions)
    Expected Result: Multiple cells glow for a single MIDI note target
    Failure Indicators: Only 1 cell highlighted (old cellId-based behavior)
    Evidence: .sisyphus/evidence/task-3-multi-highlight.png

  Scenario: Tuning slider locked during game play
    Tool: Playwright
    Preconditions: Game loaded and playing
    Steps:
      1. Drop MIDI file, wait for 'playing' state
      2. Check #tuning-slider for 'disabled' attribute
      3. Assert: slider has disabled attribute
      4. Reset game (click #game-reset-btn)
      5. Check #tuning-slider again
      6. Assert: slider no longer has disabled attribute
    Expected Result: Slider locked during play, unlocked after
    Evidence: .sisyphus/evidence/task-3-slider-lock.txt
  ```

  **Commit**: YES
  - Message: `fix(game): expand target highlights to all same-freq cells + lock controls during play`
  - Files: `src/main.ts`, `src/machines/gameMachine.ts`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [x] 4. Calibration Visual Feedback on Grid

  **What to do**:
  - **Pass calibrated range to visualizer**: In `src/main.ts`, after loading `calibratedRange` from localStorage or after exiting calibration mode, call a new method `visualizer.setCalibratedRange(range: Set<string> | null)` on the `KeyboardVisualizer`
  - **Add `calibratedRange` field** to `KeyboardVisualizer` in `src/lib/keyboard-visualizer.ts`
  - **Add `setCalibratedRange()` method**: Stores the set of calibrated cell IDs
  - **Modify `drawCell()` rendering**: When `calibratedRange` is set AND a cell's ID is NOT in the calibrated set, render it with heavily dimmed/greyed appearance (e.g., `oklch(0.15, 0.01, h)` — very dark, nearly black, with a hint of the pitch color). Text also dimmed. This is a new lowest-priority state: uncalibrated < white/black < sustained < target < active.
  - **During calibration mode**: Set ALL cells to greyed state initially (pass empty Set). As each note is played, add it to the set and call `setCalibratedRange()` again so the cell "lights up" in real time.
  - **After calibration**: Call `setCalibratedRange(savedRange)` so unreachable cells stay grey permanently
  - **On calibration cancel**: Call `setCalibratedRange(previousRange)` to restore prior state (or null if never calibrated)
  - Write StateInvariant tests:
    - `GAME-CAL-3`: After calibration, `setCalibratedRange` is callable (API exists)
    - `GAME-CAL-4`: drawCell renders differently for uncalibrated cells (pixel color test)

  **Must NOT do**:
  - Do NOT change `midiToCoord()`, `coordToMidiNote()`, or any mapping functions
  - Do NOT change how calibration data is stored in localStorage
  - Do NOT block non-calibrated cells from being played — only visual, not functional
  - Do NOT add opacity/transparency — use dimmed OKLCH colors directly

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Canvas rendering changes, color system, visual state management

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T5)
  - **Parallel Group**: Wave 3
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `src/lib/keyboard-visualizer.ts:drawCell()` — Cell rendering with state priority (active > target > sustained > white/black) — add uncalibrated as lowest priority
  - `src/lib/keyboard-visualizer.ts:343-345` — `setTargetNotes()` pattern — follow for `setCalibratedRange()`
  - `src/lib/note-colors.ts` — OKLCH color system, `cellColors()` function — reference for dimmed color values
  - `src/main.ts:1885-1913` — `enterCalibrationMode()` / `exitCalibrationMode()` — must wire setCalibratedRange calls here
  - `src/main.ts:~432` — `calibratedRange` loaded from localStorage at startup — wire to visualizer here

  **Test References**:
  - `tests/machines/invariant-checks.ts` — GAME-CAL-1 and GAME-CAL-2 patterns (existing calibration tests)

  **WHY Each Reference Matters**:
  - `drawCell()`: Must add new lowest-priority rendering path for uncalibrated cells
  - `setTargetNotes()`: Follow this exact pattern for the new `setCalibratedRange()` API
  - `note-colors.ts`: Understand the OKLCH color system to create appropriate dimmed values
  - `enterCalibrationMode()`: Must pass empty Set initially so all cells grey out
  - `exitCalibrationMode()`: Must pass final calibrated Set so greying persists

  **Acceptance Criteria**:
  - [ ] During calibration: all cells start greyed, played cells un-grey in real time
  - [ ] After calibration confirm: unreachable cells stay grey permanently
  - [ ] After calibration cancel: grid returns to previous state
  - [ ] Greyed cells are still playable (visual only, not functional block)
  - [ ] On app reload with saved calibration: grey-out loads from localStorage
  - [ ] GAME-CAL-3, GAME-CAL-4 pass

  **QA Scenarios**:

  ```
  Scenario: Calibration grey-out — cells start grey, un-grey on play
    Tool: Playwright (playwright skill)
    Preconditions: App loaded, no prior calibration
    Steps:
      1. Navigate to http://localhost:3000
      2. Open overlay (click #grid-settings-btn)
      3. Click #calibrate-btn
      4. Screenshot #keyboard-canvas (should show all cells greyed)
      5. Press key 'f' (a note key)
      6. Screenshot #keyboard-canvas (pressed cell should be un-greyed)
      7. Assert: pixel color at pressed cell position differs from surrounding greyed cells
    Expected Result: All cells grey initially, pressed cell activates
    Failure Indicators: No visual difference between cells before/after key press
    Evidence: .sisyphus/evidence/task-4-calibration-grey.png

  Scenario: Grey-out persists after calibration
    Tool: Playwright
    Preconditions: Calibration completed with a few keys
    Steps:
      1. Complete calibration (press a few keys, click confirm)
      2. Close overlay
      3. Screenshot #keyboard-canvas
      4. Assert: some cells remain greyed (uncalibrated), others are normal
      5. Reload page
      6. Screenshot #keyboard-canvas again
      7. Assert: grey-out state restored from localStorage
    Expected Result: Greyed cells persist across sessions
    Evidence: .sisyphus/evidence/task-4-calibration-persist.png
  ```

  **Commit**: YES
  - Message: `feat(game): calibration visual feedback — grey out unreachable cells on grid`
  - Files: `src/lib/keyboard-visualizer.ts`, `src/main.ts`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [x] 5. Game UI Overhaul: Drop Zone, Instructions, Progress Bar, Timer

  **What to do**:
  - **Drop zone affordance on canvas**: When no game is active (idle state), render a subtle text overlay on the canvas: "Drop a MIDI file to play" in dim white (`rgba(255,255,255,0.15)`). This should be drawn by `KeyboardVisualizer` as part of `render()` — not a DOM element over the canvas. Add `setGameState(state: string)` method to visualizer so it knows when to show/hide the prompt.
  - **Instructions in overlay**: Add instructional text in the GAME section of `index.html` above the calibrate button: "Drop a .mid file onto the keyboard to play along. Match the highlighted notes to advance." Simple, one line, `var(--dim)` color.
  - **Progress bar**: Add a thin horizontal progress bar at the TOP of the keyboard canvas. Rendered by `KeyboardVisualizer` as part of `render()`. Width = `(currentGroupIndex / totalGroups) * canvasWidth`. Color: white with slight transparency. Height: 3-4px. Only visible when game state is `playing`.
  - **Elapsed timer**: Render elapsed time text in the top-right corner of the canvas during play. Format: `MM:SS` or just `SS.s` for short songs. Updated every animation frame from `Date.now() - startTimeMs`. Drawn by visualizer.
  - **Wire game state to visualizer**: In `main.ts` gameActor subscription, call `visualizer.setGameState(state)` and `visualizer.setGameProgress(currentIndex, totalGroups, elapsedMs)` on every state change.
  - Write StateInvariant tests:
    - `GAME-UI-2`: Instructions text exists in GAME section of overlay
    - `GAME-UI-3`: Progress bar visible during playing state (canvas pixel check at top edge)

  **Must NOT do**:
  - Do NOT use DOM overlays for progress bar or timer — render on canvas
  - Do NOT add scroll to the page
  - Do NOT use any font other than JetBrains Mono
  - Do NOT add border-radius to any element

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: Canvas rendering, UI layout, visual design decisions

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T3, T4)
  - **Parallel Group**: Wave 3
  - **Blocks**: T10
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `src/lib/keyboard-visualizer.ts:render()` — Canvas render pipeline (add progress bar + timer drawing here)
  - `src/lib/keyboard-visualizer.ts:343-345` — `setTargetNotes()` pattern (follow for `setGameState()`, `setGameProgress()`)
  - `index.html:889-904` — Current GAME section HTML (add instructions above calibrate button)
  - `src/main.ts:1330-1373` — gameActor subscription (wire new visualizer methods here)
  - `index.html:234-238` — Canvas drop zone CSS (`data-dropping`) — keep this, add idle state overlay

  **Test References**:
  - `tests/machines/invariant-checks.ts` — GAME-UI-1 pattern (existing game UI test)

  **WHY Each Reference Matters**:
  - `render()`: Progress bar and timer must be drawn in the main render loop
  - `setTargetNotes()`: Establishes the pattern for adding state to the visualizer
  - `index.html:889-904`: Where to add instructions text
  - `main.ts:1330-1373`: Where to wire game state/progress to visualizer

  **Acceptance Criteria**:
  - [ ] "Drop a .mid file" text visible on canvas when game is idle
  - [ ] Instructions text in overlay GAME section
  - [ ] Progress bar at top of canvas during play, advances as notes are hit
  - [ ] Timer shows elapsed time in top-right during play
  - [ ] All UI elements disappear when game is idle/complete
  - [ ] GAME-UI-2, GAME-UI-3 pass

  **QA Scenarios**:

  ```
  Scenario: Drop zone prompt visible on idle canvas
    Tool: Playwright (playwright skill)
    Preconditions: App loaded, no game active
    Steps:
      1. Navigate to http://localhost:3000
      2. Screenshot #keyboard-canvas
      3. Assert: canvas contains dim text "Drop a MIDI file" (OCR or pixel analysis at center)
    Expected Result: Subtle drop prompt visible on keyboard
    Failure Indicators: Canvas shows only keyboard with no text overlay
    Evidence: .sisyphus/evidence/task-5-drop-prompt.png

  Scenario: Progress bar advances during gameplay
    Tool: Playwright
    Preconditions: Game loaded with test MIDI file
    Steps:
      1. Drop tests/fixtures/twinkle-type0.mid
      2. Wait for 'playing' state
      3. Screenshot canvas top edge (first 10px height)
      4. Press correct note key
      5. Screenshot canvas top edge again
      6. Assert: white progress bar is wider in second screenshot
    Expected Result: Progress bar grows as notes are completed
    Evidence: .sisyphus/evidence/task-5-progress-bar.png

  Scenario: Timer shows elapsed time
    Tool: Playwright
    Preconditions: Game in playing state
    Steps:
      1. Drop MIDI file, wait for playing
      2. Wait 2 seconds
      3. Screenshot top-right corner of canvas
      4. Assert: text shows time ≥ "2" (seconds elapsed)
    Expected Result: Timer counting up during play
    Evidence: .sisyphus/evidence/task-5-timer.png
  ```

  **Commit**: YES
  - Message: `feat(game): drop zone prompt, progress bar, elapsed timer on canvas`
  - Files: `src/lib/keyboard-visualizer.ts`, `src/main.ts`, `index.html`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 6. Game Engine Function Tests

  **What to do**:
  - Write StateInvariant tests for ALL game engine functions in `src/lib/game-engine.ts`:
    - `GAME-ENG-1`: `buildNoteGroups` — groups notes within CHORD_THRESHOLD_MS (20ms). Input: events at 0ms, 10ms, 500ms → Output: 2 groups (first has 2 cellIds, second has 1)
    - `GAME-ENG-2`: `buildNoteGroups` — deduplicates cellIds within groups
    - `GAME-ENG-3`: `transposeSong` — shifts all midiNotes by N semitones, cellIds update accordingly
    - `GAME-ENG-4`: `cropToRange` — filters groups to only include cellIds in given range, removes empty groups
    - `GAME-ENG-5`: `findOptimalTransposition` — finds semitone offset maximizing notes within range
    - `GAME-ENG-6`: `computeMedianMidiNote` — returns median MIDI note, defaults to 62 (D) for empty input
    - `GAME-ENG-7`: `buildNoteGroups` — empty events array returns empty groups
  - Each test: import function, call with known input, assert output structure and values
  - Wire all into `[Structural]` block in `tests/xstate-graph.spec.ts`

  **Must NOT do**:
  - Do NOT modify any source code — test-only task
  - Do NOT create standalone `test()` calls — only StateInvariant objects

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Test writing requires understanding function contracts, no visual work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T7, T8, T9, T10)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3

  **References**:

  **Pattern References**:
  - `src/lib/game-engine.ts:44-68` — `buildNoteGroups()` (CHORD_THRESHOLD_MS=20, dedup logic)
  - `src/lib/game-engine.ts:71-74` — `transposeSong()` (maps groups, shifts midiNotes)
  - `src/lib/game-engine.ts:76-80` — `computeMedianMidiNote()` (sort, take middle, default 62)
  - `src/lib/game-engine.ts:82-97` — `cropToRange()` (filter cellIds by Set membership)
  - `src/lib/game-engine.ts:99-118` — `findOptimalTransposition()` (scan offsets -36..+36)

  **Test References**:
  - `tests/machines/invariant-checks.ts:~1970-1985` — GAME-INT-2 `gameBuildNoteGroupsIntegration` (follow this pattern exactly)

  **WHY Each Reference Matters**:
  - Each function reference IS the thing being tested — executor must read the implementation to write correct assertions

  **Acceptance Criteria**:
  - [ ] 7 new GAME-ENG-* invariants in invariant-checks.ts
  - [ ] All wired into Structural block
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-ENG"` — all pass

  **QA Scenarios**:

  ```
  Scenario: All game engine tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-ENG"
      2. Assert: 7 tests pass, 0 failures
    Expected Result: All GAME-ENG-* invariants green
    Evidence: .sisyphus/evidence/task-6-engine-tests.txt
  ```

  **Commit**: YES
  - Message: `test(game): game engine function coverage — transposeSong, cropToRange, findOptimal, computeMedian`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 7. MIDI Parser Edge Case Tests

  **What to do**:
  - Write StateInvariant tests for MIDI parser edge cases in `src/lib/midi-parser.ts`:
    - `GAME-MIDI-1`: Type 1 (multi-track) MIDI file parsed correctly — use `tests/fixtures/twinkle-type1.mid`
    - `GAME-MIDI-2`: Running status handled — consecutive NoteOn events without repeated status byte
    - `GAME-MIDI-3`: Velocity 0 treated as NoteOff — standard MIDI convention
    - `GAME-MIDI-4`: Channel 9 (drums) filtered out — no drum events in output
    - `GAME-MIDI-5`: Empty MIDI file (valid header, zero notes) → returns empty array
    - `GAME-MIDI-6`: Corrupt/invalid MIDI (bad header) → throws with descriptive error message
    - `GAME-MIDI-7`: MIDI with only drum channel → returns empty array after filtering
  - For fixture-based tests: read fixture files via `fs.readFileSync` in test setup
  - For edge case tests: construct minimal ArrayBuffers programmatically

  **Must NOT do**:
  - Do NOT modify the MIDI parser source code
  - Do NOT add new fixture files (use existing ones + programmatic buffers)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Binary format edge cases require careful test data construction

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T8, T9, T10)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `src/lib/midi-parser.ts:209-274` — `parseMidi()` function (entry point)
  - `src/lib/midi-parser.ts:218-220` — MThd header validation (corrupt file detection)
  - `src/lib/midi-parser.ts:258` — Channel 9 drum filter
  - `src/lib/midi-parser.ts:85-180` — `parseMidiTrack()` (running status at ~line 100-120)
  - `tests/fixtures/` — Existing MIDI fixtures: `twinkle-type0.mid`, `twinkle-type1.mid`, `scale-c-major.mid`, `chords-cmaj-fmaj.mid`

  **Test References**:
  - `tests/machines/invariant-checks.ts:~1955-1970` — GAME-INT-1 `gameMidiParserIntegration` (follow this pattern for fixture loading)

  **WHY Each Reference Matters**:
  - `parseMidi()`: THE function under test
  - `parseMidiTrack()`: Contains running status logic that needs dedicated test
  - Fixtures: Provide known-good MIDI data for baseline tests

  **Acceptance Criteria**:
  - [ ] 7 new GAME-MIDI-* invariants in invariant-checks.ts
  - [ ] All wired into Structural block
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-MIDI"` — all pass

  **QA Scenarios**:

  ```
  Scenario: All MIDI parser tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-MIDI"
      2. Assert: 7 tests pass, 0 failures
    Expected Result: All GAME-MIDI-* invariants green
    Evidence: .sisyphus/evidence/task-7-midi-tests.txt
  ```

  **Commit**: YES
  - Message: `test(game): MIDI parser edge cases — Type 1, running status, vel=0, drums, corrupt`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 8. Game Machine Comprehensive State Transition Tests

  **What to do**:
  - Write StateInvariant tests for ALL game machine state transitions and error paths:
    - `GAME-SM-1`: `idle` → FILE_DROPPED → `loading` (verify state transition)
    - `GAME-SM-2`: `loading` → SONG_LOADED → `playing` (verify targetCellIds set, startTimeMs set)
    - `GAME-SM-3`: `loading` → LOAD_FAILED → `error` (verify error message stored in context)
    - `GAME-SM-4`: `error` → GAME_RESET → `idle` (verify context cleared)
    - `GAME-SM-5`: `error` → FILE_DROPPED → `loading` (retry from error)
    - `GAME-SM-6`: `complete` → FILE_DROPPED → `loading` (new game from complete)
    - `GAME-SM-7`: `complete` → GAME_RESET → `idle`
    - `GAME-SM-8`: `playing` → FILE_DROPPED → `loading` (new song during play — added in T3)
    - `GAME-SM-9`: `playing` → GAME_RESET → `idle` (existing, verify pressedMidiNotes cleared)
    - `GAME-SM-10`: `playing` → wrong NOTE_PRESSED → stays in `playing` (no state change, no error)
    - `GAME-SM-11`: TUNING_WARN_ACK sets tuningWarnAcknowledged flag
  - Each test creates an actor, sends events, asserts resulting state and context

  **Must NOT do**:
  - Do NOT modify game machine source code
  - Do NOT test rendering — only state machine logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: State machine testing, comprehensive transition coverage

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T9, T10)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `src/machines/gameMachine.ts` — Complete state machine (all states, transitions, actions, guards)
  - `src/machines/gameMachine.ts:120-175` — State definitions with transitions

  **Test References**:
  - `tests/machines/invariant-checks.ts:~1985-2050` — GAME-INT-3 and GAME-INT-4 (follow actor creation + event sending pattern exactly)

  **WHY Each Reference Matters**:
  - The machine definition IS the spec — each transition must have a corresponding test
  - GAME-INT-3/INT-4 show the exact pattern: `createActor(gameMachine)`, `.start()`, `.send()`, `.getSnapshot()`

  **Acceptance Criteria**:
  - [ ] 11 new GAME-SM-* invariants
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-SM"` — all pass

  **QA Scenarios**:

  ```
  Scenario: All state machine tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-SM"
      2. Assert: 11 tests pass, 0 failures
    Expected Result: Full state machine transition coverage
    Evidence: .sisyphus/evidence/task-8-sm-tests.txt
  ```

  **Commit**: YES
  - Message: `test(game): comprehensive state machine transition coverage — all states, error paths, reset flows`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 9. Input Integration + Edge Case Tests

  **What to do**:
  - Write StateInvariant tests for input integration and edge cases:
    - `GAME-INPUT-1`: NOTE_PRESSED event includes midiNote field (verify event shape from keyboard dispatch)
    - `GAME-INPUT-2`: NOTE_PRESSED event includes midiNote field from MIDI input dispatch
    - `GAME-INPUT-3`: NOTE_PRESSED event includes midiNote field from pointer dispatch
    - `GAME-EDGE-1`: Drop non-MIDI file (e.g., .txt) → file is rejected, no LOAD_FAILED, game stays idle
    - `GAME-EDGE-2`: MIDI with only drum channel → LOAD_FAILED with "No playable notes" message
    - `GAME-EDGE-3`: Drop file during calibration mode → calibration takes priority, file ignored
    - `GAME-EDGE-4`: Pressing same correct note twice in chord accumulation → only counts once (no double-count)
    - `GAME-EDGE-5`: Empty noteGroups after cropToRange → LOAD_FAILED
  - For input tests: verify DOM event handlers include midiNote in dispatched events
  - For edge case tests: construct scenarios that trigger error paths

  **Must NOT do**:
  - Do NOT modify source code
  - Do NOT test visual rendering (that's F3)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Integration testing across input sources + edge case coverage

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T6, T7, T8, T10)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: T3

  **References**:

  **Pattern References**:
  - `src/main.ts:1529-1531` — Keyboard NOTE_PRESSED dispatch
  - `src/main.ts:1650-1651` — Pointer NOTE_PRESSED dispatch
  - `src/main.ts:538-540` — MIDI NOTE_PRESSED dispatch
  - `src/main.ts:1389-1406` — File drop handler with .mid/.midi validation

  **Acceptance Criteria**:
  - [ ] 8 new GAME-INPUT-* and GAME-EDGE-* invariants
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-INPUT\|GAME-EDGE"` — all pass

  **QA Scenarios**:

  ```
  Scenario: All input + edge case tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"
      2. Assert: all tests pass including new GAME-INPUT and GAME-EDGE invariants
    Expected Result: Full input and edge case coverage
    Evidence: .sisyphus/evidence/task-9-input-edge-tests.txt
  ```

  **Commit**: YES
  - Message: `test(game): input integration + edge case coverage`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 10. Update Golden Screenshots

  **What to do**:
  - After all visual changes (T3 target highlights, T4 calibration grey-out, T5 progress bar/timer), golden screenshot baselines will be stale
  - Run the golden screenshot tests to identify which ones fail:
    - GOLDEN-OVERLAY, GOLDEN-FULL-PAGE, GOLDEN-KEYBOARD, GOLDEN-TET-NOTCH
  - Update baselines: `nix develop --command npx playwright test --project=firefox --workers=1 --update-snapshots`
  - Verify updated screenshots look correct (screenshot the screenshots)
  - Commit new baselines

  **Must NOT do**:
  - Do NOT change any source code
  - Do NOT modify test logic — only update snapshot baselines
  - Do NOT update snapshots if tests pass without updates (means no visual change)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]
  - Reason: Simple snapshot update, but needs playwright to verify

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all visual changes)
  - **Parallel Group**: Wave 4 (after T3, T4, T5 confirmed)
  - **Blocks**: F1-F4
  - **Blocked By**: T4, T5

  **References**:

  **Pattern References**:
  - `tests/xstate-graph.spec.ts` — Golden screenshot assertions (search for `toHaveScreenshot` or `toMatchSnapshot`)
  - `tests/xstate-graph.spec.ts-snapshots/` — Current golden baseline files

  **Acceptance Criteria**:
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1` — ALL tests pass including golden screenshots
  - [ ] Updated baselines committed

  **QA Scenarios**:

  ```
  Scenario: All tests pass with updated baselines
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1
      2. Assert: 0 failures (including golden screenshots)
    Expected Result: Clean test run with updated baselines
    Evidence: .sisyphus/evidence/task-10-golden-update.txt
  ```

  **Commit**: YES
  - Message: `test: update golden screenshots after game UI visual changes`
  - Files: `tests/xstate-graph.spec.ts-snapshots/*`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 11. MIDI Search: Adapter Interface + GitHub Adapter

  **What to do**:
  - Create `src/lib/midi-search.ts` with:
    - `MidiSearchResult` type: `{ title: string; source: string; sourceId: string; fetchUrl: string }`
    - `MidiSearchAdapter` interface: `{ id: string; name: string; search(query: string): Promise<MidiSearchResult[]>; fetch(result: MidiSearchResult): Promise<ArrayBuffer> }`
    - `GitHubMidiAdapter` class implementing the interface for `thewildwestmidis/midis` repo
    - `MutopiaMidiAdapter` class for `MutopiaProject/MutopiaProject` repo
  - **GitHub adapter implementation**:
    - On first search, fetch file tree: `GET https://api.github.com/repos/thewildwestmidis/midis/git/trees/main?recursive=1` → cache in memory (module-level variable, not localStorage)
    - Client-side fuzzy search on filenames (substring match, case-insensitive — NO npm dependency for fuzzy search)
    - Fetch .mid file: `GET https://raw.githubusercontent.com/thewildwestmidis/midis/main/${encodeURIComponent(filename)}`
    - Rate limit awareness: cache tree response, only re-fetch if cache is empty
  - **Mutopia adapter**: Same pattern but for MutopiaProject repo. Files are in nested directories, so tree traversal filters for `*.mid` files.
  - Export a `searchAllAdapters(query: string): Promise<MidiSearchResult[]>` that queries all adapters in parallel and merges results with source badges
  - **Literate approach**: Each adapter function should have a JSDoc comment explaining the data source, URL patterns, CORS status, and limitations

  **Must NOT do**:
  - No npm dependencies (no fuse.js, no lunr.js — vanilla substring search)
  - No localStorage/IndexedDB caching — memory only
  - No GitHub API authentication/tokens
  - No abstract plugin system — concrete adapter classes
  - No error swallowing — failed adapters return empty array, log to console.warn

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: API integration, async patterns, no UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T12)
  - **Parallel Group**: Wave 5
  - **Blocks**: T13, T15
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `index.html:933-937` — Existing fetch pattern (GitHub star count fetch) — follow `.then(r => r.json())`, `.catch(() => {})`
  - `src/lib/midi-parser.ts` — parseMidi accepts ArrayBuffer — the adapter's fetch() must return ArrayBuffer
  - `src/lib/game-engine.ts` — buildNoteGroups accepts NoteEvent[] — the pipeline is: adapter.fetch() → parseMidi() → buildNoteGroups()

  **External References**:
  - GitHub Trees API: `https://docs.github.com/en/rest/git/trees#get-a-tree` — returns `{ tree: [{ path, type, sha }] }` with `?recursive=1`
  - raw.githubusercontent.com serves files with `Access-Control-Allow-Origin: *` — no proxy needed
  - `thewildwestmidis/midis` — ~1,700 .mid files in flat directory
  - `MutopiaProject/MutopiaProject` — ~2,124 pieces in nested `ftp/Composer/Catalog/` structure

  **WHY Each Reference Matters**:
  - `index.html:933-937`: Shows the fetch pattern already used in this codebase
  - `midi-parser.ts`: The adapter's output (ArrayBuffer) must be compatible with parseMidi input
  - GitHub Trees API: Returns the full file listing in one request — this IS the search index

  **Acceptance Criteria**:
  - [ ] `src/lib/midi-search.ts` exports MidiSearchAdapter interface, GitHubMidiAdapter, MutopiaMidiAdapter, searchAllAdapters
  - [ ] `searchAllAdapters("twinkle")` returns results with title, source, fetchUrl
  - [ ] `adapter.fetch(result)` returns valid ArrayBuffer that parseMidi can parse
  - [ ] Results include source identifier (e.g., "github:thewildwestmidis" or "github:mutopia")
  - [ ] Build passes with no type errors

  **QA Scenarios**:

  ```
  Scenario: Search returns results from GitHub
    Tool: Bash (node REPL)
    Preconditions: Network available, GitHub API accessible
    Steps:
      1. Import searchAllAdapters from midi-search.ts
      2. Call searchAllAdapters("bach")
      3. Assert: result array length > 0
      4. Assert: each result has title, source, fetchUrl fields
      5. Fetch first result's fetchUrl
      6. Assert: response is valid ArrayBuffer (starts with MThd header bytes 4D 54 68 64)
    Expected Result: Search finds Bach MIDI files, fetch returns valid MIDI data
    Failure Indicators: Empty results, 404 on fetch, invalid ArrayBuffer
    Evidence: .sisyphus/evidence/task-11-search-results.txt

  Scenario: Failed adapter doesn't crash search
    Tool: Bash (node REPL)
    Preconditions: One adapter returns error (e.g., network timeout mock)
    Steps:
      1. Call searchAllAdapters with a query
      2. Assert: function doesn't throw, returns results from working adapter(s)
    Expected Result: Graceful degradation — failed source omitted, others still work
    Evidence: .sisyphus/evidence/task-11-adapter-error.txt
  ```

  **Commit**: YES
  - Message: `feat(search): adapter interface + GitHub adapters (thewildwestmidis + mutopia)`
  - Files: `src/lib/midi-search.ts`
  - Pre-commit: `nix develop --command npm run build`

- [ ] 12. MIDI Search: midishare.dev Adapter

  **What to do**:
  - Add `MidishareMidiAdapter` class to `src/lib/midi-search.ts` implementing `MidiSearchAdapter`
  - **Implementation**:
    - `search(query)`: `GET https://midishare.dev/api/midis` → client-side filter on title/name
    - `fetch(result)`: `GET https://midishare.dev/api/midi?id=${result.sourceId}` → ArrayBuffer
    - Cache the midis list in memory (same pattern as GitHub tree cache)
  - Source identifier: `"midishare"`
  - Handle API instability: if midishare returns non-200, return empty results with console.warn — never throw
  - Register adapter in `searchAllAdapters` alongside GitHub adapters
  - **Literate comment**: Document that midishare.dev was created by sightread team after MuseScore shut down their API, redistributes public domain content, API marked "unstable"

  **Must NOT do**:
  - No retry logic or backoff — simple fire-and-forget
  - No caching beyond in-memory module variable
  - This adapter is best-effort secondary — GitHub is primary

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Simple HTTP adapter following established pattern from T11

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T11)
  - **Parallel Group**: Wave 5
  - **Blocks**: T13, T15
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/midi-search.ts` — MidiSearchAdapter interface (created in T11)
  - T11's GitHubMidiAdapter — follow same cache + search + fetch pattern

  **External References**:
  - `midishare.dev/api/midis` — list endpoint (may return JSON array of MIDI metadata)
  - `midishare.dev/api/midi?id=<id>` — single MIDI download endpoint
  - API marked "unstable" — handle errors gracefully

  **Acceptance Criteria**:
  - [ ] MidishareMidiAdapter exported from midi-search.ts
  - [ ] Registered in searchAllAdapters
  - [ ] Returns results with source: "midishare"
  - [ ] Graceful failure if API is down

  **QA Scenarios**:

  ```
  Scenario: Midishare adapter handles API being down
    Tool: Bash
    Steps:
      1. Call MidishareMidiAdapter.search("test") with network error (or if API is actually down)
      2. Assert: returns empty array, does not throw
      3. Assert: console.warn was called with descriptive message
    Expected Result: Graceful degradation
    Evidence: .sisyphus/evidence/task-12-midishare.txt
  ```

  **Commit**: YES (groups with T11 if both ready)
  - Message: `feat(search): midishare.dev adapter`
  - Files: `src/lib/midi-search.ts`
  - Pre-commit: `nix develop --command npm run build`

- [ ] 13. Search UI + Integration Wiring

  **What to do**:
  - **Search UI in overlay**: Add to the GAME section in `index.html`:
    - Search input: `<input id="midi-search-input" type="text" placeholder="Search songs...">` — styled with black bg, white text, no border-radius, JetBrains Mono
    - Results container: `<div id="midi-search-results"></div>` — scrollable within overlay (NOT page scroll), max-height bounded
    - Each result: `<div class="search-result" data-fetch-url="..."><span class="result-title">Song Name</span><span class="result-source">github</span></div>` — source as small dim badge
    - Loading indicator: simple "Searching..." text
    - Error state: "No results" or "Search failed"
  - **Wiring in main.ts**:
    - `#midi-search-input` input event → debounce 300ms → `searchAllAdapters(query)` → render results into `#midi-search-results`
    - Click on search result → `adapter.fetch(result)` → `parseMidi(buffer)` → `buildNoteGroups(events)` → `gameActor.send({ type: 'SONG_LOADED', noteGroups })` — EXACT same pipeline as file drop
    - Show song title from search result in `#game-song-title`
    - Handle loading state: disable search input during fetch, show "Loading..."
  - **DRY pipeline**: Extract the "buffer → parse → build → load" pipeline into a shared function used by BOTH file drop handler AND search result click. No duplicated logic.
  - Write StateInvariant test:
    - `GAME-SEARCH-1`: #midi-search-input exists in DOM, inside #grid-overlay

  **Must NOT do**:
  - No page-level scroll — results scroll within their container only
  - No complex search UI (no filters, no pagination, no sorting)
  - No MIDI preview/playback before loading
  - Debounce is plain setTimeout — no npm dependency

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: DOM layout, styling, event wiring, UX

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14)
  - **Parallel Group**: Wave 6
  - **Blocks**: T15
  - **Blocked By**: T11, T12

  **References**:

  **Pattern References**:
  - `index.html:889-904` — GAME section structure (add search UI here)
  - `src/main.ts:1375-1466` — File drop handler pipeline (extract shared function from this)
  - `src/main.ts:1415-1464` — The exact `arrayBuffer → parseMidi → buildNoteGroups → SONG_LOADED` pipeline to DRY up
  - `index.html:234-238` — Existing CSS styling patterns (black bg, white text)

  **WHY Each Reference Matters**:
  - `index.html:889-904`: Where to add the search input and results container
  - `main.ts:1375-1466`: The pipeline that MUST be shared between drop and search — extract into a function like `loadMidiFromBuffer(buffer, songTitle)`

  **Acceptance Criteria**:
  - [ ] Search input visible in GAME section of overlay
  - [ ] Typing "bach" shows results from GitHub adapters
  - [ ] Clicking a result loads the game (same as file drop)
  - [ ] Pipeline is DRY — one shared function for buffer→game
  - [ ] No page scroll added
  - [ ] GAME-SEARCH-1 passes

  **QA Scenarios**:

  ```
  Scenario: Search and play a song
    Tool: Playwright (playwright skill)
    Preconditions: App loaded, dev server running
    Steps:
      1. Navigate to http://localhost:3000
      2. Click #grid-settings-btn to open overlay
      3. Type "twinkle" into #midi-search-input
      4. Wait 500ms for debounce + results
      5. Assert: #midi-search-results contains at least 1 child element
      6. Click first .search-result element
      7. Wait for game state to become 'playing'
      8. Assert: #game-song-title contains search result text
      9. Assert: keyboard canvas shows target note highlights
    Expected Result: Full search → load → play flow works
    Failure Indicators: No results, click doesn't load, game doesn't start
    Evidence: .sisyphus/evidence/task-13-search-play.png

  Scenario: DRY pipeline — search uses same path as drop
    Tool: Bash (grep)
    Steps:
      1. Search main.ts for calls to parseMidi
      2. Assert: parseMidi is called from ONE shared function (not duplicated in drop handler AND search handler)
    Expected Result: Single loadMidiFromBuffer function used by both paths
    Evidence: .sisyphus/evidence/task-13-dry-check.txt
  ```

  **Commit**: YES
  - Message: `feat(search): search UI in overlay + integration with game pipeline`
  - Files: `index.html`, `src/main.ts`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 14. Tempo/Time-Signature Extraction + Quantize Function

  **What to do**:
  - **Extend parseMidi output**: Currently returns `NoteEvent[]`. Change to return `{ events: NoteEvent[], tempoMap: TempoEvent[], timeSigMap: TimeSigEvent[] }` where:
    - `TempoEvent = { tickPosition: number; microsecondsPerQuarter: number; bpm: number }`
    - `TimeSigEvent = { tickPosition: number; numerator: number; denominatorPower: number; ticksPerQuarter: number }`
    - The parser already reads Set Tempo (FF 51) events internally for tick→ms conversion — expose them in output
    - Time Signature (FF 58): read 4 bytes — numerator, denominator power (2^n), MIDI clocks per metronome, 32nd notes per quarter. May not exist in all files — default to 4/4.
  - **Create `quantizeNotes()` function** in `src/lib/game-engine.ts`:
    - Signature: `quantizeNotes(events: NoteEvent[], tempoMap: TempoEvent[], timeSigMap: TimeSigEvent[], level: QuantizationLevel): NoteEvent[]`
    - `QuantizationLevel = '1/4' | '1/8' | '1/16' | 'none'`
    - **Algorithm**:
      1. Build a beat grid from tempo + time sig: for each point in time, compute the grid positions at the given quantization level. E.g., at 120 BPM with 1/8 grid: grid points at 0ms, 250ms, 500ms, 750ms, 1000ms...
      2. For each note event, snap `startMs` to the nearest grid point
      3. **Long note splitting**: If a note's duration spans multiple grid points, split into repeated NoteEvents at each grid point (same midiNote, same velocity). E.g., a half note (1000ms) at 1/8 grid = 4 events at 0, 250, 500, 750.
      4. Deduplicate: if two notes snap to the same grid point AND same midiNote, keep only one
      5. Sort output by snapped startMs
    - **Handle tempo changes**: The grid is non-uniform — grid point spacing changes with tempo. Use the tempo map to compute absolute ms for each grid point.
    - **Handle time sig changes**: Grid point count per measure changes. A 3/4 bar at 1/4 grid = 3 points. A 7/8 bar at 1/8 grid = 7 points.
    - `level: 'none'` returns events unchanged (bypass quantization)
  - **Literate design comments**: Add block comments explaining:
    - Why quantization exists (Piano Tiles principle: constant pace = original tempo)
    - How each level maps to difficulty (beginner/intermediate/advanced)
    - How long notes become repeated taps
    - How odd meters are handled (grid adapts to time sig, not the other way)
    - How dotted notes/syncopation simplify in coarse grids
  - **Update all callers**: In `main.ts` file drop handler and search result handler, insert `quantizeNotes()` between `parseMidi()` and `buildNoteGroups()`. Pass the quantization level from the UI (default: 'none' for backward compat).

  **Must NOT do**:
  - Do NOT change the core MIDI parsing logic — only EXPOSE tempo/timesig data that's already parsed internally
  - Do NOT break the `parseMidi` return type for existing callers without updating them. Consider: return a `ParsedMidi` object with `events`, `tempoMap`, `timeSigMap` properties. Update all callers.
  - Do NOT implement real-time playback or timing — this is still press-to-advance
  - Do NOT add time signature display UI (that's T16)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
  - Reason: Music theory + MIDI binary format + algorithm design — needs deep understanding

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T13, T15)
  - **Parallel Group**: Wave 6
  - **Blocks**: T16, T17
  - **Blocked By**: T2 (needs updated NoteGroup/NoteEvent types)

  **References**:

  **Pattern References**:
  - `src/lib/midi-parser.ts:236-252` — Existing tempo map collection (internal) — expose this
  - `src/lib/midi-parser.ts:85-180` — `parseMidiTrack()` where meta-events are read (FF 51 = Set Tempo, FF 58 = Time Sig)
  - `src/lib/midi-parser.ts:209-274` — `parseMidi()` return value (currently NoteEvent[], must become ParsedMidi)
  - `src/lib/game-engine.ts:44-68` — `buildNoteGroups()` (quantizeNotes output feeds into this)
  - `src/main.ts:1415-1464` — File drop pipeline (insert quantizeNotes between parseMidi and buildNoteGroups)

  **External References**:
  - MIDI spec Set Tempo: FF 51 03 tt tt tt (3 bytes, microseconds per quarter note)
  - MIDI spec Time Signature: FF 58 04 nn dd cc bb (numerator, denominator power, clocks, 32nds)
  - Standard BPM formula: `60,000,000 / microsecondsPerQuarter`

  **WHY Each Reference Matters**:
  - `midi-parser.ts:236-252`: The tempo map IS already built internally — just needs to be returned
  - `parseMidiTrack()`: Time Signature events may need a new case in the meta-event switch
  - `buildNoteGroups()`: Must accept quantized events seamlessly — no interface change needed

  **Acceptance Criteria**:
  - [ ] `parseMidi()` returns `{ events, tempoMap, timeSigMap }` — existing callers updated
  - [ ] `quantizeNotes(events, tempoMap, timeSigMap, '1/4')` snaps notes to quarter grid
  - [ ] Long notes (duration > grid spacing) produce multiple events
  - [ ] `level: 'none'` returns events unchanged
  - [ ] Time signature changes mid-file adjust grid spacing correctly
  - [ ] Build passes, all existing tests pass

  **QA Scenarios**:

  ```
  Scenario: Quarter-note quantization reduces note count
    Tool: Bash (node REPL)
    Preconditions: parseMidi and quantizeNotes available
    Steps:
      1. Parse tests/fixtures/scale-c-major.mid → get events + tempoMap + timeSigMap
      2. Count events: originalCount
      3. Quantize at '1/4': quantizeNotes(events, tempoMap, timeSigMap, '1/4')
      4. Count quantized events: quantizedCount
      5. Assert: quantizedCount <= originalCount (some notes merged/removed)
      6. Assert: all quantized startMs values align to quarter-note grid points
    Expected Result: Notes snapped to quarter grid, count reduced or equal
    Failure Indicators: Notes not on grid points, count increased
    Evidence: .sisyphus/evidence/task-14-quantize.txt

  Scenario: Long note splits into repeated taps
    Tool: Bash (node REPL)
    Steps:
      1. Create a NoteEvent with startMs=0, durationMs=2000 (2 seconds = a whole note at 120 BPM)
      2. Create tempoMap with 120 BPM
      3. Quantize at '1/8' (grid spacing = 250ms)
      4. Assert: produces 8 events (2000/250) all with same midiNote
      5. Assert: events at 0, 250, 500, 750, 1000, 1250, 1500, 1750
    Expected Result: Whole note becomes 8 taps at 1/8 grid
    Evidence: .sisyphus/evidence/task-14-long-note-split.txt

  Scenario: 'none' level is passthrough
    Tool: Bash
    Steps:
      1. Quantize events with level='none'
      2. Assert: output === input (same events, unchanged)
    Expected Result: No modification when quantization disabled
    Evidence: .sisyphus/evidence/task-14-none-passthrough.txt
  ```

  **Commit**: YES
  - Message: `feat(game): tempo/timesig extraction + note quantization with difficulty levels`
  - Files: `src/lib/midi-parser.ts`, `src/lib/game-engine.ts`, `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 15. Search Feature Tests

  **What to do**:
  - Write StateInvariant tests for the MIDI search feature:
    - `GAME-SEARCH-2`: searchAllAdapters returns array (may be empty if offline, never throws)
    - `GAME-SEARCH-3`: GitHubMidiAdapter.search returns results with required fields (title, source, fetchUrl)
    - `GAME-SEARCH-4`: Search result click triggers SONG_LOADED event (pipeline integration)
    - `GAME-SEARCH-5`: DRY pipeline verification — parseMidi called from shared function, not duplicated
    - `GAME-SEARCH-6`: Search input debounce — rapid typing doesn't fire multiple API calls
  - **Literate test comments**: Each test should have a block comment explaining:
    - What user behavior this test verifies
    - Why it matters (what bug would it catch)
    - Connection to the adapter pattern design

  **Must NOT do**:
  - Do NOT modify source code
  - Do NOT test midishare.dev API availability (it's unstable — test adapter error handling instead)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T14)
  - **Parallel Group**: Wave 6
  - **Blocks**: F1-F4
  - **Blocked By**: T13

  **References**:
  - `src/lib/midi-search.ts` — Adapter interface and implementations (T11-T12)
  - `src/main.ts` — Search wiring (T13)
  - `tests/machines/invariant-checks.ts` — Follow existing GAME-* pattern

  **Acceptance Criteria**:
  - [ ] 5 new GAME-SEARCH-* invariants
  - [ ] All pass: `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-SEARCH"`

  **QA Scenarios**:
  ```
  Scenario: All search tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-SEARCH"
      2. Assert: 5+ tests pass
    Expected Result: Full search feature coverage
    Evidence: .sisyphus/evidence/task-15-search-tests.txt
  ```

  **Commit**: YES
  - Message: `test(search): search adapter + UI integration tests`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 16. Quantization Difficulty UI + Wiring

  **What to do**:
  - **Add quantization selector to GAME section** in `index.html`:
    - Label: "DIFFICULTY" (`.overlay-section-title` style, greyish)
    - 4 radio buttons or a `<select>`: "None (raw)", "Beginner (1/4)", "Intermediate (1/8)", "Advanced (1/16)"
    - Default: "None (raw)" — backward compatible
    - Styled: black bg, white text, JetBrains Mono, no border-radius
    - Element ID: `#quantization-level`
  - **Wire to game pipeline in main.ts**:
    - Read `#quantization-level` value when loading a song (drop or search)
    - Pass to `quantizeNotes()` in the shared `loadMidiFromBuffer()` function
    - Changing the selector while a game is active should NOT retroactively change the game — only affects next load
  - **Update game status display**: Show current quantization level somewhere visible during play (e.g., "1/4" badge near progress bar)
  - **Literate UI comment**: In HTML, add a comment block explaining the quantization concept and how levels map to difficulty

  **Must NOT do**:
  - Do NOT add real-time re-quantization (changing level during play)
  - Do NOT add custom quantization values (only the 4 presets)
  - Do NOT add visual beat grid on the keyboard (future feature)
  - Do NOT use `<select>` with custom dropdown styling — keep it native and simple

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []
  - Reason: UI layout, form element wiring, styling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 7
  - **Blocks**: T17
  - **Blocked By**: T14

  **References**:

  **Pattern References**:
  - `index.html:889-904` — GAME section HTML (add DIFFICULTY control here)
  - `index.html:845-860` — KEYBOARD LAYOUT select pattern (follow for quantization selector)
  - `src/main.ts` — `loadMidiFromBuffer()` shared function (created in T13) — read quantization level here

  **Acceptance Criteria**:
  - [ ] DIFFICULTY selector visible in GAME section of overlay
  - [ ] Default is "None (raw)"
  - [ ] Changing to "Beginner (1/4)" and loading a song produces fewer note groups than "None"
  - [ ] Level badge visible during play
  - [ ] Build passes, all tests pass

  **QA Scenarios**:

  ```
  Scenario: Quantization affects game complexity
    Tool: Playwright (playwright skill)
    Preconditions: App loaded
    Steps:
      1. Open overlay, set #quantization-level to "None"
      2. Drop tests/fixtures/scale-c-major.mid
      3. Note the total group count from #game-progress (e.g., "1 / 8")
      4. Reset game
      5. Set #quantization-level to "Beginner (1/4)"
      6. Drop same file again
      7. Note new total group count
      8. Assert: beginner count <= none count (quantization reduces or equals)
    Expected Result: Coarser quantization = fewer groups = easier game
    Evidence: .sisyphus/evidence/task-16-difficulty.png

  Scenario: Difficulty selector defaults to None
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3000
      2. Open overlay
      3. Assert: #quantization-level value is "none"
    Expected Result: Backward compatible default
    Evidence: .sisyphus/evidence/task-16-default.txt
  ```

  **Commit**: YES
  - Message: `feat(game): quantization difficulty selector UI + pipeline wiring`
  - Files: `index.html`, `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 17. Quantization Tests

  **What to do**:
  - Write comprehensive StateInvariant tests for quantization:
    - `GAME-QUANT-1`: `quantizeNotes` with `'none'` returns events unchanged
    - `GAME-QUANT-2`: `quantizeNotes` with `'1/4'` snaps events to quarter-note grid
    - `GAME-QUANT-3`: Long note (duration > grid spacing) splits into repeated events
    - `GAME-QUANT-4`: Tempo change mid-song adjusts grid spacing (faster tempo = tighter grid)
    - `GAME-QUANT-5`: Time signature change (4/4 → 3/4) adjusts grid points per measure
    - `GAME-QUANT-6`: Two notes snapping to same grid point + same midiNote are deduplicated
    - `GAME-QUANT-7`: `parseMidi` returns tempoMap and timeSigMap (not just events)
    - `GAME-QUANT-8`: Default time signature is 4/4 when no FF 58 event in MIDI file
    - `GAME-QUANT-9`: Odd meter (7/8) produces correct number of grid points per measure
  - **Literate test comments**: Each test MUST have a block comment explaining:
    - The musical scenario being tested (e.g., "A dotted quarter note at 1/4 grid snaps to beat 1, losing the dot — this is intentional beginner simplification")
    - Why this behavior matters for the game
    - What user-visible bug would occur if this test failed

  **Must NOT do**:
  - Do NOT modify source code
  - Do NOT test UI (that's F3)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T14 + T16)
  - **Parallel Group**: Wave 7
  - **Blocks**: F1-F4
  - **Blocked By**: T14, T16

  **References**:
  - `src/lib/game-engine.ts` — quantizeNotes function (T14)
  - `src/lib/midi-parser.ts` — ParsedMidi return type (T14)
  - MIDI tempo formula: `60,000,000 / microsecondsPerQuarter = BPM`
  - Grid spacing: `(60000 / BPM) / divisor` where divisor = 1 for 1/4, 2 for 1/8, 4 for 1/16

  **Acceptance Criteria**:
  - [ ] 9 new GAME-QUANT-* invariants
  - [ ] All pass: `nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-QUANT"`
  - [ ] Every test has a literate block comment explaining the musical scenario

  **QA Scenarios**:
  ```
  Scenario: All quantization tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-QUANT"
      2. Assert: 9 tests pass
    Expected Result: Full quantization logic coverage
    Evidence: .sisyphus/evidence/task-17-quant-tests.txt
  ```

  **Commit**: YES
  - Message: `test(game): quantization coverage — grid snapping, long notes, tempo changes, odd meters`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `nix develop --command npm run build` + `nix develop --command npx playwright test --project=firefox --workers=1`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, `!` non-null assertions, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic variable names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Test: (1) Drop MIDI file → game starts with ALL same-freq cells highlighted, (2) Press wrong enharmonic → still advances, (3) Chord requires all notes, (4) Calibrate → grid greys out unreachable, (5) Search songs → click result → game loads, (6) Progress bar + timer visible during play. Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Task | Message | Key Files |
|------|---------|-----------|
| T1 | `refactor(game): add midiNotes to base NoteGroup interface` | gameMachine.ts, game-engine.ts, invariant-checks.ts |
| T2 | `fix(game): frequency-based matching + chord completion` | gameMachine.ts |
| T3 | `fix(game): expand target highlights + FILE_DROPPED from playing` | main.ts |
| T4 | `feat(game): calibration visual feedback on grid` | keyboard-visualizer.ts, main.ts |
| T5 | `feat(game): drop zone, instructions, progress bar, timer` | index.html, main.ts |
| T6-T9 | `test(game): [area] coverage` | invariant-checks.ts, xstate-graph.spec.ts |
| T10 | `test: update golden screenshots` | tests/ |
| T11 | `feat(search): adapter interface + GitHub adapter` | midi-search.ts |
| T12 | `feat(search): midishare.dev adapter` | midi-search.ts |
| T13 | `feat(search): search UI + integration` | index.html, main.ts |
| T14 | `feat(game): tempo/timesig extraction + quantize function` | midi-parser.ts, game-engine.ts |
| T15 | `test(search): search feature tests` | invariant-checks.ts |
| T16 | `feat(game): quantization difficulty UI + wiring` | index.html, main.ts |
| T17 | `test(game): quantization tests` | invariant-checks.ts |

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npm run build          # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: ALL pass (65 existing + ~55 new ≈ 120+)
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-"  # Expected: ALL game tests pass
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-QUANT"  # Expected: ALL quantization tests pass
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-SEARCH"  # Expected: ALL search tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass (65 existing + ~55 new ≈ 120+)
- [ ] Pressing enharmonic equivalent counts as correct note
- [ ] Chord requires all notes pressed before advancing
- [ ] Calibrated range visually grey on grid
- [ ] Drop zone visible on canvas
- [ ] Progress bar + timer visible during play
- [ ] Quantization selector in overlay, "Beginner 1/4" produces fewer groups
- [ ] parseMidi returns tempoMap + timeSigMap
- [ ] Search returns results, clicking loads game
- [ ] Drag-and-drop still works as parallel entry point
- [ ] Every test has literate comments explaining design intent
