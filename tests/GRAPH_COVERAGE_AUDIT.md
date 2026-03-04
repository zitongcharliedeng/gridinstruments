# Graph Coverage Audit

**Date:** 2026-03-04
**Graph tests:** 32 (in `xstate-graph.spec.ts`)
**Existing tests:** 144 across 6 spec files

## Classification Key

- **(A) Fully Superseded** — Graph test covers the same state transition with equivalent or stronger assertions. Mark `@deprecated`.
- **(B) Partially Covered** — Graph test covers the state transition, but existing test checks additional edge cases or details not modelled in the machine. Keep, add `@see` cross-reference.
- **(C) Not Covered** — Unique test with no graph equivalent. Keep as-is.

---

## Graph Test Coverage Summary

| Machine | States | Transitions | Graph Tests |
|---------|--------|-------------|-------------|
| overlay | 2 (hidden, visible) | CLICK_COG, CLICK_BACKDROP, PRESS_ESCAPE | 4 |
| visualiser | 3 (default, expanded, collapsed) | DRAG_VIS_EXPAND, TOGGLE_VIS_COLLAPSE, DBLCLICK_VIS_HANDLE | 6 |
| pedals | 3 (default, expanded, collapsed) | DRAG_PED_EXPAND, TOGGLE_PED_COLLAPSE, DBLCLICK_PED_HANDLE | 6 |
| waveform | 4 (sawtooth, sine, square, triangle) | SELECT_SAWTOOTH, SELECT_SINE, SELECT_SQUARE, SELECT_TRIANGLE | 12 |
| sustain | 2 (inactive, active) | PRESS_SPACE, RELEASE_SPACE | 2 |
| vibrato | 2 (inactive, active) | PRESS_SHIFT, RELEASE_SHIFT | 2 |
| **Total** | | | **32** |

---

## overlay-regression.spec.ts (19 tests)

| Test | Classification | Graph Equivalent | Rationale |
|------|---------------|------------------|-----------|
| OV-HIDDEN-1 | **(A) Superseded** | `overlay: hidden → CLICK_COG → visible` (Step 2 asserts source=hidden) | Graph test asserts `#grid-overlay` has `hidden` class before cog click — same check. |
| OV-TOGGLE-1 | **(A) Superseded** | `overlay: hidden → CLICK_COG → visible` | Graph test clicks cog, asserts overlay visible — identical. |
| OV-TOGGLE-2 | **(A) Superseded** | `overlay: visible → CLICK_COG → hidden` | Graph test: visible state → CLICK_COG → asserts hidden — identical. |
| OV-TOGGLE-3 | **(A) Superseded** | `overlay: visible → CLICK_BACKDROP → hidden` | Graph test clicks backdrop, asserts hidden — identical. |
| OV-BG-1 | **(C) Not Covered** | — | CSS property check (background-color). Not modelled in machines. |
| OV-SHIMMER-1 | **(C) Not Covered** | — | CSS animation check. Not modelled in machines. |
| OV-SECTIONS-1 | **(C) Not Covered** | — | DOM structure count. Not modelled in machines. |
| OV-WAVE-1 | **(A) Superseded** | `waveform: sawtooth → SELECT_SINE → sine` (Step 2 asserts source=sawtooth) | Graph test verifies sawtooth is initial/default active waveform — same check. |
| OV-WAVE-2 | **(A) Superseded** | `waveform: sawtooth → SELECT_SINE → sine` | Graph test clicks sine, asserts `.active` transfers — identical. |
| OV-PRESET-1 | **(C) Not Covered** | — | TET preset highlight at 700¢. Not modelled (tuning is in appMachine context, not UI machine). |
| OV-RESET-1 | **(C) Not Covered** | — | localStorage clearing. Side effect not modelled in any machine. |
| OV-PEDAL-1 | **(B) Partially Covered** | `sustain: inactive → PRESS_SPACE → active` | Graph uses keyboard (Space key), this uses pointerdown on `#sustain-indicator` — different trigger path. Both check `.active` class. Keep as alternative trigger coverage. |
| OV-PEDAL-2 | **(B) Partially Covered** | `vibrato: inactive → PRESS_SHIFT → active` | Same as above — graph uses keyboard, this uses pointerdown on `#vibrato-indicator`. Keep. |
| OV-ESC-1 | **(A) Superseded** | `overlay: visible → PRESS_ESCAPE → hidden` | Graph test: presses Escape, asserts hidden — identical. |
| ISS-14-1 | **(C) Not Covered** | — | R key is NOT sustain — negative regression test. Not modelled. |
| ISS-15-1 | **(B) Partially Covered** | `vibrato: inactive → PRESS_SHIFT → active` + `vibrato: active → RELEASE_SHIFT → inactive` | Graph covers press+release cycle. ISS-15-1 additionally tests a SECOND press to verify hold-not-toggle. Keep for toggle-regression. |
| ISS-15-2 | **(B) Partially Covered** | `sustain: inactive → PRESS_SPACE → active` + `sustain: active → RELEASE_SPACE → inactive` | Same — tests second press. Keep for toggle-regression. |
| ISS-11-1 | **(C) Not Covered** | — | Slider fill percentage at midpoint. Rendering detail. |
| ISS-13-1 | **(C) Not Covered** | — | Canvas pointer response after viewport resize. Not modelled. |

**Summary:** 6 superseded (A), 4 partially covered (B), 9 not covered (C).

---

## behavioral.spec.ts (38 tests)

| Test | Classification | Graph Equivalent | Rationale |
|------|---------------|------------------|-----------|
| BH-RESET-1 | **(C) Not Covered** | — | Slider reset value assertion (700.0). Slider values not modelled in UI machines. |
| BH-RESET-2 | **(C) Not Covered** | — | Slider reset value (0.00). Same. |
| BH-RESET-3 | **(C) Not Covered** | — | Slider reset value (-10.5). Same. |
| BH-RESET-4 | **(C) Not Covered** | — | Slider reset value (1.00). Same. |
| BH-DREF-1 | **(C) Not Covered** | — | D-ref note name → Hz conversion. Not modelled. |
| BH-DREF-2 | **(C) Not Covered** | — | D-ref invalid input revert. Not modelled. |
| BH-DREF-3 | **(C) Not Covered** | — | D-ref empty input revert. Not modelled. |
| BH-DREF-4 | **(C) Not Covered** | — | D-ref reset default. Not modelled. |
| BH-DREF-5 | **(C) Not Covered** | — | D-ref badge Hz display. Not modelled. |
| BH-DREF-6 | **(C) Not Covered** | — | D-ref annotation update. Not modelled. |
| BH-DREF-7 | **(C) Not Covered** | — | D-ref red border on invalid. Not modelled. |
| BH-MPE-1 | **(C) Not Covered** | — | MPE UI element presence. Not modelled (midiPanel skipped). |
| BH-MPE-2 | **(C) Not Covered** | — | MPE select disabled state. Not modelled. |
| BH-FOCUS-1 | **(C) Not Covered** | — | Enter blurs text input. Focus management not modelled. |
| BH-FOCUS-2 | **(C) Not Covered** | — | Escape blurs text input. Focus management not modelled. |
| BH-FOCUS-PRESERVE-1 | **(C) Not Covered** | — | Settings toggle focus preservation. Not modelled. |
| BH-SKEW-1 | **(C) Not Covered** | — | Inline skew label update. Not modelled. |
| BH-MODIFIER-HOLD-1 | **(A) Superseded** | `vibrato: inactive → PRESS_SHIFT → active` + `vibrato: active → RELEASE_SHIFT → inactive` | Graph tests cover press→active, release→inactive with same `.active` class assertion. |
| BH-MODIFIER-HOLD-2 | **(A) Superseded** | `sustain: inactive → PRESS_SPACE → active` + `sustain: active → RELEASE_SPACE → inactive` | Same pattern — graph covers full cycle. |
| BH-CTRL-PASSTHROUGH-1 | **(C) Not Covered** | — | Ctrl key does not trigger modifiers. Negative test not modelled. |
| BH-DOUBLEACCIDENTAL-1 | **(C) Not Covered** | — | Note naming math. Not a state transition. |
| BH-TT-1 | **(C) Not Covered** | — | Title attribute presence. Static DOM check. |
| BH-AB-1 | **(C) Not Covered** | — | About section content. Static check. |
| BH-DREF-RANGE-1 | **(C) Not Covered** | — | D-ref slider range limits. Not modelled. |
| BH-DREF-RANGE-2 | **(C) Not Covered** | — | D-ref accepts D6 value. Not modelled. |
| BH-FILL-1 | **(C) Not Covered** | — | Slider fill at minimum. Rendering detail. |
| BH-FILL-2 | **(C) Not Covered** | — | Slider fill at maximum. Rendering detail. |
| BH-BRACKET-1 | **(C) Not Covered** | — | D-ref annotation color. CSS property. |
| BH-AB-2 | **(C) Not Covered** | — | About section links. Static content. |
| BH-AB-3 | **(C) Not Covered** | — | About section footer. Static content. |
| BH-PIANOROLL-1 | **(C) Not Covered** | — | Canvas rendering on note play. Not modelled. |
| BH-BLUR-1 | **(C) Not Covered** | — | Window blur clears modifiers. Edge case not modelled. |
| BH-FOCUS-RETURN-1 | **(C) Not Covered** | — | Focus return after slider interaction. Not modelled. |
| BH-MODIFIER-PERSIST-1 | **(C) Not Covered** | — | Vibrato persists across notes. Multi-action sequence not modelled. |
| BH-STUCK-1 | **(C) Not Covered** | — | Stuck note prevention (pointer). Race condition test. |
| BH-STUCK-2 | **(C) Not Covered** | — | Stuck note prevention (keyboard). Race condition test. |
| BH-MOB-1 | **(C) Not Covered** | — | Mobile layout viewport. Different viewport context. |
| BH-MOB-2 | **(C) Not Covered** | — | Mobile zoom scaling. Different viewport context. |

**Summary:** 2 superseded (A), 0 partially covered (B), 36 not covered (C).

---

## panel-resize.spec.ts (19 tests)

| Test | Classification | Graph Equivalent | Rationale |
|------|---------------|------------------|-----------|
| PNL-VIS-1 | **(C) Not Covered** | — | DOM parent verification. Structural, not a state transition. |
| PNL-VIS-2 | **(C) Not Covered** | — | DOM parent verification for pedals. Same. |
| PNL-VIS-3 | **(C) Not Covered** | — | ARIA attributes. Accessibility, not state transition. |
| PNL-VIS-4 | **(C) Not Covered** | — | Handle pixel positioning. Layout detail. |
| PNL-VIS-5 | **(C) Not Covered** | — | Handle pixel positioning for pedals. Same. |
| PNL-VIS-6 | **(C) Not Covered** | — | DOM ancestry verification. Structural. |
| PNL-DRAG-1 | **(B) Partially Covered** | `visualiser: default → DRAG_VIS_EXPAND → expanded` | Graph test drags and asserts expanded (height > 150px). PNL-DRAG-1 also measures specific delta. Both valid; graph is broader, PNL-DRAG-1 is more precise. |
| PNL-DRAG-2 | **(C) Not Covered** | — | Shrink via drag (no "shrink" event in machine — machine only models expand/collapse, not continuous drag-smaller). |
| PNL-DRAG-3 | **(B) Partially Covered** | `pedals: default → DRAG_PED_EXPAND → expanded` | Same as PNL-DRAG-1 above. Graph covers expand; PNL-DRAG-3 measures delta. |
| PNL-DRAG-4 | **(C) Not Covered** | — | 60% viewport height cap. Boundary condition not modelled. |
| PNL-DBLCLK-1 | **(B) Partially Covered** | `visualiser: expanded → DBLCLICK_VIS_HANDLE → default` | Graph test asserts return to default (no collapsed class). PNL-DBLCLK-1 also checks exact 120px height. Keep for precision. |
| PNL-DBLCLK-2 | **(B) Partially Covered** | `pedals: expanded → DBLCLICK_PED_HANDLE → default` | Same — graph checks state, PNL-DBLCLK-2 checks exact 44px height. |
| PNL-KEY-1 | **(C) Not Covered** | — | ArrowDown keyboard resize. Not modelled as machine event. |
| PNL-KEY-2 | **(C) Not Covered** | — | ArrowUp keyboard resize. Same. |
| PNL-LS-1 | **(C) Not Covered** | — | localStorage persistence after drag. Side effect. |
| PNL-LS-2 | **(C) Not Covered** | — | localStorage restore on reload. Side effect. |
| PNL-LS-3 | **(C) Not Covered** | — | Insane height discarded. Boundary condition. |
| PNL-RESET-1 | **(C) Not Covered** | — | Reset layout restores 120px. Side effect. |
| PNL-RESET-2 | **(C) Not Covered** | — | Reset clears localStorage. Side effect. |

**Summary:** 0 superseded (A), 4 partially covered (B), 15 not covered (C).

---

## contracts.spec.ts (15 tests)

All **(C) Not Covered** — pure math/library contract tests with no UI state transitions. Graph tests model UI state machines only.

| Test | Classification |
|------|---------------|
| CT-MARKERS-1 through CT-CENTS-2 | **(C) Not Covered** |

**Summary:** 0 superseded, 0 partially, 15 not covered.

---

## visual-regression.spec.ts (37 tests)

| Test | Classification | Graph Equivalent | Rationale |
|------|---------------|------------------|-----------|
| SM-BADGE-1..4 | **(C) Not Covered** | — | Slider badge pixel positioning. Layout detail. |
| SM-BADGE-PASSTHROUGH-1 | **(C) Not Covered** | — | CSS pointer-events property. |
| SM-LABEL-1..2 | **(C) Not Covered** | — | Label inside track positioning. Layout detail. |
| SM-VAL-1..7 | **(C) Not Covered** | — | Value display format (Hz, dB, etc.). |
| SM-TET-BELOW-1 | **(C) Not Covered** | — | TET preset layout positioning. |
| SM-COLOR-1..5 | **(C) Not Covered** | — | CSS color assertions. |
| SM-DREF-WHITE-1 | **(C) Not Covered** | — | CSS color assertion. |
| SM-FONT-1 | **(C) Not Covered** | — | Font family check. |
| SM-STRUCT-1..4 | **(C) Not Covered** | — | DOM structure assertions. |
| SM-ICON-CENTER-1 | **(C) Not Covered** | — | Icon vertical alignment. |
| SM-TUNING-ALIGN-1 | **(C) Not Covered** | — | Tuning slider padding. |
| SM-CANVAS-PLAYNOTE-1 | **(C) Not Covered** | — | Canvas visibility check. |
| SM-KS-1 | **(C) Not Covered** | — | DevicePixelRatio canvas scaling. |
| GOLDEN-1..7 | **(C) Not Covered** | — | Full-page golden screenshots (Chromium-only). Graph goldens are per-state, Firefox-only. |

**Summary:** 0 superseded, 0 partially, 37 not covered.

---

## mpe-output.spec.ts (6 tests) + mpe-service.spec.ts (10 tests)

All **(C) Not Covered** — pure MIDI protocol and service tests. No UI state transitions.

**Summary:** 0 superseded, 0 partially, 16 not covered.

---

## Overall Totals

| Classification | Count | Action |
|---------------|-------|--------|
| **(A) Fully Superseded** | **8** | Mark `@deprecated` with `@see xstate-graph.spec.ts` |
| **(B) Partially Covered** | **8** | Keep. Add `@see xstate-graph.spec.ts` cross-reference. |
| **(C) Not Covered** | **128** | Keep as-is. |
| **Total** | **144** | |

### Tests to mark @deprecated (A):

1. `OV-HIDDEN-1` — overlay hidden initial state
2. `OV-TOGGLE-1` — cog opens overlay
3. `OV-TOGGLE-2` — cog closes overlay
4. `OV-TOGGLE-3` — backdrop closes overlay
5. `OV-WAVE-1` — SAW is default waveform
6. `OV-WAVE-2` — waveform button transfers active
7. `OV-ESC-1` — Escape closes overlay
8. `BH-MODIFIER-HOLD-1` — vibrato Shift hold
9. `BH-MODIFIER-HOLD-2` — sustain Space hold

**Note:** Original estimate was ~22 superseded. Actual count is 8 — most existing tests cover domain logic, edge cases, or rendering details that state machines don't model. The graph tests complement rather than replace the hand-written suite.
