# DCompose Web — Feature Specification

**This is the source of truth. Use it to prevent regressions.**

Last updated: 2026-02-23 (TET slider overhaul, skew slider overhaul, chord shape graffiti, visual test spec)

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

## Pending Rendering Fixes

These fixes from the previous session are prerequisites for the chord shape graffiti:

### Color System (note-colors.ts)
- [ ] Switch from fifths-based hue to **chromatic** hue mapping: `hue = pitchClass * 30 + 329`
- [ ] D = 29 deg (red), E = 89 deg (yellow), G = 179 deg (cyan), A = 239 deg (blue)
- [ ] Adjacent grid cells (fifths = 7 semitones apart) differ by 210 deg hue — maximum contrast
- [ ] Adjacent semitones (C/C#) differ by 30 deg — similar but distinguishable

### Grid/Axis Rendering (keyboard-visualizer.ts)
- [ ] **Render order**: Grid cells FIRST, then axes ON TOP (currently reversed)
- [ ] **Axis lines**: Two prominent white lines through center — CoF axis and Pitch axis
- [ ] **Pitch axis skews** with the MidiMech slider (follows genX1, -genY1 direction)
- [ ] **Grid fade-out**: Cells near canvas edges get decreasing alpha (vignette effect)
- [ ] **Grid beneath axes**: Cells never cover axis lines or labels

### Title Bar (index.html)
- [ ] Title bar (DCompose Web + GitHub buttons) should **float/overlay** on the history canvas using `position: absolute` — NOT take its own row
- [ ] `z-index` above the canvas, centered horizontally

### Header Layout (index.html)
- [ ] MIDI button pinned to LEFT of header
- [ ] Quote takes remaining space on RIGHT, in golden/colored readable text

### Note Naming (keyboard-layouts.ts)
- [ ] No double-sharps or double-flats for |coordX| > 6
- [ ] Wrap to enharmonic equivalents

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
