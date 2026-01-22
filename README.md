# DCompose Web

A web-based isomorphic keyboard synthesizer using the DCompose/Wicki-Hayden note layout. Play music with your computer keyboard - works on mobile with external USB keyboards!

**[Try it live](https://zitongcharliedeng.github.io/dcompose-web)**

## Why I Made This

I've been experimenting with the MIDImech layout and became very interested in the DCompose layout and Wicki-Hayden stuff. I realized I could just plug any USB keyboard into any web viewer (like my phone) and play a grid-layout instrument without needing to bring my LinnStrument around.

The latency is close to zero - I can just use my phone as the web viewer and speaker to experiment with layouts and tunings on the go.

## Features

- **Zero latency** - Web Audio API with direct oscillator synthesis
- **Isomorphic layout** - Same chord/scale shapes work in any key
- **Multiple keyboard layouts** - QWERTY (US/UK), QWERTZ (German), AZERTY (French)
- **Chord detection** - Real-time chord name display using Tonal.js
- **Mobile-friendly** - Connect a USB keyboard to your phone and play!
- **Visual feedback** - See which notes are being pressed on the grid
- **Sustain pedal** - Toggle with spacebar
- **Octave shifting** - Use +/- keys to shift octaves
- **Multiple waveforms** - Sawtooth, sine, square, triangle

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

### Controls

| Key | Action |
|-----|--------|
| Letter/number keys | Play notes |
| `Space` | Toggle sustain |
| `+` / `-` | Octave up/down |

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

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
