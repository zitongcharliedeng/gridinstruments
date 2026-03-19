# Keyboard Layouts

Isomorphic coordinate mapping from physical keyboard positions to the DCompose/Wicki-Hayden grid. Uses the `isomorphic-qwerty` library to derive grid coordinates for every key code, plus note naming utilities for circle-of-fifths positions.

## Coordinate System

The DCompose/Wicki-Hayden layout is a rank-2 pitch lattice: x-axis = circle of fifths (each step = a fifth), y-axis = octaves. D is the central note at coordinate [0, 0] (physical position KeyH). The formula maps isomorphic-qwerty (iqX, iqY) coordinates to DCompose grid positions, accounting for physical row stagger.

## Note Naming

Circle-of-fifths spelling with ♯/♭ glyphs. Frequency and MIDI conversion utilities for the rank-2 lattice.

## Layout Math

Multiple keyboard form factors (ANSI, ISO, 60%/65%/75%) are built by filtering the full key map based on which keys are physically present.

## Imports and Types

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
import { COORDS_BY_CODE } from 'isomorphic-qwerty';

export type KeyCoordinate = [number, number];

export interface KeyboardLayout {
  id: string;
  name: string;
  hasIntlBackslash: boolean;
  hasBackslash: boolean;
  hasNumpad: boolean;
  excludeKeys?: Set<string>;
  keyMap: Record<string, KeyCoordinate>;
}
```

## Row Stagger and Coordinate Transform

Physical keyboard rows are staggered: the ZXCV row (iqY=3) sits half a unit to the right of the ASDF row. `ROW_STAGGER` encodes this offset per row index. `iqToDCompose` applies the derived formula:

```
ex = iqX + rowStagger[iqY]
dcompX = 2 * ex - iqY - 12
dcompY = -ex + 7
```

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
const ROW_STAGGER: Record<number, number> = { 0: 0, 1: 1, 2: 2, 3: 3 };

function iqToDCompose(iqX: number, iqY: number): KeyCoordinate {
  const ex = iqX + (ROW_STAGGER[iqY] ?? 0);
  return [2 * ex - iqY - 12, -ex + 7];
}
```

## Building Layer Maps

All layer-1 (main keyboard, z=1) and layer-3 (numpad, z=3) entries from `COORDS_BY_CODE` are transformed and stored in separate maps for later layout filtering.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
const LAYER1_KEY_MAP: Record<string, KeyCoordinate> = {};
const NUMPAD_KEY_MAP: Record<string, KeyCoordinate> = {};

for (const [code, [iqX, iqY, iqZ]] of COORDS_BY_CODE) {
  if (iqZ === 1) {
    LAYER1_KEY_MAP[code] = iqToDCompose(iqX, iqY);
  } else if (iqZ === 3) {
    NUMPAD_KEY_MAP[code] = iqToDCompose(iqX, iqY);
  }
}
```

## Non-Note Keys

`MODIFIER_ROW_KEYS` lists every key that is never a note regardless of layout — modifiers, function keys, navigation cluster, and special keys. `SPECIAL_KEYS` names the sustain and vibrato bindings.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
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
```

## Per-Layout Key Map Builder

`buildKeyMap` filters `LAYER1_KEY_MAP` (and optionally `NUMPAD_KEY_MAP`) by removing modifier keys, layout-specific exclusions, and keys absent from the physical form factor (IntlBackslash for ISO layouts, Backslash for ANSI).

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
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
```

## Layout Variants

Compact form factors exclude keys that are physically absent. 60% keyboards have no function row, navigation cluster, or numpad. 65% adds arrow keys and a few nav keys. 75% restores the function row but keeps a compact footprint.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
const SIXTY_PCT_EXCLUDE = new Set([
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'PrintScreen','ScrollLock','Pause',
  'Insert','Delete','Home','End','PageUp','PageDown',
  'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
]);

const SIXTY_FIVE_PCT_EXCLUDE = new Set([
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  'PrintScreen','ScrollLock','Pause',
]);

const SEVENTY_FIVE_PCT_EXCLUDE = new Set([
  'PrintScreen','ScrollLock','Pause',
]);

const LAYOUTS_RAW: {
  id: string;
  name: string;
  hasIntlBackslash: boolean;
  hasBackslash: boolean;
  hasNumpad: boolean;
  excludeKeys?: Set<string>;
}[] = [
  { id: 'ansi',       name: 'ANSI (US QWERTY)',        hasIntlBackslash: false, hasBackslash: true,  hasNumpad: false },
  { id: 'ansi-np',    name: 'ANSI + Numpad',            hasIntlBackslash: false, hasBackslash: true,  hasNumpad: true  },
  { id: 'iso',        name: 'ISO (UK/EU QWERTY)',       hasIntlBackslash: true,  hasBackslash: true,  hasNumpad: false },
  { id: 'iso-np',     name: 'ISO + Numpad',             hasIntlBackslash: true,  hasBackslash: true,  hasNumpad: true  },
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
```

## Note Naming Utilities

`getNoteNameFromCoord` returns the circle-of-fifths spelling for a given x coordinate, using ♯/♭ glyphs. Double-sharp (𝄪) and double-flat (𝄫) SMP codepoints are avoided because JetBrains Mono lacks them — repeated ♯♯/♭♭ are used instead.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
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
  let s = '';
  for (let i = 0; i < n; i++) s += '\u266F';
  return s;
}

function buildFlats(n: number): string {
  let s = '';
  for (let i = 0; i < n; i++) s += '\u266D';
  return s;
}
```

## 12-TET and Cent Deviation Utilities

`get12TETName` maps a circle-of-fifths position to its closest 12-TET pitch class name — used for bracket notation and black-key detection. `getCentDeviation` gives the deviation from 12-TET in cents for a given fifth size.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
const PITCH_CLASS_12TET = ['C', 'C\u266F', 'D', 'E\u266D', 'E', 'F', 'F\u266F', 'G', 'A\u266D', 'A', 'B\u266D', 'B'];

export function get12TETName(x: number): string {
  const pc = ((2 + x * 7) % 12 + 12) % 12;
  return PITCH_CLASS_12TET[pc];
}

export function getCentDeviation(x: number, fifth: number): number {
  return x * (fifth - 700);
}
```

## Coordinate to MIDI and Frequency

The D-ref anchor — MIDI note 62 — is defined once as `D_REF_MIDI`. Every
function that needs to know where D-ref sits in MIDI space uses this constant.

`coordToMidi` converts a grid position to a MIDI note number, anchored at
D-ref. `coordToFrequency` converts to Hz using a configurable generator
interval pair (default: 700¢ fifth, 1200¢ octave) and base frequency.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
export const D_REF_MIDI = 62;

export function coordToMidi(x: number, y: number, octaveOffset = 0): number {
  return D_REF_MIDI + x * 7 + y * 12 + octaveOffset * 12;
}

export function coordToFrequency(
  x: number,
  y: number,
  octaveOffset = 0,
  generator: [number, number] = [700, 1200],
  baseFreq = 293.66
): number {
  const cents = y * generator[1] + x * generator[0] + octaveOffset * 1200;
  return baseFreq * Math.pow(2, cents / 1200);
}
```

## D-relative Note Name — Single Source of Truth

`midiToDRefNoteName` is the canonical formatter for human-readable note names
in D-relative octave notation. It is the **single source of truth** used by the
grid, the note history waterfall, the chord panel, and any other UI that
needs to display a note name.

The format: Unicode superscript or subscript octave number as a **prefix**
to the left of the note name. The octave goes left so it never collides with
accidentals (♯/♭) on the right side. D-ref (MIDI 62, octave 0) has no
prefix. Octave 0 (D-ref) has **no prefix** — just the bare note name. Octaves
above use Unicode superscript digits (e.g., `¹D`, `²A`). Octaves below use
Unicode subscript digits (e.g., `₁C`, `₃G`).

Examples: `D` = D-ref, `¹D` = one octave above, `₂C` = C two octaves below,
`¹A` = A one octave above D-ref, `³F#` = F-sharp three octaves above.

`midiToDRefOctave` is the shared octave computation used by both this string
formatter AND the grid canvas renderer — one function, one source of truth
for determining octave distance from D-ref.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
const SUPERSCRIPT_DIGITS = '\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079';
const SUBSCRIPT_DIGITS = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';

function toSuperscript(n: number): string {
  return String(n).split('').map(d => SUPERSCRIPT_DIGITS[parseInt(d, 10)]).join('');
}

function toSubscript(n: number): string {
  return String(n).split('').map(d => SUBSCRIPT_DIGITS[parseInt(d, 10)]).join('');
}

const NOTE_NAMES_12 = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

export function pitchClassName(midi: number): string {
  return NOTE_NAMES_12[((midi % 12) + 12) % 12];
}

export function relativeOctave(midi: number, refMidi: number): number {
  return Math.floor((midi - refMidi) / 12);
}

export function octavePrefix(octave: number): string {
  if (octave === 0) return '\u2070';
  if (octave > 0) return toSuperscript(octave);
  return toSubscript(-octave);
}

export function formatNoteWithOctavePrefix(midi: number): string {
  return octavePrefix(relativeOctave(midi, D_REF_MIDI)) + pitchClassName(midi);
}
```

## Key Mapping Queries and Display Labels

`getAllMappedKeys` and `isKeyMapped` query the default (ANSI) layout. `codeToLabel` converts a W3C key code to a short display string for the QWERTY overlay — letter keys become single uppercase letters, digit keys become the digit character, and punctuation keys use their printed symbol.

``` {.typescript file=_generated/lib/keyboard-layouts.ts}
export function getAllMappedKeys(): string[] {
  return Object.keys(KEYBOARD_VARIANTS[0].keyMap);
}

export function isKeyMapped(code: string): boolean {
  return code in KEYBOARD_VARIANTS[0].keyMap;
}

export function codeToLabel(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return 'N' + code.slice(6);
  switch (code) {
    case 'Backquote':       return '`';
    case 'Minus':           return '-';
    case 'Equal':           return '=';
    case 'BracketLeft':     return '[';
    case 'BracketRight':    return ']';
    case 'Backslash':       return '\\';
    case 'IntlBackslash':   return '\\';
    case 'Semicolon':       return ';';
    case 'Quote':           return "'";
    case 'Comma':           return ',';
    case 'Period':          return '.';
    case 'Slash':           return '/';
    case 'NumpadAdd':       return 'N+';
    case 'NumpadSubtract':  return 'N-';
    case 'NumpadMultiply':  return 'N*';
    case 'NumpadDivide':    return 'N/';
    case 'NumpadDecimal':   return 'N.';
    default:                return '';
  }
}

export const standardLayout: KeyboardLayout = KEYBOARD_VARIANTS[0];
```
