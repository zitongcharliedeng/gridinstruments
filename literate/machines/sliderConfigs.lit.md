# Slider Configs

Per-slider component configurations for `NumericSlider`. Each config provides the `defaultValue`, badge/label formatters, and (for editable badges) a `parseInput` function. Range, step, and initial value are read from the HTML element by `NumericSlider` at runtime.

## D-ref note-name-to-Hz helper

The D-ref slider accepts either a plain Hz number or a note name (e.g. `A4`, `C5`). This local helper converts note names to Hz. It is duplicated from the module-level helper in `main.ts` (which is not exported) and must stay in sync with it.

``` {.typescript file=_generated/machines/sliderConfigs.ts}
import type { SliderComponentConfig } from '../components/NumericSlider';

const NOTE_SEMITONES: Partial<Record<string, number>> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function noteNameToHz(input: string): number | null {
  const m = /^([A-Ga-g][#b]?)(\d+)$/.exec(input.trim());
  if (!m) return null;
  const noteKey = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const semitone = NOTE_SEMITONES[noteKey];
  if (semitone === undefined) return null;
  const octave = parseInt(m[2], 10);
  const semitonesFromD4 = (octave - 4) * 12 + (semitone - 2);
  return 293.66 * Math.pow(2, semitonesFromD4 / 12);
}
```

## Tuning and skew configs

Tuning covers the range 683–722 cents, defaulting to 700 (equal temperament fifth). Skew maps 0 (MidiMech) to 1 (DCompose); its `parseInput` accepts values outside 0–1 so microtonal presets can be typed in directly.

``` {.typescript file=_generated/machines/sliderConfigs.ts}
export const TUNING_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'tuning',
  defaultValue: 700,
  formatBadge: (v) => v.toFixed(1),
  editable: true,
  parseInput: (raw) => {
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 683 || n > 722) return null;
    return n;
  },
};

export const SKEW_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'skew',
  defaultValue: 0,
  formatBadge: (v) => v.toFixed(2),
  editable: true,
  parseInput: (raw) => {
    const n = parseFloat(raw);
    return isFinite(n) ? n : null;
  },
};
```

## Volume and zoom configs

Volume stores a 0–1 linear gain but the badge displays dB, with −∞ shown when gain is zero. Zoom is not editable; its `defaultValue` of 1.0 may be overridden per touch device in `main.ts` before the slider is constructed.

``` {.typescript file=_generated/machines/sliderConfigs.ts}
export const VOLUME_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'volume',
  defaultValue: 0.3,
  formatBadge: (v) => (v <= 0 ? '-\u221E' : (20 * Math.log10(v)).toFixed(1)),
  editable: false,
};

export const ZOOM_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'zoom',
  defaultValue: 1.0,
  formatBadge: (v) => v.toFixed(2),
  editable: false,
};
```

## D-ref config

The D-ref slider controls the reference frequency for the D note (default 293.66 Hz at A440). Its `parseInput` tries a note-name parse first, then falls back to a plain Hz number, accepting any value in the audible 20–20000 Hz range.

``` {.typescript file=_generated/machines/sliderConfigs.ts}
export const DREF_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'dref',
  defaultValue: 293.66,
  formatBadge: (v) => v.toFixed(2),
  editable: true,
  parseInput: (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const fromNote = noteNameToHz(trimmed);
    if (fromNote !== null) return fromNote;
    const hz = parseFloat(trimmed);
    return isFinite(hz) && hz >= 20 && hz <= 20000 ? hz : null;
  },
};
```
