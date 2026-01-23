# DCompose Web

A web-based isomorphic keyboard synthesizer using the DCompose/Wicki-Hayden note layout. Play music with your computer keyboard - works on mobile with external USB keyboards!

**[Try it live](https://zitongcharliedeng.github.io/dcompose-web)**

## Why I Made This

I've been experimenting with the MIDImech layout and became very interested in the DCompose layout and Wicki-Hayden stuff. I realized I could just plug any USB keyboard into any web viewer (like my phone) and play a grid-layout instrument without needing to bring my LinnStrument around.

The latency is close to zero - I can just use my phone as the web viewer and speaker to experiment with layouts and tunings on the go.

## Features

### Core Features
- **Zero latency** - Web Audio API with direct oscillator synthesis
- **Isomorphic layout** - Same chord/scale shapes work in any key
- **Works with ANY keyboard** - QWERTY, Dvorak, AZERTY, Colemak, etc. (uses physical key codes)
- **Chord detection** - Real-time chord name display using Tonal.js
- **Mobile-friendly** - Connect a USB keyboard to your phone and play!
- **Visual feedback** - See which notes are being pressed on the grid

### Controls
- **Alt (hold)** - Sustain pedal (notes continue after release)
- **Space (hold)** - Vibrato (pitch modulation)
- **Octave shift** - Move up/down in pitch (Y-axis)
- **Transpose** - Move left/right on circle of fifths (X-axis)
- **Multiple waveforms** - Sawtooth, sine, square, triangle

### Tuning System
- **Continuous tuning slider** - Explore the syntonic temperament continuum (650-750 cents)
- **Live tuning changes** - All playing notes update in real-time when you change tuning
- **Reference markers** - 12-TET, Pythagorean, Meantone, 19-TET, 31-TET, 5-TET, 7-TET, etc.

### Visualizer
- **Dynamic layout** - Grid adjusts to show accurate pitch relationships for current tuning
- **Octave labels** - D1-D7 with Hz values on Y-axis
- **Circle of fifths labels** - Note names on X-axis
- **A4=440Hz reference line** - Visual pitch reference
- **Zoom controls** - Adjust horizontal/vertical spacing and button size

## How It Works

The DCompose note layout arranges notes in a 2D grid where:
- **Horizontal axis** = Circle of fifths (moving right goes up a fifth)
- **Vertical axis** = Pitch height (moving up raises pitch)
- **D** is at the center of the layout

This means:
- Notes that sound good together are close together
- The same chord shape works in any key
- Scale patterns are consistent everywhere

## Quick Start

1. Open the web page
2. Click/tap anywhere to enable audio
3. Press keys on your keyboard to play!

### Keyboard Controls

| Key | Action |
|-----|--------|
| All letter/number keys | Play notes |
| `Alt` (hold) | Sustain - notes keep playing after release |
| `Space` (hold) | Vibrato - adds pitch modulation to active notes |
| Octave +/- buttons | Shift all notes up/down by octave |
| Transpose +/- buttons | Shift all notes left/right on circle of fifths |

### Modifier Row Design

The bottom row of the keyboard (Ctrl, Alt, Space) is reserved for modifiers, NOT notes:
- Most keyboards have a massive spacebar that breaks the uniform grid pattern
- This row is useless for isomorphic note playing anyway
- So we repurpose it: Alt = Sustain, Space = Vibrato, Ctrl = Reserved (unused)

### Vibrato Behavior

- **Vibrato only affects actively held keys** - sustained notes are NOT affected
- **Vibrato state is captured at note start** - if you press a note while holding Space, it gets vibrato
- **Sustained notes retain their vibrato state** - if you press with vibrato, release (sustain holds it), it keeps vibrating

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Feature Specification (for regression prevention)

### Physical Keyboard Mapping
- Uses `KeyboardEvent.code` (physical position), NOT `key` (logical character)
- Works identically on QWERTY, Dvorak, AZERTY, Colemak, etc.
- Transformation formula: `coordX = 2*physX + physY - 14`, `coordY = -physX - physY + 8`
- KeyH (physical position) = D at coordinate [0, 0]

### Bottom Row Exclusion
- Bottom row (Ctrl, Alt, Win, Space) is NOT part of the note grid
- Rationale: Spacebar occupies 5-6 key widths, breaks uniform grid
- Alt = Hold for sustain (not toggle)
- Space = Hold for vibrato
- Ctrl = Unused (prevents Ctrl+W closing tab)

### Key Event Handling
- `event.preventDefault()` on all keys except F5, F11, F12, Escape
- Prevents browser shortcuts (Ctrl+W, Alt+Tab, etc.)
- Allows F5 refresh, F11 fullscreen, F12 devtools, Escape

### Sustain Behavior
- Alt key HOLD = sustain ON
- Alt key RELEASE = sustain OFF, all sustained notes stop
- Visual indicator on sustain button

### Vibrato Behavior
- Space key HOLD = vibrato ON
- Space key RELEASE = vibrato OFF
- Only affects notes pressed WHILE vibrato is active
- Sustained notes keep vibrato state they had when pressed
- Does NOT retroactively add vibrato to already-sustained notes

### Pitch Offset System
- `octaveOffset`: Y-axis shift, +/-12 semitones per step
- `transposeOffset`: X-axis shift, +/-7 semitones per step (circle of fifths)
- Both use same logic (just offset values), no code duplication

### Visualizer Layout
- Y-axis = pitch height (higher = higher pitch)
- X-axis = circle of fifths (right = sharper keys)
- Grid adjusts based on tuning (fifth size in cents)
- `scaleX`, `scaleY` multipliers for zoom control

## Credits & Inspiration

This project is heavily inspired by and builds upon:

- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren - The original web-based Wicki keyboard synthesizer. The core keyboard mapping concept and oscillator synth design come from this project.

- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder - Isomorphic musical layout engine for LinnStrument and Launchpad X. Inspired the UI approach and chord detection feature.

- **[Striso](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren - Physical instrument using the DCompose layout. The official source of the DCompose note layout design.

- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** - Library for mapping QWERTY keyboards to isomorphic coordinates.

## The DCompose Layout

The DCompose note layout is an orthogonal decomposition of pitch and the circle of fifths:
- "DCompose" refers to mathematical **decomposition**
- The musical term **compose**
- The note **D**, which is central in this layout

It's closely related to the Wicki-Hayden layout (they can transform into each other by shearing), but DCompose has a clearer pitch height direction, making it more intuitive.

## Technologies

- **TypeScript** + **Vite** - Modern build tooling
- **Web Audio API** - Low-latency audio synthesis
- **Tonal.js** - Music theory and chord detection
- **Canvas API** - Keyboard visualization

## License

MIT License - Feel free to use, modify, and share!

## Links

- [Wicki-Hayden Layout (Wikipedia)](https://en.wikipedia.org/wiki/Wicki-Hayden_note_layout)
- [Isomorphic Keyboard (Wikipedia)](https://en.wikipedia.org/wiki/Isomorphic_keyboard)
- [Original WickiSynth Source](https://github.com/pierstitus/tuning-exploration)
