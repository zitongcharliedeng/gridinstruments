# GridInstruments

Isomorphic keyboard synthesizer in the browser. DCompose / Wicki-Hayden layout, Web Audio, Web MIDI, note history, microtonality.

**[Try it live](https://gridinstruments.xyz)** · [⭐ Star on GitHub](https://github.com/zitongcharliedeng/gridinstruments) · [![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20NC-blue)](LICENSE)

![GridInstruments screenshot](tests/visual-regression.spec.ts-snapshots/full-page-chromium-linux.png)

## Features

- **Isomorphic grid** — DCompose / Wicki-Hayden layout, continuous DCompose↔MidiMech skew
- **Web Audio** — direct oscillator synthesis, multiple waveforms, zero-latency
- **Web MIDI** — live MIDI input with per-device enable/disable
- **MPE output** *(in progress)* — send expressive MIDI to external synths
- **Microtonality** — continuous fifth slider (7-TET through 5-TET), reference markers
- **Note history** — waterfall + staff notation, chord detection
- **Chromesthesia** — pitch-class colors in OKLCH

## Controls

| Control | Action |
|---------|--------|
| Letter/number keys | Play notes |
| `Shift` hold | Vibrato |
| `Space` hold | Sustain |
| Skew slider | DCompose (1.0) ↔ MidiMech (0.0) |
| Fifth slider | Tune generator (double-click = nearest TET) |
| Layout dropdown | Keyboard physical layout variant |

## Credits

- **[WickiSynth](https://www.toverlamp.org/static/wickisynth/wickisynth_lowlatency.html)** by Piers Titus van der Torren — original concept
- **[MIDImech](https://github.com/flipcoder/midimech)** by flipcoder — isomorphic layout engine
- **[Striso](https://www.striso.org/the-note-layout/)** by Piers Titus van der Torren — physical DCompose instrument
- **[isomorphic-qwerty](https://github.com/xenharmonic-devs/isomorphic-qwerty)** by Xenharmonic Devs — keyboard coordinate library

## Development

```bash
npm install
npm run dev      # Vite dev server on :5173
npm run build    # tsc + vite build
npx playwright test --project=chromium  # run tests
```
