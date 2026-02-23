# DCompose Web — Feature Specification

**This is the source of truth. Use it to prevent regressions.**

Last updated: 2026-02-23 (dynamic chord graffiti, MIDI octave bug closed, enharmonic naming, axes coupling)

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
- [x] Range: 650-750 cents (fifth size), step 0.1 cents
- [x] Live frequency updates in real-time
- [x] Double-click snaps to nearest named TET

### Reference Markers (in `synth.ts`)
- [x] 12-TET (700 cents), Pythagorean (701.96 cents), 1/4-comma Meantone (696.58 cents)
- [x] 19-TET (694.74 cents), 31-TET (696.77 cents), 53-TET (701.89 cents), 17-TET (705.88 cents)
- [x] 7-TET (685.71 cents), 5-TET (720 cents)
- [x] `findNearestMarker(fifth)` function
- [x] `nearest-marker` span shows exact or approximate match

### D4 Hz Reference
- [x] `d4-hz-input` (number) + `d4-note-input` (text) — cross-updating
- [x] Default: D4 = 293.66 Hz
- [x] Dragging golden D-line on keyboard canvas also retunes

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

### Chord Geometry (MidiMech Grid Coordinates)
From the [MidiMech cheat sheet](https://github.com/flipcoder/mech-theory):

**Major triad (triangle pointing UP):**
```
[ ][M][ ]   row 1
[R][ ][5]   row 0
```
- Root `R` at (0,0), Major 3rd `M` at (1,1), Perfect 5th `5` at (2,0)
- Intervals: root -> +4 semitones (maj3) -> +3 semitones (min3) -> root

**Minor triad (triangle pointing DOWN):**
```
[m][ ][5]   row 1
[ ][R][ ]   row 0
```
- Root `R` at (1,0), Minor 3rd `m` at (0,1), Perfect 5th `5` at (2,1)
- Intervals: root -> +3 semitones (min3) -> +4 semitones (maj3) -> root

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

## Completed: Axes Coupled to Grid Skew
### Design Intent
The X axis = Circle of Fifths, the Y axis = Pitch. Both axes rotate/stretch with the grid
when the skew slider changes.
### Specifications
 [x] **X axis label**: "Circle of Fifths →" with arrow indicating direction
 [x] **Y axis label**: "Pitch ↑" with arrow indicating direction
 [x] **Y axis rotates** with the grid: at DCompose it's vertical, at MidiMech it leans with the pitch direction
 [x] **White axes**: Both axis lines are white (#fff), prominent, with visible labels
 [x] **Grid beneath axes**: Grid cells do NOT cover axis lines or labels

---

## Pending: Smooth Transition (No Gaps at Intermediate Skew)

### Design Intent
At intermediate skew values (e.g., 0.3–0.7), the cell tiling develops gaps or overlaps
because cell shape vectors (cellHv1, cellHv2) are interpolated INDEPENDENTLY from the
basis vectors. This breaks the mathematical tiling constraint.

### Root Cause (keyboard-visualizer.ts `getSpacing()` lines 217-244)
At MidiMech (t=0), cells tile along wholetone/fourth. At DCompose (t=1), cells tile along
fifth/octave. These are two different fundamental domains of the SAME lattice.
Linear interpolation of cell vectors between them does NOT maintain tiling at intermediate t.

**Proof**: At t=0, fifth = 1×cellTileV1 + 1×cellTileV2. At t=1, fifth = 1×cellTileV1 + 0×cellTileV2.
At intermediate t, the coefficient is (1, 1-t) which is NOT integer → cells don't tile.

### Fix Formula
Always derive cell half-vectors from the CURRENT interpolated basis as wholetone/fourth:
```typescript
// wholetone = 2*fifth - octave  (pure horizontal at MidiMech, diagonal at DCompose)
// fourth   = -fifth + octave   (pure vertical at MidiMech, diagonal at DCompose)
// These ALWAYS tile because they're the reduced basis of the coordinate lattice.
const cellHv1 = {
  x: (2 * genX - genX1) / 2,
  y: -(2 * genY0 - genY1) / 2,
};
const cellHv2 = {
  x: (-genX + genX1) / 2,
  y: (genY0 - genY1) / 2,
};
```

### Verification
- At t=0 (MidiMech): gives rectangles aligned to wholetone/fourth ✓
- At t=1 (DCompose): gives wholetone/fourth parallelograms (correct tiling) ✓
- At ALL intermediate t: tiles perfectly (reduced basis is always valid) ✓

### Specifications
 [ ] No gaps between cells at ANY skew value (0.0 to 1.0)
 [ ] No overlaps between cells at ANY skew value
 [ ] Cell edges always touch (continuous surface, CELL_INSET=0.93 mortar only)
 [ ] Parallelogram shape interpolation is smooth and continuous
 [ ] Replace lines 217-244 in getSpacing() with wholetone/fourth derivation
 [ ] Transition from MidiMech to DCompose has no 'holes' or disconnected cells

---

## Pending: Enhanced Note Naming (Double-Flat/Sharp with Cents Bracket)

### Design Intent
For non-12-TET tunings, note names should show accurate enharmonic spelling with
cent deviation underneath in brackets. In 12-TET, names are standard (no brackets).

### Specifications
 [ ] Primary label: enharmonic note name using double-flats/sharps when accurate (e.g., `B𝄫`)
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

## Pending: Fix Chord Graffiti Shape and Readability

### Known Issues
1. Per-cell parallelogram outlines (lines 158-181 in chord-graffiti.ts) create ugly 'connected squares' appearance
2. Major chord shape doesn't look like opposite/reflection of minor chord
3. Text labels use SVG displacement filter → wiggly and unreadable
4. Font size 11px with 0.7 opacity → too small and dim
5. Hint text at 8px is microscopic

### Fix Specifications
 [ ] Remove per-cell parallelogram outlines (keep ONLY the triangle connecting 3 chord tone centers)
 [ ] Major triad triangle: points UP (root at bottom-left, maj3 at top, p5 at bottom-right)
 [ ] Minor triad triangle: points DOWN (reflection of major across fourth axis)
 [ ] Remove `filter: url(#spray-roughen)` from `.graffiti-overlay` CSS
 [ ] Remove `filter: url(#spray-roughen)` from `.graffiti-label` CSS
 [ ] Increase graffiti label font size to 14px, opacity to 0.9
 [ ] Increase hint text font size to 10px, opacity to 0.7
 [ ] Text must be clean and readable — no wiggly displacement effects

---

## Pending: Remove Redundant Canvas/HTML Elements

### Design Intent
Several UI elements now duplicate information shown by the improved TET slider thumb badge
and white Circle of Fifths axis. Remove them to declutter.

### Elements to Remove
 [ ] `drawCircleOfFifthsLabels()` — bottom x-axis note row (lines 478-507 in keyboard-visualizer.ts)
 [ ] `drawTuningMarkersInline()` — purple tuning markers at bottom (lines 443-476)
 [ ] Canvas tuning label at top (`12-TET (700.0¢)` box, lines 339-356)
 [ ] HTML `.tuning-readout` div with `#tuning-value` and `#nearest-marker` (index.html lines 549-552)
 [ ] Remove the call sites in `drawPitchLines()` (lines 357-358)

---

## Pending: MidiMech as Default View

### Design Intent
MidiMech (skew=0.0) should be the default view when the page loads, not DCompose (skew=1.0).
MidiMech is the more intuitive starting layout with horizontal wholetone rows and vertical fourths.

### Specifications
 [ ] Change `value="1"` to `value="0"` on `#skew-slider` in index.html
 [ ] Update main.ts initialization to match (if any hardcoded defaults)
 [ ] Left endpoint label ('MidiMech') should have `.active` class on load
 [ ] Right endpoint label ('DCompose') should NOT have `.active` class on load

---

## Pending: Restore Numerical Axis Values

### Design Intent
After removing redundant bottom labels, the axes need their own numerical markers.
Pitch axis needs Hz/octave markers. CoF axis needs note names along the axis line.

### Specifications
 [ ] **CoF axis**: Note names (D, A, E, B, F♯, ...) placed along the Circle of Fifths axis line
 [ ] **Pitch axis**: Octave markers (C2, C3, D4, C5, etc.) along the Pitch axis line
 [ ] Labels rotate with axes when skew changes (coupled to grid geometry)
 [ ] Labels are small, semi-transparent, and don't obscure grid cells
 [ ] Origin marker (D4 + Hz) remains at center intersection

---

## Pending: UI Polish Fixes

### MIDI Settings Button
 [ ] Rename from `▼ MIDI` to `⚙ MIDI` (cog icon implies settings)
 [ ] Toggle text: open = `⚙ MIDI settings`, closed = `⚙ MIDI`
 [ ] Button hugs left side of header (already positioned correctly)

### Zoom Reset Tooltip
 [ ] `title="Aims to match keysize to standard keyboard key size"` on `#zoom-reset`

### TET Slider Preset Spacing
 [ ] Increase stagger threshold from 3% to 5% of slider range
 [ ] Prevents overlapping labels at 694-702¢ cluster (19-TET, Meantone, 31-TET, 12-TET, Pythagorean, 53-TET)

### Skew Slider Units/Labels
 [ ] Display current value (0.0–1.0) or descriptive text within/near the slider
 [ ] Consider showing intermediate layout name or percentage

---

## Pending: MPE Support + Pressure-Sensitive Touch

### MPE (MIDI Polyphonic Expression)
 [ ] Per-note pitch bend on channels 2-16
 [ ] Per-note aftertouch (CC 74 / pressure)
 [ ] Manager channel on ch 1 for global controls
 [ ] Configuration UI in MIDI settings panel

### Pressure-Sensitive Touchscreen
 [ ] Map `PointerEvent.pressure` to velocity on note-on
 [ ] Map `PointerEvent.pressure` changes to expression/aftertouch
 [ ] Fallback to fixed velocity (0.7) when pressure API unavailable
 [ ] Works alongside MPE output for pressure → MIDI CC mapping

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
- [ ] D4 Hz input + note name input cross-update correctly
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
