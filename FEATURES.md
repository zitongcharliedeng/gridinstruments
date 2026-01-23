# DCompose Web - Feature Specification

**This is the source of truth. If a feature is not documented here with [x], it's not done.**

Last updated: 2026-01-23

## Core Architecture

### Physical Keyboard Mapping
- [x] Uses `KeyboardEvent.code` (physical position), NOT `key` (logical character)
- [x] Works identically on QWERTY, Dvorak, AZERTY, Colemak, etc.
- [x] Transformation formula: `coordX = 2*physX + physY - 14`, `coordY = -physX - physY + 8`
- [x] KeyH (physical position) = D at coordinate [0, 0]

### Bottom Row Exclusion
- [x] Bottom row (Ctrl, Alt, Win, Space) is NOT part of the note grid
- [x] Rationale: Spacebar occupies 5-6 key widths, breaks uniform grid
- [x] Comment in code explaining this design decision
- [x] `MODIFIER_ROW_KEYS` set defined in keyboard-layouts.ts

## Modifier Keys

### Sustain (Alt key)
- [x] Alt key HOLD = sustain ON
- [x] Alt key RELEASE = sustain OFF, all sustained notes stop
- [x] Visual indicator on sustain button
- [x] Both AltLeft and AltRight work
- [x] NOT a toggle - must hold

### Vibrato (Space key)
- [x] Space key HOLD = vibrato ON
- [x] Space key RELEASE = vibrato OFF
- [x] Only affects notes pressed WHILE vibrato is active
- [x] Sustained notes keep vibrato state they had when pressed
- [x] Does NOT retroactively add vibrato to already-sustained notes
- [x] `vibratoOnPress` tracked per-voice in synth

### Key Event Capture
- [x] `event.preventDefault()` on all keys except F5, F11, F12, Escape
- [x] Prevents browser shortcuts (Ctrl+W, Alt+Tab, etc.)
- [x] Allows F5 refresh, F11 fullscreen, F12 devtools, Escape

## Pitch Control

### Octave Offset
- [x] Y-axis shift in the grid
- [x] +/- 12 semitones per step
- [x] UI buttons for adjustment (+/-)
- [x] Display shows current offset

### Transpose Offset
- [x] X-axis shift (circle of fifths)
- [x] +/- 7 semitones per step (one fifth)
- [x] UI buttons for adjustment (+/-)
- [x] Display shows current offset
- [x] Applied in handleKeyDown via `effectiveCoordX = coordX + this.transposeOffset`
- [ ] **NEEDS VERIFICATION**: Test that transpose actually shifts notes

## Tuning System

### Continuous Tuning Slider
- [x] Range: 650-750 cents for the fifth
- [x] Live frequency updates - all playing notes update in real-time via `setGenerator()`
- [x] Vertical slider on left side panel
- [x] Step size: 0.1 cents for fine control

### Reference Markers
- [x] 12-TET (700 cents) - Western standard
- [x] Pythagorean (701.96 cents) - Pure fifths
- [x] 1/4 Meantone (696.58 cents) - Pure major thirds
- [x] 19-TET (694.74 cents)
- [x] 31-TET (696.77 cents)
- [x] 53-TET (701.89 cents) - Turkish classical
- [x] 17-TET (705.88 cents)
- [x] 7-TET (685.71 cents) - Thai music
- [x] 5-TET (720 cents) - Indonesian slendro
- [x] Clickable markers jump to that tuning
- [x] Markers positioned alongside slider

### Nearest Marker Display
- [x] Shows nearest tuning marker name when sliding
- [x] Shows exact match (= name) when within 2 cents
- [x] Shows approximate match (≈ name +X¢) otherwise
- [x] `findNearestMarker()` function in synth.ts

### A4 Reference Frequency
- [x] Adjustable A4 reference (400-480Hz, default 440Hz)
- [x] Decimal input field in UI
- [x] `setA4Hz()` method in synth
- [x] Recalculates D4 base frequency when changed
- [x] Updates all playing notes in real-time
- [x] Formula: D4 = A4 / 2^(3 * fifth / 1200)

## Audio Controls

### Volume
- [x] Master volume slider (0-1)
- [x] Smooth transitions via `setTargetAtTime()` to avoid clicks
- [x] Default: 0.3

### EQ/Tone
- [x] Tone slider (bass ↔ treble)
- [x] Uses highshelf filter at 3kHz
- [x] Range: -12dB to +12dB
- [x] Smooth transitions

### Waveform
- [x] Sawtooth (default)
- [x] Sine
- [x] Square
- [x] Triangle
- [x] Dropdown selector in header

## Visualizer

### Grid Layout
- [x] Y-axis = pitch height (higher = higher pitch)
- [x] X-axis = circle of fifths (right = sharper keys)
- [x] Grid adjusts based on tuning (fifth size in cents)
- [x] D is centered at origin
- [x] Canvas-based rendering

### Labels
- [x] Y-axis: Octave labels (D1-D7 with Hz values)
- [x] X-axis: Circle of fifths labels (Bb, F, C, G, D, A, E, B, F#, etc.)
- [x] A4=440Hz reference line (dashed, orange)
- [x] Labels drawn in `drawPitchLines()` and `drawCircleOfFifthsLabels()`

### Button Sizing
- [x] **AUTO-CALCULATED** - buttons are as large as possible without overlap
- [x] `calculateOptimalButtonRadius()` function
- [x] `buttonSpacing` parameter (0 = touching, 0.1 = 10% gap, default 0.05)
- [x] No manual button size slider needed
- [x] Radius clamped to 6-40px range

### Scale/Zoom
- [x] `scaleX` and `scaleY` multipliers
- [x] Decimal input fields (not sliders) for precision
- [x] Range: 0.5 - 2.0
- [x] Affects `genX` and `genYFactor` spacing calculations
- [ ] **FUTURE**: Draggable axis handles for intuitive adjustment

### Active Note Display
- [x] Green highlight for pressed notes
- [x] Orange highlight for sustained notes
- [x] Colors defined in visualizer `colors` object

### Info Panel
- [x] Chord detection display (using Tonal.js)
- [x] Active note names display

## UI Design

### Minimalist Approach
- [x] Decimal inputs for scale X/Y (not sliders)
- [x] Auto-calculated button sizes
- [x] No button size slider
- [x] Tuning slider kept (good for exploration)
- [x] Volume/EQ sliders kept (natural for audio)

### Controls Layout
- [x] Header: Logo, Octave +/-, Transpose +/-, Sustain button, Waveform
- [x] Left panel: Tuning slider with markers
- [x] Main area: Canvas visualizer
- [x] Below canvas: Volume, EQ sliders
- [x] Below that: Scale inputs, A4 Hz input
- [x] Info panel: Chord display, Notes display
- [x] Instructions panel: How to play

## Files Modified

- `src/lib/keyboard-layouts.ts` - Physical key mapping, SPECIAL_KEYS, MODIFIER_ROW_KEYS
- `src/lib/synth.ts` - Audio synthesis, tuning, A4 Hz reference, vibrato per-voice
- `src/lib/keyboard-visualizer.ts` - Canvas rendering, auto-sizing, labels
- `src/main.ts` - Event handling, UI wiring
- `index.html` - UI structure and styles
- `FEATURES.md` - This file (source of truth)
- `README.md` - User documentation

## Testing Checklist

Before release, manually verify:
- [ ] All letter/number keys play notes
- [ ] Alt hold = sustain ON, release = OFF
- [ ] Space hold = vibrato ON, release = OFF
- [ ] Transpose buttons shift notes on X-axis (test: same key plays different pitch)
- [ ] Octave buttons shift notes on Y-axis
- [ ] Tuning slider changes pitch in real-time
- [ ] Nearest marker shows correctly when tuning
- [ ] A4 Hz input changes pitch reference
- [ ] Volume slider works
- [ ] EQ slider works (treble/bass change)
- [ ] Waveform selector works (sound character changes)
- [ ] Visualizer shows correct note positions
- [ ] Active/sustained notes highlight correctly
- [ ] Chord detection displays correctly
- [ ] No browser shortcuts trigger (try Ctrl+W)
- [ ] Scale X/Y inputs adjust grid spacing
- [ ] Circle of fifths labels visible at bottom
- [ ] Octave labels visible on left

## Known Issues / TODO

1. [ ] Need manual verification of transpose feature
2. [ ] Consider adding draggable axis handles for scale
3. [ ] Mobile: tuning markers hidden (by design, but could improve)
4. [ ] No MIDI support yet
5. [ ] No recording/export feature yet
