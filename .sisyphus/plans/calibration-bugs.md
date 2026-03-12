# Game Mode Polish: Calibration Bugs + UX Fixes

## TL;DR

> **Quick Summary**: Fix 3 calibration bugs AND 4 game UX issues in one plan. Calibration bugs block correct gameplay; UX issues make the game confusing to use. Prioritized by ROI — broken mechanics first, UX friction second, informational warnings last.
> 
> **Deliverables**:
> - D-ref slider adjusts by transposition offset so songs aren't shifted (#109)
> - Uncalibrated cells rendered as greyscale C=0, not dimmed (#110)
> - Calibration UI extracted from overlay into standalone floating panel (#111) — step 0 of migration toward global calibration (#112)
> - Chord progress visuals — pressed target notes dim as user completes chord (#121)
> - Restart button replaces Reset — back to start of same song (#119)
> - Search input gets a persistent "SONG SEARCH" label (#118). Full overlay restructure (#120) deferred — section is migrating to header component (#112, #117)
> - Keyboard ghosting one-time warning toast for large chords (#122)
> - Updated/new tests for all changes
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 implementation waves + 1 verification wave
> **Critical Path**: T1/T2/T3 (parallel) → T4/T5/T6/T7 (parallel) → F1

---

## Context

### Original Request
User reports calibration bugs:
1. "after i calibrate the grid, the key is no longer transposed to have the right dref the entire song moves up" (#109)
2. "the calibration settings needs to show the grid more visually when we are in it" (#111)
3. "brightness is used for pressure visuals in the future... it should be greyscaled not dimmed!" (#110)

User then reports additional game UX issues:
4. "THE NOTES WHICH ARE WHITE SHOULD DISAPPEAR ONE BY ONE OR GO HALF WHITE OPACITY IF THE CURRENT STEP NOTES AREN'T ALL PRESSED TO SHOW PROGRESS" (#121)
5. "there should be a go back to start of song button instead of reset?" (#119)
6. "the search bar doesn't even have a name and why is calibrate in between the two?" (#118, #120)
7. "some computer keyboard lock up after more than x notes being pressed" (#122)

### GitHub Issues (ALL filed)
| Issue | Title | Priority |
|-------|-------|----------|
| #109 | D-ref not adjusted after calibration transpose | HIGH — game broken |
| #110 | Uncalibrated cells dimmed not greyscale | HIGH — blocks MPE |
| #111 | Overlay blocks grid during calibration | MEDIUM — can't see |
| #121 | Chord progress visuals missing | HIGH — core mechanic opaque |
| #119 | Reset → Restart (back to start of song) | HIGH — basic UX |
| #118 | Search input has no label | MEDIUM — confusing |
| #120 | Game overlay section restructure | MEDIUM — poor grouping |
| #122 | Keyboard ghosting warning | LOW — informational |

### Architectural Direction (from reading ALL issues + comments)

The user's long-term vision (from #56 comments, #112 comments, #117 body):
- **Grid = primitive component** — per-grid settings (tuning, skew, zoom, waveform) live in per-grid overlay via cog button
- **Song/game is GLOBAL** — search, song status, calibration, difficulty belong in a **top-level header component**, not the per-grid overlay
- **Calibration is GLOBAL** — from #112 comment: *"maybe calibration should be there instead and not the grid, and instead ALL THE GRID components go grey and you select playable keys in all"*
- **Multi-grid** — eventually multiple grids serve one song, each grid can be different tuning/layout

**Impact on this plan**: The multi-grid refactor (#56) and header component don't exist yet. We can't move game UI to something that doesn't exist. BUT we should NOT invest in polishing game UI inside the overlay — it's heading out. Tasks are designed to be **architecturally neutral**: fix bugs that are bugs regardless of location, extract rather than embed, add minimal UI that transfers.

### ROI Prioritization (informed by full issue landscape)

**Wave 1 — Fix broken mechanics** (HIGH ROI):
T1-T3 fix calibration bugs. T3 is reframed as "extract calibration from overlay" (not "minimize overlay") — this is step 0 of the architectural migration toward global calibration (#112). The floating panel works now AND becomes the global calibration UI later.

**Wave 2 — UX polish** (MEDIUM-HIGH ROI):
T4 (chord progress) is the highest-ROI UX fix. T5 (restart event) is architecture-independent — the event is needed regardless of where the button lives. T6 is simplified to just the search label — full overlay restructure (#120) is deferred because the section is migrating to a header component. T7 (ghosting toast) is lowest priority.

**NOT in this plan** (tracked in issues, separate concerns):
- #112, #117 — Song/game as top-level header component (architectural, blocked by #56)
- #120 — Full overlay restructure (partially resolved by T3 extracting calibrate; remainder deferred to header migration — see [comment](https://github.com/zitongcharliedeng/gridinstruments/issues/120#issuecomment-4046381590))
- #108 — Game timing modes (future enhancement, P3)
- #107 — Two-hand playing, octave colors (depends on #56)
- #113 — Yellow paint hints coupled to inactivity (separate feature)
- All slider/panel/mobile bugs (#65, #68, #70, #78, #79, #84, #99, etc.)

### Root Causes

**Bug 1 — D-ref not adjusted after transpose** (`main.ts:1771-1788`):
`loadMidiFromBuffer()` sets D-ref from the original median MIDI note (line 1771-1778), THEN transposes the song by N semitones via `findOptimalTransposition()` to fit the calibrated range (line 1783-1788). D-ref is never shifted by those N semitones.

**Bug 2 — Calibration UI trapped inside overlay** (`main.ts:1997-2008`, `index.html`):
Calibration UI lives inside `#grid-overlay` which blocks the grid. But calibration is conceptually GLOBAL (#112 comment: "maybe calibration should be there instead and not the grid"). The fix is extraction — move calibration into a standalone floating panel outside the overlay. This is step 0 of migration toward the eventual global header component (#56).

**Bug 3 — Uncalibrated = dimmed, not greyscale** (`note-colors.ts:139-140`):
Current: `oklch(0.15, 0.01, h)` — lightness crushed to 0.15. Should be: same lightness as normal keys but zero chroma (C=0). Brightness channel reserved for MPE pressure.

**UX 4 — No chord progress feedback** (`main.ts:1352-1360`):
`setTargetNotes()` takes cell IDs but `pressedMidiNotes` is never communicated to the visualizer. All targets stay equally white until chord completes.

**UX 5 — Reset destroys session** (`gameMachine.ts:110-119`):
`GAME_RESET` clears everything including `noteGroups`. No way to restart the same song.

**UX 6 — Search input has no label** (`index.html:937`):
Search input has only `placeholder="Search songs..."` — no persistent label. The calibrate-between-search-and-status complaint (#120) is resolved by T3 extracting calibration. Full restructure is deferred — the GAME section is architecturally heading toward a header component (#112, #117).

**UX 7 — Keyboard ghosting invisible** (`main.ts:1489-1583`):
Consumer keyboards silently drop keys beyond rollover limit. No warning exists.

---

## Work Objectives

### Core Objective
Fix all calibration bugs and polish game UX so the game mode is functional, intuitive, and provides clear feedback at every step — from song search through chord completion.

### Must Have
- D-ref slider adjusted by transposition offset after `findOptimalTransposition()`
- Uncalibrated cells: same lightness as normal keys, zero chroma (greyscale)
- White uncalibrated: `oklch(0.24, 0, h)`, Black uncalibrated: `oklch(0.16, 0, h)`
- Calibration UI extracted from overlay into standalone floating panel (outside `#grid-overlay`)
- Floating panel works as the calibration UI for now AND becomes the global calibration component later
- Pressed target notes render as dimmed white (`target-pressed` state)
- Remaining target notes stay bright white
- "⟲ Restart" button replaces "Reset" — sends `GAME_RESTART` (keeps song, resets progress)
- Persistent "SONG SEARCH" label above search input (`.overlay-section-title` style)
- GAME-CAL-4 test updated for greyscale assertion
- All existing 124 structural tests pass

### Must NOT Have (Guardrails)
- Do NOT change transposeSong/cropToRange/findOptimalTransposition algorithms
- Do NOT change active, target, sustained, white, or black color values
- Do NOT add new npm dependencies
- Do NOT add page-level scroll
- Do NOT use border-radius, non-JetBrains-Mono fonts
- Do NOT add `as any`, `@ts-ignore`, `@ts-expect-error`, or `!` non-null assertions
- Do NOT change how calibration data is collected (key press → add to calibratedCells)
- Do NOT restructure the GAME overlay section layout (#120 deferred — section migrating to header #112/#117)
- Do NOT build a header component — that's #56 scope, not this plan
- Do NOT change chord completion logic in gameMachine
- Do NOT claim "ghosting detected" — frame as hardware info

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Playwright + XState StateInvariant)
- **Automated tests**: Tests-after — update GAME-CAL-4, add new tests for chord progress + restart
- **Framework**: Playwright + StateInvariant objects

### QA Policy
Every task includes agent-executed QA. Evidence to `.sisyphus/evidence/`.
- **Color verification**: Playwright pixel sampling for greyscale + target-pressed states
- **D-ref verification**: Playwright — load MIDI with calibration, check D-ref accounts for transposition
- **Overlay verification**: Playwright — enter calibration, assert grid visible
- **Chord progress**: Playwright — simulate multi-note press, verify visual state changes
- **Restart**: Playwright — play song, restart, verify progress resets but song stays

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (3 parallel — calibration bug fixes, independent files):
├── Task 1: D-ref transposition fix (#109) [quick]
├── Task 2: Greyscale uncalibrated cells (#110) [quick]
└── Task 3: Calibration UX — minimize overlay (#111) [quick]

Wave 2 (4 parallel — UX polish, after Wave 1):
├── Task 4: Chord progress visuals (#121) [unspecified-high]
│            depends: T2 (shares note-colors.ts)
├── Task 5: Restart button (#119) [quick]
│            depends: none from Wave 1, but batched for ordering
├── Task 6: Search label + overlay restructure (#118, #120) [quick]
│            depends: T3 (calibration moved out, restructure what's left)
└── Task 7: Keyboard ghosting warning (#122) [quick]
             depends: none, lowest priority

Wave FINAL (After ALL tasks — verification):
└── Task F1: Build + test + visual QA [unspecified-high + playwright]

Critical Path: T2 → T4 → F1
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | F1 | 1 |
| T2 | — | T4, F1 | 1 |
| T3 | — | F1 | 1 |
| T4 | T2 | F1 | 2 |
| T5 | — | F1 | 2 |
| T6 | — | F1 | 2 |
| T7 | — | F1 | 2 |
| F1 | T1-T7 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 4 tasks — T4 `unspecified-high`, T5 `quick`, T6 `quick`, T7 `quick`
- **FINAL**: 1 task — F1 `unspecified-high` + `playwright` skill

---

## TODOs

- [x] 1. Fix D-ref Not Adjusting After Calibration Transpose (#109)

  **What to do**:
  - In `src/main.ts` `loadMidiFromBuffer()` method (line ~1783-1788):
    - After `findOptimalTransposition()` returns `semitones` and `transposeSong()` shifts the groups...
    - **Adjust D-ref by the same transposition offset**. The current code sets D-ref from `medianMidi` (line 1771) BEFORE transposition. After transposition, the effective median has shifted by `semitones`.
    - The fix: after the calibration block, adjust D-ref slider:
      ```
      const adjustedMedianMidi = medianMidi + semitones;
      const adjustedHz = 440 * Math.pow(2, (adjustedMedianMidi - 69) / 12);
      dRefSlider.value = Math.max(dMin, Math.min(dMax, adjustedHz)).toFixed(2);
      dRefSlider.dispatchEvent(new Event('input'));
      ```
    - Move the D-ref slider setting AFTER the calibration block, or add a second adjustment after transposition. The cleanest approach: compute D-ref AFTER transposition is applied.

  **Must NOT do**:
  - Do NOT change `findOptimalTransposition()`, `transposeSong()`, or `cropToRange()`
  - Do NOT change how D-ref is computed (median MIDI → Hz formula is correct)
  - Do NOT touch the tuning slider auto-set logic (lines 1797-1803)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: 5-10 line fix in one function, pure logic reordering

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T2, T3)
  - **Parallel Group**: Wave 1
  - **Blocks**: F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/main.ts:1749-1813` — `loadMidiFromBuffer()` full method
  - `src/main.ts:1771-1778` — Current D-ref setting (BEFORE transposition — THE BUG)
  - `src/main.ts:1783-1788` — Calibration range: transpose + crop (AFTER D-ref is set)
  - `src/lib/game-engine.ts:140-160` — `findOptimalTransposition()` returns semitone offset

  **WHY Each Reference Matters**:
  - `main.ts:1771-1778`: This is where D-ref is set from original median — must move or adjust AFTER line 1788
  - `main.ts:1783-1788`: The transposition that shifts notes — D-ref must account for this shift
  - `game-engine.ts:140-160`: Returns the semitone offset that D-ref needs to be adjusted by

  **Acceptance Criteria**:
  - [ ] After calibrating and loading a MIDI file, the song center aligns with the grid center
  - [ ] D-ref slider value accounts for the transposition semitones
  - [ ] Loading the same MIDI file with vs without calibration puts notes in similar grid positions
  - [ ] `nix develop --command npm run build` exits 0
  - [ ] All existing tests pass

  **QA Scenarios**:

  ```
  Scenario: D-ref adjusts correctly with calibration transpose
    Tool: Playwright
    Preconditions: App loaded, calibrated range saved
    Steps:
      1. Note current D-ref slider value
      2. Drop a MIDI file
      3. Check D-ref slider value — should reflect the transposed median, not original
      4. Verify target note highlights appear centered in the calibrated range
    Expected Result: Song notes appear centered within the calibrated key range
    Failure Indicators: Notes shifted far from center, D-ref still at original median
    Evidence: .sisyphus/evidence/task-1-dref-transpose.txt
  ```

  **Commit**: YES
  - Message: `fix(game): adjust D-ref by transposition offset after calibration range fit`
  - Files: `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [x] 2. Greyscale Uncalibrated Cells — Not Dimmed (#110)

  **What to do**:
  - **Split `uncalibrated` into two states**: `uncalibrated-white` and `uncalibrated-black` in the `cellColors` function signature and implementation in `src/lib/note-colors.ts`
  - **Update `cellColors()` switch statement** (line 139-140):
    ```
    case 'uncalibrated-white':
      return { fill: oklch(0.24, 0, h), text: oklch(0.50, 0, h) };
    case 'uncalibrated-black':
      return { fill: oklch(0.16, 0, h), text: oklch(0.40, 0, h) };
    ```
    Key: **chroma = 0** (greyscale). Lightness = same as normal white (0.24) / black (0.16).
  - **Update the state type** everywhere it appears (the union type for cell state):
    - `src/lib/note-colors.ts:129` — function parameter type
    - `src/lib/keyboard-visualizer.ts:578` — state variable type
  - **Update `drawCell()` in `keyboard-visualizer.ts`** (line 578-583): When `isUncalibrated` is true, use `isBlackKey ? 'uncalibrated-black' : 'uncalibrated-white'` instead of just `'uncalibrated'`
  - **Update GAME-CAL-4 test** in `tests/machines/invariant-checks.ts` (line 2660-2698): Must now assert greyscale — sample pixel RGB channels and verify `R === G === B` (within ±2 tolerance). Not just "darker."
  - **Rationale** (add as comment in note-colors.ts): Lightness/brightness is reserved for MPE pressure/velocity visuals. Uncalibrated uses desaturation (greyscale) to avoid collision.

  **Must NOT do**:
  - Do NOT change active, target, sustained, white, or black color values
  - Do NOT change lightness values for uncalibrated (keep L=0.24 white, L=0.16 black)
  - Do NOT use opacity/transparency — use zero-chroma OKLCH directly
  - Do NOT change the state priority order (active > target > sustained > uncalibrated > black/white)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Color value changes + type update, small scope

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T3)
  - **Parallel Group**: Wave 1
  - **Blocks**: T4 (chord progress adds another color state to same files), F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/note-colors.ts:127-146` — `cellColors()` function with all state color definitions
  - `src/lib/note-colors.ts:139-140` — Current uncalibrated colors (THE BUG: `oklch(0.15, 0.01, h)`)
  - `src/lib/note-colors.ts:141-144` — Normal white (L=0.24, C=0.055) and black (L=0.16, C=0.035) for reference
  - `src/lib/keyboard-visualizer.ts:570-584` — `drawCell()` state selection (has `isBlackKey` available)
  - `tests/machines/invariant-checks.ts:2660-2698` — GAME-CAL-4 test (must update assertion)

  **WHY Each Reference Matters**:
  - `note-colors.ts:139-140`: THE color values to change — chroma must become 0, lightness must match normal state
  - `keyboard-visualizer.ts:570-584`: Must split uncalibrated into white/black variant — `isBlackKey` is already available
  - `invariant-checks.ts:2660-2698`: Test currently checks "darker" — must change to "greyscale (R≈G≈B)"

  **Acceptance Criteria**:
  - [ ] Uncalibrated cells are grey (zero color saturation), not dimmed
  - [ ] Uncalibrated white keys have same lightness as normal white keys (L=0.24)
  - [ ] Uncalibrated black keys have same lightness as normal black keys (L=0.16)
  - [ ] White/black key distinction still visible in uncalibrated state
  - [ ] GAME-CAL-4 test asserts greyscale (R≈G≈B within ±2), not just "darker"
  - [ ] Build passes, all tests pass

  **QA Scenarios**:

  ```
  Scenario: Uncalibrated cells are greyscale, not dimmed
    Tool: Playwright
    Preconditions: App loaded
    Steps:
      1. Open overlay, click Calibrate
      2. Sample pixel at center of an uncalibrated cell
      3. Assert: R, G, B channels are equal (within ±3 tolerance)
      4. Assert: brightness is NOT drastically lower than normal cells
    Expected Result: Grey cells (no color), same luminance structure
    Failure Indicators: Cells have color tint, or are much darker than normal
    Evidence: .sisyphus/evidence/task-2-greyscale.txt

  Scenario: White/black key distinction preserved in greyscale
    Tool: Playwright
    Steps:
      1. Enter calibration mode (all cells greyscale)
      2. Sample a white-key position and a black-key position
      3. Assert: white-key pixel brightness > black-key pixel brightness
    Expected Result: Different grey levels for white vs black keys
    Evidence: .sisyphus/evidence/task-2-wb-distinction.txt
  ```

  **Commit**: YES
  - Message: `fix(game): greyscale uncalibrated cells — preserve lightness, zero chroma (MPE pressure reserved)`
  - Files: `src/lib/note-colors.ts`, `src/lib/keyboard-visualizer.ts`, `tests/machines/invariant-checks.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [x] 3. Extract Calibration UI from Overlay into Standalone Floating Panel (#111, step 0 of #112)

  > **Architectural context**: Calibration is conceptually GLOBAL — it affects which keys are playable across ALL future grids (#112 comment: "maybe calibration should be there instead and not the grid, and instead ALL THE GRID components go grey and you select playable keys in all"). The overlay is for PER-GRID settings (#56). Extracting calibration into a standalone panel is the correct first step — it works now AND becomes the global calibration component when the header/multi-grid architecture (#56) lands.

  **What to do**:
  - **Extract calibration UI from overlay**: The calibration button and banner currently live INSIDE `#grid-overlay` (index.html:939-945). Move them OUT into a standalone `<div id="calibration-panel">` that lives OUTSIDE the overlay, as a sibling of `#keyboard-container`.
  - **The floating panel**:
    - Contains: "Calibrate Range" trigger button (shown when NOT calibrating) + calibration instructions + Confirm + Cancel buttons (shown WHEN calibrating)
    - Styled: `position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 20;`
    - Background: `rgba(0,0,0,0.8)`, border: `1px solid var(--dim)`, padding
    - Font: JetBrains Mono, white text, no border-radius
    - The trigger button is visible by default. Instructions + confirm/cancel appear when calibrating.
  - **When entering calibration mode** (`enterCalibrationMode()` in `src/main.ts:1997`):
    - Close the overlay if open: add `hidden` class to `#grid-overlay`
    - Show calibration instructions + confirm/cancel in the floating panel
    - Grid is now fully visible with cells greying out in real time
  - **When exiting calibration mode** (`exitCalibrationMode()`):
    - Hide instructions, show trigger button again
    - Optionally reopen overlay
  - **Remove old calibration elements from inside `#grid-overlay`**: `#calibrate-btn`, `#calibration-banner`, confirm/cancel buttons — ALL move to the floating panel
  - **Wire confirm/cancel** in the floating panel to same `exitCalibrationMode(true/false)` methods
  - **This also resolves #120** (calibrate no longer sits between search and game status in the overlay)

  **Must NOT do**:
  - Do NOT add scroll to the page
  - Do NOT use border-radius on the panel
  - Do NOT use any font other than JetBrains Mono
  - Do NOT remove the cog button or change how the main overlay opens/closes
  - Do NOT change how calibration data is collected (key press → add to calibratedCells)
  - Do NOT build a header component — just extract calibration to a floating panel for now

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: DOM extraction + visibility toggling, straightforward. The panel is architecturally neutral — works with single grid now, adapts to multi-grid later.

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: F1. Also resolves the #120 complaint (calibrate between search and status) as a side effect.
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/main.ts:1997-2029` — `enterCalibrationMode()` and `exitCalibrationMode()` (must modify)
  - `index.html:939-945` — Current calibration UI inside overlay (replace with floating panel)
  - `index.html:262-289` — `#grid-overlay` styling (z-index, positioning)
  - `index.html:797` — `#grid-settings-btn` cog button (z-index 15 — panel needs z-index > 15)

  **WHY Each Reference Matters**:
  - `main.ts:1997-2029`: Mode entry/exit functions that toggle overlay vs floating panel
  - `index.html:939-945`: Old calibration UI to replace
  - `index.html:797`: Cog is z-index 15, calibration panel needs z-index 20+

  **Acceptance Criteria**:
  - [ ] Clicking "Calibrate range" closes the overlay and shows a floating panel
  - [ ] Full keyboard grid visible during calibration
  - [ ] User sees cells change from greyscale to colored as they press keys
  - [ ] Confirm saves calibration and hides panel
  - [ ] Cancel discards calibration and hides panel
  - [ ] No page scroll introduced
  - [ ] All existing tests pass

  **QA Scenarios**:

  ```
  Scenario: Overlay closes and grid visible during calibration
    Tool: Playwright
    Preconditions: App loaded
    Steps:
      1. Click #grid-settings-btn to open overlay
      2. Click calibrate button
      3. Assert: #grid-overlay has class 'hidden' (overlay closed)
      4. Assert: #calibration-panel is visible (floating panel shown)
      5. Assert: #keyboard-canvas is not obscured (visible in viewport)
      6. Screenshot full page
    Expected Result: Grid fully visible with floating calibration panel on top
    Failure Indicators: Overlay still open, grid obscured, panel not visible
    Evidence: .sisyphus/evidence/task-3-calibration-ux.png

  Scenario: Confirm/cancel work from floating panel
    Tool: Playwright
    Steps:
      1. Enter calibration mode
      2. Press a key (add to calibrated cells)
      3. Click confirm on floating panel
      4. Assert: #calibration-panel is hidden
      5. Assert: calibrated range is saved (greyscale cells persist)
    Expected Result: Calibration completes from floating panel
    Evidence: .sisyphus/evidence/task-3-calibration-confirm.txt
  ```

  **Commit**: YES
  - Message: `refactor(game): extract calibration UI from overlay into standalone floating panel`
  - Files: `index.html`, `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [x] 4. Chord Progress Visuals — Pressed Target Notes Dim (#121)

  **What to do**:
  - **Add `target-pressed` color state** to `src/lib/note-colors.ts`:
    - Extend the cell state union type to include `'target-pressed'`
    - Add to `cellColors()` switch:
      ```
      case 'target-pressed':
        return { fill: oklch(0.55, 0.01, h), text: oklch(0.70, 0.01, h) };
      ```
    - This is a dimmed white — visually between `target` (bright white, L=0.96) and `sustained` (dim color). It says "done" but the group isn't complete yet.
  - **Add `pressedTargetNotes` tracking** to `src/lib/keyboard-visualizer.ts`:
    - New field: `private pressedTargetNotes: Set<string> = new Set()`
    - New setter: `setPressedTargetNotes(noteIds: string[]): void { this.pressedTargetNotes = new Set(noteIds); }`
    - In `drawCell()` state selection: add `target-pressed` check BEFORE `target`:
      ```
      const isTargetPressed = this.targetNotes.has(noteId) && this.pressedTargetNotes.has(noteId) && !isActive;
      const isTarget = this.targetNotes.has(noteId) && !this.pressedTargetNotes.has(noteId) && !isActive;
      // state selection: isActive ? 'active' : isTargetPressed ? 'target-pressed' : isTarget ? 'target' : ...
      ```
    - `target-pressed` cells should render at FULL SIZE (s=1.0) same as target, so the chord shape stays visible
  - **Wire `pressedMidiNotes` to visualizer** in `src/main.ts` gameActor subscription (line 1352-1360):
    - Read `snapshot.context.pressedMidiNotes` from the game machine snapshot
    - Map pressed MIDI notes to cell IDs using the current NoteGroup:
      ```
      const currentGroup = snapshot.context.noteGroups[snapshot.context.currentGroupIndex];
      if (currentGroup) {
        const pressedMidis = new Set(snapshot.context.pressedMidiNotes);
        const pressedCellIds = currentGroup.cellIds.filter((_, i) =>
          pressedMidis.has(currentGroup.midiNotes[i])
        );
        visualizer.setPressedTargetNotes(pressedCellIds);
      }
      ```
    - When the group advances (chord complete), `pressedMidiNotes` clears automatically via `clearPressed` action in gameMachine — so the next group starts with no pressed targets
  - **Add test** `GAME-CHORD-PROGRESS-1` in `tests/machines/invariant-checks.ts`:
    - Assert: `target-pressed` is a valid cell state in the color system
    - Assert: `target-pressed` fill color is dimmer than `target` fill but brighter than `black`
    - Assert: `setPressedTargetNotes` method exists on keyboard visualizer

  **Must NOT do**:
  - Do NOT change existing `target` color (bright white = `oklch(0.96, 0.03, h)`)
  - Do NOT change chord completion logic in gameMachine (`isChordComplete`, `accumulateNote`)
  - Do NOT change `setTargetNotes()` signature — `setPressedTargetNotes()` is a separate method
  - Do NOT remove pressed notes from `targetNotes` set — both sets coexist for correct rendering

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - Reason: Touches 4 files, requires understanding of game machine state flow + visualizer rendering pipeline

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T5, T6, T7)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: T2 (T2 modifies the same cell state union type in note-colors.ts)

  **References**:

  **Pattern References**:
  - `src/lib/note-colors.ts:127-146` — `cellColors()` with all state definitions (add `target-pressed` here)
  - `src/lib/note-colors.ts:133-134` — `target` color values (`oklch(0.96, 0.03, h)`) — the bright white to contrast against
  - `src/lib/keyboard-visualizer.ts:346-348` — `setTargetNotes()` method (model for `setPressedTargetNotes`)
  - `src/lib/keyboard-visualizer.ts:569-590` — `drawCell()` state selection chain (add `isTargetPressed` before `isTarget`)
  - `src/lib/keyboard-visualizer.ts:587` — Scale: `(isActive || isTarget) ? 1.0 : CELL_INSET` — must add `isTargetPressed` here too
  - `src/machines/gameMachine.ts:94-99` — `accumulateNote` action that adds to `pressedMidiNotes`
  - `src/machines/gameMachine.ts:127-132` — `isChordComplete` guard that checks all notes pressed
  - `src/machines/gameMachine.ts:103-108` — `clearPressed` action that resets `pressedMidiNotes` on advance
  - `src/main.ts:1352-1360` — gameActor subscription (add `pressedMidiNotes` → `setPressedTargetNotes` wiring)

  **WHY Each Reference Matters**:
  - `note-colors.ts:133-134`: Existing `target` color — `target-pressed` must be visually dimmer but same hue direction
  - `keyboard-visualizer.ts:569-590`: The state selection chain — `target-pressed` must be checked BEFORE `target` (more specific condition first)
  - `keyboard-visualizer.ts:587`: Scale logic — pressed targets must stay full size to show chord shape
  - `gameMachine.ts:94-99, 103-108`: Source of truth for which notes are pressed and when they clear
  - `main.ts:1352-1360`: The subscription that bridges game state → visualizer — must add `pressedMidiNotes` wiring

  **Acceptance Criteria**:
  - [ ] Pressing one note of a 2+ note chord: that note dims, remaining targets stay bright white
  - [ ] Pressing all notes of a chord: group advances, all targets clear, next group highlights
  - [ ] `target-pressed` cells stay full size (s=1.0) — chord shape remains visible
  - [ ] `target-pressed` color is dimmer than `target` but brighter than background
  - [ ] New test GAME-CHORD-PROGRESS-1 passes
  - [ ] Build passes, all tests pass

  **QA Scenarios**:

  ```
  Scenario: Partial chord press dims individual target notes
    Tool: Playwright
    Preconditions: App loaded, MIDI file with multi-note chords loaded
    Steps:
      1. Wait for first multi-note target group to highlight (2+ white cells)
      2. Simulate pressing one of the target notes (keyboard or MIDI)
      3. Sample pixel at the pressed target cell
      4. Sample pixel at an unpressed target cell
      5. Assert: pressed target pixel is dimmer than unpressed target pixel
      6. Assert: pressed target pixel is NOT the active color (not pitch-class hue)
    Expected Result: Pressed note visibly dimmer, unpressed notes stay bright white
    Failure Indicators: All targets same brightness, or pressed target disappears entirely
    Evidence: .sisyphus/evidence/task-4-chord-progress.txt

  Scenario: Chord completion clears all targets and advances
    Tool: Playwright
    Steps:
      1. Start with a multi-note target group
      2. Press all target notes
      3. Assert: previous target cells are no longer highlighted
      4. Assert: new target group (next group) cells are now bright white
    Expected Result: Clean transition from completed chord to next target
    Evidence: .sisyphus/evidence/task-4-chord-advance.txt
  ```

  **Commit**: YES
  - Message: `feat(game): chord progress visuals — pressed target notes dim to show remaining`
  - Files: `src/lib/note-colors.ts`, `src/lib/keyboard-visualizer.ts`, `src/main.ts`, `tests/machines/invariant-checks.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [x] 5. Replace Reset with Restart — Back to Start of Same Song (#119)

  **What to do**:
  - **Add `GAME_RESTART` event** to `src/machines/gameMachine.ts`:
    - Add to the machine's event types: `{ type: 'GAME_RESTART' }`
    - From `playing` state: `GAME_RESTART` → `playing` with action:
      ```
      assign({
        currentGroupIndex: 0,
        pressedMidiNotes: [],
        startTimeMs: () => Date.now(),
        finishTimeMs: 0,
        // KEEP: noteGroups, songTitle, quantizationLevel, tuningWarnAcknowledged, error
      })
      ```
    - From `complete` state: Same transition (user can restart after finishing)
    - Keep `GAME_RESET` as-is (other code paths may need full reset to idle)
  - **Update button in `index.html`** (line 953):
    - Change `<button id="game-reset-btn">Reset</button>` to `<button id="game-reset-btn">⟲ Restart</button>`
    - Keep the same ID for minimal wiring changes
  - **Update handler in `src/main.ts`** (line 1326-1331):
    - Change `gameActor.send({ type: 'GAME_RESET' })` to `gameActor.send({ type: 'GAME_RESTART' })`
    - Do NOT hide `#game-status` on restart (game status should stay visible with progress reset to "0 / N")
    - Remove the line that hides game-status div
  - **Update gameActor subscription** to handle restart state:
    - When state is `playing` AND `currentGroupIndex === 0` AND `startTimeMs > 0`, game has restarted
    - Progress should show "0 / N" — this should happen automatically since the subscription reads `currentGroupIndex`
  - **Add test** `GAME-RESTART-1` in `tests/machines/invariant-checks.ts`:
    - Assert: `GAME_RESTART` event exists on gameMachine
    - Assert: from `playing` state, `GAME_RESTART` transitions to `playing` with reset progress
    - Assert: from `complete` state, `GAME_RESTART` transitions to `playing`

  **Must NOT do**:
  - Do NOT remove `GAME_RESET` event from the machine (keep for full reset paths)
  - Do NOT change the `#game-reset-btn` element ID (minimize wiring changes)
  - Do NOT add any other UI elements for this change

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Small state machine addition + button text change + handler update

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4, T6, T7)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: None (touches gameMachine.ts but different section than T4)

  **References**:

  **Pattern References**:
  - `src/machines/gameMachine.ts:110-119` — `resetGame` action (model for restart — same but keep noteGroups)
  - `src/machines/gameMachine.ts:180-185` — `GAME_RESET` transitions from playing/complete/error → idle
  - `src/main.ts:1326-1331` — Current reset handler (change to restart)
  - `index.html:953` — Reset button HTML (change text)

  **WHY Each Reference Matters**:
  - `gameMachine.ts:110-119`: Model for what to reset vs keep — restart is a subset of reset
  - `gameMachine.ts:180-185`: Existing transition pattern to follow
  - `main.ts:1326-1331`: The handler to update — send `GAME_RESTART` instead of `GAME_RESET`

  **Acceptance Criteria**:
  - [ ] "⟲ Restart" button visible during gameplay (replaces "Reset" text)
  - [ ] Clicking restart: progress resets to "0 / N", same song stays loaded
  - [ ] Song title stays visible, game status stays visible
  - [ ] After restart, target highlights show the first group of the song
  - [ ] Restart works from both `playing` and `complete` states
  - [ ] GAME_RESET still works (no regression on other paths)
  - [ ] Test GAME-RESTART-1 passes
  - [ ] Build passes, all tests pass

  **QA Scenarios**:

  ```
  Scenario: Restart resets progress but keeps song
    Tool: Playwright
    Preconditions: App loaded, MIDI file loaded, partially played (progress > 0)
    Steps:
      1. Read #game-song-title text — note the song name
      2. Read #game-progress text — confirm progress > "0 / N"
      3. Click #game-reset-btn (now labeled "⟲ Restart")
      4. Read #game-song-title text — should be same song name
      5. Read #game-progress text — should be "0 / N" (or "1 / N" after first target loads)
      6. Assert: #game-status is still visible (display !== 'none')
    Expected Result: Same song, progress reset, game continues
    Failure Indicators: Song clears, game-status hides, progress unchanged
    Evidence: .sisyphus/evidence/task-5-restart.txt

  Scenario: Restart from complete state
    Tool: Playwright
    Steps:
      1. Complete a short MIDI file (all groups done)
      2. Verify #game-progress shows completion (e.g., "N / N ✓")
      3. Click #game-reset-btn (⟲ Restart)
      4. Assert: game is in playing state, progress reset
    Expected Result: Can replay same song after completion
    Evidence: .sisyphus/evidence/task-5-restart-from-complete.txt
  ```

  **Commit**: YES
  - Message: `feat(game): restart button — back to start of same song without clearing`
  - Files: `src/machines/gameMachine.ts`, `src/main.ts`, `index.html`, `tests/machines/invariant-checks.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [x] 6. Add SONG SEARCH Label (#118)

  **What to do**:
  - **Add persistent search label** in `index.html`:
    - Above `#midi-search-input`, add: `<div class="overlay-section-title">SONG SEARCH</div>`
    - Uses greyish `var(--dim)` color, consistent with GAME and DIFFICULTY headings
  - That's it. No reordering, no restructuring. The full overlay restructure (#120) is deferred to the header migration (#56/#112/#117).

  **Must NOT do**:
  - Do NOT reorder any existing overlay elements
  - Do NOT add "GAME SETTINGS" heading (deferred to header migration)
  - Do NOT move calibration, difficulty, or game-status elements
  - Do NOT change any element IDs
  - Do NOT introduce page scroll
  - Do NOT add border-radius, non-JetBrains-Mono fonts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Single line HTML addition — one `<div>` above an existing `<input>`

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4, T5, T7)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: None (standalone label addition, no dependency on T3 or any other task)

  **References**:

  **Pattern References**:
  - `index.html:937` — Search input with placeholder only (add label directly above this)
  - `index.html:831` — Example of `.overlay-section-title` usage elsewhere (pattern to follow for styling)

  **WHY Each Reference Matters**:
  - `index.html:937`: The exact insertion point — new label goes immediately before this element
  - `index.html:831`: Existing section title pattern — copy this class for consistent greyish heading style

  **Acceptance Criteria**:
  - [ ] "SONG SEARCH" label visible above search input at all times (doesn't disappear on type)
  - [ ] Label uses `overlay-section-title` class (greyish `var(--dim)` color)
  - [ ] No element IDs changed
  - [ ] No scroll introduced on page
  - [ ] No elements reordered — only the new label inserted
  - [ ] All existing tests pass
  - [ ] Build passes

  **QA Scenarios**:

  ```
  Scenario: Search has persistent label
    Tool: Playwright
    Preconditions: App loaded, overlay open
    Steps:
      1. Open #grid-overlay by clicking #grid-settings-btn
      2. Locate #midi-search-input in the GAME section
      3. Assert: element with class "overlay-section-title" containing text "SONG SEARCH" exists immediately before #midi-search-input
      4. Type "test" into #midi-search-input
      5. Assert: "SONG SEARCH" label still visible (not obscured or hidden by typing)
    Expected Result: Persistent "SONG SEARCH" section label above search input
    Failure Indicators: No label visible, label disappears when typing, label has wrong class
    Evidence: .sisyphus/evidence/task-6-search-label.png

  Scenario: Label styling matches existing section titles
    Tool: Playwright
    Steps:
      1. Open #grid-overlay
      2. Query all elements with class "overlay-section-title"
      3. Assert: one of them contains text "SONG SEARCH"
      4. Assert: its computed color matches var(--dim) (greyish, not white)
    Expected Result: Label styled consistently with other section titles
    Evidence: .sisyphus/evidence/task-6-label-styling.png
  ```

  **Commit**: YES
  - Message: `fix(game): add persistent SONG SEARCH label above search input`
  - Files: `index.html`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

- [ ] 7. Keyboard Ghosting/Rollover Warning (#122) — LOW PRIORITY

  **What to do**:
  - **Track key rollover high-water mark** in `src/main.ts`:
    - Add field: `private maxSimultaneousKeys = 0`
    - In `handleKeyDown`: after adding to `activeNotes`, update `maxSimultaneousKeys = Math.max(maxSimultaneousKeys, activeNotes.size)`
  - **Add one-time warning toast** when conditions are met:
    - Trigger condition: game is in `playing` state AND current target group has 4+ notes AND `maxSimultaneousKeys < 4`
    - Show toast ONCE per session (flag: `private ghostingWarningShown = false`)
    - Toast text: "Your keyboard may limit simultaneous notes. For full chords, connect a MIDI controller or use touchscreen."
  - **Add toast element** in `index.html`:
    - `<div id="ghosting-toast">` — positioned fixed, bottom-center, z-index 30
    - Style: JetBrains Mono, white text, `rgba(0,0,0,0.85)` background, no border-radius
    - Includes dismiss button (✕) and auto-fades after 10 seconds
    - Hidden by default (`display: none`)
  - **Toast show/hide logic** in `src/main.ts`:
    - `showGhostingToast()`: set display block, start 10s auto-hide timer
    - `hideGhostingToast()`: set display none, clear timer
    - Dismiss button click → hide
    - Check condition in gameActor subscription when group changes

  **Must NOT do**:
  - Do NOT claim "ghosting detected" (we can't detect it — frame as hardware info)
  - Do NOT block gameplay
  - Do NOT make the toast persistent or annoying
  - Do NOT add complex detection heuristics
  - Do NOT add page scroll

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: Small toast element + simple high-water-mark tracking, no complex logic

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T4, T5, T6)
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/main.ts:344-347` — `activeNotes` Map, `keyRepeat` Set (track size here)
  - `src/main.ts:1489-1510` — `handleKeyDown` (add high-water-mark update)
  - `src/main.ts:1352-1360` — gameActor subscription (add toast trigger check)
  - `src/machines/gameMachine.ts:42-45` — `GameContext.noteGroups` — access current group's midiNotes length

  **WHY Each Reference Matters**:
  - `main.ts:344-347`: Where activeNotes lives — measure its `.size` for high-water mark
  - `main.ts:1489-1510`: Key handler where we update the max count
  - `main.ts:1352-1360`: Where we check if current chord is large enough to warrant warning

  **Acceptance Criteria**:
  - [ ] `maxSimultaneousKeys` tracks the highest number of simultaneous keys in the session
  - [ ] Toast appears once when playing a 4+ note chord with low rollover history
  - [ ] Toast auto-hides after 10 seconds
  - [ ] Toast has dismiss button (✕)
  - [ ] Toast does NOT reappear after dismissal
  - [ ] Toast does NOT appear if MIDI controller is connected (check via input source)
  - [ ] No page scroll
  - [ ] Build passes, all tests pass

  **QA Scenarios**:

  ```
  Scenario: Toast shows for large chord with low rollover
    Tool: Playwright
    Preconditions: App loaded, MIDI file with 4+ note chords loaded
    Steps:
      1. Start game with default keyboard (no MIDI)
      2. Navigate to a target group with 4+ notes
      3. Press only 2 keys simultaneously
      4. Assert: #ghosting-toast becomes visible after a brief delay
      5. Assert: toast text mentions "keyboard may limit simultaneous notes"
      6. Wait 10 seconds
      7. Assert: toast auto-hides
    Expected Result: One-time informational toast about keyboard rollover
    Failure Indicators: No toast appears, or toast appears every chord
    Evidence: .sisyphus/evidence/task-7-ghosting-toast.png

  Scenario: Toast dismissible and one-time
    Tool: Playwright
    Steps:
      1. Trigger toast (as above)
      2. Click dismiss button on toast
      3. Assert: toast hides immediately
      4. Continue playing with more 4+ note chords
      5. Assert: toast does NOT reappear
    Expected Result: Toast shows once, dismisses cleanly, never returns
    Evidence: .sisyphus/evidence/task-7-toast-dismiss.txt
  ```

  **Commit**: YES (groups with T4-T6 if convenient)
  - Message: `feat(game): keyboard rollover warning toast for large chords`
  - Files: `index.html`, `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check code). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [7/7] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality + Build + Tests** — `unspecified-high`
  Run `nix develop --command npm run build` (exit 0). Run `nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"` (all 124+ pass). Review all changed files for: `as any`, `@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check no `!` non-null assertions added.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Code Quality [N clean/N issues] | VERDICT`

- [ ] F3. **Visual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task:
  1. Calibration: overlay closes, floating panel visible, grid visible with greyscale cells
  2. Greyscale: sample uncalibrated pixel R≈G≈B (±3), white/black distinction preserved
  3. D-ref: load MIDI with calibration, verify D-ref slider reflects transposed median
  4. Chord progress: press partial chord, verify pressed targets dim, remaining stay bright
  5. Restart: click restart mid-song, verify progress resets, song stays loaded
  6. Search label: verify "SONG SEARCH" visible above input, persists while typing
  7. Section order: verify SONG SEARCH → search → results → game-status → GAME SETTINGS → difficulty
  8. Ghosting toast: verify appears once for large chord, auto-hides, dismissible
  Save evidence to `.sisyphus/evidence/calibration-bugs-qa/`.
  Output: `Scenarios [N/N pass] | Screenshots [N captured] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance per task. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [7/7 compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Task | Message | Key Files |
|------|---------|-----------|
| T1 | `fix(game): adjust D-ref by transposition offset after calibration range fit` | main.ts |
| T2 | `fix(game): greyscale uncalibrated cells — preserve lightness, zero chroma` | note-colors.ts, keyboard-visualizer.ts, invariant-checks.ts |
| T3 | `fix(game): extract calibration from overlay into standalone floating panel` | index.html, main.ts |
| T4 | `feat(game): chord progress visuals — pressed target notes dim to show remaining` | note-colors.ts, keyboard-visualizer.ts, main.ts, invariant-checks.ts |
| T5 | `feat(game): restart button — back to start of same song without clearing` | gameMachine.ts, main.ts, index.html, invariant-checks.ts |
| T6 | `fix(game): add persistent SONG SEARCH label above search input` | index.html |
| T7 | `feat(game): keyboard rollover warning toast for large chords` | index.html, main.ts |

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npm run build                                                          # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"      # Expected: 124+ pass (new tests added)
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-CAL"        # Expected: 4+ pass (updated CAL-4)
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-CHORD"      # Expected: 1+ pass (new)
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-RESTART"    # Expected: 1+ pass (new)
```

### Final Checklist
- [ ] Uncalibrated cells are greyscale (zero chroma), NOT dimmed (#110)
- [ ] White/black key lightness distinction preserved in greyscale state
- [ ] After calibration + MIDI load, D-ref accounts for transposition offset (#109)
- [ ] Overlay closes during calibration, floating panel visible (#111)
- [ ] Grid fully visible during calibration
- [ ] Pressed target notes dim to show chord progress (#121)
- [ ] Remaining targets stay bright white
- [ ] "⟲ Restart" replaces "Reset" — keeps song, resets progress (#119)
- [ ] "SONG SEARCH" label above search input, persists while typing (#118)
- [ ] Overlay sections logically grouped: song area vs game settings (#120)
- [ ] Keyboard ghosting toast appears once for large chords (#122)
- [ ] All 124+ structural tests pass (plus new GAME-CHORD-PROGRESS-1, GAME-RESTART-1)
- [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`, or `!` non-null assertions
- [ ] No page scroll introduced
- [ ] All GitHub issues referenced in commits
