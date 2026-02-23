# DCompose Web

A web-based isomorphic keyboard synthesizer using the DCompose/Wicki-Hayden note layout, with live MIDI input, note history waterfall, chord detection, and chromesthesia colors.

**[Try it live](https://zitongcharliedeng.github.io/dcompose-web)** · [⭐ Star on GitHub](https://github.com/zitongcharliedeng/dcompose-web)

## Why I Made This

I've been experimenting with the MIDImech layout and became very interested in the DCompose layout and Wicki-Hayden stuff. I realized I could just plug any USB keyboard into any web viewer (like my phone) and play a grid-layout instrument — or connect a MIDI controller and use it as a live recording overlay.

## Features

### Live MIDI Input
- **Web MIDI API** — connects to any MIDI device (piano, controller, DAW loopback)
- **Per-device enable/disable** — prevent loopback doubling, use multiple MIDI sources simultaneously
- **Channel modes**: Omni (all channels), ChPerNote (MPE), ChPerRow (channel = keyboard row)
- **MIDI panel**: collapsible settings panel (▼ MIDI toggle) with device list and channel mode

### Note History Strip (top panel, 3 sections)
- **Staff notation** — treble clef, note heads at correct positions, ledger lines, chromesthesia colors
- **Piano roll waterfall** — 3-second history, notes scroll right→left, fade over time, note name labels
- **Chord panel** — large chord name (via Tonal.js), alternate interpretations, active note list, MIDI status dot

### Isomorphic Keyboard Grid
- **DCompose / Wicki-Hayden layout** — moving right = up a fifth; moving up = up an octave; D at center
- **DCompose ↔ MidiMech slider** — continuously morph between diagonal (DCompose) and horizontal (MidiMech) row alignment
- **Edge-to-edge buttons** — no gaps, no dead zones; nearest-neighbor hit detection on every pixel
- **Chromesthesia colors** — each pitch class has a fixed color (C=red through B=pink), dimmed when inactive

### Keyboard Input
- **Full key support** — every key the `isomorphic-qwerty` library knows: letters, numbers, `IntlBackslash` (ISO extra key), `Quote`, `Semicolon`, `Backslash`, and numpad keys
- **8 layout variants** — ANSI, ANSI+Numpad, ISO, ISO+Numpad, 75%, 65%, 60%, 60% ISO (dropdown)
- **Physical-position mapping** — `KeyboardEvent.code`; works on QWERTY, Dvorak, AZERTY, etc.
- **Sustain**: hold `Alt` — **Vibrato**: hold `Space`

### Tuning System
- **Fifth slider** (650–750¢) — live frequency updates, double-click snaps to nearest TET
- **Reference markers**: 12-TET, Pythagorean, 1/4-comma Meantone, 19-TET, 31-TET, 53-TET, 17-TET, 7-TET, 5-TET
- **D4 Hz reference** — text + number inputs; draggable golden D-line on keyboard canvas

### Audio
- **Zero-latency Web Audio API** — direct oscillator synthesis
- **Waveforms**: sawtooth, sine, square, triangle
- **Master volume** slider

## Quick Start

1. Open the page; click/tap anywhere to enable audio
2. Press letter/number keys to play notes
3. Connect a MIDI device to use it as input — check ▼ MIDI panel to enable/disable devices
4. Drag the skew slider to morph between DCompose and MidiMech grid layouts
5. Adjust the Fifth slider to explore microtonal tunings

## Controls

| Control | Action |
|---------|--------|
| All letter/number/punctuation keys | Play notes |
| `Alt` hold | Sustain |
| `Space` hold | Vibrato |
| `Ctrl +/-` | Zoom keyboard grid |
| Skew slider | DCompose (1.0) ↔ MidiMech (0.0) |
| Fifth slider | Tune generator (double-click = nearest TET) |
| D-line drag | Retune D4 Hz reference |
| Layout dropdown | Keyboard physical layout variant |

## Note Layout

```
Moving RIGHT  → up a fifth (700¢ default)
Moving UP     → up an octave (1200¢)
Center note   → D (coordinate [0,0], MIDI 62)
```

Same chord shapes work in any key. Scale patterns are consistent everywhere.

## Keyboard Coordinate Formula

Using [isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty):

```
ex     = iqX + rowStagger[iqY]      // rowStagger: ZXCV row = +1
dcompX = 2 * ex - iqY - 8
dcompY = -ex + 5
```

Row stagger: `{ 0: 0, 1: 0, 2: 0, 3: 1 }` (digits, QWER, ASDF, ZXCV)

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build (runs tsc + vite)
```

See [FEATURES.md](FEATURES.md) for the full feature spec and regression checklist.

## Credits

- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren — original concept and synth design
- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder — isomorphic layout engine, alternate grid orientation
- **[Striso](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren — physical DCompose instrument
- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** by Xenharmonic Devs — keyboard coordinate library
- **[Tonal.js](https://github.com/tonaljs/tonal)** — chord detection

## Links

- [Wicki–Hayden layout (Wikipedia)](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
- [Isomorphic keyboard (Wikipedia)](https://en.wikipedia.org/wiki/Isomorphic_keyboard)
- [Scale Workshop](https://scaleworkshop.plainsound.org/) — feature-rich microtonal workstation (use this if you need serious tools)
