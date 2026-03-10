# P0 Regression Batch + Unfinished Issues

## TL;DR

> **Quick Summary**: Fix P0 slider fill/badge regression (overlay-hidden timing), icon sizing sitewide (2x, match letter height), info popup → centered modal, TET notch label polish, drag handle overlap + labels, MIDI header toggle, permanent scrollbar, settings cog active state, shimmer intensity, mobile responsive + tests.
> 
> **Deliverables**:
> - All overlay sliders rendering correctly (fill, badge, position)
> - Icons sitewide 2x larger, vertically aligned with text
> - ⓘ LEFT of "GridInstruments"
> - Info popup as centered dialog modal with backdrop + X button
> - TET notch labels readable with consistent spacing
> - Drag handles below navbar with VISUALISER/PEDALS labels
> - MIDI toggle as plain header (not dropdown)
> - Permanent scrollbar on overlay
> - Settings cog inverts when active
> - Shimmer 2x intensity + glow
> - Mobile responsive at 375px/768px with tests
> - All visual regression goldens regenerated
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (slider fix) → Task 4 (info popup) → Task 11 (mobile) → Task 13 (goldens)

---

## Context

### Original Request
User tested the site after previous session's 15 commits. Found P0 regressions (slider fill/badge broken on volume/zoom/d-ref), multiple unfinished issues (#48 info popup, #51 notch labels, #61 icon position, #66 notch spacing, #72 handle overlap, #26 MIDI toggle, #62 scrollbar, #58 mobile), and sitewide icon sizing complaints (10th time).

### Interview Summary
**Key Decisions**:
- Icons must match x-height of adjacent text, minimum 2x current size
- ⓘ goes LEFT of "GridInstruments" title
- Info popup reuses existing `dialogMachine` + `#info-dialog` (centered modal, backdrop dimming, X button, markdown)
- MIDI section is a collapsible header, not a dropdown
- Settings cog inverts colors (white bg, black icon) when active
- Scrollbar permanently visible on overlay
- Shimmer 2x opacity + glow effect
- Mobile tests at 375px and 768px

**Research Findings (Metis)**:
- **Root cause of slider regression**: `applySliderFill()` uses `slider.offsetWidth` which returns 0 when overlay is `display:none`. Fills/badges are calculated wrong on first open. Fix: re-trigger all slider positioning when overlay transitions from hidden → visible via `requestAnimationFrame`.
- **NumericSlider.ts is dead code** — no instantiation exists. All fill logic is in `applySliderFill()` module-level function.
- **Info popup ghost wiring**: `dialogMachine` actor + `#info-dialog` element already exist but are unused. `setupInfoDialogs()` creates inline `.info-popup` divs instead. Just need to wire OPEN events to existing actor.
- **Zoom-DPI disconnect**: `appMachine` initializes `defaultZoom: 1.0` hardcoded, while `DComposeApp.defaultZoom` calculates DPI-aware value. State disconnect on startup.

### Metis Review
**Identified Gaps** (addressed):
- Slider fill on window resize — add ResizeObserver
- Info dialog stacking — `showModal()` is exclusive
- Firefox scrollbar — need `scrollbar-width: thin` + `scrollbar-color`
- Handle labels at collapsed panel size — verify no navbar overlap
- TET notch label click targets on mobile — include in icon sizing sweep

---

## Work Objectives

### Core Objective
Fix all P0 regressions and unfinished issues reported by user, with automated test coverage preventing future regressions.

### Concrete Deliverables
- Fixed slider fill/badge/position on all overlay sliders
- Sitewide icon sizing overhaul
- ⓘ repositioned LEFT of title
- Info popup as centered dialog modal
- TET notch labels with proper spacing and screenshot test
- Drag handles with labels, below navbar
- MIDI header toggle (not dropdown)
- Permanent overlay scrollbar
- Settings cog active state inversion
- Enhanced shimmer
- Mobile responsive layout + tests at 375px/768px
- Regenerated golden screenshots

### Definition of Done
- [x] `nix develop --command npx playwright test --project=firefox --workers=1` — all tests pass
- [x] `nix develop --command npx tsc --noEmit` — zero errors
- [x] `nix develop --command npm run build` — builds clean
- [x] All changes committed and pushed to origin/main
- [x] All affected issues labeled "ready for review"

### Must Have
- Slider fill renders correctly when overlay opens (P0)
- Badge positioned over thumb on all sliders (P0)
- Icons ≥2x larger, vertically centered with adjacent text
- ⓘ LEFT of "GridInstruments"
- Info popup as centered modal with backdrop dimming + X button
- Mobile layout functional at 375px width
- Permanent scrollbar on overlay

### Must NOT Have (Guardrails)
- NO new npm dependencies
- NO changes to canvas rendering code (keyboard-visualizer.ts, note-history-visualizer.ts)
- NO changes to `overflow: hidden` on body/html
- NO closing GitHub issues — only label "ready for review"
- NO `as any`, `@ts-ignore`, `@ts-expect-error`
- NO touching NumericSlider.ts (dead code)
- NO building a "popup framework" — reuse existing dialogMachine
- NO slider fill color changes — `var(--fg)` is correct, fix TIMING only
- NO hardcoded colors — use CSS variables (`var(--fg)`, `var(--dim)`, `var(--accent)`)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright + Firefox via nix devshell)
- **Automated tests**: YES (Tests-after — add regression tests for new fixes)
- **Framework**: Playwright (firefox project)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Build**: Use Bash — `tsc --noEmit`, `npm run build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — P0 fixes + foundation):
├── Task 1: Fix slider fill/badge regression (P0) [deep]
├── Task 2: Icon sizing sitewide sweep [quick]
├── Task 3: ⓘ LEFT of GridInstruments + icon height (#61) [quick]
├── Task 4: Settings cog active state invert [quick]
├── Task 5: Permanent scrollbar on overlay (#62) [quick]
└── Task 6: Shimmer 2x intensity + glow (#57, #69) [quick]

Wave 2 (After Wave 1 — component fixes):
├── Task 7: Info popup → centered dialog modal (#48) (depends: 1, 2, 3) [deep]
├── Task 8: TET notch labels + spacing + screenshot test (#51, #66) (depends: 2) [deep]
├── Task 9: Drag handle overlap + VISUALISER/PEDALS labels (#72) (depends: 2) [deep]
├── Task 10: MIDI header toggle, not dropdown (#26) (depends: 2) [quick]
└── Task 11: Zoom DPI coupling fix (depends: 1) [deep]

Wave 3 (After Wave 2 — mobile + integration):
├── Task 12: Mobile responsive fix + tests at 375px/768px (#58) (depends: 2, 3, 7) [deep]
└── Task 13: Regenerate golden screenshots (depends: ALL) [quick]

Wave FINAL (After ALL — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real QA — Playwright (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 7 → Task 12 → Task 13 → F1-F4
Max Concurrent: 6 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 7, 11, 12, 13 |
| 2 | — | 7, 8, 9, 10, 12, 13 |
| 3 | — | 7, 12, 13 |
| 4 | — | 13 |
| 5 | — | 13 |
| 6 | — | 13 |
| 7 | 1, 2, 3 | 12, 13 |
| 8 | 2 | 13 |
| 9 | 2 | 13 |
| 10 | 2 | 13 |
| 11 | 1 | 13 |
| 12 | 2, 3, 7 | 13 |
| 13 | ALL | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 6 tasks — T1 → `deep`, T2-T6 → `quick`
- **Wave 2**: 5 tasks — T7 → `deep`, T8 → `deep`, T9 → `deep`, T10 → `quick`, T11 → `deep`
- **Wave 3**: 2 tasks — T12 → `deep`, T13 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Fix slider fill/badge/position regression (P0)

  **What to do**:
  - ROOT CAUSE: `applySliderFill()` uses `slider.offsetWidth` which returns 0 when overlay has `display:none`. Badge positioning via `thumbCenterPx()` also returns 0. Fills/badges are set once at startup (when overlay hidden) then never re-triggered on open.
  - In the `overlayActor.subscribe()` callback (around line 1095 in main.ts), add: when overlay transitions to `visible`, use `requestAnimationFrame(() => { ... })` to re-apply fill AND badge position for ALL overlay sliders: skew, shear, tuning, d-ref, volume, zoom.
  - For each slider, call `applySliderFill(slider)` AND re-trigger the badge position function (call the existing `updateXxxBadge()` / set badge `.style.left` using `thumbCenterPx()`).
  - Also add a `ResizeObserver` on `#grid-overlay` that re-triggers fills on resize (handles window resize while overlay is open).
  - Verify the fill gradient uses `var(--fg)` (white) on left, `#000` on right, proportional to slider value.
  - Verify badge text shows correct value and is positioned over the thumb.

  **Must NOT do**:
  - Do NOT change slider fill COLOR — `var(--fg)` is correct
  - Do NOT touch NumericSlider.ts (dead code)
  - Do NOT modify the slider event handler logic — only add re-trigger on visibility change

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Root cause analysis requiring understanding of XState actor lifecycle, DOM visibility timing, and slider positioning math
  - **Skills**: [`playwright`]
    - `playwright`: Needed for QA scenarios verifying slider rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 7, 11, 12, 13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/main.ts:301-314` — `applySliderFill()` function — the fill gradient calculation. Line 308: `offsetWidth` dependency. Line 310-312: fallback path when `offsetWidth` is 0.
  - `src/main.ts:284-298` — `thumbCenterPx()` + `clampBadgePosition()` — badge positioning math
  - `src/main.ts:1749-1825` — `appActor.subscribe()` callback that handles slider badge/label/fill updates for volume/zoom
  - `src/main.ts:1095` area — `overlayActor.subscribe()` callback — WHERE to add the re-trigger

  **API/Type References**:
  - `src/machines/overlayMachine.ts` — overlayMachine states: `hidden`, `visible`

  **WHY Each Reference Matters**:
  - `applySliderFill` line 308: This is where `offsetWidth` returns 0 when hidden — the bug origin
  - `overlayActor.subscribe`: This is WHERE the fix goes — detect `visible` transition, re-trigger
  - `appActor.subscribe` lines 1749-1825: Shows the pattern for how badge text/position is set — replicate this trigger

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Slider fill renders correctly on overlay open
    Tool: Playwright
    Preconditions: Fresh page load, overlay closed
    Steps:
      1. Click '#grid-settings-btn' to open overlay
      2. Wait 500ms for rAF + paint
      3. Evaluate `getComputedStyle(document.querySelector('#volume-slider')).backgroundImage` 
      4. Assert it contains 'linear-gradient'
      5. Repeat for '#zoom-slider', '#d-ref-slider', '[data-slider="skew"]', '[data-slider="bfact"]', '#tuning-slider'
    Expected Result: All 6 sliders have linear-gradient background
    Failure Indicators: Background is solid color or empty string
    Evidence: .sisyphus/evidence/task-1-slider-fill-on-open.png

  Scenario: Slider badge positioned over thumb, not at 0
    Tool: Playwright
    Preconditions: Overlay open
    Steps:
      1. Get bounding box of '#volume-slider'
      2. Get bounding box of the volume badge element (text above slider)
      3. Assert badge center X is within slider track bounds (not at far left edge for non-minimum values)
      4. Assert badge text matches current slider value
    Expected Result: Badge center X > slider left + 20px (for non-zero values)
    Evidence: .sisyphus/evidence/task-1-badge-position.png

  Scenario: Slider fill updates on window resize while overlay open
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Set viewport to 800x600
      3. Wait 500ms
      4. Check fill gradient on volume slider
      5. Set viewport to 1200x800
      6. Wait 500ms
      7. Check fill gradient again — should have different pixel breakpoint
    Expected Result: Fill gradient percentage changes with viewport width
    Evidence: .sisyphus/evidence/task-1-resize-fill.png
  ```

  **Commit**: YES
  - Message: `fix(ui): P0 slider fill/badge regression — re-trigger on overlay visible`
  - Files: `src/main.ts`
  - Pre-commit: `nix develop --command npx tsc --noEmit`

- [x] 2. Icon sizing sitewide sweep — 2x larger, match letter x-height

  **What to do**:
  - Audit ALL icons in the UI. Complete list: `#about-btn` (ⓘ next to title), `.grid-cog` (⚙ settings), `.slider-info-btn` (ⓘ on sliders), `.gh-mark svg` (GitHub octocat), `.gh-btn` (star/suggest buttons), `.star-icon` (☆), reset buttons (↻).
  - For each icon: increase `font-size` by minimum 2x. Use `vertical-align: middle` or flexbox `align-items: center` to vertically center with adjacent text.
  - The ⓘ buttons on sliders (`.slider-info-btn`) should match the slider label text height.
  - The ⓘ next to title should match "GridInstruments" text height.
  - GitHub octocat SVG should match button text height.
  - Reset buttons (↻) should match slider label height.
  - Use `line-height: 1` on icon elements to prevent extra space below.

  **Must NOT do**:
  - Do NOT change icon content/meaning
  - Do NOT add new icons
  - Do NOT use hardcoded pixel sizes — use relative units or match specific elements

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS-only changes, straightforward property updates
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 8, 9, 10, 12, 13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `index.html:387-400` area — `.slider-info-btn` CSS — current font-size ~18px
  - `index.html:633-640` area — `#about-btn` HTML + CSS
  - `index.html:590-620` area — `.gh-actions`, `.gh-btn`, `.gh-mark` CSS
  - `index.html:431-440` area — `.slider-reset` CSS

  **WHY Each Reference Matters**:
  - Each CSS block defines the current too-small icon sizes — agent must find and increase each one
  - HTML structure shows which elements contain icons vs text — needed to set correct alignment

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All icons vertically aligned with adjacent text
    Tool: Playwright
    Steps:
      1. Open page at default viewport
      2. For '#about-btn': get bounding box, compare center Y with '.site-title' center Y
      3. For '.slider-info-btn': compare center Y with nearest '.slider-label' center Y
      4. For '.gh-mark svg': compare center Y with '.gh-btn' text center Y
      5. Assert all center Y differences < 3px
    Expected Result: Icons vertically centered with text
    Evidence: .sisyphus/evidence/task-2-icon-alignment.png

  Scenario: Icons are minimum 2x previous size
    Tool: Playwright
    Steps:
      1. Measure '#about-btn' computed font-size — should be ≥ 20px (was ~12px)
      2. Measure '.slider-info-btn' computed font-size — should be ≥ 16px (was ~10px)
      3. Measure '.gh-mark svg' computed width — should be ≥ 20px (was ~11px)
    Expected Result: All icon sizes at least doubled
    Evidence: .sisyphus/evidence/task-2-icon-sizes.png
  ```

  **Commit**: YES (group with Task 3)
  - Message: `style(ui): icon sizing sitewide 2x + vertical alignment`
  - Files: `index.html`

- [x] 3. Move ⓘ LEFT of "GridInstruments" + match title height (#61)

  **What to do**:
  - In `index.html`, move `#about-btn` (ⓘ button) BEFORE `<span class="site-title">GridInstruments</span>`. Currently it's after — move it to the left.
  - Size the ⓘ to match the x-height of "GridInstruments" text (the title uses ~16px, so ⓘ should be ~16-18px font-size with no extra padding pushing it down).
  - Ensure the ⓘ button click still triggers `aboutDialogActor.send({ type: 'OPEN' })`.
  - Verify the ⓘ and title are on the same baseline.

  **Must NOT do**:
  - Do NOT change about dialog behavior
  - Do NOT move GitHub/star/suggest buttons

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7, 12, 13
  - **Blocked By**: None

  **References**:
  - `index.html:633-640` — `#about-btn` and `.site-title` HTML structure
  - `src/main.ts:189-254` — `setupInfoDialogs()` and about button wiring

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ⓘ is LEFT of "GridInstruments"
    Tool: Playwright
    Steps:
      1. Get bounding box of '#about-btn'
      2. Get bounding box of '.site-title'
      3. Assert about-btn right edge < site-title left edge
    Expected Result: ⓘ button fully to the left of the title
    Evidence: .sisyphus/evidence/task-3-info-left.png

  Scenario: ⓘ click opens about dialog
    Tool: Playwright
    Steps:
      1. Click '#about-btn'
      2. Assert '#about-dialog' has attribute 'open'
      3. Assert dialog backdrop is visible (dimmed background)
    Expected Result: About dialog opens as modal
    Evidence: .sisyphus/evidence/task-3-about-dialog.png
  ```

  **Commit**: YES (group with Task 2)
  - Files: `index.html`

- [x] 4. Settings cog active state — invert colors when overlay open

  **What to do**:
  - Update `.grid-cog.active` CSS in `index.html` to invert: `background: var(--fg); color: var(--bg); border-color: var(--fg);`
  - Currently `.grid-cog.active` keeps black background — should swap to white background + black icon.
  - Verify the cog toggles class correctly (it's wired via `overlayActor.subscribe` — `gridCog.classList.toggle('active', visible)`).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `index.html` — search for `.grid-cog` CSS rules
  - `src/main.ts` ~line 1095 — `overlayActor.subscribe` toggles `.active` class

  **QA Scenarios:**
  ```
  Scenario: Cog inverts when overlay open
    Tool: Playwright
    Steps:
      1. Get computed backgroundColor of '#grid-settings-btn' — should be black (or transparent)
      2. Click '#grid-settings-btn' to open overlay
      3. Get computed backgroundColor — should be white (var(--fg) = #fff)
      4. Get computed color — should be black (var(--bg) = #000)
    Expected Result: Background white, icon black when active
    Evidence: .sisyphus/evidence/task-4-cog-active.png
  ```

  **Commit**: YES (group with Tasks 5, 6)

- [x] 5. Permanent scrollbar on overlay (#62)

  **What to do**:
  - Change `#grid-overlay` CSS from `overflow-y: auto` to `overflow-y: scroll` so scrollbar is always visible, not just during scroll.
  - Add Firefox compatibility: `scrollbar-width: thin; scrollbar-color: var(--dim) transparent;`
  - Add webkit scrollbar styling: `::-webkit-scrollbar { width: 8px; }`, `::-webkit-scrollbar-thumb { background: var(--dim); }`, `::-webkit-scrollbar-track { background: transparent; }`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `index.html` — `#grid-overlay` CSS block

  **QA Scenarios:**
  ```
  Scenario: Scrollbar permanently visible on overlay
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Evaluate: document.querySelector('#grid-overlay').scrollHeight vs clientHeight
      3. Take screenshot showing scrollbar
    Expected Result: Scrollbar visible even if content doesn't overflow
    Evidence: .sisyphus/evidence/task-5-scrollbar.png
  ```

  **Commit**: YES (group with Tasks 4, 6)

- [x] 6. Shimmer 2x intensity + more glow (#57 follow-up, #69 follow-up)

  **What to do**:
  - In `#grid-overlay::before` CSS (the shimmer pseudo-element), double all opacity values in the gradient. Current values approximately `0.02, 0.05, 0.07` → change to `0.04, 0.10, 0.14`.
  - Add subtle glow effect: `box-shadow: inset 0 0 40px rgba(255,255,255,0.04);` on the `::before` pseudo-element.
  - Do NOT add `filter: blur()` — creates GPU compositing overhead on mobile.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 13
  - **Blocked By**: None

  **References**:
  - `index.html` — `#grid-overlay::before` CSS block with shimmer animation

  **QA Scenarios:**
  ```
  Scenario: Shimmer opacity values doubled
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Evaluate computedStyle of '#grid-overlay::before' — check background or animation
      3. Take screenshot showing shimmer
    Expected Result: Visible shimmer glow (opacity at 0.04/0.10/0.14 levels)
    Evidence: .sisyphus/evidence/task-6-shimmer.png
  ```

  **Commit**: YES (group with Tasks 4, 5)

- [x] 7. Info popup → centered dialog modal with backdrop (#48)

  **What to do**:
  - REMOVE the `setupInfoDialogs()` inline popup code entirely (lines ~189-248 in main.ts). Delete all `.info-popup` CSS from index.html.
  - REUSE the existing `#info-dialog` HTML element (line 788 in index.html) and `infoDialogActor` (`dialogMachine` instance) that are already wired but unused.
  - When a `.slider-info-btn` is clicked, send `infoDialogActor.send({ type: 'OPEN', content: SLIDER_INFO[key] })`.
  - The `infoDialogActor.subscribe()` callback already renders content into `#info-dialog-content` (via `contentEl.innerHTML = snapshot.context.content`). Just make sure the dialog uses `showModal()` for backdrop dimming.
  - Ensure the dialog has: centered position, backdrop dimming (`dialog::backdrop { background: rgba(0,0,0,0.7); }`), an X close button (`#info-close`), proper markdown/HTML rendering of SLIDER_INFO content.
  - The SLIDER_INFO content (lines 125-187 in main.ts) is already rich HTML suitable for the dialog.

  **Must NOT do**:
  - Do NOT create a new popup framework
  - Do NOT create new HTML elements — reuse `#info-dialog`
  - Do NOT change the content strings in SLIDER_INFO

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Involves removing old code, rewiring actor events, and ensuring dialog lifecycle is correct
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11)
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `src/main.ts:125-187` — `SLIDER_INFO` content strings (tuning, skew, shear)
  - `src/main.ts:189-248` — `setupInfoDialogs()` — code to REMOVE
  - `src/main.ts:191-199` — `infoDialogActor` creation + subscribe — code to KEEP and enhance
  - `index.html:788` area — `#info-dialog` HTML element already exists
  - `src/machines/dialogMachine.ts` — dialogMachine with OPEN/CLOSE events

  **QA Scenarios:**
  ```
  Scenario: Slider info button opens centered dialog modal
    Tool: Playwright
    Steps:
      1. Open overlay ('#grid-settings-btn')
      2. Click '.slider-info-btn[data-info="tuning"]'
      3. Assert '#info-dialog' has attribute 'open' (dialog.showModal() was called)
      4. Assert dialog is visually centered (bounding box center ≈ viewport center)
      5. Assert backdrop dimming exists (::backdrop with non-transparent background)
      6. Assert content contains "Fifths Tuning" text
    Expected Result: Centered modal with dimmed backdrop, showing tuning info
    Evidence: .sisyphus/evidence/task-7-info-dialog.png

  Scenario: Dialog closes on X button
    Tool: Playwright
    Steps:
      1. Open info dialog (click .slider-info-btn)
      2. Click '#info-close' (X button)
      3. Assert '#info-dialog' does NOT have attribute 'open'
    Expected Result: Dialog closes
    Evidence: .sisyphus/evidence/task-7-dialog-close.png

  Scenario: No inline .info-popup elements exist
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Click all .slider-info-btn buttons
      3. Assert page.locator('.info-popup').count() === 0
    Expected Result: Zero inline popup elements — all use dialog
    Evidence: .sisyphus/evidence/task-7-no-inline-popup.png
  ```

  **Commit**: YES
  - Message: `refactor(ui): info popup → centered dialog modal (#48)`
  - Files: `src/main.ts`, `index.html`

- [x] 8. TET notch labels — spacing, readability, screenshot test (#51, #66)

  **What to do**:
  - Fix outer TET notch marks extending too far — clamp marks to be within visible slider bounds. If `ratio < 0` or `ratio > 1`, either hide the mark or position it at the slider endpoint.
  - Fix inconsistent label spacing: long tick labels and short tick labels should have the SAME vertical space reserved. Currently the staggered ticks (`.slider-tick-staggered`) create uneven spacing.
  - Ensure TET preset labels are readable: minimum font-size 9px, adequate contrast.
  - Add a screenshot invariant test: take a screenshot of the tuning slider area and compare against golden. This catches spacing/overlap regressions automatically.

  **Must NOT do**:
  - Do NOT change TET calculation logic
  - Do NOT change preset values

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: CSS positioning + screenshot test creation
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 2

  **References**:
  - `src/main.ts:1480-1538` — `populateSliderPresets()` — mark creation, stagger logic, positioning
  - `index.html` — `.slider-preset-mark`, `.slider-tick`, `.slider-tick-long`, `.slider-tick-staggered`, `.slider-preset-btn` CSS
  - `tests/visual-regression.spec.ts` — existing golden screenshot tests — follow pattern for new test

  **QA Scenarios:**
  ```
  Scenario: All TET notch labels are within slider bounds
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Get bounding box of '#tuning-slider' track
      3. Get bounding boxes of all '.slider-preset-mark' elements in tuning container
      4. Assert all marks' left edge >= track left - 5px AND right edge <= track right + 5px
    Expected Result: No marks extending far beyond slider bounds
    Evidence: .sisyphus/evidence/task-8-notch-bounds.png

  Scenario: TET notch labels screenshot invariant
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Take screenshot of '#tuning-slider' parent container
      3. Compare against golden (first run saves golden)
    Expected Result: Screenshot matches golden within threshold
    Evidence: .sisyphus/evidence/task-8-tuning-golden.png
  ```

  **Commit**: YES
  - Message: `fix(ui): TET notch labels spacing + screenshot test (#51, #66)`
  - Files: `src/main.ts`, `index.html`, `tests/visual-regression.spec.ts`

- [x] 9. Drag handle below navbar + VISUALISER/PEDALS labels (#72)

  **What to do**:
  - Fix visualiser drag handle overlapping the top navbar. The handle must be fully below `#top-bar`. Adjust z-index or positioning so the handle renders beneath the navbar.
  - Add text labels to both drag handles: "VISUALISER" on the visualiser handle, "PEDALS" on the pedals handle. Use small, dim text (e.g., `color: var(--dim); font-size: 9px; letter-spacing: 1px; text-transform: uppercase;`).
  - Keep the existing drag grip arrows (▲▼ or ◆) alongside the text label.
  - Verify the 19 existing panel-resize tests still pass — update bounding box assertions if handle dimensions change.

  **Must NOT do**:
  - Do NOT change drag behavior logic
  - Do NOT change panel state machine
  - Do NOT change handle z-index to be above the keyboard canvas

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Must fix z-index stacking + update existing tests
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 2

  **References**:
  - `index.html` — `.panel-resize-handle` CSS + HTML
  - `index.html` — `#top-bar` CSS
  - `src/main.ts:1660-1690` — `wireHandle()` function — handle event wiring
  - `tests/panel-resize.spec.ts` — 19 tests that assert on handle position/behavior

  **QA Scenarios:**
  ```
  Scenario: Visualiser handle does NOT overlap top-bar
    Tool: Playwright
    Steps:
      1. Get bounding box of '#visualiser-panel .panel-resize-handle'
      2. Get bounding box of '#top-bar'
      3. Assert handle top >= top-bar bottom (no overlap)
    Expected Result: Handle fully below navbar
    Evidence: .sisyphus/evidence/task-9-handle-no-overlap.png

  Scenario: Handle labels visible
    Tool: Playwright
    Steps:
      1. Check '#visualiser-panel .panel-resize-handle' text contains 'VISUALISER'
      2. Check '#pedals-panel .panel-resize-handle' text contains 'PEDALS'
    Expected Result: Both handles have text labels
    Evidence: .sisyphus/evidence/task-9-handle-labels.png
  ```

  **Commit**: YES
  - Message: `fix(ui): drag handle below navbar + VISUALISER/PEDALS labels (#72)`
  - Files: `index.html`, `tests/panel-resize.spec.ts`

- [x] 10. MIDI section — plain header toggle, not dropdown (#26)

  **What to do**:
  - The MIDI section toggle should be a clickable header bar (like a collapsible section heading), NOT wrapped in any dropdown-like container.
  - Ensure it shows: chevron ▶ (rotates to ▼ when open) + ⚙ icon + "MIDI" text. When clicked, `#midi-settings-panel` expands/collapses.
  - The chevron rotation is already implemented via `midiPanelActor.subscribe()`. Verify it's working and style it as a simple section header with no box/border/dropdown appearance.
  - Style: same as other section titles in the overlay (font-size, color, spacing).

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 2

  **References**:
  - `index.html` — `#midi-settings-toggle` HTML + CSS
  - `src/main.ts:962-980` — `midiPanelActor.subscribe()` — chevron + innerHTML update

  **QA Scenarios:**
  ```
  Scenario: MIDI toggle is a plain header, not a dropdown
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Assert '#midi-settings-toggle' tagName is 'DIV' (not 'SELECT')
      3. Assert no <select> element wrapping MIDI toggle
      4. Click '#midi-settings-toggle'
      5. Assert '#midi-settings-panel' has class 'open'
      6. Assert chevron is rotated (transform contains 'rotate(90deg)')
    Expected Result: Plain header that expands/collapses
    Evidence: .sisyphus/evidence/task-10-midi-header.png
  ```

  **Commit**: YES (group with Task 9)

- [x] 11. Zoom DPI coupling fix

  **What to do**:
  - The `appMachine` initializes `defaultZoom: 1.0` (hardcoded at line ~1740 in main.ts). But `DComposeApp` calculates a DPI-aware default zoom using `window.innerWidth / 480` for touch devices and a similar heuristic for desktop.
  - Fix: Pass the DPI-calculated default zoom to `appMachine` input instead of hardcoded `1.0`.
  - Verify that on page load, the zoom slider reflects the DPI-appropriate value and the grid renders at the correct scale.
  - On mobile (375px width), the default zoom should be ≤ 1.0 (per existing test BH-MOB-2).

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires understanding app machine initialization + DPI calculation
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:
  - `src/main.ts` ~line 1740 — `appMachine` creation with `defaultZoom: 1.0`
  - `src/main.ts` — `DComposeApp` constructor where `this.defaultZoom` is calculated
  - `src/machines/appMachine.ts` — appMachine input type, defaultZoom usage
  - `tests/behavioral.spec.ts` — BH-MOB-2 test for mobile zoom

  **QA Scenarios:**
  ```
  Scenario: Desktop default zoom is appropriate for viewport
    Tool: Playwright
    Steps:
      1. Load page at 1280x800 viewport
      2. Open overlay
      3. Get zoom slider value
      4. Assert value is reasonable for viewport (0.5-2.0 range)
    Expected Result: Zoom matches viewport heuristic, not hardcoded 1.0
    Evidence: .sisyphus/evidence/task-11-zoom-dpi.png

  Scenario: Mobile default zoom ≤ 1.0
    Tool: Playwright
    Steps:
      1. Set viewport to 375x667
      2. Load page
      3. Open overlay
      4. Get zoom slider value
      5. Assert value ≤ 1.0
    Expected Result: Mobile zoom is ≤ 1.0
    Evidence: .sisyphus/evidence/task-11-mobile-zoom.png
  ```

  **Commit**: YES
  - Message: `fix(ui): zoom DPI coupling — pass calculated default to appMachine`
  - Files: `src/main.ts`, `src/machines/appMachine.ts`

- [x] 12. Mobile responsive fix + tests at 375px and 768px (#58)

  **What to do**:
  - Add CSS media queries for mobile viewports. At minimum:
    - `@media (max-width: 768px)`: Reduce top-bar padding, shrink title font, ensure all icons visible
    - `@media (max-width: 480px)`: Stack GitHub/star/suggest vertically or hide non-essential ones, ensure ⓘ and title remain visible
    - `@media (max-width: 375px)`: Minimum viable — title + ⓘ + cog visible, other items overflow gracefully
  - Ensure `#top-bar` uses `flex-wrap: wrap` or `overflow: visible` so items don't disappear off-screen.
  - Ensure the cog button remains accessible at all viewport sizes.
  - Add Playwright tests at 375px and 768px viewports checking: title visible, ⓘ visible, cog visible, no horizontal overflow.

  **Must NOT do**:
  - Do NOT add landscape orientation handling
  - Do NOT add PWA metadata
  - Do NOT change body `overflow: hidden`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: CSS responsive design + new test creation
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13 — but 13 should run after)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 2, 3, 7

  **References**:
  - `index.html` — `#top-bar`, `.gh-actions`, `.site-title` CSS
  - `tests/behavioral.spec.ts:620-649` — existing BH-MOB-1 and BH-MOB-2 tests

  **QA Scenarios:**
  ```
  Scenario: Mobile 375px — essential UI elements visible
    Tool: Playwright
    Steps:
      1. Set viewport to 375x667
      2. Assert '.site-title' is visible
      3. Assert '#about-btn' is visible
      4. Assert '#grid-settings-btn' is visible
      5. Assert no horizontal scrollbar (document.body.scrollWidth <= window.innerWidth)
    Expected Result: Core UI elements visible, no overflow
    Evidence: .sisyphus/evidence/task-12-mobile-375.png

  Scenario: Tablet 768px — all UI elements visible
    Tool: Playwright
    Steps:
      1. Set viewport to 768x1024
      2. Assert '.site-title' is visible
      3. Assert '#about-btn' is visible
      4. Assert '.gh-actions' elements are visible
      5. Assert '#grid-settings-btn' is visible
    Expected Result: Full UI visible at tablet width
    Evidence: .sisyphus/evidence/task-12-tablet-768.png
  ```

  **Commit**: YES
  - Message: `fix(ui): mobile responsive + tests at 375px/768px (#58)`
  - Files: `index.html`, `tests/behavioral.spec.ts`

- [x] 13. Regenerate golden screenshots

  **What to do**:
  - After ALL other tasks are complete, regenerate visual regression golden screenshots.
  - Run: `nix develop --command npx playwright test --project=firefox --workers=1 tests/visual-regression.spec.ts --update-snapshots`
  - Verify the new goldens look correct by inspecting them.
  - Commit the updated golden files.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after all other tasks)
  - **Blocks**: F1-F4
  - **Blocked By**: ALL tasks 1-12

  **References**:
  - `tests/visual-regression.spec.ts` — golden screenshot test file
  - `tests/visual-regression.spec.ts-snapshots/` — golden snapshot directory

  **QA Scenarios:**
  ```
  Scenario: All visual regression tests pass with new goldens
    Tool: Playwright
    Steps:
      1. Run full test suite
      2. Assert all pass (except known skips)
    Expected Result: 169+ tests pass
    Evidence: .sisyphus/evidence/task-13-all-pass.txt
  ```

  **Commit**: YES
  - Message: `test(visual): regenerate golden screenshots after UI overhaul`
  - Files: `tests/visual-regression.spec.ts-snapshots/*`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run build` + `npx playwright test --project=firefox --workers=1`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real QA** — `unspecified-high` + `playwright` skill
  Start from clean state (clear localStorage). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `fix(ui): P0 slider fill regression — re-trigger on overlay visible` + `style(ui): icon sizing sitewide 2x + vertical alignment` + `style(ui): ⓘ left of title, cog active invert, permanent scrollbar, shimmer 2x`
- **Wave 2**: `refactor(ui): info popup → centered dialog modal (#48)` + `fix(ui): TET notch labels spacing + screenshot test (#51, #66)` + `fix(ui): drag handle below navbar + VISUALISER/PEDALS labels (#72)` + `fix(ui): MIDI header toggle not dropdown (#26)` + `fix(ui): zoom DPI coupling`
- **Wave 3**: `fix(ui): mobile responsive + tests at 375px/768px (#58)` + `test(visual): regenerate golden screenshots`

---

## Success Criteria

### Verification Commands
```bash
nix develop --command npx tsc --noEmit          # Expected: no errors
nix develop --command npm run build             # Expected: exit 0
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: all pass
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] All tests pass (including new regression tests)
- [x] All golden screenshots regenerated
- [x] All affected issues labeled "ready for review"
- [x] All changes pushed to origin/main
