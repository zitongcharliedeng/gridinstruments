/**
 * Per-slider component configs for NumericSlider.
 *
 * Each config provides the defaultValue, badge/label formatters, and (for
 * editable badges) a parseInput function. Range, step, and initial value
 * are read from the HTML element by NumericSlider at runtime.
 */
import type { SliderComponentConfig } from '../components/NumericSlider';

// ─── D-ref note-name-to-Hz helper ────────────────────────────────────────────
// Duplicated from the module-level helper in main.ts (not exported there).
// Must stay in sync with noteNameToHz in main.ts.

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

function noteNameToHz(input: string): number | null {
  const m = input.trim().match(/^([A-Ga-g][#b]?)(\d+)$/);
  if (!m) return null;
  const noteKey = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const semitone = NOTE_SEMITONES[noteKey];
  if (semitone === undefined) return null;
  const octave = parseInt(m[2], 10);
  // D4 = 293.66 Hz; D = semitone 2
  const semitonesFromD4 = (octave - 4) * 12 + (semitone - 2);
  return 293.66 * Math.pow(2, semitonesFromD4 / 12);
}

// ─── Tuning (683–722 ¢, FIFTH_DEFAULT = 700) ─────────────────────────────────

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

// ─── Skew (0 = MidiMech, 1 = DCompose; badge accepts values outside 0–1) ─────

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

// ─── Volume (0–1 linear gain; badge displays dB) ──────────────────────────────

export const VOLUME_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'volume',
  defaultValue: 0.3,
  formatBadge: (v) => (v <= 0 ? '-\u221E' : (20 * Math.log10(v)).toFixed(1)),
  editable: false,
};

// ─── Zoom (0.2–3×; defaultValue overridden per touch device in main.ts) ───────

export const ZOOM_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'zoom',
  defaultValue: 1.0,
  formatBadge: (v) => v.toFixed(2),
  editable: false,
};

// ─── D-ref (73.42–1174.66 Hz; D4 = 293.66 Hz default) ────────────────────────

export const DREF_SLIDER_CONFIG: SliderComponentConfig = {
  name: 'dref',
  defaultValue: 293.66,
  formatBadge: (v) => v.toFixed(2),
  editable: true,
  parseInput: (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Note name first (e.g. "A4" → 440 Hz, "C5" → 523.25 Hz)
    const fromNote = noteNameToHz(trimmed);
    if (fromNote !== null) return fromNote;
    // Plain Hz number
    const hz = parseFloat(trimmed);
    return isFinite(hz) && hz >= 20 && hz <= 20000 ? hz : null;
  },
};
