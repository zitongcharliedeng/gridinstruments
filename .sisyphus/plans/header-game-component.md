# Header Game Component — Song Bar + Issue Convergence

## TL;DR

> **Quick Summary**: Create a `#song-bar` header row that consolidates ALL game/song UI (calibration, search, song status, progress, difficulty, MIDI drop) into a top-level component. This is the emergent solution for #112, #117, #120 — game mode is a top-level app feature, not a per-grid overlay setting. Also fixes #123 (MIDI settings subtitle) and #113 (inactivity fade for hints).
>
> **Deliverables**:
> - `#song-bar` — always-visible header row between `#top-bar` and `#visualiser-panel`
> - Calibration button + banner moved from floating panel to song-bar
> - Song search + results moved from overlay to song-bar
> - Game status (song title, progress, restart, difficulty) moved from overlay to song-bar
> - MIDI file drop on entire document body, visually absorbed by song-bar
> - GAME section removed from grid overlay entirely
> - MIDI settings "EXPRESSION" subtitle (#123)
> - Inactivity fade for yellow hints + "play some notes" (#113)
> - All structural tests updated for new DOM layout
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 3/4/5/6 → Task 7 → Task 10 → F1-F4

---

## Context

### Original Request
User found calibration in wrong place (floating panel over grid) and identified the emergent pattern across issues #112, #117, #120: game mode is NOT a per-grid setting — it's a top-level app feature that belongs in the header. Calibration is only useful for game mode, so it belongs with game controls, not separated into a random floating panel.

### Issue Convergence Map

**Cluster 1 — Header Game Component (THIS PLAN)**:
- **#112**: "The song concept should exist outside the grid component, it should be top level anyways... maybe the song stuff and search and settings should exist as part of the header?"
- **#117**: "Drop midi file here shouldn't be on the main grid but in the new proposed header component and the midifile should be able to be dropped anywhere on the site, but visually look like it is absorbed by the hint"
- **#120**: "Calibrate range is a grid/keyboard SETTING — it has nothing to do with the song/beatmap flow. It's sandwiched between search and game status, breaking the logical flow."
- **#123**: "MIDI settings missing a subtitle within inputs. Not clear what all these checkboxes represent"
- **#113**: "Yellow paint hints should only be visible when the visualiser text tips are visible too, the 'afk' fade in and out status"

**Cluster 2 — Game Mode Evolution (FUTURE, not this plan)**:
- #125: Quantization → osu-style real-time reading
- #108: Game timing modes (flow vs quantized vs hybrid)
- #104: Game mode like video reference
- #73: Ear/aim training mode

**Cluster 3 — MIDI Input Architecture (FUTURE, not this plan)**:
- #106: Separate bend/timbre settings + info icons
- #114: Timbre CC74 vs poly press selection
- #115: Global MIDI interpretation option
- #105: iPhone/macOS WebMIDI (platform limitation)

**Cluster 4 — Architecture (FUTURE, blocked by #56)**:
- #56: Multi-grid architecture
- #107: Octave colors for two-hand grids
- #29: Full XState migration

### Interview Summary
**Key Decisions**:
- Song-bar is ALWAYS visible (not hidden until game starts) — per #112 comment: "it should say like choose a song to learn in this always visible component"
- Calibration belongs WITH game settings in song-bar — user: "it doesn't make sense for calibration to be removed from the game settings because it's only useful for the game"
- Difficulty + quantization move to song-bar alongside calibration
- MIDI file drop works on entire document body, song-bar shows drag-over highlight
- Overlay keeps only: SOUND, VISUAL, INPUT sections. GAME section fully removed.
- Inactivity state is independent from song-bar — it controls graffiti + canvas text alpha

### Metis Review
**Identified Gaps** (addressed):
- ISS-92-1 test expects 6 overlay section titles — must update to 3 (SOUND, VISUAL, INPUT)
- 7+ GAME-* tests reference elements inside `#grid-overlay` — must update for `#song-bar`
- `enterCalibrationMode()` hides overlay — must remove this since calibrate is no longer in overlay
- File drop handler on `#keyboard-canvas` — must move to `document.body`
- Song-bar needs all 3 responsive breakpoints (768px, 480px, 375px)
- "Play some notes" is Canvas 2D `ctx.fillText()` — needs alpha animation, not CSS opacity
- Chord graffiti is SVG overlay — CSS opacity transition works
- Inactivity must be suppressed during game `playing` state

---

## Work Objectives

### Core Objective
Create a top-level `#song-bar` header component that owns ALL game/song UI, moving it out of the per-grid overlay and floating panel. Fix the architectural mistake of treating game mode as a grid setting.

### Concrete Deliverables
- `#song-bar` element as direct child of `#app`, between `#top-bar` and `#visualiser-panel`
- Calibration UI (button + banner) inside `#song-bar`
- Song search (input + results) inside `#song-bar`
- Game status (title, progress, restart, difficulty) inside `#song-bar`
- MIDI file drop on `document.body` with song-bar drag-over highlight
- GAME section removed from `#grid-overlay`
- `#calibration-panel` removed from `#keyboard-container`
- MIDI settings "EXPRESSION" subtitle above expression checkboxes
- Inactivity fade for chord graffiti SVG + canvas "play some notes" text
- Updated structural tests for new DOM layout

### Definition of Done
- [ ] `nix develop --command npx playwright test --project=firefox --workers=1` — all tests pass
- [ ] `nix develop --command npm run build` — builds clean
- [ ] All changes committed and pushed to origin/main
- [ ] All affected issues labeled "ready for review"

### Must Have
- `#song-bar` exists as flex-shrink:0 child of `#app` between `#top-bar` and `#visualiser-panel`
- `#calibrate-btn`, `#calibration-banner` inside `#song-bar`
- `#midi-search-input`, `#midi-search-results` inside `#song-bar`
- `#game-status`, `#game-progress`, `#game-song-title`, `#game-reset-btn` inside `#song-bar`
- `#quantization-level` inside `#song-bar`
- `#grid-overlay` has NO `.overlay-section-title` containing "GAME"
- MIDI file drop works on document body
- Song-bar always visible with empty-state prompt ("Drop a .mid file or search for a song")
- All element IDs preserved exactly (main.ts uses `getElementById()` 15+ times on these)
- MIDI settings has "EXPRESSION" section title above Bend/Velocity/Pressure checkboxes

### Must NOT Have (Guardrails)
- NO changes to gameMachine.ts state machine logic
- NO changes to game-engine.ts, calibration.ts, midi-parser.ts, midi-search.ts
- NO changes to keyboard input behavior (R=note, Shift=vibrato, Space=sustain)
- NO new npm dependencies
- NO page-level scroll — song-bar must have fixed compact height
- NO changes to SOUND/VISUAL/INPUT overlay sections
- NO changes to synth behavior or tuning logic
- NO changes to game score overlay (position:fixed, z-index:100 — independent of song-bar)
- NO redesigning search UX — keep exact same pipeline, just move DOM elements
- NO graphical progress bar — text progress "3/45" only
- NO CSS animations beyond simple opacity transitions for inactivity fade

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright + Firefox via nix devshell)
- **Automated tests**: YES (Tests-after — add invariants for new DOM structure)
- **Framework**: Playwright (firefox project), StateInvariant objects

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Build**: Use Bash — `npm run build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation + quick fix):
├── Task 1: Create #song-bar HTML/CSS shell in index.html [quick]
├── Task 2: MIDI settings EXPRESSION subtitle (#123) [quick]

Wave 2 (After Wave 1 — parallel migration, each self-contained):
├── Task 3: Move calibration to song-bar (HTML + JS + tests) (depends: 1) [deep]
├── Task 4: Move song search to song-bar (HTML + JS + tests) (depends: 1) [deep]
├── Task 5: Move game status + difficulty + restart to song-bar (HTML + JS + tests) (depends: 1) [deep]
├── Task 6: Move MIDI file drop to document.body (JS + tests) (depends: 1) [deep]

Wave 3 (After Wave 2 — cleanup + features):
├── Task 7: Remove GAME section from overlay + delete floating panel + update overlay tests (depends: 3,4,5) [deep]
├── Task 8: Inactivity fade for graffiti + canvas text (#113) (depends: 1) [deep]
├── Task 9: Song-bar responsive (mobile breakpoints) (depends: 3,4,5) [quick]

Wave 4 (After Wave 3 — final):
├── Task 10: Full test suite pass + golden screenshots (depends: ALL) [quick]

Wave FINAL (After ALL — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — Playwright (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 3 → Task 7 → Task 10 → F1-F4
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 3, 4, 5, 6, 8, 9 |
| 2 | — | 10 |
| 3 | 1 | 7, 9, 10 |
| 4 | 1 | 7, 9, 10 |
| 5 | 1 | 7, 9, 10 |
| 6 | 1 | 10 |
| 7 | 3, 4, 5 | 10 |
| 8 | 1 | 10 |
| 9 | 3, 4, 5 | 10 |
| 10 | ALL | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `quick`
- **Wave 2**: 4 tasks — T3-T6 → `deep`
- **Wave 3**: 3 tasks — T7 → `deep`, T8 → `deep`, T9 → `quick`
- **Wave 4**: 1 task — T10 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Create `#song-bar` HTML/CSS shell in index.html

  **What to do**:
  - Add a new `<div id="song-bar">` as a direct child of `#app`, AFTER `</header>` (line 783) and BEFORE `#visualiser-panel` (line 786).
  - Layout: `display:flex; align-items:center; gap:8px; padding:2px 8px; flex-shrink:0; border-bottom:1px solid var(--border); font-size:11px; min-height:28px; z-index:2;`
  - **Empty state**: When no song is loaded, show placeholder text: `<span id="song-bar-hint" style="color:var(--dim);font-size:10px;">Drop a .mid file or search for a song to learn</span>`
  - **Structure** (empty containers — elements will be moved in later tasks):
    ```
    #song-bar
    ├── #song-bar-calibrate  (will hold calibrate btn + banner)
    ├── #song-bar-search     (will hold search input + results)
    ├── #song-bar-status     (will hold song title + progress + restart + difficulty)
    └── #song-bar-hint       (placeholder text, hidden when song loaded)
    ```
  - Add CSS for `#song-bar` and child containers. Follow `#top-bar` styling patterns (index.html:98-152).
  - The song-bar should be compact (28-32px default height) and expand only when calibration banner is visible.

  **Must NOT do**:
  - Do NOT move any existing elements yet — just create the empty shell
  - Do NOT change any other part of index.html

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 3, 4, 5, 6, 8, 9
  - **Blocked By**: None

  **References**:
  - `index.html:98-152` — `#top-bar` CSS patterns to follow
  - `index.html:767-783` — `<header id="top-bar">` HTML where song-bar goes AFTER
  - `index.html:786` — `#visualiser-panel` where song-bar goes BEFORE

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Song-bar exists in correct DOM position
    Tool: Playwright
    Steps:
      1. Navigate to page
      2. Assert `page.locator('#song-bar')` is visible
      3. Evaluate: `document.getElementById('song-bar').previousElementSibling.id` → 'top-bar'
      4. Evaluate: `document.getElementById('song-bar').nextElementSibling.id` → 'visualiser-panel'
      5. Assert `#song-bar-hint` text contains 'Drop a .mid file'
    Expected Result: Song-bar between top-bar and visualiser, shows empty-state hint
    Evidence: .sisyphus/evidence/task-1-song-bar-shell.png

  Scenario: Song-bar has correct CSS properties
    Tool: Playwright
    Steps:
      1. Evaluate computed style of `#song-bar`: flexShrink === '0'
      2. Assert min-height >= 28px
      3. Assert display is 'flex'
    Expected Result: Song-bar is flex-shrink:0, flex display
    Evidence: .sisyphus/evidence/task-1-song-bar-css.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add #song-bar header shell for game/song controls`
  - Files: `index.html`

- [x] 2. MIDI settings EXPRESSION subtitle (#123)

  **What to do**:
  - In `index.html`, find the MIDI expression checkboxes (Bend, Velocity, Pressure) at lines 905-917.
  - Add `<span class="overlay-section-title">EXPRESSION</span>` BEFORE the div containing the expression checkboxes (before line 905).
  - This gives the checkbox group a clear heading, matching the pattern of other overlay sections.
  - The section title uses `color:var(--dim)` per existing `.overlay-section-title` CSS.

  **Must NOT do**:
  - Do NOT change any checkbox behavior or wiring
  - Do NOT change the pitch bend range input
  - Do NOT restructure the MIDI panel layout beyond adding the heading

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `index.html:905-917` — Expression checkboxes (Bend, Velocity, Pressure)
  - `index.html:290-332` — `.overlay-section-title` CSS styling

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: EXPRESSION subtitle exists above checkboxes
    Tool: Playwright
    Steps:
      1. Open overlay (click '#grid-settings-btn')
      2. Scroll to MIDI section, click '#midi-settings-toggle' to expand
      3. Assert text 'EXPRESSION' exists within '#midi-settings-panel'
      4. Evaluate: the EXPRESSION title element is BEFORE the Bend checkbox in DOM order
    Expected Result: "EXPRESSION" heading visible above Bend/Velocity/Pressure
    Evidence: .sisyphus/evidence/task-2-expression-subtitle.png
  ```

  **Commit**: YES
  - Message: `fix(ui): #123 — add EXPRESSION subtitle to MIDI settings panel`
  - Files: `index.html`
  - Pre-commit: `nix develop --command npm run build`

---

- [x] 3. Move calibration from floating panel to song-bar

  **What to do**:
  - **HTML**: Move the contents of `#calibration-panel` (index.html:800-809) INTO `#song-bar-calibrate` container.
    - Move `#calibrate-btn`, `#calibration-banner`, `#calibration-msg`, `#calibrate-confirm`, `#calibrate-cancel`
    - Remove the old `#calibration-panel` div (the position:absolute wrapper)
    - Keep ALL element IDs exactly the same
  - **JS**: Update `enterCalibrationMode()` (main.ts:2036-2048):
    - REMOVE line 2040-2041: `const overlay = document.getElementById('grid-overlay'); if (overlay) overlay.classList.add('hidden');` — calibrate no longer needs to hide the overlay
    - The rest stays (set calibrating=true, clear cells, show banner, hide btn)
  - **JS**: Update `exitCalibrationMode()` (main.ts:2051-2073): No changes needed — it doesn't reference the overlay.
  - **CSS**: Remove the inline `style` from the old `#calibration-panel` wrapper. Add CSS for `#song-bar-calibrate` — inline-flex, align-items:center, gap:6px.
  - **Tests**: Update GAME-CAL-1 (expects `#calibrate-btn` exists) — should still pass if ID preserved. Update GAME-CAL-4 if it opens overlay to find calibrate btn — calibrate is now in song-bar, not overlay.

  **Must NOT do**:
  - Do NOT change calibration persistence logic (calibration.ts)
  - Do NOT change calibratedCells/calibratedRange data flow
  - Do NOT rename any element IDs

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: HTML move + JS update + test update across 3 files
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Tasks 7, 9, 10
  - **Blocked By**: Task 1

  **References**:
  - `index.html:800-809` — `#calibration-panel` HTML to move
  - `src/main.ts:2036-2073` — `enterCalibrationMode()` / `exitCalibrationMode()` — must remove overlay hide
  - `src/main.ts:1323-1328` — Calibrate button event listeners (safe — IDs preserved)
  - `tests/machines/invariant-checks.ts` — GAME-CAL-1, GAME-CAL-4 assertions

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Calibrate button is inside song-bar, not keyboard-container
    Tool: Playwright
    Steps:
      1. Assert `page.locator('#song-bar #calibrate-btn')` is visible
      2. Assert `page.locator('#keyboard-container #calibration-panel')` count === 0
      3. Click '#calibrate-btn'
      4. Assert '#calibration-banner' is visible inside '#song-bar'
      5. Assert '#grid-overlay' is NOT hidden (calibration no longer hides overlay)
    Expected Result: Calibration UI fully in song-bar, overlay untouched
    Evidence: .sisyphus/evidence/task-3-calibrate-in-songbar.png

  Scenario: Calibration mode still works correctly
    Tool: Playwright
    Steps:
      1. Click '#calibrate-btn'
      2. Assert '#calibration-msg' text is 'Play all reachable notes, then confirm'
      3. Click '#calibrate-cancel'
      4. Assert '#calibrate-btn' is visible again, banner hidden
    Expected Result: Full calibrate → cancel flow works from song-bar
    Evidence: .sisyphus/evidence/task-3-calibrate-flow.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): move calibration from floating panel to song-bar (#112, #120)`
  - Files: `index.html`, `src/main.ts`, `tests/machines/invariant-checks.ts`

- [x] 4. Move song search from overlay to song-bar

  **What to do**:
  - **HTML**: Move `#midi-search-input` and `#midi-search-results` (index.html:950-951) from the GAME overlay section INTO `#song-bar-search` container.
  - Remove the `<div class="overlay-section-title">SONG SEARCH</div>` from overlay (it's now part of the song-bar context).
  - Keep ALL element IDs exactly the same.
  - Style the search input for horizontal song-bar context: `width:200px` (not 100%), compact, with a small magnifier icon or "🔍" prefix.
  - Style search results as a dropdown below the input (position:absolute from song-bar-search, z-index:25, max-height:300px, overflow-y:auto, background:var(--bg), border:1px solid var(--border)).

  **Must NOT do**:
  - Do NOT change the search pipeline logic (main.ts:1462-1530 — debounce, adapters, rendering)
  - Do NOT change search result click handlers
  - Do NOT rename element IDs

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: HTML restructure + CSS dropdown positioning + test updates
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 5, 6)
  - **Blocks**: Tasks 7, 9, 10
  - **Blocked By**: Task 1

  **References**:
  - `index.html:949-951` — SONG SEARCH title + input + results div
  - `src/main.ts:1462-1530` — Search pipeline wiring (getElementById calls — safe if IDs preserved)
  - `tests/machines/invariant-checks.ts` — GAME-SEARCH-1, GAME-SEARCH-6 test assertions

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Search input is inside song-bar
    Tool: Playwright
    Steps:
      1. Assert `page.locator('#song-bar #midi-search-input')` is visible
      2. Assert `page.locator('#grid-overlay #midi-search-input')` count === 0
      3. Type 'twinkle' into '#midi-search-input'
      4. Wait 2000ms for debounce + search
      5. Assert '#midi-search-results' has child elements (search results rendered)
    Expected Result: Search works from song-bar, results appear as dropdown
    Evidence: .sisyphus/evidence/task-4-search-in-songbar.png

  Scenario: Search results dropdown positioned correctly
    Tool: Playwright
    Steps:
      1. Type 'bach' into '#midi-search-input'
      2. Wait for results
      3. Get bounding box of '#midi-search-results'
      4. Assert results top >= song-bar bottom (dropdown appears below song-bar)
      5. Assert results has max-height constraint (not infinite)
    Expected Result: Results dropdown below song-bar, not overflowing page
    Evidence: .sisyphus/evidence/task-4-search-dropdown.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): move song search from overlay to song-bar (#112)`
  - Files: `index.html`, `tests/machines/invariant-checks.ts`

- [x] 5. Move game status + difficulty + restart to song-bar

  **What to do**:
  - **HTML**: Move the following from GAME overlay section INTO `#song-bar-status` container:
    - `#game-status` div (contains song title, progress, quantization badge, restart button) — lines 952-959
    - `#quantization-level` select (difficulty setting) — lines 942-948
    - The "DIFFICULTY" section title can be a compact label in song-bar
    - The instruction text `<p>Drop a .mid file...</p>` (line 935) is REMOVED — replaced by `#song-bar-hint`
  - Keep ALL element IDs exactly the same.
  - Layout: compact inline flow. When no song loaded, these are hidden (display:none). When song loads, show song title + progress + difficulty selector + restart button in a row.
  - The `#song-bar-hint` (from Task 1) should be hidden when `#game-status` is visible, and vice versa.

  **Must NOT do**:
  - Do NOT change gameMachine state machine logic
  - Do NOT change game actor subscription handlers (main.ts:1342-1420 — they set #game-status display and text)
  - Do NOT rename element IDs

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multiple elements moving, visibility toggle logic, test updates
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 6)
  - **Blocks**: Tasks 7, 9, 10
  - **Blocked By**: Task 1

  **References**:
  - `index.html:933-960` — Full GAME overlay section
  - `src/main.ts:1342-1420` — Game actor subscription that manipulates #game-status, #game-progress, #game-song-title
  - `src/main.ts:1775-1843` — `loadMidiFromBuffer()` sets #game-song-title, #game-quantization-badge
  - `tests/machines/invariant-checks.ts` — GAME-UI-1, GAME-UI-2 test assertions

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Game status elements inside song-bar
    Tool: Playwright
    Steps:
      1. Assert `page.locator('#song-bar #game-status')` exists
      2. Assert `page.locator('#song-bar #quantization-level')` exists
      3. Assert `page.locator('#song-bar #game-reset-btn')` exists
      4. Assert `page.locator('#grid-overlay #game-status')` count === 0
    Expected Result: All game UI in song-bar, none in overlay
    Evidence: .sisyphus/evidence/task-5-status-in-songbar.png

  Scenario: Song-bar hint hidden when song loaded, visible when empty
    Tool: Playwright
    Steps:
      1. Assert '#song-bar-hint' is visible (no song loaded)
      2. Assert '#game-status' has display:none (no song)
    Expected Result: Hint visible, status hidden when no song
    Evidence: .sisyphus/evidence/task-5-empty-state.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): move game status + difficulty from overlay to song-bar (#112, #120)`
  - Files: `index.html`, `tests/machines/invariant-checks.ts`

- [x] 6. Move MIDI file drop to document.body (#117)

  **What to do**:
  - **JS**: In main.ts, find the file drop handler on `#keyboard-canvas` (around line 1424-1458). Change the event target from `this.canvas` to `document.body`.
  - Keep the same handler logic: `dragenter`, `dragover`, `dragleave`, `drop` events.
  - **Visual feedback**: Instead of `canvas.dataset.dropping = 'true'`, apply the highlight to `#song-bar`:
    - On dragover with MIDI file: `songBar.classList.add('dropping')`
    - On dragleave/drop: `songBar.classList.remove('dropping')`
  - **CSS**: Add `#song-bar.dropping { outline: 2px solid rgba(255,255,255,0.7); outline-offset: -2px; }` to index.html.
  - Remove the `#keyboard-canvas[data-dropping="true"]` CSS rule (index.html:234-238).

  **Must NOT do**:
  - Do NOT change the MIDI file parsing logic
  - Do NOT change `loadMidiFromBuffer()` or game actor events
  - Do NOT add drag-and-drop to individual elements — only document.body

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Event handler migration + visual feedback change
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:
  - `src/main.ts:1424-1458` — File drop handler on canvas (dragenter/dragover/dragleave/drop)
  - `index.html:234-238` — `#keyboard-canvas[data-dropping="true"]` CSS to remove
  - `tests/machines/invariant-checks.ts` — GAME-DROP-1 test (canvas accepts pointer events — may need update)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: File drop on document.body triggers song load
    Tool: Playwright
    Steps:
      1. Create a programmatic DataTransfer with a .mid file
      2. Dispatch 'dragover' on document.body
      3. Assert '#song-bar' has class 'dropping'
      4. Dispatch 'drop' on document.body with the DataTransfer
      5. Assert '#song-bar' does NOT have class 'dropping' (removed after drop)
    Expected Result: Drop on body triggers MIDI load, song-bar shows drag highlight
    Evidence: .sisyphus/evidence/task-6-body-drop.png

  Scenario: Canvas no longer has drop styling
    Tool: Playwright
    Steps:
      1. Assert CSS rule `#keyboard-canvas[data-dropping="true"]` does NOT exist
      2. Assert '#keyboard-canvas' has no 'data-dropping' attribute
    Expected Result: Canvas drop styling removed
    Evidence: .sisyphus/evidence/task-6-no-canvas-drop.txt
  ```

  **Commit**: YES
  - Message: `refactor(ui): move MIDI file drop to document.body (#117)`
  - Files: `src/main.ts`, `index.html`, `tests/machines/invariant-checks.ts`

---

- [ ] 7. Remove GAME section from overlay + cleanup

  **What to do**:
  - **HTML**: Remove the entire GAME section from `#grid-overlay` (index.html lines 933-960):
    - Remove `<div class="overlay-section-title">GAME</div>`
    - Remove the `<div class="overlay-section">` wrapper and ALL its children (the instruction paragraph, difficulty, search, status — all already moved by T3-T5)
  - **HTML**: Remove the old `#calibration-panel` div from `#keyboard-container` (already moved by T3, but the empty wrapper may remain).
  - **Tests**: Update ISS-92-1: overlay now has 3 section titles (SOUND, VISUAL, INPUT), NOT 6. Find the invariant check that counts `.overlay-section-title` elements and update the expected count.
  - **Tests**: Update or remove GAME-UI-2 (which asserted the instruction paragraph exists in GAME section — paragraph is removed, replaced by `#song-bar-hint`).
  - Run full test suite to confirm no regressions.

  **Must NOT do**:
  - Do NOT remove SOUND, VISUAL, or INPUT sections
  - Do NOT change overlay show/hide logic
  - Do NOT change overlay shimmer or scrollbar

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Must carefully remove HTML without breaking remaining overlay + update multiple tests
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - `index.html:933-960` — GAME overlay section to remove
  - `index.html:800-809` — Old calibration panel wrapper to remove
  - `tests/machines/invariant-checks.ts` — ISS-92-1 (overlay section title count), GAME-UI-2 (instruction text)
  - `tests/xstate-graph.spec.ts` — Where ISS-92-1 is registered

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Overlay has no GAME section
    Tool: Playwright
    Steps:
      1. Click '#grid-settings-btn' to open overlay
      2. Evaluate: count of '.overlay-section-title' elements inside '#grid-overlay'
      3. Assert count reflects only SOUND, VISUAL, INPUT sections
      4. Assert NO element with text 'GAME' inside '#grid-overlay'
    Expected Result: GAME section fully removed from overlay
    Evidence: .sisyphus/evidence/task-7-no-game-in-overlay.png

  Scenario: No floating calibration panel exists
    Tool: Playwright
    Steps:
      1. Assert `page.locator('#keyboard-container #calibration-panel')` count === 0
    Expected Result: Old floating panel wrapper removed
    Evidence: .sisyphus/evidence/task-7-no-floating-panel.txt
  ```

  **Commit**: YES
  - Message: `refactor(ui): remove GAME section from overlay + cleanup (#120)`
  - Files: `index.html`, `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`

- [ ] 8. Inactivity fade for graffiti + canvas text (#113)

  **What to do**:
  - **Concept**: When no notes are active and note history is empty (idle state), the yellow chord graffiti SVG and "Play some notes" canvas text should fade IN after a timeout. When notes play, they fade OUT immediately.
  - **Graffiti (SVG)**: The `.graffiti-overlay` element (or the `#chord-graffiti` SVG canvas) needs:
    - CSS: `transition: opacity 1.5s ease;`
    - JS: On note activity → `graffitiEl.style.opacity = '0'`
    - JS: On idle (setTimeout ~5s after last note-off) → `graffitiEl.style.opacity = '1'`
  - **"Play some notes" (Canvas 2D)**: In `note-history-visualizer.ts`, the `ctx.fillText('Play some notes')` call (around line 143-150) renders when history is empty. Add an alpha property that fades from 0 to 1 over time after inactivity:
    - Add `idleAlpha: number` field to NoteHistoryVisualizer
    - On render: if no notes playing AND history empty, increment `idleAlpha` by small delta per frame toward 1.0
    - On any note-on: set `idleAlpha = 0`
    - Use `ctx.globalAlpha = this.idleAlpha` before drawing the text, restore after
  - **Game mode suppression**: During gameMachine `playing` state, suppress graffiti entirely (opacity stays 0). The inactivity behavior is for free-play mode only.
  - Find the idle/activity signals: `activeNotes.size` in the DComposeApp class, or subscribe to the synth's note-on/note-off events.

  **Must NOT do**:
  - Do NOT change graffiti drawing logic (chord-graffiti.ts)
  - Do NOT change note history rendering beyond the alpha fade
  - Do NOT add npm dependencies for animation

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Cross-cutting concern touching SVG overlay, canvas renderer, and game state
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1

  **References**:
  - `src/lib/chord-graffiti.ts` — SVG graffiti overlay, `.graffiti-overlay` element
  - `src/lib/note-history-visualizer.ts:143-150` — Canvas `ctx.fillText('Play some notes...')`
  - `src/main.ts` — DComposeApp `activeNotes` tracking, game actor subscription
  - `index.html` — `.graffiti-overlay` or `#chord-hints-svg` element (find by searching)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Graffiti has CSS opacity transition
    Tool: Playwright
    Steps:
      1. Evaluate: find the graffiti SVG overlay element
      2. Assert its computed CSS `transition` includes 'opacity'
    Expected Result: Graffiti element has opacity transition
    Evidence: .sisyphus/evidence/task-8-graffiti-transition.txt

  Scenario: Canvas text fades in after idle period
    Tool: Playwright
    Steps:
      1. Navigate to page, wait 8 seconds (no interaction)
      2. Take screenshot of '#history-canvas'
      3. Assert the canvas is not fully black (text should be visible)
    Expected Result: "Play some notes" text visible after inactivity
    Evidence: .sisyphus/evidence/task-8-idle-text.png
  ```

  **Commit**: YES
  - Message: `feat(ui): #113 — inactivity fade for hints and graffiti`
  - Files: `src/lib/note-history-visualizer.ts`, `src/main.ts`, `index.html`

- [ ] 9. Song-bar responsive for mobile breakpoints

  **What to do**:
  - Add media queries for `#song-bar` at the same breakpoints as `#top-bar`:
    - `@media (max-width: 768px)`: Reduce padding, smaller font. Search input width shrinks.
    - `@media (max-width: 480px)`: Song-bar wraps to two lines if needed (`flex-wrap:wrap`). Search may hide behind a toggle.
    - `@media (max-width: 375px)`: Show only essential elements: current song title + progress. Calibrate and search accessible via expand.
  - Ensure total header height (top-bar + song-bar) doesn't consume too much vertical space on mobile — max ~64px combined on 375px viewport.
  - Test at 375x667 (iPhone SE) and 768x1024 (iPad) viewports.

  **Must NOT do**:
  - Do NOT change body overflow:hidden
  - Do NOT add landscape orientation handling
  - Do NOT hide song-bar entirely on mobile — it must remain accessible

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - `index.html:688-730` — Existing media queries for `#top-bar`
  - `index.html` — `#song-bar` CSS (created in T1)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Song-bar visible at 375px mobile width
    Tool: Playwright
    Steps:
      1. Set viewport to 375x667
      2. Assert '#song-bar' is visible
      3. Assert total height of '#top-bar' + '#song-bar' <= 64px
      4. Assert no horizontal scrollbar
    Expected Result: Song-bar compact and visible on mobile
    Evidence: .sisyphus/evidence/task-9-mobile-375.png

  Scenario: Song-bar visible at 768px tablet width
    Tool: Playwright
    Steps:
      1. Set viewport to 768x1024
      2. Assert '#song-bar' is visible
      3. Assert '#midi-search-input' is visible
    Expected Result: Full song-bar visible at tablet width
    Evidence: .sisyphus/evidence/task-9-tablet-768.png
  ```

  **Commit**: YES
  - Message: `fix(ui): song-bar responsive for mobile breakpoints`
  - Files: `index.html`

- [ ] 10. Full test suite pass + golden screenshots

  **What to do**:
  - Run full test suite: `nix develop --command npx playwright test --project=firefox --workers=1`
  - If any tests fail due to DOM structure changes not caught by earlier tasks, fix them.
  - Regenerate golden screenshots: `nix develop --command npx playwright test --project=firefox --workers=1 --update-snapshots`
  - Verify the new goldens look correct.
  - Commit updated golden files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: F1-F4
  - **Blocked By**: ALL tasks 1-9

  **References**:
  - `tests/xstate-graph.spec.ts` — Main test file
  - `tests/xstate-graph.spec.ts-snapshots/` — Golden screenshot directory

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All tests pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1
      2. Assert all tests pass, 0 failures
    Expected Result: Full green suite
    Evidence: .sisyphus/evidence/task-10-all-pass.txt
  ```

  **Commit**: YES
  - Message: `test(visual): regenerate golden screenshots after song-bar restructure`
  - Files: `tests/xstate-graph.spec.ts-snapshots/*`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build` + `nix develop --command npx playwright test --project=firefox --workers=1`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real QA** — `unspecified-high` + `playwright` skill
  Start from clean state. Execute EVERY QA scenario from EVERY task. Test cross-task integration (song search → load song → calibrate → play). Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Commit Message |
|------|---------------|
| 1 | `feat(ui): add #song-bar header shell for game/song controls` |
| 1 | `fix(ui): #123 — add EXPRESSION subtitle to MIDI settings panel` |
| 2 | `refactor(ui): move calibration from floating panel to song-bar` |
| 2 | `refactor(ui): move song search from overlay to song-bar` |
| 2 | `refactor(ui): move game status + difficulty from overlay to song-bar` |
| 2 | `refactor(ui): move MIDI file drop to document.body (#117)` |
| 3 | `refactor(ui): remove GAME section from overlay + cleanup floating panel` |
| 3 | `feat(ui): #113 — inactivity fade for hints and graffiti` |
| 3 | `fix(ui): song-bar responsive for mobile breakpoints` |
| 4 | `test(visual): regenerate golden screenshots after song-bar restructure` |

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npm run build             # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: all pass
```

### Final Checklist
- [ ] `#song-bar` exists between `#top-bar` and `#visualiser-panel`
- [ ] ALL game UI elements inside `#song-bar` (calibrate, search, status, difficulty, restart)
- [ ] `#grid-overlay` has NO game section
- [ ] `#calibration-panel` removed from `#keyboard-container`
- [ ] MIDI file drop works on document body
- [ ] MIDI settings has EXPRESSION subtitle
- [ ] Inactivity fades graffiti + canvas text
- [ ] All tests pass
- [ ] All affected issues labeled "ready for review"
