# GridInstruments — Opus Session Progress (2026-03-13)

## Context Recovery

Recovered context from failed Sisyphus sessions:
- **266MB** session archive (`.opencode-session-archive-ses_374c6238.jsonl`)
- **724MB** OpenCode SQLite database
- **4 unstarted plans** with detailed task breakdowns
- **9 plan files** in `.sisyphus/plans/`
- **20MB** of task evidence in `.sisyphus/evidence/`

### Key Finding
The literate migration (completed by Sisyphus) actually implemented ~80% of the features
described in the 4 remaining plans. The Sisyphus agents planned extensively but didn't
realize their own literate migration work had already addressed most issues.

## What Was Already Implemented (Pre-Session)

### From literate-migration (47/47 tasks complete):
- Frequency-based note matching (midiNote, not cellId)
- Chord completion via sequential accumulation
- Note quantization with 3 levels (1/4, 1/8, 1/16)
- Tempo map + time signature extraction
- MIDI search with GitHub + Mutopia + Midishare adapters
- `#song-bar` header with calibration, search, game status
- Calibration visual feedback (greyed uncalibrated cells)
- CSS icon system (.icon/.icon-btn classes)
- QWERTY key overlay toggle
- D-relative notation
- MPE expression visualizers (pressure opacity, pitch bend color)
- EXPRESSION subtitle in MIDI settings
- Drop zone on document.body
- Progress bar + elapsed timer in song-bar
- Restart button (GAME_RESTART vs GAME_RESET)

## Fixes Applied This Session

### Info Popup System (#137, #136, #129, #124, #133, #135)
1. **Dialog centering** (#137): Removed `position: fixed` from `#info-dialog` —
   `showModal()` now handles centering natively. Added `border-radius: 12px`.
2. **Info button ordering** (#136): Moved all song-bar info buttons to LEFT of
   their components (calibration, search, quantization).
3. **Label rename** (#133): Changed "QUANTIZE" → "Quant" with improved tooltip.
4. **Reset button** (#135): Changed "Reset" → "Reset Page" with descriptive tooltip.
5. **Enriched info content** (#129, #124): Upgraded 7 sparse single-sentence info
   popups to detailed HTML with headings, tables, and reference links:
   - Calibration: step-by-step instructions, persistence explanation
   - Search: source descriptions, usage tips
   - Quantization: level comparison table, algorithm explanation
   - Pitch Bend: range guide, MPE vs standard explanation
   - Velocity: input source comparison
   - Pressure: channel vs poly types table
   - Timbre: CC alternatives table

### Documentation & Interconnection (#124, #52)
6. **Source links**: Added dynamic links from every info popup to the relevant
   literate programming source file on GitHub. Pattern:
   `📄 Source: filename.lit.md — description`

   This creates an Obsidian-graph-like interconnection between the running app
   and its source documentation.

### Files Changed
- `index.html` — Dialog CSS, button ordering, label rename, reset text
- `literate/app-constants.lit.md` — srcLink helper, enriched SLIDER_INFO content

## Issues Triaged & Commented (GitHub)

### Verified Fixed (comments posted):
- #137 Dialog centering
- #136 Info button positioning
- #135 Reset button naming
- #133 Quant label
- #129 Calibration naming + info
- #123 EXPRESSION subtitle
- #119 Restart button
- #118 Search label
- #120 Game overlay restructure → song-bar
- #117 Drop MIDI file on body
- #112 Song concept top-level
- #131 Literate programming migration
- #88 QWERTY overlay
- #93 D-relative notation
- #80 MPE expression visualizers

### Needs Implementation (comments posted):
- #113 Inactivity fade for hints
- #121 Chord progress visuals (pressed targets dim)
- #122 Keyboard ghosting warning

## Background Agents (in progress)
1. **Audit agent** — Comprehensive issue triage
2. **Search fix agent** (#140) — MIDI search broken
3. **Slider/UI agent** (#70, #62, #78, shimmer) — Slider desync, scrollbar, zoom
4. **Game UX agent** (#121, #122, #119) — Chord visuals, ghosting, restart

## Remaining Work

### High Priority (P1)
- #140 Search doesn't work (agent working)
- #128 Mirror note greying in game
- #100 Key brightness issues
- #67 MPE duplicate notes / voice tracking
- #144 Slide pitch behavior
- #79 Mobile responsive

### Medium Priority (P2)
- #70 Slider fill desync (agent working)
- #78 Zoom slider (agent working)
- #126 Pitch bend range UI
- #106 Expression settings separation
- #114 Timbre CC mode selection
- #113 Inactivity fade

### Future / Architectural
- #56 Multi-grid architecture
- #29 Full XState migration
- #132 Effect-TS full stack
- #139 Monorepo integration
- #138 /dev deployment path
- #105 iPhone/macOS WebMIDI (platform limitation)
- #104 Video reference game mode
- #73 Ear/aim training mode

## Test Status
- Build: PASSING ✅
- Tests: Running (164 structural tests, Firefox single worker)
- Previous run showed 17 failures in layout/modifier/songBar tests (investigating)

## Learnings Captured
- Entangled 2.4.2 Pandoc-style syntax required
- filedb.json caching bug fix (delete before tangle)
- tangle.sh safety (use targets array, not files dict)
- ast-grep pre-existing violations in main.ts
