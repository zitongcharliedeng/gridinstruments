# MANUAL QA — F3

**Date:** 2026-03-08  
**Browser:** Firefox (nix devshell playwright)  
**Viewports tested:** 1280×900, 1280×400, 390×844, 375×667

## Scenarios

| # | Scenario | Result | Details |
|---|----------|--------|---------|
| 1 | Icon alignment — all icons vertically centered | ✓ PASS | 6/6 icons pass. Overlay icons: 0px diff (#about-btn, .star-icon, .slider-info-btn, .slider-reset, #midi-chevron). #about-close: visible+non-zero-dims (position:absolute in dialog — parent-center check N/A by design) |
| 2 | MIDI chevron non-zero height | ✓ PASS | height=11px (x=24, y=609.2, w=11, h=11) |
| 3 | Mobile header 390px — all buttons visible | ✓ PASS | scrollWidth=390 (≤390). No overflow. |
| 4 | Canvas text fits at 375px | ✓ PASS | scrollWidth=375 (≤375). No overflow. |
| 5 | Overlay scrollbar visible | ✓ PASS | scrollHeight=560 > clientHeight=209. overflowY=scroll |
| 6 | Zoom slider fill updates after drag | ✓ PASS | 28.62% → 82.06% (gradient updated on input event) |
| 7 | Pitch bend range setting visible | ✓ PASS | Found via text:"pitch bend", visible=true |
| 8 | Desktop layout unchanged (1280px) | ✓ PASS | scrollWidth=1280 (≤1280). No overflow. |

## Evidence Files

| File | Description |
|------|-------------|
| icons-desktop.png | Overlay open — all 5 overlay icons visible |
| icons-about-dialog.png | About dialog open — #about-close button visible |
| midi-chevron.png | MIDI chevron rendered at 11×11px |
| mobile-header-390.png | 390px viewport — no overflow |
| mobile-canvas-375.png | 375px viewport — canvas fits |
| overlay-scrollbar.png | 400px viewport — overlay scroll visible |
| zoom-slider-after-drag.png | Zoom slider fill updated to 82% |
| midi-pitch-bend-setting.png | Pitch bend setting visible in MIDI panel |
| desktop-1280.png | Desktop 1280×900 baseline |
| icon-alignment-results.json | Pixel-accurate measurements for all 6 icons |
| overlay-scroll-info.json | scrollHeight=560, clientHeight=209, overflowY=scroll |
| zoom-slider-styles.json | Before/after gradient |
| pitch-bend-element.json | pitch bend element info |

## VERDICT: APPROVE

All 8 scenarios pass. 15 evidence files saved to `.sisyphus/evidence/final-qa/`.
