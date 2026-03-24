# App Constants

Shared presets, tuning table rows, and source link helper.

## Imports and preset types

``` {.typescript file=_generated/app-constants.ts}
import { TUNING_MARKERS } from './lib/synth';

export interface SliderPresetPoint { value: number; label: string }
```

## Preset arrays

`SKEW_PRESETS` and `SHEAR_PRESETS` name the two endpoints of their respective continuous
parameters. `TUNING_LABEL_PRESETS` is derived from `TUNING_MARKERS` so the tuning slider
tick labels stay in sync with the synth's marker table.

``` {.typescript file=_generated/app-constants.ts}
export const SKEW_PRESETS: SliderPresetPoint[] = [
  { value: 0, label: 'DCompose / Wicki-Hayden' },
  { value: 1, label: 'MidiMech' },
];

export const SHEAR_PRESETS: SliderPresetPoint[] = [
  { value: 0, label: 'DCompose' },
  { value: 1, label: 'Wicki-Hayden' },
];

export const TUNING_LABEL_PRESETS: SliderPresetPoint[] = TUNING_MARKERS.map(m => ({ value: m.fifth, label: m.name }));
```

## Tuning table rows

Built once at module load time from `TUNING_MARKERS` sorted by fifth size.

``` {.typescript file=_generated/app-constants.ts}
const tuningTableRows = TUNING_MARKERS
  .slice().sort((a, b) => a.fifth - b.fifth)
  .map(m => `<tr><td><strong>${m.fifth % 1 === 0 ? m.fifth : `~${String(m.fifth)}`}¢</strong></td><td>${m.description}</td></tr>`)
  .join('\n');
```

## Source link helper

Generates a small footer link pointing to the literate source file on GitHub.

``` {.typescript file=_generated/app-constants.ts}
const SRC = 'https://github.com/zitongcharliedeng/gridinstruments/blob/main/literate';
export const srcLink = (file: string, label = 'Source'): string =>
  `<p style="margin-top:16px;padding-top:8px;border-top:1px solid #222;font-size:10px;"><a href="${SRC}/${file}" target="_blank" rel="noopener" style="color:var(--dim);">📄 ${label}</a></p>`;
export { tuningTableRows };
```
