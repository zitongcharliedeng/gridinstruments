# Calibration Bug Fixes: D-ref Transpose, Greyscale, and Calibration UX

## TL;DR

> **Quick Summary**: Fix 3 calibration bugs — D-ref not adjusting after song transpose, uncalibrated cells using dimmed lightness instead of greyscale (conflicts with future MPE pressure visuals), and overlay blocking the grid during calibration mode.
> 
> **Deliverables**:
> - D-ref slider adjusts by the transposition offset so songs aren't shifted
> - Uncalibrated cells rendered as greyscale (C=0) at normal lightness, not dimmed
> - Calibration mode minimizes overlay so user can see the grid
> - Updated GAME-CAL-4 test to assert greyscale (zero chroma), not just "darker"
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 3 tasks in 1 wave + 1 verification wave
> **Critical Path**: T1/T2/T3 (parallel) → F1

---

## Context

### Original Request
User reports:
1. "after i calibrate the grid, the key is no longer transposed to have the right dref the entire song moves up"
2. "the calibration settings needs to show the grid more visually when we are in it... the rest of the settings except from its transparent popup should go away so the user can see what is being greyed out"
3. "brightness is used for pressure visuals in the future... it should be greyscaled not dimmed! this is a critical issue with your tests"

### Root Causes

**Bug 1 — D-ref not adjusted after transpose** (`main.ts:1771-1788`):
`loadMidiFromBuffer()` sets D-ref from the original median MIDI note (line 1771-1778), THEN transposes the song by N semitones via `findOptimalTransposition()` to fit the calibrated range (line 1783-1788). D-ref is never shifted by those N semitones. Result: grid centered on old pitch, song notes shifted — everything appears moved up.

**Bug 2 — Overlay blocks grid during calibration** (`main.ts:1997-2008`, `index.html`):
`enterCalibrationMode()` shows a banner and changes button text, but `#grid-overlay` stays fully open covering the canvas. User cannot see cells greying out.

**Bug 3 — Uncalibrated = dimmed, not greyscale** (`note-colors.ts:139-140`):
Current: `oklch(0.15, 0.01, h)` — lightness crushed to 0.15, near-zero chroma. Should be: same lightness as normal white/black keys (L=0.24/L=0.16) but zero chroma (C=0). Brightness/lightness channel is reserved for MPE pressure velocity visuals. Using it for "uncalibrated" state creates a collision. Greyscale = desaturate (remove hue), don't dim (reduce brightness).

---

## Work Objectives

### Core Objective
Fix all 3 calibration bugs so the calibration flow works correctly — D-ref adjusts with transposition, uncalibrated cells are greyscale not dimmed, and the grid is visible during calibration.

### Must Have
- D-ref slider adjusted by transposition offset after `findOptimalTransposition()`
- Uncalibrated cells: same lightness as normal white/black keys, zero chroma (greyscale)
- White uncalibrated key: `oklch(0.24, 0, h)` fill, `oklch(0.75, 0, h)` text
- Black uncalibrated key: `oklch(0.16, 0, h)` fill, `oklch(0.60, 0, h)` text
- Calibration mode closes/minimizes overlay so grid is visible
- Calibration instructions + confirm/cancel remain accessible during calibration
- GAME-CAL-4 test updated to assert zero chroma, not just "darker than before"
- All existing 124 structural tests pass

### Must NOT Have (Guardrails)
- Do NOT change how calibrated range data is stored in localStorage
- Do NOT change the transposeSong/cropToRange/findOptimalTransposition algorithms
- Do NOT add new DOM elements to the canvas — calibration banner can be a small floating panel
- Do NOT remove the overlay entirely — just hide the non-calibration sections
- Do NOT change any other color states (active, target, sustained, white, black)
- Do NOT add `as any`, `@ts-ignore`, `@ts-expect-error`, or `!` non-null assertions

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Playwright + XState StateInvariant)
- **Automated tests**: Tests-after — update existing GAME-CAL-4, may add GAME-CAL-5
- **Framework**: Playwright + StateInvariant objects

### QA Policy
Every task includes agent-executed QA. Evidence to `.sisyphus/evidence/`.
- **Color verification**: Playwright pixel sampling — assert R===G===B (greyscale) for uncalibrated cells
- **D-ref verification**: Playwright — load MIDI with calibration, check D-ref slider value accounts for transposition
- **Overlay verification**: Playwright — enter calibration, assert grid canvas is visible (not covered)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (3 parallel — independent files):
├── Task 1: D-ref transposition fix [quick]
├── Task 2: Greyscale uncalibrated cells [quick]
└── Task 3: Calibration UX — minimize overlay [quick]

Wave FINAL (After ALL tasks):
└── Task F1: Build + test + visual QA [unspecified-high + playwright]

Critical Path: T1/T2/T3 → F1
Parallel Speedup: All 3 implementation tasks run simultaneously
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| T1 | — | F1 | 1 |
| T2 | — | F1 | 1 |
| T3 | — | F1 | 1 |
| F1 | T1, T2, T3 | — | FINAL |

---

## TODOs

- [ ] 1. Fix D-ref Not Adjusting After Calibration Transpose

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

- [ ] 2. Greyscale Uncalibrated Cells (Not Dimmed)

  **What to do**:
  - **Split `uncalibrated` into two states**: `uncalibrated-white` and `uncalibrated-black` in the `cellColors` function signature and implementation in `src/lib/note-colors.ts`
  - **Update `cellColors()` switch statement** (line 139-140):
    ```
    case 'uncalibrated-white':
      return { fill: oklch(0.24, 0, h), text: oklch(0.50, 0, h) };
    case 'uncalibrated-black':
      return { fill: oklch(0.16, 0, h), text: oklch(0.40, 0, h) };
    ```
    Key: **chroma = 0** (greyscale). Lightness = same as normal white (0.24) / black (0.16). Text lightness slightly reduced for subtlety but still zero chroma.
  - **Update the state type** everywhere it appears (the union type `'active' | 'target' | 'sustained' | 'uncalibrated' | 'white' | 'black'`):
    - `src/lib/note-colors.ts:129` — function parameter type
    - `src/lib/keyboard-visualizer.ts:578` — state variable type
  - **Update `drawCell()` in `keyboard-visualizer.ts`** (line 578-583): When `isUncalibrated` is true, use `isBlackKey ? 'uncalibrated-black' : 'uncalibrated-white'` instead of just `'uncalibrated'`
  - **Update GAME-CAL-4 test** in `tests/machines/invariant-checks.ts` (line 2660-2698): Currently asserts "canvas should be darker." Must now assert greyscale — sample pixel RGB channels and verify `R === G === B` (zero chroma = equal RGB channels, within tolerance of ±2 for rounding). The brightness should be SIMILAR to before (not drastically darker).
  - **Rationale** (add as comment in note-colors.ts): Lightness/brightness is reserved for MPE pressure/velocity visuals. Uncalibrated uses desaturation (greyscale) to avoid collision with pressure display.

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
  - **Blocks**: F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/lib/note-colors.ts:127-146` — `cellColors()` function with all state color definitions
  - `src/lib/note-colors.ts:139-140` — Current uncalibrated colors (THE BUG: `oklch(0.15, 0.01, h)`)
  - `src/lib/note-colors.ts:141-144` — Normal white (L=0.24, C=0.055) and black (L=0.16, C=0.035) for reference lightness values
  - `src/lib/keyboard-visualizer.ts:570-584` — `drawCell()` state selection (has `isBlackKey` available)
  - `tests/machines/invariant-checks.ts:2660-2698` — GAME-CAL-4 test (must update assertion)

  **WHY Each Reference Matters**:
  - `note-colors.ts:139-140`: THE color values to change — chroma must become 0, lightness must match normal state
  - `keyboard-visualizer.ts:570-584`: Must split uncalibrated into white/black variant — `isBlackKey` is already destructured on line 570
  - `invariant-checks.ts:2660-2698`: Test currently checks "darker" — must change to check "greyscale (R≈G≈B)"

  **Acceptance Criteria**:
  - [ ] Uncalibrated cells are grey (zero color saturation), not dimmed
  - [ ] Uncalibrated white keys have same lightness as normal white keys (L=0.24)
  - [ ] Uncalibrated black keys have same lightness as normal black keys (L=0.16)
  - [ ] White/black key distinction is still visible in uncalibrated state (different greys)
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

- [ ] 3. Calibration UX — Minimize Overlay to Show Grid

  **What to do**:
  - **When entering calibration mode** (`enterCalibrationMode()` in `src/main.ts:1997`):
    - Close the overlay: add `hidden` class to `#grid-overlay` (same as clicking the cog to close it)
    - Show a small floating calibration panel instead — a minimal absolutely-positioned element with:
      - The calibration message ("Play all reachable notes, then confirm")
      - Confirm + Cancel buttons
      - Semi-transparent dark background (`rgba(0,0,0,0.7)`) so it doesn't obscure too much
      - Positioned at top-center or bottom of the keyboard area, narrow width
    - This lets the user see the FULL grid with cells greying out in real time
  - **Add the calibration panel HTML** in `index.html`:
    - A new `<div id="calibration-panel">` OUTSIDE `#grid-overlay`, positioned over the canvas
    - Contains: message text, confirm button, cancel button
    - Styled: `position: absolute; top: 8px; left: 50%; transform: translateX(-50%); z-index: 20;`
    - Background: `rgba(0,0,0,0.8)`, border: `1px solid var(--dim)`, padding
    - Font: JetBrains Mono, white text, no border-radius
    - Hidden by default (`display: none`)
  - **Update `enterCalibrationMode()`**: Hide overlay → show calibration panel
  - **Update `exitCalibrationMode()`**: Hide calibration panel → optionally reopen overlay
  - **Remove the old `#calibration-banner`** from inside the overlay (it's replaced by the floating panel)
  - **Wire the new confirm/cancel buttons** to the same `exitCalibrationMode(true/false)` methods

  **Must NOT do**:
  - Do NOT add scroll to the page
  - Do NOT use border-radius on the panel
  - Do NOT use any font other than JetBrains Mono
  - Do NOT remove the cog button or change how the main overlay opens/closes
  - Do NOT change how calibration data is collected (key press → add to calibratedCells)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - Reason: DOM visibility toggling + small HTML addition, straightforward

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: F1
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/main.ts:1997-2029` — `enterCalibrationMode()` and `exitCalibrationMode()` (must modify)
  - `index.html:939-945` — Current calibration UI inside overlay (replace with floating panel)
  - `index.html:262-289` — `#grid-overlay` styling (understand z-index, positioning)
  - `index.html:797` — `#grid-settings-btn` cog button (z-index 15 — calibration panel needs z-index > 15)

  **WHY Each Reference Matters**:
  - `main.ts:1997-2029`: The mode entry/exit functions that need to toggle overlay vs floating panel
  - `index.html:939-945`: The old calibration UI to replace
  - `index.html:262-289`: Understanding overlay z-index to ensure floating panel is above it
  - `index.html:797`: Cog button is z-index 15, calibration panel needs z-index 20+

  **Acceptance Criteria**:
  - [ ] Clicking "Calibrate range" closes the overlay and shows a floating panel
  - [ ] Full keyboard grid is visible during calibration
  - [ ] User can see cells change from greyscale to colored as they press keys
  - [ ] Confirm button saves calibration and hides the panel
  - [ ] Cancel button discards calibration and hides the panel
  - [ ] No page scroll introduced
  - [ ] All existing tests pass

  **QA Scenarios**:

  ```
  Scenario: Overlay closes and grid is visible during calibration
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
      2. Press a key (to add to calibrated cells)
      3. Click confirm on floating panel
      4. Assert: #calibration-panel is hidden
      5. Assert: calibrated range is saved (greyscale cells persist)
    Expected Result: Calibration completes from floating panel
    Evidence: .sisyphus/evidence/task-3-calibration-confirm.txt
  ```

  **Commit**: YES
  - Message: `fix(game): minimize overlay during calibration — floating panel shows grid`
  - Files: `index.html`, `src/main.ts`
  - Pre-commit: `nix develop --command npm run build && nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"`

---

## Final Verification Wave

- [ ] F1. **Build + Test + Visual QA** — `unspecified-high` (+ `playwright` skill)
  Run `nix develop --command npm run build` (exit 0). Run `nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"` (all 124+ pass). Then Playwright visual QA:
  1. Load app → open overlay → enter calibration → assert overlay closes, floating panel visible, grid visible with greyscale cells
  2. Press some keys → assert pressed cells switch from grey to colored
  3. Confirm calibration → assert panel closes, greyscale persists on unplayed cells
  4. Sample uncalibrated cell pixel: assert R≈G≈B (greyscale, ±3 tolerance)
  5. Sample normal cell pixel: assert R≠G or R≠B (has color)
  6. Drop MIDI file → assert D-ref reflects transposed median, notes centered in range
  Save all evidence to `.sisyphus/evidence/calibration-bugs-qa/`.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Visual QA [N/N] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

| Task | Message | Key Files |
|------|---------|-----------|
| T1 | `fix(game): adjust D-ref by transposition offset after calibration range fit` | main.ts |
| T2 | `fix(game): greyscale uncalibrated cells — preserve lightness, zero chroma` | note-colors.ts, keyboard-visualizer.ts, invariant-checks.ts |
| T3 | `fix(game): minimize overlay during calibration — floating panel shows grid` | index.html, main.ts |

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npm run build                    # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural"  # Expected: 124+ pass
nix develop --command npx playwright test --project=firefox --workers=1 -g "GAME-CAL"    # Expected: 4+ pass (updated CAL-4)
```

### Final Checklist
- [ ] Uncalibrated cells are greyscale (zero chroma), NOT dimmed (low lightness)
- [ ] White/black key lightness distinction preserved in greyscale state
- [ ] After calibration + MIDI load, D-ref accounts for transposition offset
- [ ] Overlay closes during calibration, floating panel visible
- [ ] Grid fully visible during calibration (cells grey out in real time)
- [ ] All 124+ existing structural tests still pass
- [ ] No `as any`, `@ts-ignore`, `@ts-expect-error`, or `!` non-null assertions

