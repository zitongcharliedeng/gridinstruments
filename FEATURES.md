# DCompose Web — Feature Specification

**This is the source of truth. Use it to prevent regressions.**

Last updated: 2026-02-24 (touch lag fix, zoom coupling fix, Ctrl passthrough, game-like status indicators, editable tuning badge, latencyHint, dead code cleanup)

---

## New Features (added Feb 2026)

### Live MIDI Input (`src/lib/midi-input.ts`)
- [x] Web MIDI API — requests permission on first audio interaction
- [x] Per-device enable/disable via checkbox Map (prevent loopback doubling, multi-device use)
- [x] Channel modes: `omni` (all channels), `chPerNote` (MPE), `chPerRow` (ch=keyboard row)
- [x] `onStatusChange(devices)` callback fires on connect/disconnect
- [x] `getDevices()` returns `MidiDeviceInfo[]` with id, name, manufacturer, connected, enabled
- [x] `overallStatus` property: `'unavailable' | 'no-devices' | 'connected'`
- [x] `connectedDeviceName` property: first active device name

### Note History Visualizer (`src/lib/note-history-visualizer.ts`)
- [x] 60fps canvas strip (height 220px), three panels:
  - **Left (23%)**: Treble clef staff, note heads at correct positions, ledger lines, chromesthesia colors
  - **Center (50%)**: Piano-roll waterfall, 3s window, scrolling right-to-left, fade over time
  - **Right (27%)**: Large chord name, alternate chord names, active note list (MIDI status NOT here — only in MIDI settings panel)
- [x] `noteOn(coordX, coordY, midiNote)` / `noteOff(coordX, coordY)` API
- [x] `setMidiStatus(status, deviceName)` — **no-op stub** (API compat only); MIDI status lives in MIDI settings panel only
- [x] `clearAll()` for window blur / stop-all
- [x] `start()` / `stop()` for animation loop control
- [x] `resize(width, height)` with devicePixelRatio support

### Keyboard Layout Dropdown (`src/lib/keyboard-layouts.ts`)
- [x] Dynamic generation from `isomorphic-qwerty` COORDS_BY_CODE
- [x] 8 layout variants: `ansi`, `ansi-np`, `iso`, `iso-np`, `75pct`, `65pct`, `60pct`, `60pct-iso`
- [x] `IntlBackslash` (ISO extra key), `Backslash`, `Quote`, `Semicolon`, all letter/number keys
- [x] Numpad keys (layer z=3) in numpad-enabled layouts
- [x] Formula: `ex = iqX + rowStagger[iqY]`, `ROW_STAGGER = {0:0,1:1,2:2,3:3}` (Scale Workshop-compatible)
- [x] Corrected formula: `dcompX = 2*ex - iqY - 12`, `dcompY = -ex + 7` -> AWD forms a major chord
- [x] Verification: A->MIDI 52, W->59, D->56 -> intervals 7,4 semitones = major chord
- [x] `KEYBOARD_VARIANTS` array + `getLayout(id)` function
- [x] Layout dropdown (`layout-select`) populated by JS at startup

### DCompose / MidiMech Skew Slider (`src/lib/keyboard-visualizer.ts`)
- [x] `skew-slider` input (range 0-1, step 0.01)
  - `1.0` = full DCompose diagonal (staggered Wicki-Hayden, parallelogram cells lean)
  - `0.0` = MidiMech orthogonal rows (rectangular cells, no lean)
- [x] `setSkewFactor(n)` / `getSkewFactor()` methods on `KeyboardVisualizer`
- [x] Continuous linear interpolation via `genY0` lerp
- [x] Parallelogram half-vectors: `hv1 = (genX/2, -genY0/2)`, `hv2 = (0, -genY1/2)`

### Chromesthesia Colors (`src/lib/note-colors.ts`)
- [x] `NOTE_COLORS[12]` — one color per pitch class (C=red, C#=orange ... B=pink)
- [x] `noteColor(midiNote, alpha)` — returns rgba string
- [x] `colorFromCoordX(x)` — note color from DCompose X coordinate
- [x] `midiToCoord(midiNote)` — MIDI note -> `[coordX, coordY]`
- [x] `coordToMidiNote(x, y)` — `[coordX, coordY]` -> nearest MIDI note
- [x] Active buttons rendered bright; inactive buttons rendered dark-tinted version of color

### Button Geometry (Parallelogram Cells)
- [x] Cells are **parallelograms**, not circles — natural Voronoi regions for isomorphic grid
- [x] `CELL_INSET = 0.93` — inactive cells shrink to 93%; black background shows as thin "mortar"
- [x] Active cells use `scale = 1.0` (full size, pop forward visually)
- [x] Every pixel in the grid container is claimed by exactly one cell (no dead zones, no overlaps)
- [x] Nearest-neighbor hit detection via parallelogram projection math (O(N) with radius-2 pre-filter)
- [x] No `spacing-input` UI control — gap is programmatic (CELL_INSET constant)

### MIDI Settings Panel (UI)
- [x] Collapsible accordion panel (`midi-settings-panel`) below header
- [x] Toggle button (`midi-settings-toggle`) shows arrow indicator
- [x] Per-device rows: checkbox + status dot + name/manufacturer
- [x] Channel mode select (`midi-channel-mode`): omni / chPerNote / chPerRow
- [x] CSS class `.open` on panel -> `display: flex`

### UI / Styling
- [x] Font: JetBrains Mono everywhere (loaded from Google Fonts)
- [x] Background: `#000`, text: `#fff`
- [x] No `border-radius` on any container or panel
- [x] No `linear-gradient` or `background: gradient` on chrome elements
- [x] Musical canvases keep chromesthesia colors
- [x] Compact GitHub star widget in header (inline, not full-width banner)
- [x] GitHub star count fetched from API and displayed in widget
- [x] About section with links to Striso, Wicki-Hayden Wikipedia, MidiMech, WickiSynth, creator socials

---

## Core Architecture (original)

### Physical Keyboard Mapping
- [x] Uses `KeyboardEvent.code` (physical position), NOT `key` (logical character)
- [x] Works identically on QWERTY, Dvorak, AZERTY, Colemak, etc.
- [x] Formula: `ex = iqX + rowStagger[iqY]`, `ROW_STAGGER = {0:0,1:1,2:2,3:3}`
- [x] Corrected formula: `dcompX = 2*ex - iqY - 12`, `dcompY = -ex + 7`
- [x] KeyH (physical position) = D at coordinate `[0, 0]`

### Bottom Row Exclusion
- [x] Ctrl, Alt, Meta, Space excluded from note grid
- [x] `MODIFIER_ROW_KEYS` set in keyboard-layouts.ts

## Modifier Keys

### Sustain (Alt key)
- [x] Alt hold = sustain ON; release = sustain OFF
- [x] Both AltLeft and AltRight work
- [x] Visual indicator (`sustain-indicator`)

### Vibrato (Space key)
- [x] Space hold = vibrato ON; release = OFF
- [x] `vibratoOnPress` tracked per-voice in synth
- [x] Visual indicator (`vibrato-indicator`)

### Key Event Capture
- [x] `event.preventDefault()` on all keys except F5, F11, F12, Escape
- [x] Keyboard plays notes even when sliders/selects have focus (guard only skips textarea + text/number inputs)
- [x] `select` and `input[type=range]` auto-blur on `pointerup`/`change` to restore keyboard focus instantly

## Tuning System

### Continuous Tuning Slider (`tuning-slider`)
 [x] Range: **683–722 cents** (fifth size), step 0.01 cents — covers all TET presets (7-TET=685.71¢ to 5-TET=720¢)
 [x] Display badge (`#tuning-thumb-badge`, `<span>`) — read-only, positioned above slider track
 [x] One-way sync: slider → badge (badge displays current value as textContent)
 [x] Live frequency updates in real-time
 [x] Double-click snaps to nearest named TET

### Reference Markers (in `synth.ts`)
- [x] 12-TET (700 cents), Pythagorean (701.96 cents), 1/4-comma Meantone (696.58 cents)
- [x] 19-TET (694.74 cents), 31-TET (696.77 cents), 53-TET (701.89 cents), 17-TET (705.88 cents)
- [x] 7-TET (685.71 cents), 5-TET (720 cents)
- [x] `findNearestMarker(fifth)` function
- [x] `nearest-marker` span shows exact or approximate match

### D Ref Control (`#d4-ref-input`)
 [x] **Single text input only** — no slider, no separate Hz/note inputs
 [x] Accepts: raw Hz value (e.g. `293.66`) OR note name with octave (e.g. `D4`, `G#5`, `Bb3`)
 [x] Note names parsed case-insensitively; sharps (`#`) and flats (`b`) supported
 [x] `#d4-ref-hint` span shows bracket annotation next to the input:
  - Exact note: `[D4]`
  - Off-pitch: `[+14¢ from G#4]` (rounded to nearest cent)
 [x] Default: D4 = 293.66 Hz, hint = `[D4]`
 [x] Dragging golden D-line on keyboard canvas also updates input and hint

## Audio

### Waveforms
- [x] Sawtooth (default), Sine, Square, Triangle via `waveform-select`

### Volume
- [x] Master volume slider (`volume-slider`), range 0-1, default 0.3
- [x] Smooth transitions via `setTargetAtTime()`

## Keyboard Canvas Visualizer (`src/lib/keyboard-visualizer.ts`)

- [x] Canvas-based rendering, auto-sized to container
- [x] Zoom: Ctrl +/- scales grid
- [x] Golden D-line (draggable)
- [x] Labels: pitch names on buttons
- [x] Resize handler on window resize

## Files

```
src/lib/note-colors.ts           chromesthesia palette + midi/coord helpers
src/lib/midi-input.ts            Web MIDI, per-device, channel modes
src/lib/keyboard-layouts.ts      isomorphic-qwerty formula, 8 layout variants
src/lib/keyboard-visualizer.ts   canvas keyboard, skew slider, nearest-neighbor hit
src/lib/note-history-visualizer.ts  3-panel top strip (staff / waterfall / chord)
src/lib/chord-detector.ts        chord detection (unchanged)
src/lib/synth.ts                 Web Audio, tuning, vibrato, sustain (unchanged)
src/lib/mpe-output.ts             MPE channel allocator (legacy, kept for test imports)
src/lib/mpe-service.ts            MPE service — standalone, configurable, replaces MpeOutput
src/main.ts                      wiring layer
index.html                       UI structure + JetBrains Mono styling
VISUAL-TESTS.md                  visual regression test invariants
```

---

## Tuning Slider Overhaul (TET Presets)

### Design Intent
The original WickiSynth (by Piers Titus van der Torren) has a vertical slider with clickable TET preset labels positioned alongside it. We bring this UX to DCompose Web with a **horizontal** orientation — a wide slider with a **timeline row of clickable preset buttons** below it.

### Slider Specifications
- [ ] **Orientation**: Horizontal (wide) — uses available horizontal space in the controls strip
- [ ] **Width**: At least 300px (was 140px) — long enough to precisely land on values
- [ ] **Range**: 650-750 cents (fifth size), step 0.1 cents (unchanged)
- [ ] **Progress fill**: CSS `linear-gradient` trick — filled portion shows active color, unfilled shows track color
- [ ] **Value display**: Current fifth value (e.g. `700.0 cents`) shown inside or adjacent to the slider thumb

### Clickable Preset Buttons
- [ ] Row of buttons positioned **below** the slider, aligned to their corresponding slider positions
- [ ] Each button: clickable, snaps the slider to its exact fifth value on click
- [ ] Active button highlighted (matching the nearest TET to current slider position)
- [ ] Vertical tick marks connecting buttons to their slider positions
- [ ] Button label format: `12-TET` (short name), tooltip shows full description

### Preset Values (from `TUNING_MARKERS` in `synth.ts`)

| Preset | Fifth (cents) | Description |
|--------|--------------|-------------|
| 5-TET | 720.000 | Indonesian slendro |
| 17-TET | 705.882 | 17 equal divisions |
| 53-TET | 701.887 | Turkish classical |
| Pythagorean | 701.955 | Pure fifths (3:2) |
| **12-TET** | **700.000** | **Western standard (default)** |
| 31-TET | 696.774 | 31 equal divisions |
| 1/4 Meantone | 696.578 | Pure major thirds |
| 19-TET | 694.737 | 19 equal divisions |
| 7-TET | 685.714 | Thai, Mandinka balafon |

### Formula
N-TET fifth size: `fifth = (1200 + k * 1200/N) / 2` where `k` = best fifth approximation in N steps.
The slider traverses the **syntonic tuning continuum** — a 1-parameter family of regular temperaments.

---

## Layout Skew Slider Overhaul (DCompose / MidiMech)

### Design Intent
The current skew slider is tiny (80px), has ambiguous labels, and does not communicate what it represents. The slider controls a **shear transformation** between two isomorphic keyboard layouts:
- **DCompose** (value = 1.0): Diagonal Wicki-Hayden layout — coordX axis leans up-right, coordY axis is vertical
- **MidiMech** (value = 0.0): Rectangular wholetone layout — coordX axis is horizontal, coordY axis leans down-right

### Slider Specifications
- [ ] **Width**: Wider — at least 200px (was 80px)
- [ ] **Endpoint labels**: `DCompose` on the RIGHT end (value 1.0), `MidiMech` on the LEFT end (value 0.0)
- [ ] **Value within slider**: The current value or layout name shown inside the track using color/gradient tricks
- [ ] **Progress fill**: CSS `linear-gradient` progress from MidiMech (left) to DCompose (right)
- [ ] **Division should be obvious**: The slider visually communicates that these are two distinct layout paradigms connected by a continuous transformation
- [ ] **Semantic value**: The slider value represents the shear interpolation parameter (0 = no Y-lean on coordX, 1 = full Y-lean on coordX)

### Layout Math
```
skewFactor = 0.0 (MidiMech):
  genY0 = 0           -> coordX axis is horizontal (right = whole tone)
  genX1 = baseSkew    -> coordY axis leans right (up-right = fourth)

skewFactor = 1.0 (DCompose):
  genY0 = baseSkew    -> coordX axis leans up-right (diagonal = fifth)
  genX1 = 0           -> coordY axis is vertical (up = octave)
```

---

## Chord Shape Graffiti Decorations

### Design Intent
Spray-painted yellow chord shape diagrams scattered around the site as **educational decoration**. The shapes teach newcomers that on an isomorphic layout, a major chord is always a triangle and a minor chord is always an inverted triangle — regardless of key. This is the core insight that makes isomorphic layouts "hard to suck" at.

### Chord Geometry (Cell-Grid Coordinates: Wholetone × Fourth)
The cell tiling uses wholetone (200¢) and fourth (500¢) as its reduced basis.
wholetone = 2·fifth − octave, fourth = −fifth + octave.
**Major triad (triangle pointing UP):**
```
    [P5]     fourth=1
[R]    [M3]  fourth=0
 wt=0  wt=1  wt=2
```
- Root `R` at (0,0)=0¢, Major 3rd `M3` at (2,0)=400¢, Perfect 5th `P5` at (1,1)=700¢
**Minor triad (triangle pointing DOWN):**
```
[m3]   [P5]  fourth=1
    [R]      fourth=0
 wt=-1 wt=0  wt=1
```
- Root `R` at (0,0)=0¢, Minor 3rd `m3` at (-1,1)=300¢, Perfect 5th `P5` at (1,1)=700¢

### Rendering Requirements
- [ ] **Dynamic rendering**: Chord shapes are computed from the SAME grid engine that renders the keyboard (not hardcoded SVGs). When the skew slider changes, the chord shape geometry matches the current grid state exactly.
- [ ] **Visual style**: Yellow spray-paint aesthetic on black background
  - Rough.js `polygon()` for wobbly hand-drawn outlines (roughness 2.5+, bowing 1.5)
  - SVG `feTurbulence` + `feDisplacementMap` filter for jagged spray-paint edges
  - `mix-blend-mode: screen` for additive glow on black background
  - Color: `#FFD700` (gold yellow) with opacity variations
- [ ] **Label text**: Scribbled-looking text labels like "psst... this is a major chord" and "...and this is minor" — rendered with SVG displacement filter for hand-written feel
- [ ] **Positioning**: `position: absolute`, `pointer-events: none` — floating overlays scattered in available whitespace (near About section, near footer, beside the keyboard canvas). NOT in their own container.
- [ ] **Concrete wall texture**: Optional subtle noise texture behind the shapes to simulate painting on a wall
- [ ] **Paint drip**: Optional yellow drip SVG path extending below one or two shapes

### Color Palette (on #000 background)
```css
:root {
  --spray-gold:    #FFD700;   /* primary spray color */
  --spray-amber:   #FFAB00;   /* weathered variant */
  --spray-fill:    rgba(255, 200, 0, 0.08);  /* faint interior */
  --spray-ghost:   rgba(255, 215, 0, 0.15);  /* background wash */
}
```

---

## Completed Rendering Fixes

These were prerequisites for the chord shape graffiti — all completed:
### Color System (note-colors.ts)
 [x] Switch from fifths-based hue to **chromatic** hue mapping: `hue = pitchClass * 30 + 329`
 [x] D = 29 deg (red), E = 89 deg (yellow), G = 179 deg (cyan), A = 239 deg (blue)
 [x] Adjacent grid cells (fifths = 7 semitones apart) differ by 210 deg hue — maximum contrast
 [x] Adjacent semitones (C/C#) differ by 30 deg — similar but distinguishable
### Grid/Axis Rendering (keyboard-visualizer.ts)
 [x] **Render order**: Grid cells FIRST, then axes ON TOP
 [x] **Axis lines**: Two prominent white lines through center — CoF axis and Pitch axis
 [x] **Pitch axis skews** with the MidiMech slider (follows genX1, -genY1 direction)
 [x] **Grid fade-out**: Cells near canvas edges get decreasing alpha (vignette effect)
 [x] **Grid beneath axes**: Cells never cover axis lines or labels
### Title Bar (index.html)
 [x] Title bar (DCompose Web + GitHub buttons) **floats/overlays** on the history canvas using `position: absolute` — does NOT take its own row
 [x] `z-index` above the canvas, centered horizontally
### Header Layout (index.html)
 [x] MIDI button pinned to LEFT of header
 [x] Quote takes remaining space on RIGHT, in golden/colored readable text
 [x] Quote text: `tl;dr: notes that are mathematically more harmonious are closer together spatially — make it hard to suck!`
### Note Naming (keyboard-layouts.ts)
 [x] Circle-of-fifths spelling: F♯♯ instead of G, B♭♭ instead of A (proper enharmonic names)
 [x] `getNoteNameFromCoord(x)` uses fifths-natural lookup + accidental counting
 [x] `get12TETName(x)` returns the 12-TET pitch class name (for isBlackKey + brackets)
 [x] `getCentDeviation(x, fifth)` computes cent offset from 12-TET
 [x] Bracket sub-label on cells: `(G)` for 12-TET double-accidentals, `(F+18¢)` for non-12-TET
 [x] Brackets only shown when cell is large enough (cellMin > 30px) and there's useful info
 [x] Brackets dimmer (60% opacity) and smaller font (60% of main label)

### MidiMech Cell Shape Fix (keyboard-visualizer.ts)
 [x] Cell shape vectors (`hv1`, `hv2`) are separated from basis vectors (`genX`, `genY`)
 [x] MidiMech (skew=0): cells align to wholetone (horizontal) + fourth (vertical) = upright rectangles
 [x] DCompose (skew=1): cells align to fifth + octave = ~69° parallelograms
 [x] `getSpacing()` returns interpolated `cellHv1`/`cellHv2` separately from basis vectors

---

## Zoom Slider (`keyboard-visualizer.ts`, `main.ts`)

### Design Intent
Default grid was too zoomed out — notes too small for fingers on touch screens and too spread for
desktop. Added a zoom slider so users can adjust, with smart defaults per device.

### Specifications
 [x] `#zoom-slider` input (range 0.2–3.0, step 0.1)
 [x] `#zoom-reset` button (↻ icon) resets to device-appropriate default
 [x] Touch devices default to 1.6x zoom (~5x effective with base `dPy=height/3`)
 [x] Desktop defaults to 1.0x zoom (~3 octaves visible)
 [x] `setZoom(z)` / `getZoom()` API on `KeyboardVisualizer`
 [x] Base cell size: `dPy = height / 3` (was `height / 7` — 2.33x larger base)
 [x] Auto-blur on pointerup/change to preserve keyboard focus

### Regression Notes
 Zoom × base must show 3–4 octaves on desktop and 1–2 on phone at default
 Reset button tooltip: "aims to match the keysize to the standard keyboard key size"

---

## License

 [x] MIT License — `LICENSE` file in project root
 [x] Copyright (c) 2026 zitongcharliedeng
 [x] Open source, forks welcome, credit required via license terms

---

## Completed: Axes Coupled to Grid Skew (Gradient-Based)
### Design Intent
The CoF axis = iso-pitch direction (⊥ to pitch gradient), Pitch axis = pitch gradient direction.
At DCompose (skew=1): CoF is horizontal, Pitch is vertical. At MidiMech (skew=0): both diagonal.
### Specifications
 [x] **CoF axis**: Drawn along iso-pitch direction `(octave*genX - fifth*genX1, fifth*genY1 - octave*genY0)`
 [x] **Pitch axis**: Drawn along pitch gradient `(fifth*genY1 - octave*genY0, fifth*genX1 - octave*genX)`
 [x] **Fifth index lines**: Perpendicular tick marks at each fifth step along CoF axis, labeled with note names
 [x] **Octave labels**: Projected onto Pitch axis line at each octave step
 [x] **White axes**: Both axis lines are white (#fff), prominent, with visible labels and arrowheads
 [x] **Grid beneath axes**: Grid cells do NOT cover axis lines or labels
 [x] **Origin marker**: D4 + Hz at center intersection

---

## Completed: Smooth Transition (No Gaps at Intermediate Skew)

### Implementation
Cell half-vectors are now derived from the CURRENT interpolated basis vectors as wholetone/fourth
(reduced basis), guaranteeing perfect tiling at ALL skew values. The fix is in `getSpacing()` lines 216-231.
### Specifications
 [x] No gaps between cells at ANY skew value (0.0 to 1.0)
 [x] No overlaps between cells at ANY skew value
 [x] Cell edges always touch (continuous surface, CELL_INSET=0.93 mortar only)
 [x] Parallelogram shape interpolation is smooth and continuous
 [x] Replace lines 217-244 in getSpacing() with wholetone/fourth derivation
 [x] Transition from MidiMech to DCompose has no 'holes' or disconnected cells

---

## Pending: Enhanced Note Naming (Double-Flat/Sharp with Cents Bracket)

### Design Intent
For non-12-TET tunings, note names should show accurate enharmonic spelling with
cent deviation underneath in brackets. In 12-TET, names are standard (no brackets).

### Specifications
 [x] Primary label: enharmonic note name using double-flats/sharps with proper glyphs (♯, ♭, 𝄪, 𝄫)
 [ ] Bracket underneath: equivalent pitch with cent deviation, e.g. `(A - 3¢)` or `(A + 7¢)`
 [ ] In 12-TET: standard names only, no brackets (deviation is 0)
 [ ] Use best notation for each TET (whatever is most readable/accurate)

---

## Completed: TET Slider Improvements
### Specifications
 [x] Preset button positions aligned to their TRUE position on the slider scale (proportional to fifth value)
 [x] Vertical tick marks jutting up from preset buttons to their slider positions (timeline style)
 [x] Current fifth value shown as floating thumb badge tracking the slider position
 [x] Stagger detection for dense clusters (<3% of range)
---

## Closed: MIDI Octave Offset on First Load

 [x] **Cannot reproduce**: Exhaustive testing of `midiToCoord()` → `synth.getFrequency()` pipeline across MIDI notes 24-96 and all 9 tuning systems (685.71¢ to 720¢) found NO octave-level mismatches.
 [x] Math is correct at every tuning position tested.
 [x] If the bug reappears, it may be related to browser-specific Web MIDI timing or synth initialization race conditions.
---

## Completed: Chord Graffiti Dynamic Rendering

 [x] Chord shapes computed from SAME grid engine via `visualizer.getGridGeometry()` — not hardcoded SVGs
 [x] `getGridGeometry()` public method on `KeyboardVisualizer` returns `cellHv1`, `cellHv2`, `width`, `height`
 [x] When skew/tuning/zoom slider changes, `updateGraffiti()` re-renders shapes matching current grid state exactly
 [x] Major chord in top-left corner, minor chord in bottom-right corner
 [x] Minor chord hint text: "it's a reflection of a major chord, neat huh?"
 [x] Returns `update()` function from `createChordGraffiti()` for re-rendering on any parameter change
 [x] Verified via headless Playwright screenshots at DCompose (skew=1.0), MidiMech (skew=0.0), and mid-transition (skew=0.5)
---

## Completed: Fix Chord Graffiti Shape and Readability

### Fixed Issues
 [x] Removed per-cell parallelogram outlines (keep ONLY the triangle connecting 3 chord tone centers)
 [x] Updated shape coordinates to **root position** in (fifth, octave) cell coords:
     `MAJOR_SHAPE=[[0,0],[4,-2],[1,0]]` (D, F#, A = ▲), `MINOR_SHAPE=[[0,0],[-3,2],[1,0]]` (D, F, A = ▽)
 [x] Major triad triangle points UP (▲ = root position), minor points DOWN (▽ = root position)
 [x] Removed `filter: url(#spray-roughen)` from `.graffiti-overlay` and `.graffiti-label` CSS
 [x] Increased graffiti label font size to 14px, opacity to 0.9
 [x] Increased hint text font size to 10px, opacity to 0.7
 [x] Text is clean and readable — no wiggly displacement effects

---

## Completed: Remove Redundant Canvas/HTML Elements

### Implementation
All redundant elements removed:
 [x] `drawCircleOfFifthsLabels()` — removed from keyboard-visualizer.ts
 [x] `drawTuningMarkersInline()` — removed from keyboard-visualizer.ts
 [x] Canvas tuning label at top — removed (no longer rendered)
 [x] HTML `.tuning-readout` div with `#tuning-value` and `#nearest-marker` — CSS and JS references removed
 [x] Call sites in `drawPitchLines()` — removed (replaced by gradient-based axis system)

---

## Completed: MidiMech as Default View

### Implementation
MidiMech (skew=0.0) is now the default view on page load.
 [x] HTML slider `#skew-slider` defaults to `value="0"` (index.html)
 [x] keyboard-visualizer.ts `skewFactor` default changed from 1.0 to 0
 [x] Left endpoint label ('MidiMech') has `.active` class on load
 [x] Right endpoint label ('DCompose') does NOT have `.active` class on load

---

## Completed: Restore Numerical Axis Values

### Implementation
Note names and octave labels are now projected from actual grid positions onto the conceptual
axis lines using dot-product projection. This ensures labels stay on the axis line at any skew.
### Specifications
 [x] **CoF axis**: Note names (D, A, E, B, F♯, ...) with perpendicular tick marks at each fifth step
 [x] **Pitch axis**: Octave markers (oct 1 through oct 7) projected onto the Pitch axis line
 [x] Labels projected from grid positions onto conceptual axes — always on the axis line
 [x] Labels are small (9px), semi-transparent (fading at edges), don't obscure grid cells
 [x] Origin marker (D4 + Hz) at center intersection
---

## Pending: UI Polish Fixes
 [x] Rename from `▼ MIDI` to `⚙ MIDI` (cog icon implies settings)
 [x] Toggle text: open = `⚙ MIDI settings`, closed = `⚙ MIDI`
 [x] Button hugs left side of header (already positioned correctly)
### Zoom Reset Tooltip
 [x] `title="Aims to match keysize to standard keyboard key size"` on `#zoom-reset`
### TET Slider Preset Spacing
 [x] Increase stagger threshold from 3% to 5% of slider range
 [x] Prevents overlapping labels at 694-702¢ cluster

### Skew Slider Value Display
 [x] `#skew-value` badge shows current value (0.00–1.00) next to slider
 [x] Value integrated directly into slider track (skew-thumb-badge, modern design)

---

## Completed: Slider UI Overhaul

### Design Intent
All sliders need to be self-explanatory, with proper units, readable labels, and modern design.
Currently the controls are cramped and labels are ambiguous.

### Fifth (Generator) Slider
 [x] Rename label from `FIFTH` to `Fifth (¢)` — units visible
 [ ] Center the label above the slider
 [ ] Widen indentation lines — they should extend into the black bar area
 [ ] Spread out TET preset labels — currently too cramped at 694-702¢ cluster
 [x] Alternate labels above/below the slider for dense regions (staggered labels flip above)
 [ ] TET indentation marks should visually intersect with the fifth scale
 [ ] Consider single-line layout with alternating top/bottom labels

### Skew (Layout) Slider
 [x] Show MidiMech value directly in the slider track (skew-thumb-badge)
 [x] Integrate DCompose/MidiMech labels into the slider itself (skew-slider-area wrapper)
 [x] Modern slider design — value visible within the track (thumb badge overlay)

### General Slider Principles
 [ ] Every slider must have units (¢, Hz, %, etc.)
 [ ] Every slider must be OBVIOUS what it controls at a glance
 [ ] Consider modern slider patterns: value-in-track, colored fill, integrated labels
 [ ] Single-line layouts where possible to save vertical space
---

## Completed: MPE Support + Pressure-Sensitive Touch

### MPE (MIDI Polyphonic Expression)
 [x] Per-note pitch bend on channels 2-16
 [x] Per-note aftertouch (CC 74 / pressure)
 [x] Manager channel on ch 1 for global controls
 [x] Configuration UI in MIDI settings panel

### Pressure-Sensitive Touchscreen
 [x] Map `PointerEvent.pressure` to velocity on note-on
 [x] Map `PointerEvent.pressure` changes to expression/aftertouch
 [x] Fallback to fixed velocity (0.7) when pressure API unavailable
 [x] Works alongside MPE output for pressure → MIDI CC mapping

---

## Completed: Touch & Performance Fixes (Feb 23 2026)

### Bug 1: Touch Screen Lag
 [x] `handlePointerDown` made synchronous (only async if AudioContext uninitialized)
 [x] `getBoundingClientRect()` cached in `cachedCanvasRect` (invalidated on resize)
 [x] `render()` RAF-throttled with `renderScheduled` flag (prevents stacking frames)

### Bug 2: D4→G2 Pitch Drift on Touch
 [x] Golden line drag restricted to mouse only (`event.pointerType === 'mouse'`)
 [x] Touch near canvas center no longer hijacks D4 cell

### Bug 3: Fifth Index Lines Misaligned at MidiMech
 [x] Changed from CoF-axis projection to actual cell center positions (`cx + i*fifthDx`)
 [x] Tick marks now align correctly at all skew values (0.0 to 1.0)

---

## Completed: MPE Pitch Bend Sensitivity (Feb 23 2026)

 [x] Added `sendPitchBendSensitivity(chIdx, semitones)` method to `MpeOutput`
 [x] After MCM, sends RPN 0x00/0x00 (Pitch Bend Sensitivity) on manager channel AND all 15 member channels
 [x] Default `_bendRange = 48` (±24 semitones) — synths previously defaulted to ±2, causing wrong pitches
 [x] Sends null RPN (127/127) after each PBS set to prevent accidental RPN edits

---

## Completed: Strict TypeScript ESLint Config (Feb 23 2026)

 [x] Installed `eslint`, `@eslint/js`, `typescript-eslint` as devDependencies
 [x] Created `eslint.config.mjs` with `strictTypeChecked` + `stylisticTypeChecked` configs
 [x] Rules: no `as` assertions (never), no `any`, no `!` non-null assertions, explicit return types
 [x] Rules: strict boolean expressions, exhaustive switches, no floating promises
 [x] Added `"lint": "eslint src/"` script to package.json
 [x] Current state: 233 violations across 17 rules (informational — for future refactors, not blocking)
 [x] Top violations: `restrict-template-expressions` (68), `consistent-type-assertions` (32), `no-inferrable-types` (29)

---

## Completed: Touch Event Reliability Fix (Feb 24 2026)

### Root Cause
`touch-action: none` was missing from `#keyboard-canvas` and `#keyboard-container`.
Without it the browser adds ~300ms tap delay and fires `pointercancel` when a scroll gesture
begins — causing stuck notes and missed inputs on mobile.

### Specifications
 [x] `touch-action: none` added to `#keyboard-container` CSS
 [x] `touch-action: none` added to `#keyboard-canvas` CSS
 [x] `-webkit-tap-highlight-color: transparent` added to both elements
 [x] `user-select: none` added to both elements
 [x] `setPointerCapture()` call wrapped in `try/catch` for iOS Safari compatibility
 [x] `AudioContext` created with `{ latencyHint: 'interactive' }` for minimum output latency (`synth.ts`)
 [x] Redundant `touchstart → preventDefault` listener removed from `main.ts`

---

## Completed: Zoom Coupling Fix (Feb 24 2026)

### Problem
Zoom keyboard shortcuts called `visualizer.setScale()` directly but never updated
`zoomSlider.value` nor called `updateGraffiti()` — causing the slider and graffiti
overlays to desync from the visible zoom level.

### Specifications
 [x] Zoom hotkeys changed from `Ctrl+=/−` to `Shift+=/−` (Ctrl now fully passes through to browser)
 [x] Zoom hotkeys use `visualizer.setZoom()` API (same path as the slider)
 [x] `zoomSlider.value` updated in sync with every hotkey zoom change
 [x] `updateGraffiti?.()` called after every hotkey zoom change
 [x] `updateSliderFill(zoomSlider)` called to keep the CSS fill indicator in sync

---

## Completed: Ctrl Passthrough (Feb 24 2026)

### Problem
`event.preventDefault()` fired for ALL keys before the Ctrl check — swallowing Ctrl+C,
Ctrl+V, Ctrl+Z, etc. and making the browser's native keyboard shortcuts unusable.

### Specifications
 [x] Early return `if (event.ctrlKey || event.metaKey) return;` at top of `handleKeyDown`
 [x] Ctrl and Meta (Cmd on macOS) always pass through to the browser unchanged
 [x] Only `Shift` and `Space` are application modifier keys

---

## Completed: Game-Like Status Indicators (Feb 24 2026)

### Design Intent
Vibrato (Space) and Sustain (Alt) indicators moved from the header controls strip to a
game-like overlay inside the keyboard canvas — positioned bottom-left, always visible,
never consuming header space.

### Specifications
 [x] `.status-indicators` container: `position: absolute; bottom: 12px; left: 12px; z-index: 10`
    inside `#keyboard-container` (not the header)
 [x] Each `.status-indicator` hidden by default (`display: none`)
 [x] Active state via `classList.add('active')` → `.status-indicator.active { display: inline-block }`
 [x] `#vibrato-indicator`: blue (`#88aaff`), tooltip `"Hold Space for vibrato"`
 [x] `#sustain-indicator`: gold (`#ffcc44`), tooltip `"Hold Alt for sustain"`
 [x] Vibrato and sustain are **hold-mode only** (active while key held, off on release — never toggle)
 [x] `#instructions` div removed from bottom of page; hotkey documentation lives in indicator tooltips only
 [x] Header ctrl-group for indicators replaced with a comment (no visible change to header layout)

---

## Completed: Editable Tuning Thumb Badge (Feb 24 2026)

> **Superseded**: Badge is now a display-only `<span>` with `pointer-events: none`. The editable badge was removed because it blocked slider interaction.

### Design Intent (Historical)
The floating thumb badge on the fifth slider is directly editable — click it and type a
precise fifth value without using the slider.

### Specifications (Historical)
 [x] `#tuning-thumb-badge` changed from `<div>` to `<input type="number" min="683" max="722" step="0.01">`
 [x] JS cast to `HTMLInputElement | null`; `.value` used instead of `.textContent`
 [x] `input` event listener on the badge: updates `synth.setFifth()`, `visualizer.setGenerator()`,
    `updateGraffiti?.()`, and clamps + syncs the main tuning slider
 [x] Dead `#fifth-custom-input` event listeners removed from `main.ts` (HTML element was already removed)
 [x] CSS: `pointer-events: auto; cursor: text; width: 58px; border: none; outline: none; text-align: center`
    (was `pointer-events: none`)

---

## Pending: Assertion Spec Consolidation (Deferred)

### Design Intent
The 56+ atomic user assertions accumulated over development sessions contain overlapping,
contradictory, and superseded requirements. Later ideas override earlier ones. Consolidate
into a single clean spec to prevent regressions.

### Process
 [ ] Group all assertions by topic (grid rendering, UI layout, MIDI, axes, colors, etc.)
 [ ] Where later requests supersede earlier ones, keep only the latest
 [ ] Flag genuine merge conflicts (unclear which wins) for user decision
 [ ] Produce unified spec entries in this FEATURES.md
 [ ] Remove/archive the raw assertion list after consolidation

---

## Pending: Touch Screen Smart Defaults

 [ ] Default key size matches standard physical keyboard key size relative to the touch screen dimensions
 [ ] Additional zoom slider for fine-tuning (already implemented — just needs smart default calibration)
 [ ] Buttons should not be so zoomed out they're hard to press on tablet-size screens
---

## Regression Checklist

Run before any release:

- [ ] `npm run build` exits 0
- [ ] Pressing `A` key plays a note (ANSI layout)
- [ ] ISO `IntlBackslash` key plays a note when ISO layout selected
- [ ] Numpad keys play notes when ansi-np or iso-np layout selected
- [ ] MIDI: permission requested on first keypress/click (if device connected)
- [ ] Skew slider at 0.0 -> horizontal rows; at 1.0 -> diagonal stagger
- [ ] Fifth slider at 700.0 cents shows "= 12-TET"
- [ ] Double-click fifth slider snaps to nearest TET
- [ ] History canvas shows waterfall bars when keys pressed
- [ ] Staff panel shows note heads when keys pressed
- [ ] Chord panel shows name for 3+ simultaneous notes
- [ ] MIDI settings panel opens/closes on toggle click
- [ ] Per-device checkbox changes enabled state
- [ ] Volume slider changes loudness
 [ ] D ref input accepts Hz (e.g. 293.66) and note names (e.g. D4, G#5, Bb3)
- [ ] Sliders (volume, skew, tuning) do NOT steal keyboard focus — notes still play after interacting
- [ ] No pixel gaps or dead zones on keyboard canvas (parallelogram cells, CELL_INSET=0.93)
- [ ] JetBrains Mono visible (not fallback monospace)
- [ ] Black bg, white text, no rounded corners on chrome elements
- [ ] Compact GitHub star widget visible in header (not full-width banner)
- [ ] MIDI status dot NOT shown in history canvas (only in MIDI settings panel)
- [ ] Skew slider at 0.0 -> rectangular cells; at 1.0 -> leaning parallelogram cells
- [ ] About section links present
- [ ] TET preset buttons click -> slider snaps to exact value
- [ ] TET slider is wide enough (300px+) to precisely land on values
- [ ] Active TET preset button highlighted when slider is at/near that value
- [ ] Skew slider shows "MidiMech" on left end, "DCompose" on right end
- [ ] Skew slider width is at least 200px
- [ ] Chord shape graffiti overlays are visible (yellow on black)
- [ ] Chord shapes update dynamically when skew slider changes
- [ ] Chord graffiti labels ("psst... major chord") are readable
- [ ] Graffiti overlays do not block interaction (pointer-events: none)
 [ ] Zoom slider visible in controls strip (range 0.2–3.0)
 [ ] Zoom reset button (↻) resets to device default
 [ ] Desktop default zoom shows ~3–4 octaves
 [ ] Touch default zoom shows ~1–2 octaves (larger cells)
 [ ] Zoom slider does NOT steal keyboard focus
 [ ] MIT LICENSE file present in project root
- [ ] MidiMech is default view on page load (skew=0.0)
- [ ] No redundant tuning labels (no purple markers, no bottom note row, no canvas tuning box, no HTML readout)
- [ ] Chord graffiti shapes are clean triangles (no per-cell parallelogram outlines)
- [ ] Graffiti labels are non-wiggly and readable (14px, no SVG displacement filter)
- [ ] MIDI button shows ⚙ icon
- [ ] Zoom reset tooltip mentions 'standard keyboard key size'
- [ ] TET slider presets don't overlap at 694-702¢ cluster
- [ ] Skew slider shows units or descriptive value
- [ ] No pixel gaps at intermediate skew values (0.0 to 1.0)
- [ ] Axes show numerical values (note names on CoF, octaves on Pitch)
 [ ] D ref input exists as `#d4-ref-input` (type=text), no slider element `#d4-hz-slider`
 [ ] D ref hint `#d4-ref-hint` shows `[D4]` on load
 [ ] Fifth slider range is 683–722¢ (not 650–750)
 [x] Tuning badge `#tuning-thumb-badge` (input[type=number]) is editable and syncs bidirectionally with slider
 [ ] Chord graffiti major triangle = root position (▲), minor = root position (▽)

---

## VISION: Tutorial / Rhythm Game Mode

### Core Concept
An osu!-like rhythm game that ACTUALLY teaches you an instrument you can freestyle on. Unlike osu! where score-grinding only improves your click accuracy, here competitive grinding makes you a virtuoso musician — improving your improvisation skills and music understanding through repetition, iteration, variation, and pattern recognition.

### Inspirations
 **RhythmTyper**: Typing rhythm game — merge concept with isomorphic instrument
 **osu!**: Score-pushing, mods (nightcore, hardrock), competitive grinding
 **Guitar Hero / Rocksmith**: Learn real instrument through games
 The key insight: on an isomorphic layout, every chord shape is the SAME regardless of key. Grinding patterns transfers DIRECTLY to real musical skill.

### Phase 1: Sequential Tutorial (no time constraint)
 [ ] **QWERTY overlay mode**: Toggle to show the physical keyboard key label on each cell (e.g., "A", "W", "D") for the currently selected keyboard layout
 [ ] **Song tutorial**: Pre-loaded songs (start with Rick Astley — Never Gonna Give You Up)
 [ ] **Sequential play**: No timing pressure — just play the right notes in order
 [ ] **Chord support**: When a step requires 3 notes simultaneously, all 3 must light up before advancing
 [ ] **Visual cue**: Next note(s) to play are highlighted/pulsing on the grid; played notes light up green
 [ ] **Progress indicator**: How far through the song you are

### Phase 2: MIDI Import + Adaptive Layout
 [ ] **MIDI file import**: Upload any .mid file, auto-convert to the isomorphic grid
 [ ] **QWERTY-restricted mode**: Constrain imported MIDI to the smallest QWERTY box (for 60% keyboards)
 [ ] **Adaptive pitch mapping**: Programmatically match pitches to whatever input the user has:
  - Keyboard size (60%, 75%, full, with/without numpad)
  - Touch screen dimensions (tablet, phone)
  - MIDI controller key count
 [ ] **Elegant API**: `TutorialEngine` class that takes a song (note sequence with optional timing) and an input method, producing a playable tutorial adapted to the user's device

### Phase 3: Competitive Rhythm Game
 [ ] **Timed mode**: osu!-style — notes scroll toward the grid, hit them on beat
 [ ] **Scoring**: Accuracy + combo system
 [ ] **Difficulty tiers**: Easy (melody only) → Medium (chords) → Hard (full arrangement) → Expert (original MIDI)
 [ ] **Mods** (inspired by osu!):
  - **Nightcore**: Speed up tempo
  - **Hardrock (Inversion)**: Play the song's mirror image along the fourth axis — every major becomes minor and vice versa. You play the reflected shapes and melodies by flipping your perspective. (See minor chord hint below)
  - **No-fail**: Practice mode, no combo break
  - **Hidden**: Notes fade before reaching the hit zone
 [ ] **Leaderboards**: Per-song scoring (local first, multiplayer later)

### Phase 4: Multiplayer
 [ ] **Competitive**: Two players, same song, split screen or networked
 [ ] **Co-op**: Different parts of the arrangement assigned to different players
 [ ] **Import & share**: Share MIDI-to-tutorial conversions as shareable links

### Why This Matters
Imagine if osu! actually taught you an instrument. All those score-pushing hours would ALSO make you a virtuoso musician. The isomorphic layout means patterns learned in one key transfer to ALL keys — grinding competitively directly improves your improvisation skills and understanding of music through repetition, iteration, variation, and noticing patterns.

---

## Pending: Minor Chord Graffiti Hint (Reflection Insight)

### Hint Text for Minor Chord Shape
Add to the minor chord graffiti overlay:

> "It's a reflection of a major chord, neat huh? Try playing the reflected versions of your favourite songs by flipping your device upside down and playing the same shapes and melodies — like how osu! has mods, like nightcore, this could be the hardrock version of a song! You have to play its inverted version along the fourth axis."

### Design Notes
 [ ] This text should be scribbly/spray-painted like the other graffiti labels
 [ ] The minor chord IS literally a reflection of the major chord across the fourth axis on the isomorphic grid
 [ ] This connects directly to the "Hardrock" mod in the rhythm game (Phase 3)
 [ ] The hint educates about the deep mathematical symmetry: major ↔ minor is just a geometric reflection
