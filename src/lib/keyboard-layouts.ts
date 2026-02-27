/**
 * PHYSICAL POSITION Keyboard to Isomorphic Coordinate Mapping
 *
 * Uses isomorphic-qwerty library coordinates to dynamically generate
 * DCompose/Wicki-Hayden grid positions for every key code the library knows.
 *
 * The DCompose/Wicki-Hayden layout:
 * - Moving right increases pitch by a fifth (700 cents)
 * - Moving up increases pitch by an octave (1200 cents)
 * - D is the central note (coordinate [0, 0]) at KeyH physical position
 *
 * Formula (derived from the existing hardcoded map, verified to match):
 *   ex = iqX + rowStagger[iqY]
 *   dcompX = 2 * ex - iqY - 8
 *   dcompY = -ex + 5
 *
 * Row stagger (physical keyboard offset): ZXCV row (iqY=3) is staggered +1
 * relative to the rows above it on standard keyboards.
 */

import { COORDS_BY_CODE } from 'isomorphic-qwerty';

export type KeyCoordinate = [number, number]; // [x, y] where x=fifths from D, y=octave offset

export interface KeyboardLayout {
  id: string;
  name: string;
  /** Whether this layout has the ISO extra key (IntlBackslash between LShift and Z) */
  hasIntlBackslash: boolean;
  /** Whether this layout has a right-side Backslash key (ANSI) */
  hasBackslash: boolean;
  /** Whether to include numpad keys */
  hasNumpad: boolean;
  /** Extra keys to explicitly EXCLUDE from note map (layout-specific) */
  excludeKeys?: Set<string>;
  keyMap: Record<string, KeyCoordinate>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row stagger: physical keyboard stagger offsets per isomorphic-qwerty row
// iqY=0 → digits row, 1 → QWER, 2 → ASDF, 3 → ZXCV
// The ZXCV row is physically staggered half a unit to the right relative to the
// rows above, which we represent as +1 in the ex calculation.
// ─────────────────────────────────────────────────────────────────────────────
const ROW_STAGGER: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3 };

function iqToDCompose(iqX: number, iqY: number): KeyCoordinate {
  const ex = iqX + (ROW_STAGGER[iqY] ?? 0);
  return [2 * ex - iqY - 12, -ex + 7];
}

// ─────────────────────────────────────────────────────────────────────────────
// Build the full key map from isomorphic-qwerty COORDS_BY_CODE
// Only layer z=1 (main keyboard) and z=3 (numpad) are used as notes.
// ─────────────────────────────────────────────────────────────────────────────

/** All layer-1 (main keyboard) note mappings */
const LAYER1_KEY_MAP: Record<string, KeyCoordinate> = {};
/** All layer-3 (numpad) note mappings */
const NUMPAD_KEY_MAP: Record<string, KeyCoordinate> = {};

for (const [code, [iqX, iqY, iqZ]] of COORDS_BY_CODE) {
  if (iqZ === 1) {
    LAYER1_KEY_MAP[code] = iqToDCompose(iqX, iqY);
  } else if (iqZ === 3) {
    // Numpad: treat as an extension of the grid
    // iqY for numpad goes 0-4 (rows), iqX 0-3 (cols)
    // Map numpad similarly — keep layer separation via row offset
    NUMPAD_KEY_MAP[code] = iqToDCompose(iqX, iqY);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keys that are NEVER notes regardless of layout (modifiers / system)
// ─────────────────────────────────────────────────────────────────────────────
export const MODIFIER_ROW_KEYS = new Set([
  'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight',
  'Space',
  'ShiftLeft', 'ShiftRight',
  'CapsLock',
  'Tab',
  'Backspace',
  'Delete',
  'Enter',
  'ContextMenu',
  'Fn',
  'Escape',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'Insert','Home','End','PageUp','PageDown',
  'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
  'NumLock',
  'NumpadDecimal', 'NumpadEnter', 'NumpadEqual',
]);

export const SPECIAL_KEYS = {
  SUSTAIN: 'AltLeft',
  SUSTAIN_RIGHT: 'AltRight',
  VIBRATO: 'Space',
};

// ─────────────────────────────────────────────────────────────────────────────
// Build per-layout key maps
// ─────────────────────────────────────────────────────────────────────────────

function buildKeyMap(opts: {
  hasIntlBackslash: boolean;
  hasBackslash: boolean;
  hasNumpad: boolean;
  excludeKeys?: Set<string>;
}): Record<string, KeyCoordinate> {
  const map: Record<string, KeyCoordinate> = {};

  for (const [code, coord] of Object.entries(LAYER1_KEY_MAP)) {
    if (MODIFIER_ROW_KEYS.has(code)) continue;
    if (opts.excludeKeys?.has(code)) continue;
    if (code === 'IntlBackslash' && !opts.hasIntlBackslash) continue;
    if (code === 'Backslash' && !opts.hasBackslash) continue;
    map[code] = coord;
  }

  if (opts.hasNumpad) {
    for (const [code, coord] of Object.entries(NUMPAD_KEY_MAP)) {
      if (MODIFIER_ROW_KEYS.has(code)) continue;
      if (opts.excludeKeys?.has(code)) continue;
      map[code] = coord;
    }
  }

  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout variants
// ─────────────────────────────────────────────────────────────────────────────

// Keys absent on 60% keyboards (no top function row, no numpad, no nav cluster)
const SIXTY_PCT_EXCLUDE = new Set([
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'PrintScreen','ScrollLock','Pause',
  'Insert','Delete','Home','End','PageUp','PageDown',
  'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
]);

// 65% adds arrow keys + a few nav keys but still no F-row
const SIXTY_FIVE_PCT_EXCLUDE = new Set([
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'PrintScreen','ScrollLock','Pause',
]);

// 75% adds F-row on the top but remains compact
const SEVENTY_FIVE_PCT_EXCLUDE = new Set([
  'PrintScreen','ScrollLock','Pause',
]);

const LAYOUTS_RAW: Array<{
  id: string;
  name: string;
  hasIntlBackslash: boolean;
  hasBackslash: boolean;
  hasNumpad: boolean;
  excludeKeys?: Set<string>;
}> = [
  // Full-size ANSI (standard US — has Backslash, no IntlBackslash)
  { id: 'ansi',       name: 'ANSI (US QWERTY)',        hasIntlBackslash: false, hasBackslash: true,  hasNumpad: false },
  { id: 'ansi-np',    name: 'ANSI + Numpad',            hasIntlBackslash: false, hasBackslash: true,  hasNumpad: true  },
  // ISO (UK/EU — has IntlBackslash between LShift and Z, also has Backslash)
  { id: 'iso',        name: 'ISO (UK/EU QWERTY)',       hasIntlBackslash: true,  hasBackslash: true,  hasNumpad: false },
  { id: 'iso-np',     name: 'ISO + Numpad',             hasIntlBackslash: true,  hasBackslash: true,  hasNumpad: true  },
  // Compact form factors (ANSI-based)
  { id: '75pct',      name: '75% (no nav cluster)',     hasIntlBackslash: false, hasBackslash: true,  hasNumpad: false, excludeKeys: SEVENTY_FIVE_PCT_EXCLUDE },
  { id: '65pct',      name: '65% (no F-row)',           hasIntlBackslash: false, hasBackslash: true,  hasNumpad: false, excludeKeys: SIXTY_FIVE_PCT_EXCLUDE },
  { id: '60pct',      name: '60% (compact)',            hasIntlBackslash: false, hasBackslash: true,  hasNumpad: false, excludeKeys: SIXTY_PCT_EXCLUDE },
  { id: '60pct-iso',  name: '60% ISO',                 hasIntlBackslash: true,  hasBackslash: true,  hasNumpad: false, excludeKeys: SIXTY_PCT_EXCLUDE },
];

export const KEYBOARD_VARIANTS: KeyboardLayout[] = LAYOUTS_RAW.map(raw => ({
  ...raw,
  keyMap: buildKeyMap(raw),
}));

export const layouts: Record<string, KeyboardLayout> = Object.fromEntries(
  KEYBOARD_VARIANTS.map(l => [l.id, l])
);

export function getLayout(id: string): KeyboardLayout {
  return layouts[id] ?? KEYBOARD_VARIANTS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions (unchanged API surface)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get note name from coordinate using circle-of-fifths spelling.
 * Returns proper enharmonic names using ♯ and ♭ glyphs.
 * When a note would require double-sharps/flats, falls back to 12-TET enharmonic name.
 * x = position in circle of fifths (0 = D)
 */
// Natural notes in order of fifths: F(-3) C(-2) G(-1) D(0) A(1) E(2) B(3)
const FIFTHS_NATURALS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export function getNoteNameFromCoord(x: number): string {
  const baseIndex = ((x + 3) % 7 + 7) % 7;
  const baseName = FIFTHS_NATURALS[baseIndex];
  const accidentals = Math.floor((x + 3) / 7);
  if (accidentals === 0) return baseName;
  if (accidentals > 0) return baseName + buildSharps(accidentals);
  return baseName + buildFlats(-accidentals);
}

function buildSharps(n: number): string {
  // \u266F = ♯, \uD834\uDD2A = 𝄪 (double sharp)
  let s = '';
  const doubles = Math.floor(n / 2);
  const singles = n % 2;
  for (let i = 0; i < doubles; i++) s += '\uD834\uDD2A';
  for (let i = 0; i < singles; i++) s += '\u266F';
  return s;
}

function buildFlats(n: number): string {
  // \u266D = ♭, \uD834\uDD2B = 𝄫 (double flat)
  let s = '';
  const doubles = Math.floor(n / 2);
  const singles = n % 2;
  for (let i = 0; i < doubles; i++) s += '\uD834\uDD2B';
  for (let i = 0; i < singles; i++) s += '\u266D';
  return s;
}

/**
 * Get the 12-TET equivalent name for a circle-of-fifths position.
 * Used for bracket notation and isBlackKey determination.
 */
const PITCH_CLASS_12TET = ['C', 'C\u266F', 'D', 'E\u266D', 'E', 'F', 'F\u266F', 'G', 'A\u266D', 'A', 'B\u266D', 'B'];

export function get12TETName(x: number): string {
  const pc = ((2 + x * 7) % 12 + 12) % 12;
  return PITCH_CLASS_12TET[pc];
}

/**
 * Cent deviation from 12-TET for a given circle-of-fifths position.
 * Positive = sharper than 12-TET, negative = flatter.
 * Assumes pure octaves (1200¢).
 */
export function getCentDeviation(x: number, fifth: number): number {
  return x * (fifth - 700);
}

/**
 * Convert coordinate to MIDI note number
 * D4 (MIDI 62) is at [0, 0]
 */
export function coordToMidi(x: number, y: number, octaveOffset: number = 0): number {
  return 62 + x * 7 + y * 12 + octaveOffset * 12;
}

/**
 * Convert coordinate to frequency in Hz (12-TET by default)
 */
export function coordToFrequency(
  x: number,
  y: number,
  octaveOffset: number = 0,
  generator: [number, number] = [700, 1200],
  baseFreq: number = 293.66
): number {
  const cents = y * generator[1] + x * generator[0] + octaveOffset * 1200;
  return baseFreq * Math.pow(2, cents / 1200);
}

export function getAllMappedKeys(): string[] {
  return Object.keys(KEYBOARD_VARIANTS[0].keyMap);
}

export function isKeyMapped(code: string): boolean {
  return code in KEYBOARD_VARIANTS[0].keyMap;
}

// Legacy export for code that imports 'standardLayout' by name
export const standardLayout: KeyboardLayout = KEYBOARD_VARIANTS[0];
