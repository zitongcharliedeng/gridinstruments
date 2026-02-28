# GridInstruments

A web-based isomorphic keyboard synthesizer using the DCompose/Wicki-Hayden note layout, with live MIDI input, note history waterfall, chord detection, and chromesthesia colors.

**[Try it live](https://gridinstruments.xyz)** · [⭐ Star on GitHub](https://github.com/zitongcharliedeng/gridinstruments) · [![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20NC-blue)](LICENSE)

![GridInstruments screenshot](tests/visual-regression.spec.ts-snapshots/full-page-chromium-linux.png)

## Why I Made This

I've been experimenting with the MIDImech layout and became very interested in the DCompose layout and Wicki-Hayden stuff. I realized I could just plug any USB keyboard into any web viewer (like my phone) and play a grid-layout instrument — or connect a MIDI controller and use it as a live recording overlay.

## Features

- **Isomorphic keyboard grid** — DCompose / Wicki-Hayden layout with continuous DCompose↔MidiMech skew slider
- **Live MIDI input** — Web MIDI API with per-device enable/disable
- **MPE output** *(in progress)* — send expressive MIDI to external synths
- **Note history** — staff notation, piano-roll waterfall, chord detection
- **Tuning exploration** — continuous fifth slider (7-TET through 5-TET), reference markers, live frequency updates
- **Chromesthesia colors** — each pitch class has a fixed OKLCH color
- **Multiple keyboard layouts** — ANSI, ISO, 75%, 65%, 60% with numpad variants
- **Zero-latency Web Audio** — direct oscillator synthesis with multiple waveforms

## Controls

| Control | Action |
|---------|--------|
| Letter/number/punctuation keys | Play notes |
| `Shift` hold | Vibrato |
| `Space` hold | Sustain |
| Skew slider | DCompose (1.0) ↔ MidiMech (0.0) |
| Fifth slider | Tune generator (double-click = nearest TET) |
| D-line drag | Retune D reference Hz |
| Layout dropdown | Keyboard physical layout variant |

## Quick Start

1. Open the page; click/tap anywhere to enable audio
2. Press letter/number keys to play notes
3. Connect a MIDI device — check ⚙ MIDI panel to enable/disable devices
4. Drag the skew slider to morph between DCompose and MidiMech layouts
5. Adjust the Fifth slider to explore microtonal tunings

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build (tsc + vite)
npx playwright test --project=firefox  # run tests
```

## Credits

- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren — original concept and synth design
- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder — isomorphic layout engine
- **[Striso](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren — physical DCompose instrument
- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** by Xenharmonic Devs — keyboard coordinate library

## Links

- [Wicki–Hayden layout (Wikipedia)](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
- [Isomorphic keyboard (Wikipedia)](https://en.wikipedia.org/wiki/Isomorphic_keyboard)
