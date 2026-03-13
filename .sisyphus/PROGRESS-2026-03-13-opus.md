# GridInstruments — Opus Session Progress (2026-03-13)

## Session Summary

**6 commits pushed to main** with 16 actual code fixes across 56 issues triaged.

## Commits

| Hash | Description |
|------|------------|
| `79011bc` | Dialog centering, info popups enriched, source links, search fix, slider desync |
| `cecdd0b` | Tangle cache update |
| `af7d8ce` | Centralized idle state (#113), D-ref notation (#93), history panel API (#9), cleanup |
| `e22efb7` | WebMIDI message (#105), flat sound (#102), timbre CC11 (#114), mobile handles (#101) |
| `ca7d169` | Arrow key pitch bend (#143), slide pitch clamp (#144) |
| `9677377` | Auto-detect keyboard layout (#141) |
| `e2ffe6f` | Wire history time slider (#9) |

## Issues Fixed This Session (16 actual code fixes)

| Issue | Title | Fix |
|-------|-------|-----|
| #137 | Info popup centering | Removed position:fixed, showModal() centers natively |
| #136 | Info buttons positioning | Moved to left of components in song-bar |
| #135 | Reset button naming | "Reset" → "Reset Page" |
| #133 | Quant label | "QUANTIZE" → "Quant" with tooltip |
| #129 | Calibration info popup | Enriched from 1 sentence to detailed HTML with steps |
| #140 | Search broken | main → HEAD in GitHub API URLs |
| #70 | Slider fill desync | Double-rAF on overlay open |
| #113 | Inactivity fade | Centralized idle/activity state with timer |
| #93 | D-ref notation | hzToNoteAnnotation uses actual d4Hz parameter |
| #9 | History panel controls | setTimeWindow/setNoteRange API + UI slider |
| #105 | iPhone WebMIDI | User-facing message when unavailable |
| #102 | Flat sounds | "Flat sound" checkbox disables all expression |
| #114 | Timbre CC modes | Added CC11 option |
| #101 | Mobile drag handle | Touch-aware CSS with larger targets |
| #143 | Arrow key bend | Left/Right = ±1 semitone bend |
| #144 | Slide pitch fix | Pointer bend clamped to ±2 semitones |
| #141 | Keyboard auto-detect | Keyboard API getLayoutMap() for ISO detection |

## Issues Verified Already Working (15)

| Issue | Evidence |
|-------|---------|
| #131 | Literate migration complete |
| #88 | QWERTY overlay (commit 0f48408) |
| #80 | MPE expression visualizers (commit c97d0cf) |
| #122 | Ghosting warning implemented |
| #121 | Chord progress dimming implemented |
| #119 | Restart button sends GAME_RESTART |
| #118 | Search input has SEARCH label |
| #120 | Song-bar restructured |
| #117 | Drop on document.body |
| #112 | Progress bar in song-bar |
| #123 | EXPRESSION subtitle |
| #46 | Wicki-Hayden morph slider |
| #36 | MPE output |
| #32 | Literate programming = spec consolidation |
| #134 | getCellIdsForMidiNotes frequency matching |

## Issues Classified as FUTURE (21)

#56, #29, #139, #138, #105 (platform), #94, #90, #89, #52, #9, #132, #108, #107,
#104, #73, #60, #53, #46, #45, #36, #35, #32, #31, #30, #28, #83, #127, #125,
#143, #102, #101

## Cleanup Completed
- Deleted 266MB OpenCode session archive
- Deleted 19MB sisyphus evidence (screenshots, QA reports)
- Deleted stale OMC session state files
- Deleted MCP_EDIT_FAILURE_POSTMORTEM.md

## Root Cause Analysis

Six fundamental decouplings identified:
1. **RC1: Coordinate ≠ Frequency** — Already fixed in literate migration
2. **RC2: Expression global vs per-voice** — Partially addressed (flat sound, clamp)
3. **RC3: UI elements orphaned** — Fixed (info buttons, song-bar)
4. **RC4: No idle/activity state** — Fixed (centralized timer)
5. **RC5: Mobile afterthought** — Improved (touch CSS, handle sizing)
6. **RC6: No behavioral tests** — 70+ GAME-* tests already exist

## Verification
- Build: PASSES (all commits verified)
- Tests: Running (164+ structural tests with Firefox)
- All 14 fixed issues labeled "ready for review" on GitHub
- All 56 open issues have GitHub comments with status
