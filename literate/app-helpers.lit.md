# App Helpers

Pure utility functions — Markdown rendering, type guards, numeric parsing, slider annotation formatting, and D-reference note/Hz conversion.

``` {.typescript file=src/app-helpers.ts}
/**
 * Pure utility functions — no DOM dependencies (except type guards).
 */

import type { WaveformType } from './lib/synth';
import type { SliderPresetPoint } from './app-constants';

/** Converts a restricted subset of Markdown to HTML for the About dialog. */
export function renderMarkdown(md: string): string {
  // Drop H1 title, image/badge lines, and the ## Development section
  const withoutDev = md
    .replace(/^# .+\n/m, '')                          // remove H1 title
    .replace(/^\[?!\[.*$/gm, '')                      // remove image/badge lines (![...] and [![...])
    .split(/^## Development$/m)[0];                    // cut at Development section

  return withoutDev
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Tables — before inline formatting (avoid pipe/bracket confusion)
    .replace(/^\|(.+)\|$/gm, (_: string, row: string) =>
      '<tr>' + row.split('|').map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>')
    .replace(/<tr>(<td>[-:\s]+<\/td>)+<\/tr>\n?/g, '')  // remove separator rows
    .replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')
    // Inline formatting
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]+?<\/li>)(?!\n<li>)/g, '$1</ul>')
    .replace(/<li>/g, (m: string, offset: number, str: string) => str.lastIndexOf('<li>', offset) < str.lastIndexOf('</ul>', offset) ? '<ul><li>' : m)
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// Type guard for WaveformType
export function isWaveformType(value: unknown): value is WaveformType {
  return typeof value === 'string' && ['sine', 'square', 'sawtooth', 'triangle'].includes(value);
}

/** Parse a numeric string with a fallback for NaN. */
export function parseNum(s: string, fallback: number): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

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
  // Threshold = half the last displayed digit (e.g. precision=2 → 0.005)
  const threshold = 0.5 * Math.pow(10, -precision);
  if (minDist < threshold) return nearest.label;
  const offset = value - nearest.value;
  const rounded = parseFloat(Math.abs(offset).toFixed(precision));
  const sign = offset > 0 ? '+' : '\u2212';
  return `${nearest.label} ${sign}${rounded.toFixed(precision)}${unit}`;
}

// ─── D ref helper functions ────────────────────────────────────────────────

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
  // D4 = 293.66Hz, D = semitone 2
  const semitonesFromD4 = (octave - 4) * 12 + (semitone - 2);
  return 293.66 * Math.pow(2, semitonesFromD4 / 12);
}

export function hzToNoteAnnotation(hz: number, _d4Hz: number): string {
  const NOTE_NAMES = ['D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#'];
  const semisFromD4 = 12 * Math.log2(hz / 293.66);
  const roundedSemis = Math.round(semisFromD4);
  const cents = Math.round((semisFromD4 - roundedSemis) * 100);
  const noteIdx = ((roundedSemis % 12) + 12) % 12;
  const octave = 4 + Math.floor(roundedSemis / 12);
  const noteName = `${NOTE_NAMES[noteIdx]}${String(octave)}`;
  if (Math.abs(cents) < 1) return noteName;
  return `${noteName} ${cents > 0 ? '+' : ''}${cents}¢`;
}
```
