/**
 * OKLCH-based note colors — perceptually uniform, fifths-based hue mapping.
 *
 * D = red (root). Each perfect-fifth step = 30° on the OKLCH hue wheel.
 * The circle of fifths maps directly onto the hue circle, so harmonically
 * related notes are adjacent in color (D→A = red→orange) while adjacent
 * semitones are ~180° apart (maximally contrasting).
 *
 * Hue table (D=29° OKLCH red):
 *   D=29°  A=59°  E=89°  B=119°  F#=149°  C#=179°
 *   Ab=209° Eb=239° Bb=269° F=299° C=329° G=359°
 */

// ── OKLCH → sRGB conversion ──────────────────────────────────────────────

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLAB → LMS (cube-root space)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  // Cube to recover LMS
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS → linear sRGB
  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Linear → sRGB gamma
  const gamma = (x: number) =>
    x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;

  return [
    Math.round(Math.max(0, Math.min(1, gamma(lr))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(lg))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(lb))) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function oklch(L: number, C: number, H: number): string {
  return rgbToHex(...oklchToRgb(L, C, H));
}

// ── Fifths-based hue mapping ─────────────────────────────────────────────

/** OKLCH hue for perceptual red (D anchor). */
const D_HUE = 29;

/** Hue step per circle-of-fifths position (360° / 12 notes). */
const FIFTH_STEP = 30;

/** Circle-of-fifths position for each pitch class (0=C..11=B). D=0. */
const COF_FROM_PC: readonly number[] = [
  -2,  // C
   5,  // C#
   0,  // D
  -5,  // D#/Eb
   2,  // E
  -3,  // F
   4,  // F#
  -1,  // G
   6,  // G#/Ab
   1,  // A
  -4,  // A#/Bb
   3,  // B
];

/** OKLCH hue for a circle-of-fifths position (D=0). */
function cofHue(coordX: number): number {
  return ((coordX * FIFTH_STEP + D_HUE) % 360 + 360) % 360;
}

/** OKLCH hue for a pitch class (0=C). */
function pcHue(pc: number): number {
  return cofHue(COF_FROM_PC[pc]);
}

// ── Pre-computed arrays (indexed by pitch class 0=C..11=B) ───────────────

/** Vivid colors: for active notes and history visualization. */
export const NOTE_COLORS: readonly string[] = Array.from({ length: 12 }, (_, pc) =>
  oklch(0.72, 0.19, pcHue(pc)));

/** Dimmed colors: for history trail. */
export const NOTE_COLORS_DIM: readonly string[] = Array.from({ length: 12 }, (_, pc) =>
  oklch(0.32, 0.07, pcHue(pc)));

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Get vivid color for a MIDI note number.
 */
export function noteColor(midiNote: number, alpha = 1): string {
  const pc = ((midiNote % 12) + 12) % 12;
  if (alpha === 1) return NOTE_COLORS[pc];
  const [r, g, b] = oklchToRgb(0.72, 0.19, pcHue(pc));
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Vivid color for a DCompose coordX (circle-of-fifths position, D=0).
 */
export function colorFromCoordX(coordX: number): string {
  return oklch(0.72, 0.19, cofHue(coordX));
}

/**
 * Cell fill + text colors for the keyboard grid.
 *
 * Returns hue-tinted fills so parallelogram shapes are always visible on
 * the pure-black canvas. White/black key distinction via lightness.
 *
 *   Active:    vivid fill, white text
 *   Sustained: warm glow fill, bright hue text
 *   White key: dark tinted fill (L=0.24), readable hue text
 *   Black key: darker tinted fill (L=0.16), dimmer hue text
 */
export function cellColors(
  coordX: number,
  state: 'active' | 'sustained' | 'white' | 'black'
): { fill: string; text: string } {
  const h = cofHue(coordX);
  switch (state) {
    case 'active':
      return { fill: oklch(0.72, 0.19, h), text: '#ffffff' };
    case 'sustained':
      return { fill: oklch(0.38, 0.11, h), text: oklch(0.82, 0.16, h) };
    case 'white':
      return { fill: oklch(0.24, 0.055, h), text: oklch(0.75, 0.14, h) };
    case 'black':
      return { fill: oklch(0.16, 0.035, h), text: oklch(0.60, 0.11, h) };
  }
}

/** Pitch class (0=C) from DCompose coordX. */
export function pitchClassFromCoordX(coordX: number): number {
  return ((2 + coordX * 7) % 12 + 12) % 12;
}

/** MIDI note number from DCompose coordinates. */
export function coordToMidiNote(coordX: number, coordY: number): number {
  // D4 = MIDI 62, each CoF step = 7 semitones, each octave step = 12
  return 62 + coordX * 7 + coordY * 12;
}

/** DCompose coordinates from MIDI note (canonical short-path CoF position). */
export function midiToCoord(midi: number): [number, number] {
  const pitchClass = ((midi % 12) + 12) % 12;
  const x = COF_FROM_PC[pitchClass];
  const pitchCents = (midi - 62) * 100;
  const y = Math.round((pitchCents - x * 700) / 1200);
  return [x, y];
}
