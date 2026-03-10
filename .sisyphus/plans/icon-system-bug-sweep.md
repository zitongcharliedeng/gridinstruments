# Icon Design System + P0/P1 Bug Sweep

## TL;DR

> **Quick Summary**: Create a defensive CSS icon system that makes misalignment structurally impossible, then fix all remaining P0/P1 bugs: mobile responsive (#79), zoom slider (#78), slider desync (#70), MIDI/MPE note handling (#67), overlay scrollbar (#62). The icon system is the foundation — it fixes the 17-times-reported alignment problem AND prevents future regressions.
> 
> **Deliverables**:
> - CSS icon design system (`.icon` base class + size variants) applied to all 19 icon instances
> - ast-grep lint rule preventing ad-hoc icon styling
> - Mobile responsive header + visualiser text (#79)
> - Zoom slider fix (#78)
> - Slider fill/notch/badge single source of truth (#70)
> - MIDI input → MPE-aware note handling with proper voice tracking (#67)
> - Overlay scrollbar persistence (#62)
> - Playwright tests for each fix + updated golden screenshots
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 (icon chain) | Task 4,5,6,7,8 independent

---

## Context

### Original Request
Fix all icon alignment (asked 17 times), fix mobile view (asked 3 times), fix zoom slider, fix slider desync, fix MIDI same-note release via proper MPE input, fix overlay scrollbar. Create CSS architecture where "our framework makes it incredibly hard to mess up."

### Interview Summary
**Key Discussions**:
- The suggest SVG icon is the ONLY one that looks correct — because SVGs have explicit width/height and parent uses `inline-flex + align-items:center + gap`
- Unicode glyphs (ⓘ, ⚙, ☆, ▶, ↻, ✕) have unpredictable per-font metrics — each instance has ad-hoc CSS
- Mobile view: header buttons clipped off-screen, visualiser "Play some notes" text is Canvas 2D (not CSS) at 48px — overflows
- #67 is NOT a simple note-release fix — it's an MPE architecture issue. MIDI input should use MPE-aware voice tracking, not replicated listeners. The `noteHoldCounts` ref-counting is a bandaid. Expression forwarding (pitch bend, slide, pressure) has TODO stubs at main.ts:475-486
- User referenced briosum.com/lab/mpe-player/ and studiocode.dev/mpe-monitor/ as working examples
- User wants pitch bend range setting (±2 to ±48 semitones), CC74 timbre setting, clear input vs output distinction
- #70, #62 have existing implementations from prior commits but user says they're NOT done / NOT tested well enough with vision

### Metis Review
**Identified Gaps** (addressed):
- "Play some notes" text is Canvas 2D `ctx.fillText()` at `note-history-visualizer.ts:143-150`, NOT CSS — requires TypeScript changes
- SM-ICON-CENTER-1 test has empty body — must use `getBoundingClientRect()` not `getComputedStyle`
- Zoom slider inside `#grid-overlay` (hidden) — `offsetWidth` returns 0, breaks `applySliderFill()` and `thumbCenterPx()`
- Golden screenshots will break — need deliberate update step AFTER all visual changes
- No mobile viewport in playwright.config.ts — use per-test `page.setViewportSize()` not global config change

---

## Work Objectives

### Core Objective
Make icon alignment structurally impossible to break through a CSS design system, fix all remaining P0/P1 bugs, and establish proper MPE-aware MIDI input handling.

### Concrete Deliverables
- `.icon` / `.icon-btn` CSS classes in `index.html` `<style>` block
- All 19 icon instances migrated to use icon system
- ast-grep rule: `no-adhoc-icon-styling`
- #79: Mobile responsive at 375px+ — header wraps, canvas text scales
- #78: Zoom slider renders and interacts correctly
- #70: Slider fill/notch/badge in lockstep
- #67: MPE-aware MIDI input with voice tracking, pitch bend range setting, expression forwarding
- #62: Persistent overlay scrollbar
- Updated golden screenshots
- Playwright tests for each

### Definition of Done
- [ ] `nix develop --command npx playwright test --project=firefox --workers=1` → all pass
- [ ] `npx tsc --noEmit` → clean
- [ ] `npx ast-grep scan` → 0 new violations
- [ ] All 19 icons vertically centered (delta ≤ 2px from parent center)
- [ ] Mobile viewport 390px: all header buttons visible, no horizontal overflow
- [ ] Each fixed issue labeled "ready for review" on GitHub

### Must Have
- CSS icon system with `.icon` base class enforcing `display: inline-flex; align-items: center; justify-content: center`
- Size variants tied to CSS custom properties (not magic numbers)
- All icons use the system — zero ad-hoc `line-height`/`font-size` on icon elements
- MPE input with device+channel scoped voice tracking
- Pitch bend range as user setting (±2 to ±48 semitones)

### Must NOT Have (Guardrails)
- Do NOT create a full "design system" — scope is ONLY icon alignment classes. No spacing scale, no button variants, no responsive utilities beyond what #79 needs
- Do NOT refactor slider internals (`thumbCenterPx`, `applySliderFill`) — those are separate concern
- Do NOT add new npm dependencies (especially not MPE libraries — use bespoke implementation per user's "be elegant" directive)
- Do NOT add permanent mobile viewport project to `playwright.config.ts` — use per-test `page.setViewportSize()`
- Do NOT add `@media` queries beyond existing breakpoints (768px, 480px, 375px) unless diagnosis proves needed
- Do NOT replace Canvas 2D text with HTML — keep it canvas, just make font size responsive
- Do NOT touch synth.ts oscillator/audio code when fixing MIDI routing
- Do NOT close issues — only label "ready for review"

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES — Playwright + nix devshell
- **Automated tests**: Tests-after (add assertions for each fix)
- **Framework**: Playwright via `nix develop --command npx playwright test --project=firefox --workers=1`
- **Icon alignment**: `getBoundingClientRect()` center-Y delta assertions (NOT `getComputedStyle`)
- **Mobile**: Per-test `page.setViewportSize({ width: 390, height: 844 })` then assert no overflow

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Canvas**: Use Playwright `page.evaluate()` to measure canvas text
- **MIDI**: Use Playwright `page.evaluate()` to inject mock MIDI messages

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — icon system + diagnostics):
├── Task 1: CSS Icon Design System (.icon base class + variants) [quick]
├── Task 4: Diagnose zoom slider #78 root cause [deep]
├── Task 7: Verify + fix slider desync #70 [unspecified-high]
└── Task 8: Fix overlay scrollbar #62 [quick]

Wave 2 (Apply + P0 fixes — MAX PARALLEL):
├── Task 2: Migrate all 19 icons to icon system (depends: 1) [quick]
├── Task 3: Mobile responsive #79 — header + canvas text (depends: 1) [visual-engineering]
├── Task 5: Fix zoom slider #78 (depends: 4 diagnosis) [unspecified-high]
└── Task 6: MPE-aware MIDI input #67 — voice tracking + expression (independent) [deep]

Wave 3 (Polish + enforcement):
├── Task 9: ast-grep rule for icon system enforcement (depends: 2) [quick]
├── Task 10: Update golden screenshots + full test pass (depends: 2,3,5,7,8) [quick]
└── Task 11: Label all fixed issues "ready for review" on GitHub (depends: all) [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA at 390px + 1280px (unspecified-high + playwright skill)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 2 → Task 10 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 (Icon CSS) | — | 2, 3, 9 |
| 2 (Icon migration) | 1 | 9, 10 |
| 3 (Mobile #79) | 1 | 10 |
| 4 (Zoom diagnosis) | — | 5 |
| 5 (Zoom fix #78) | 4 | 10 |
| 6 (MIDI/MPE #67) | — | 10 |
| 7 (Slider desync #70) | — | 10 |
| 8 (Scrollbar #62) | — | 10 |
| 9 (ast-grep rule) | 2 | 10 |
| 10 (Screenshots) | 2,3,5,7,8 | F1-F4 |
| 11 (Labels) | all | — |

### Agent Dispatch Summary

- **Wave 1**: 4 tasks — T1 `quick`, T4 `deep`, T7 `unspecified-high`, T8 `quick`
- **Wave 2**: 4 tasks — T2 `quick`, T3 `visual-engineering`, T5 `unspecified-high`, T6 `deep`
- **Wave 3**: 3 tasks — T9 `quick`, T10 `quick`, T11 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high` + `playwright`, F4 `deep`

---

## TODOs

- [ ] 1. CSS Icon Design System — Foundation

  **What to do**:
  - In `index.html` `<style>` block, create a defensive icon class system:
    ```css
    /* ── Icon System ─── */
    :root { --icon-sm: 12px; --icon-md: 16px; --icon-lg: 18px; }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--icon-size, 1em);
      height: var(--icon-size, 1em);
      font-size: inherit;
      line-height: 1;
      vertical-align: middle;
    }
    .icon-sm { --icon-size: var(--icon-sm); font-size: var(--icon-sm); }
    .icon-md { --icon-size: var(--icon-md); font-size: var(--icon-md); }
    .icon-lg { --icon-size: var(--icon-lg); font-size: var(--icon-lg); }
    .icon-btn {
      /* extends .icon for clickable icons */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      font-family: var(--font);
      color: inherit;
    }
    ```
  - The key insight: the suggest SVG icon works because SVGs have explicit dimensions + parent flex centering. This system gives Unicode glyphs the same treatment.
  - `width` and `height` are set explicitly (not relying on font metrics), `inline-flex` + `align-items: center` handles vertical centering, `flex-shrink: 0` prevents squishing.

  **Must NOT do**:
  - Do NOT create a full design system — only icon classes
  - Do NOT add spacing utilities, button variants, or responsive utilities
  - Do NOT change any existing icon elements yet (that's Task 2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 7, 8)
  - **Blocks**: Tasks 2, 3, 9
  - **Blocked By**: None

  **References**:
  - `index.html:87` — `.gh-btn .star-icon` — the WORKING pattern (inline-flex + align-items:center). This is what we're systematizing.
  - `index.html:91-102` — `#about-btn` — current ad-hoc attempt at flex centering with `line-height: 1` (broken)
  - `index.html:509-523` — `.slider-info-btn` — current broken icon button with `font-size: 18px; line-height: 1`
  - `index.html:553-556` — `.slider-reset` — current broken icon button with `font-size: 14px; line-height: 1`

  **Acceptance Criteria**:
  - [ ] CSS classes `.icon`, `.icon-sm`, `.icon-md`, `.icon-lg`, `.icon-btn` exist in `<style>` block
  - [ ] CSS custom properties `--icon-sm`, `--icon-md`, `--icon-lg` defined on `:root`
  - [ ] `npx tsc --noEmit` → clean

  **QA Scenarios**:
  ```
  Scenario: Icon CSS classes exist and have correct properties
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. page.evaluate(() => { const el = document.createElement('span'); el.className = 'icon icon-md'; document.body.appendChild(el); const s = getComputedStyle(el); return { display: s.display, alignItems: s.alignItems }; })
      3. Assert display === 'inline-flex' AND alignItems === 'center'
    Expected Result: Both assertions pass
    Evidence: .sisyphus/evidence/task-1-icon-css-exists.txt
  ```

  **Commit**: YES (Commit A)
  - Message: `feat(css): icon design system — .icon base class + size variants`
  - Files: `index.html`

- [ ] 2. Migrate All 19 Icons to Icon System

  **What to do**:
  - Apply `.icon` / `.icon-btn` classes to every icon element in `index.html` and `src/main.ts`
  - Remove all ad-hoc `line-height`, `font-size`, `display: inline-flex`, `align-items` from individual icon selectors — the base class handles it
  - Complete migration checklist (every instance must be touched):

    **Header icons**:
    1. `#about-btn` (ⓘ) → add `class="icon-btn icon-md"`, remove redundant `font-size: 16px; line-height: 1; display: inline-flex; align-items: center` from CSS
    2. `.star-icon` (☆) → add `class="icon icon-md"` to the span, remove `font-size: 16px; line-height: 1; display: inline-flex; align-items: center` from CSS
    3. `.gh-mark svg` — already works (SVG has explicit w/h), add `class="icon"` to parent span for consistency
    4. `.gh-suggest svg` — same as above

    **Grid cog**:
    5. `#grid-settings-btn` (⚙) — already correct (32×32 flex centered), add `.icon-btn` class for consistency

    **Slider info buttons** (×3):
    6-8. `.slider-info-btn` (ⓘ) — add `icon-btn icon-lg`, remove `font-size: 18px; line-height: 1` from CSS rule, keep `position: absolute` positioning

    **Slider reset buttons** (×6):
    9-14. `.slider-reset` (↻) — add `icon-btn icon-md`, remove `font-size: 14px; line-height: 1` from CSS rule, keep `width: 22px; height: 18px`

    **MIDI section**:
    15. `#midi-chevron` (▶) — add `class="icon"`, remove inline `style="display:inline-flex;align-items:center;line-height:0"` — the `.icon` class handles it
    16. MIDI cog (⚙ span) — add `class="icon"`, remove inline `style="display:inline-flex;align-items:center;line-height:0"`
    17. Dynamic MIDI toggle in `src/main.ts` line ~968 — update innerHTML template to use `class="icon"` instead of inline styles

    **Dialog close buttons**:
    18. `#about-close` (✕) — add `class="icon-btn icon-md"`
    19. `#info-close` (✕) — add `class="icon-btn icon-md"`

  **Must NOT do**:
  - Do NOT change icon glyphs themselves (don't replace ⓘ with SVG etc.)
  - Do NOT change positioning logic (absolute, transform, etc.) — only alignment/sizing
  - Do NOT touch slider internals (thumbCenterPx, applySliderFill)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Task 1)
  - **Blocks**: Tasks 9, 10
  - **Blocked By**: Task 1

  **References**:
  - `index.html:87` — `.gh-btn .star-icon` current CSS to replace
  - `index.html:91-102` — `#about-btn` current CSS to replace
  - `index.html:509-523` — `.slider-info-btn` current CSS to replace
  - `index.html:553-556` — `.slider-reset` current CSS to replace
  - `index.html:779` — MIDI section inline styles to replace with classes
  - `src/main.ts:968` — Dynamic MIDI toggle innerHTML template

  **Acceptance Criteria**:
  - [ ] All 19 icon instances have `.icon` or `.icon-btn` class
  - [ ] Zero `line-height: 0` in icon elements
  - [ ] Zero ad-hoc `line-height: 1` on icon-specific selectors (only the `.icon` base class has `line-height: 1`)
  - [ ] `npx tsc --noEmit` → clean

  **QA Scenarios**:
  ```
  Scenario: All icons vertically centered within parents (happy path)
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. Click #grid-settings-btn to open overlay
      3. For each icon selector (#about-btn, .star-icon, .slider-info-btn, .slider-reset, #midi-chevron, #about-close):
         a. Get parent boundingClientRect
         b. Get icon element boundingClientRect
         c. Compute parentCenterY = parent.top + parent.height/2
         d. Compute iconCenterY = icon.top + icon.height/2
         e. Assert Math.abs(parentCenterY - iconCenterY) < 2
    Expected Result: All icons within 2px of parent vertical center
    Evidence: .sisyphus/evidence/task-2-icon-alignment.json

  Scenario: MIDI section icons not collapsed (error case)
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099, open overlay
      2. Get #midi-chevron boundingClientRect
      3. Assert height > 0 (was previously 0 due to line-height: 0)
    Expected Result: MIDI chevron has non-zero height
    Evidence: .sisyphus/evidence/task-2-midi-chevron-height.txt
  ```

  **Commit**: YES (Commit B)
  - Message: `fix(ui): migrate all 19 icons to .icon design system`
  - Files: `index.html`, `src/main.ts`

- [ ] 3. Mobile Responsive — Header + Canvas Text (#79)

  **What to do**:
  - **Header**: In `index.html` `<style>`, update `.top-bar` responsive rules at `@media (max-width: 480px)`:
    - Add `flex-wrap: wrap` to `.top-bar`
    - Reduce gap/padding on `.gh-btn` elements
    - Ensure ALL buttons (ⓘ, title, star, suggest, reset) remain visible by wrapping to second row if needed
    - Hide star count badge `#star-count-badge` on mobile (save space)
  - **Canvas text**: In `src/lib/note-history-visualizer.ts` around line 143-150 where `ctx.fillText('Play some notes', ...)` is drawn:
    - Make font size responsive: `Math.min(48, canvas.width * 0.12)` — scales with canvas width
    - Same for subtitle text: `Math.min(11, canvas.width * 0.028)`
    - Ensure `ctx.measureText(text).width < canvas.width - 20` (text fits with padding)
  - **Overflow**: Add `max-width: 100vw; overflow-x: hidden` to `body` or `#app` container if not already present

  **Must NOT do**:
  - Do NOT replace Canvas text with HTML elements
  - Do NOT add hamburger menu or complex mobile nav
  - Do NOT change desktop layout at all (only add/modify mobile breakpoints)
  - Do NOT add breakpoints beyond existing 768px, 480px, 375px

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 5, 6)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1 (icon system needed for header layout)

  **References**:
  - `index.html:63-67` — `.top-bar` current CSS (flexbox layout)
  - `index.html:71-89` — `.gh-btn`, `.gh-mark`, `.star-icon` header button CSS
  - `src/lib/note-history-visualizer.ts:143-150` — Canvas 2D `ctx.fillText('Play some notes', ...)` — THIS IS NOT CSS, it's TypeScript
  - `index.html:577-590` — existing `@media (max-width: 480px)` and `@media (max-width: 768px)` breakpoints

  **Acceptance Criteria**:
  - [ ] At 390×844 viewport: ALL header buttons visible (none clipped)
  - [ ] At 390×844 viewport: no element has `boundingClientRect.right > 390`
  - [ ] Canvas text "Play some notes" fits within canvas width at 375px viewport
  - [ ] Desktop 1280×900: layout unchanged from current

  **QA Scenarios**:
  ```
  Scenario: Mobile header buttons all visible
    Tool: Playwright
    Steps:
      1. page.setViewportSize({ width: 390, height: 844 })
      2. Navigate to http://localhost:3099
      3. Query all .top-bar children: #about-btn, .site-title, .gh-btn (star), .gh-btn.gh-suggest, #reset-layout
      4. For each: getBoundingClientRect(), assert rect.right <= 390 AND rect.left >= 0
    Expected Result: All 5 header elements fully within viewport
    Evidence: .sisyphus/evidence/task-3-mobile-header.png

  Scenario: Canvas text scales on mobile
    Tool: Playwright
    Steps:
      1. page.setViewportSize({ width: 375, height: 667 })
      2. Navigate to http://localhost:3099
      3. page.evaluate(() => { const c = document.querySelector('#note-history-canvas') as HTMLCanvasElement; const ctx = c.getContext('2d'); return ctx ? ctx.measureText('Play some notes').width < c.width : false; })
      4. Assert result === true
    Expected Result: Text measurement fits within canvas
    Evidence: .sisyphus/evidence/task-3-canvas-text-mobile.png

  Scenario: No horizontal overflow on mobile
    Tool: Playwright
    Steps:
      1. page.setViewportSize({ width: 390, height: 844 })
      2. Navigate to http://localhost:3099
      3. page.evaluate(() => document.documentElement.scrollWidth <= 390)
      4. Assert result === true
    Expected Result: No horizontal scroll
    Evidence: .sisyphus/evidence/task-3-no-overflow.txt
  ```

  **Commit**: YES (Commit C)
  - Message: `fix(ui): mobile responsive header + canvas text (#79)`
  - Files: `index.html`, `src/lib/note-history-visualizer.ts`

- [ ] 4. Diagnose Zoom Slider #78 Root Cause

  **What to do**:
  - Open `http://localhost:3099` in Playwright
  - Click `#grid-settings-btn` to open overlay
  - Screenshot the zoom slider area
  - Check if zoom slider (`#zoom-slider`) has correct attributes: `type="range"`, `min`, `max`, `step`, `value`
  - Check if `applySliderFill()` is called for zoom slider — the slider is inside `#grid-overlay` which starts hidden, so `offsetWidth` may be 0 when fill is first calculated
  - Check `refreshAllSliderUI()` at overlay open — is it called? Does it re-trigger fill for zoom?
  - Check if zoom slider has the same CSS classes as tuning/skew/volume sliders
  - Document root cause and proposed fix
  - Key suspects:
    1. `offsetWidth === 0` when overlay hidden → fill calculation breaks
    2. Zoom slider has dual binding: direct `addEventListener('input')` at line 1050 AND appActor subscriber at line 1807 — race condition?
    3. CSS specificity conflict — zoom slider may have different parent container styles
    4. `SLIDER_INPUT` dispatch at line 1839 fires before appActor subscribes at line 1807

  **Must NOT do**:
  - Do NOT implement the fix yet — this is diagnosis only
  - Do NOT refactor slider code — just find the root cause

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 7, 8)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:
  - `src/main.ts:1050` — zoom slider direct event listener
  - `src/main.ts:1807-1826` — appActor subscriber for slider UI updates
  - `src/main.ts:1839` — initial SLIDER_INPUT dispatch
  - `src/main.ts` — `refreshAllSliderUI()` function — search for it, understand all call sites
  - `src/main.ts` — `applySliderFill()` and `thumbCenterPx()` — these break when `offsetWidth === 0`
  - `index.html` — `#grid-overlay` starts with class `hidden` — all sliders inside have 0 dimensions until opened

  **Acceptance Criteria**:
  - [ ] Root cause documented in task output
  - [ ] Proposed fix described (which file, which lines, what change)
  - [ ] Screenshot of broken state captured

  **QA Scenarios**:
  ```
  Scenario: Capture zoom slider broken state
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. Click #grid-settings-btn to open overlay
      3. Screenshot the #zoom-slider area
      4. Evaluate: document.querySelector('#zoom-slider')?.offsetWidth
      5. Evaluate: getComputedStyle(document.querySelector('#zoom-slider')).width
    Expected Result: Documentation of what's broken and why
    Evidence: .sisyphus/evidence/task-4-zoom-diagnosis.png
  ```

  **Commit**: NO (diagnosis only)

- [ ] 5. Fix Zoom Slider #78

  **What to do**:
  - Implement the fix based on Task 4 diagnosis
  - Most likely fix: ensure `refreshAllSliderUI()` runs AFTER overlay becomes visible (not just `requestAnimationFrame` but after layout reflow — may need `setTimeout(fn, 0)` after removing `hidden` class)
  - If dual-binding race: consolidate to single XState subscriber pattern (like other sliders)
  - Verify zoom slider renders identically to tuning/skew/volume sliders

  **Must NOT do**:
  - Do NOT refactor all slider code — fix only zoom
  - Do NOT change slider CSS for other sliders

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 6)
  - **Blocks**: Task 10
  - **Blocked By**: Task 4

  **References**:
  - Task 4 diagnosis output (root cause + proposed fix)
  - `src/main.ts` — zoom slider wiring
  - `index.html` — zoom slider HTML and CSS

  **Acceptance Criteria**:
  - [ ] Zoom slider renders with visible track, thumb, and fill
  - [ ] Dragging zoom slider updates grid cell size
  - [ ] Badge text updates to match slider value
  - [ ] `applySliderFill` produces non-zero fill width

  **QA Scenarios**:
  ```
  Scenario: Zoom slider renders correctly
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. Click #grid-settings-btn to open overlay
      3. Get #zoom-slider boundingClientRect — assert width > 50
      4. Screenshot overlay area
      5. Get computed background of zoom slider — assert it contains gradient (fill visible)
    Expected Result: Zoom slider has visible track and fill
    Evidence: .sisyphus/evidence/task-5-zoom-fixed.png

  Scenario: Zoom slider interaction works
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Get initial zoom value: page.evaluate(() => (document.querySelector('#zoom-slider') as HTMLInputElement).value)
      3. Drag zoom slider to new position using page.locator('#zoom-slider').fill('50')
      4. Get new zoom value — assert it changed
      5. Assert grid re-rendered (keyboard-canvas dimensions or cell count changed)
    Expected Result: Slider value changes and grid updates
    Evidence: .sisyphus/evidence/task-5-zoom-interaction.txt
  ```

  **Commit**: YES (Commit D)
  - Message: `fix(ui): zoom slider rendering and interaction (#78)`
  - Files: TBD by diagnosis

- [ ] 6. MPE-Aware MIDI Input with Voice Tracking (#67)

  **What to do**:
  Read the full context in issue #67 comments carefully. The user's vision:
  
  **Core problem**: MIDI note-on/off is handled with simple key-value mapping (`activeNotes`). When two devices play the same note, releasing one kills both. The `noteHoldCounts` ref-counting for history visualizer is a bandaid.
  
  **The elegant fix** (per user: "MIDI should be coupled with sounds, not implemented with new listeners that replicate on press and on release"):
  
  1. **Voice tracking in MidiInput**: Add per-device, per-channel voice tracking to `midi-input.ts`:
     - Track active voices as `Map<string, ActiveVoice>` where key = `${deviceId}_${channel}_${note}`
     - Each voice stores: deviceId, channel, note, velocity, timestamp
     - Note-off only releases the exact voice that was pressed (device+channel+note scoped)
  
  2. **Expression forwarding**: Implement the TODO stubs at `main.ts:475-486`:
     - `onPitchBend(channel, value)` → route to correct MPE voice by channel
     - `onSlide(channel, value)` → route to correct MPE voice
     - `onPressure(channel, value)` → route to correct MPE voice
     - This requires mapping MIDI input channel → MPE noteId (currently missing)
  
  3. **MPE input settings** (in overlay, next to existing MIDI panel):
     - Pitch bend range: numeric slider, ±2 to ±48 semitones (default ±24)
     - Store in localStorage like other settings
     - Info button (ⓘ) using new `.icon-btn` class explaining what pitch bend range does
  
  4. **Same-note simultaneous handling**: When device A holds D4 and device B taps D4:
     - Both play as independent audio voices (separate `audioNoteId`)
     - Releasing device B's D4 only stops device B's voice
     - Device A's D4 continues playing
     - This is already partially handled by `noteKey = midi_${deviceId}_${midiNote}` but verify it works correctly end-to-end
  
  **Research references from user**:
  - https://briosum.com/lab/mpe-player/ — working MPE input example (crackly audio but correct note handling)
  - https://studiocode.dev/mpe-monitor/ — MPE monitor with pitch bend range options and CC timbre
  - mpe.js by ROLI is archived — do NOT use it. Build bespoke.

  **Must NOT do**:
  - Do NOT add npm dependencies (no mpe.js, no webmidi.js)
  - Do NOT touch synth.ts oscillator/audio internals
  - Do NOT change MPEService output (only input handling)
  - Do NOT build a full MPE input library — keep it focused on the voice tracking + expression routing

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `src/lib/midi-input.ts` — entire file, especially `handleMessage()` at line 147 and callback system
  - `src/main.ts:460-513` — `setupMidiListeners()`, `handleMidiNoteOn()`, `handleMidiNoteOff()` — current wiring
  - `src/main.ts:475-486` — TODO stubs for expression forwarding
  - `src/main.ts:327-328` — `noteHoldCounts` ref-counting (bandaid to evaluate)
  - `src/main.ts:1393-1425` — `trackNoteOn()` / `trackNoteOff()` — history visualizer coupling
  - `src/lib/mpe-service.ts` — existing MPE OUTPUT service (voice tracking pattern to reference, but this is OUTPUT not INPUT)
  - `src/lib/synth.ts` — `playNote(id, coordX, coordY, tuningOffset)` / `stopNote(id)` — audio API
  - Issue #67 comments — user's full requirements including pitch bend range, CC timbre, briosum/studiocode references

  **Acceptance Criteria**:
  - [ ] Two MIDI devices playing same note → two independent audio voices
  - [ ] Releasing one device's note does NOT stop the other's
  - [ ] Pitch bend from MIDI input applies to correct voice
  - [ ] Pitch bend range setting exists in overlay (±2 to ±48 semitones)
  - [ ] Pitch bend range persists in localStorage
  - [ ] `npx tsc --noEmit` → clean

  **QA Scenarios**:
  ```
  Scenario: Same note from two devices — independent voices
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. Inject mock MIDI noteOn for device "dev1", note 62, velocity 100 via page.evaluate()
      3. Assert synth has active voice for "midi_dev1_62"
      4. Inject mock MIDI noteOn for device "dev2", note 62, velocity 80
      5. Assert synth has TWO active voices for note 62
      6. Inject mock MIDI noteOff for device "dev2", note 62
      7. Assert "midi_dev1_62" voice still active, "midi_dev2_62" stopped
    Expected Result: Device 1's note survives device 2's release
    Evidence: .sisyphus/evidence/task-6-same-note-independence.txt

  Scenario: Pitch bend range setting exists and persists
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. Open overlay (#grid-settings-btn)
      3. Find pitch bend range input (slider or number input)
      4. Set value to 24
      5. Reload page, reopen overlay
      6. Assert pitch bend range value is still 24
    Expected Result: Setting persists across reload
    Evidence: .sisyphus/evidence/task-6-pitchbend-persist.txt
  ```

  **Commit**: YES (Commit E)
  - Message: `fix(midi): MPE-aware input with voice tracking + expression forwarding (#67)`
  - Files: `src/lib/midi-input.ts`, `src/main.ts`, `index.html`

- [ ] 7. Verify + Fix Slider Desync #70

  **What to do**:
  - First VERIFY: Open overlay, move each slider, check if fill/notch/badge are in lockstep
  - The issue says "single source of truth: slider value → one calculation → fill, notch, badge all derive from same normalized position"
  - Prior commit `75f87db` claims to fix this. Check if it actually works:
    - Move tuning slider slowly — does fill track thumb exactly?
    - Does badge value match slider position?
    - Do TET notch positions align with their labeled values?
  - If fix is working: document evidence and label "ready for review"
  - If fix is NOT working (user said it's not done): identify which of the three (fill/notch/badge) is still desynced and fix
  - Key function: `applySliderFill()` and `thumbCenterPx()` in main.ts — these should be the single source of truth

  **Must NOT do**:
  - Do NOT refactor slider architecture — just verify/fix the coupling
  - Do NOT touch zoom slider (that's Task 5)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4, 8)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `src/main.ts` — search for `applySliderFill`, `thumbCenterPx`, `updateSliderBadge`
  - `index.html` — slider CSS: `.slider-track`, `.slider-fill`, `.slider-badge`
  - Commit `75f87db` — the prior fix attempt: `Fix 5 issues: slider desync (#70), TET preset split (#16), checkbox blur (#22), opacity (#71), annotation sign (#50)`

  **Acceptance Criteria**:
  - [ ] Tuning slider: fill gradient endpoint matches thumb position within 2px
  - [ ] Tuning slider: badge text matches actual slider value
  - [ ] All sliders: fill + thumb + badge in lockstep when dragged

  **QA Scenarios**:
  ```
  Scenario: Slider fill tracks thumb position
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099, open overlay
      2. For tuning slider: get thumb position via page.evaluate
      3. Get fill gradient endpoint position
      4. Assert |thumbX - fillEndX| < 3px
      5. Move slider to 25%, 50%, 75% — repeat assertion at each
    Expected Result: Fill always tracks thumb within 3px
    Evidence: .sisyphus/evidence/task-7-slider-sync.json

  Scenario: Badge value matches slider position
    Tool: Playwright
    Steps:
      1. Open overlay
      2. Set tuning slider to known value via .fill()
      3. Read badge text
      4. Assert badge text reflects the set value (within rounding)
    Expected Result: Badge matches slider value
    Evidence: .sisyphus/evidence/task-7-badge-sync.txt
  ```

  **Commit**: YES if changes needed (Commit F)
  - Message: `fix(ui): slider fill/notch/badge lockstep (#70)`
  - Files: `src/main.ts` or `index.html`
  - Pre-commit: `nix develop --command npx playwright test --project=firefox --workers=1`

- [ ] 8. Fix Overlay Scrollbar #62

  **What to do**:
  - The settings overlay (`#grid-overlay`) scrollbar disappears when content overflows
  - Fix: In `index.html` CSS for `#grid-overlay`, change `overflow-y: auto` to `overflow-y: scroll`
  - OR: Add scrollbar styling to keep it always visible:
    ```css
    #grid-overlay::-webkit-scrollbar { width: 6px; }
    #grid-overlay::-webkit-scrollbar-track { background: #111; }
    #grid-overlay::-webkit-scrollbar-thumb { background: #444; }
    ```
  - Verify scrollbar is visible when overlay content exceeds viewport height

  **Must NOT do**:
  - Do NOT change overlay layout or positioning
  - Do NOT add custom scrollbar library

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4, 7)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:
  - `index.html` — `#grid-overlay` CSS rules — search for `overflow`
  - Issue #62 body — "Use `overflow-y: scroll` or ensure scrollbar styling keeps it persistently visible"

  **Acceptance Criteria**:
  - [ ] Overlay scrollbar visible when content overflows viewport
  - [ ] Scrollbar persists (does not auto-hide)

  **QA Scenarios**:
  ```
  Scenario: Scrollbar visible on content overflow
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:3099
      2. page.setViewportSize({ width: 1280, height: 400 }) (force overflow)
      3. Click #grid-settings-btn to open overlay
      4. page.evaluate(() => { const el = document.querySelector('#grid-overlay'); return el ? el.scrollHeight > el.clientHeight : false; })
      5. Assert overflow exists
      6. Screenshot overlay — scrollbar should be visible
    Expected Result: Scrollbar visible in screenshot
    Evidence: .sisyphus/evidence/task-8-scrollbar-visible.png

  Scenario: Scrollbar does not auto-hide
    Tool: Playwright
    Steps:
      1. Open overlay at small viewport
      2. Wait 3 seconds (auto-hide timeout)
      3. Screenshot again
      4. Compare — scrollbar still visible
    Expected Result: Scrollbar persists after timeout
    Evidence: .sisyphus/evidence/task-8-scrollbar-persists.png
  ```

  **Commit**: YES (Commit G)
  - Message: `fix(ui): persistent overlay scrollbar (#62)`
  - Files: `index.html`

- [ ] 9. ast-grep Rule: No Ad-Hoc Icon Styling

  **What to do**:
  - Create `ast-grep-rules/no-adhoc-icon-styling.yml` that catches common icon anti-patterns:
    - `line-height: 0` on any element containing icon Unicode characters
    - `font-size` + `line-height: 1` combination without `.icon` class
  - This is a PREVENTION rule — catches regressions before they land
  - Note: ast-grep works on AST, so this needs to target HTML/CSS patterns or the inline style attributes

  **Must NOT do**:
  - Do NOT make the rule so broad it catches non-icon elements
  - Do NOT block existing code that's already fixed by Task 2

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (after Task 2)
  - **Blocks**: Task 10
  - **Blocked By**: Task 2

  **References**:
  - `ast-grep-rules/no-imperative-test-files.yml` — existing rule pattern to follow
  - `ast-grep-rules/no-raw-dispatchevent-in-specs.yml` — existing rule pattern
  - Task 2 output (all instances migrated, so rule should have 0 violations)

  **Acceptance Criteria**:
  - [ ] Rule file exists at `ast-grep-rules/no-adhoc-icon-styling.yml`
  - [ ] `npx ast-grep scan` → 0 violations (all icons already migrated)
  - [ ] Rule catches `line-height: 0` on inline-flex icon elements

  **Commit**: YES (Commit H)
  - Message: `chore(lint): ast-grep rule preventing ad-hoc icon styling`
  - Files: `ast-grep-rules/no-adhoc-icon-styling.yml`

- [ ] 10. Update Golden Screenshots + Full Test Pass

  **What to do**:
  - Run full test suite to see which golden screenshots are broken by visual changes (Tasks 1-3, 5, 7, 8)
  - Update ALL broken golden screenshots in one pass:
    ```bash
    nix develop --command npx playwright test --project=firefox --workers=1 --update-snapshots
    ```
  - Then run again WITHOUT `--update-snapshots` to verify all pass
  - Expected breakages: GOLDEN-1 (overlay), GOLDEN-2 (title bar), GOLDEN-4 (full page), any slider screenshots

  **Must NOT do**:
  - Do NOT update snapshots for tests that haven't been affected by our changes
  - Do NOT skip failing tests — fix the root cause or update the snapshot

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after all visual changes land)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 2, 3, 5, 7, 8

  **References**:
  - `tests/visual-regression.spec.ts` — golden screenshot tests
  - `tests/xstate-graph.spec.ts-snapshots/` — per-state golden screenshots

  **Acceptance Criteria**:
  - [ ] `nix develop --command npx playwright test --project=firefox --workers=1` → ALL pass
  - [ ] `npx tsc --noEmit` → clean
  - [ ] `npx ast-grep scan` → 0 violations

  **QA Scenarios**:
  ```
  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. nix develop --command npx playwright test --project=firefox --workers=1
      2. Assert exit code 0
      3. Capture test count and pass/fail summary
    Expected Result: All tests pass, 0 failures
    Evidence: .sisyphus/evidence/task-10-full-suite.txt
  ```

  **Commit**: YES (Commit I)
  - Message: `test(golden): update screenshots after icon system + bug fixes`
  - Files: `tests/*.spec.ts-snapshots/*.png`

- [ ] 11. Label Fixed Issues on GitHub

  **What to do**:
  - For each fixed issue (#78, #79, #70, #67, #62), add a comment summarizing the fix and label "ready for review"
  - Do NOT close — only label

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: All implementation tasks
  - **Blocks**: None

  **Acceptance Criteria**:
  - [ ] Each issue has implementation summary comment
  - [ ] Each issue has "ready for review" label

  **Commit**: NO (GitHub only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `ast-grep scan` + `nix develop --command npx playwright test --project=firefox --workers=1`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task at BOTH viewports (1280×900 desktop + 390×844 mobile). Test cross-task integration. Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Commit A**: `feat(css): icon design system — .icon base class + size variants` — index.html
- **Commit B**: `fix(ui): migrate all 19 icons to icon system` — index.html, src/main.ts
- **Commit C**: `fix(ui): mobile responsive header + canvas text (#79)` — index.html, src/lib/note-history-visualizer.ts
- **Commit D**: `fix(ui): zoom slider rendering (#78)` — index.html or src/main.ts (TBD by diagnosis)
- **Commit E**: `fix(midi): MPE-aware input with voice tracking + expression (#67)` — src/lib/midi-input.ts, src/main.ts
- **Commit F**: `fix(ui): slider fill/notch/badge lockstep (#70)` — src/main.ts or index.html
- **Commit G**: `fix(ui): persistent overlay scrollbar (#62)` — index.html
- **Commit H**: `chore(lint): ast-grep rule no-adhoc-icon-styling` — ast-grep-rules/
- **Commit I**: `test(golden): update screenshots after visual changes` — tests/

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit  # Expected: clean, exit 0
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: all pass
npx ast-grep scan  # Expected: 0 new violations
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] All 19 icons use `.icon` class system
- [ ] Mobile 390px: all header buttons visible
- [ ] Zoom slider functional
- [ ] MIDI expression forwarding works
- [ ] Each issue labeled "ready for review"
