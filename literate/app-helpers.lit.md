# App Helpers

Pure utility functions — Markdown rendering, type guards, numeric parsing, slider annotation formatting, and D-reference note/Hz conversion.

## Imports

``` {.typescript file=_generated/app-helpers.ts}
import type { WaveformType } from './lib/synth';
import type { SliderPresetPoint } from './app-constants';
```

## Markdown Renderer

`renderMarkdown` converts a restricted Markdown subset to HTML for the About dialog. It strips the H1 title, image/badge lines, and everything from `## Development` onward, then converts headings, tables, inline formatting, links, and lists.

Tables are handled before inline formatting to avoid confusing pipe characters with other syntax.

``` {.typescript file=_generated/app-helpers.ts}
export function renderMarkdown(md: string): string {
  const withoutDev = md
    .replace(/^# .+\n/m, '')
    .replace(/^\[?!\[.*$/gm, '')
    .split(/^## Development$/m)[0];

  return withoutDev
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\|(.+)\|$/gm, (_: string, row: string) =>
      '<tr>' + row.split('|').map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>')
    .replace(/<tr>(<td>[-:\s]+<\/td>)+<\/tr>\n?/g, '')
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)(?!\n<li>)/g, '$1</ul>')
    .replace(/<li>/g, (m: string, offset: number, str: string) => str.lastIndexOf('<li>', offset) < str.lastIndexOf('</ul>', offset) ? '<ul><li>' : m)
    .replace(/\n{2,}/g, '\n')
    .trim();
}
```

## Type Guards and Numeric Parsing

`isWaveformType` narrows `unknown` to `WaveformType`. `parseNum` wraps `parseFloat` with a fallback for `NaN` — used everywhere slider attribute strings are read.

``` {.typescript file=_generated/app-helpers.ts}
export function isWaveformType(value: unknown): value is WaveformType {
  return typeof value === 'string' && ['sine', 'square', 'sawtooth', 'triangle', 'pluck', 'organ', 'brass', 'pad', 'bell', 'bass', 'bright', 'warm', 'guitar'].includes(value);
}

export function parseNum(s: string, fallback: number): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}
```

## Slider Annotation Formatter

`formatSliderAnnotation` displays the value as an offset from the nearest named preset. When the distance is below the display threshold (half the last displayed digit) it shows the preset label directly. Otherwise it shows `"label ±N.NNunit"` with a Unicode minus sign for negative offsets.

``` {.typescript file=_generated/app-helpers.ts}
export function formatSliderAnnotation(
  value: number,
  presets: SliderPresetPoint[],
  precision: number,
  unit = '',
): string {
  let nearest = presets[0];
  let minDist = Math.abs(value - nearest.value);
  for (const p of presets) {
    const d = Math.abs(value - p.value);
    if (d < minDist) { minDist = d; nearest = p; }
  }
  const threshold = 0.5 * Math.pow(10, -precision);
  if (minDist < threshold) return nearest.label;
  const offset = value - nearest.value;
  const rounded = parseFloat(Math.abs(offset).toFixed(precision));
  const sign = offset > 0 ? '+' : '\u2212';
  return `${nearest.label} ${sign}${rounded.toFixed(precision)}${unit}`;
}
```

## D Reference Helpers

The D-reference pitch is the frequency anchor for the entire grid. `noteNameToHz` parses a note name like `"A4"` and returns its frequency relative to D4 = 293.66 Hz using semitone arithmetic. `hzToNoteAnnotation` does the inverse — given a frequency and the current D4 reference, it returns a display string like `"A4"` or `"G#4 +12¢"`.

``` {.typescript file=_generated/app-helpers.ts}
const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

export function noteNameToHz(input: string): number | null {
  const m = /^([A-Ga-g][#b]?)(\d+)$/.exec(input.trim());
  if (!m) return null;
  const noteKey = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  if (!(noteKey in NOTE_SEMITONES)) return null;
  const semitone = NOTE_SEMITONES[noteKey];
  const octave = parseInt(m[2], 10);
  const semitonesFromD4 = (octave - 4) * 12 + (semitone - 2);
  return 293.66 * Math.pow(2, semitonesFromD4 / 12);
}

export function hzToNoteAnnotation(hz: number, d4Hz: number): string {
  const NOTE_NAMES = ['D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#'];
  const refHz = d4Hz > 0 ? d4Hz : 293.66;
  const semisFromD4 = 12 * Math.log2(hz / refHz);
  const roundedSemis = Math.round(semisFromD4);
  const cents = Math.round((semisFromD4 - roundedSemis) * 100);
  const noteIdx = ((roundedSemis % 12) + 12) % 12;
  const octave = 4 + Math.floor(roundedSemis / 12);
  const noteName = `${NOTE_NAMES[noteIdx]}${String(octave)}`;
  if (Math.abs(cents) < 1) return noteName;
  return `${noteName} ${cents > 0 ? '+' : ''}${cents}¢`;
}
```
