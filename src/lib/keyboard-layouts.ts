/**
 * Physical Keyboard to Isomorphic Coordinate Mapping
 * 
 * This module uses a PHYSICAL-FIRST approach:
 * 1. Define physical key positions as a 2D array
 * 2. Apply a linear transformation to get isomorphic coordinates
 * 3. Works with ANY logical layout (QWERTY, Dvorak, AZERTY, etc.) since we use KeyboardEvent.code
 * 
 * The DCompose/Wicki-Hayden layout:
 * - Moving right increases pitch by a fifth (700 cents)
 * - Moving up increases pitch by an octave (1200 cents)
 * - D is the central note (coordinate [0, 0]) at KeyH
 */

export type KeyCoordinate = [number, number]; // [x, y] where x=fifths, y=octave

export interface KeyboardLayout {
  name: string;
  keyMap: Record<string, KeyCoordinate>;
}

/**
 * Physical keyboard layout definition
 * Each row is an array of KeyboardEvent.code values
 * null represents empty space (for row stagger alignment)
 * 
 * This covers the main alphanumeric section of a standard keyboard
 * Works with: ANSI, ISO, 60%, 65%, TKL, Full-size keyboards
 * Works with: QWERTY, Dvorak, Colemak, AZERTY, QWERTZ (all use same physical codes!)
 */
const PHYSICAL_ROWS = [
  // Row 0: Number row (leftmost position)
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  
  // Row 1: Top letter row (QWERTY row) - stagger ~0.5 keys right
  // Tab is a modifier, starts at position 0
  [null, 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  
  // Row 2: Home row (ASDF row) - stagger ~0.75 keys right  
  // CapsLock is a modifier at position 0
  [null, 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'],
  
  // Row 3: Bottom letter row (ZXCV row)
  // IntlBackslash is the ISO key between LShift and Z (only on ISO keyboards)
  // ANSI keyboards don't have this key - it simply won't fire events
  ['IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash'],
  
  // Row 4: Space bar row - Space is centered roughly under B-N area
  // We map it to a single coordinate at its center position
  [null, null, null, null, null, 'Space', null, null, null, null, null],
];

/**
 * Additional keys that can be optionally mapped
 * These are on the edges/modifiers and may be useful for some users
 */
const EXTENDED_KEYS = {
  // Function row (F1-F12)
  functionRow: ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  
  // Left-side modifiers (can be mapped as extra bass notes)
  leftModifiers: ['Tab', 'CapsLock', 'ShiftLeft'],
  
  // Right-side keys (can be mapped as extra treble notes)  
  rightModifiers: ['Backspace', 'Enter', 'ShiftRight'],
  
  // Numpad (for full-size keyboards)
  numpad: [
    ['NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract'],
    ['Numpad7', 'Numpad8', 'Numpad9', 'NumpadAdd'],
    ['Numpad4', 'Numpad5', 'Numpad6'],
    ['Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter'],
    ['Numpad0', 'NumpadDecimal'],
  ],
};

/**
 * Transformation from physical position to isomorphic coordinates
 * 
 * The DCompose layout uses a shear transformation:
 * - Each step RIGHT in a row: +2 fifths (x), -1 octave offset (y)
 * - Each step DOWN a row: +1 fifth (x), -1 octave offset (y)
 * - Reference point: KeyH (physical ~col 6, row 2) → [0, 0]
 * 
 * Formula:
 *   coordX = 2 * physX + 1 * physY + offsetX
 *   coordY = -1 * physX + -1 * physY + offsetY
 * 
 * With KeyH at [0,0], solving for offsets:
 *   offsetX = -14, offsetY = 8
 */
function physicalToIsomorphic(physX: number, physY: number): KeyCoordinate {
  const coordX = 2 * physX + 1 * physY - 14;
  const coordY = -1 * physX - 1 * physY + 8;
  return [coordX, coordY];
}

/**
 * Generate key map from physical layout
 */
function generateKeyMap(includeExtended: boolean = true): Record<string, KeyCoordinate> {
  const keyMap: Record<string, KeyCoordinate> = {};
  
  // Process main alphanumeric keys
  PHYSICAL_ROWS.forEach((row, physY) => {
    row.forEach((code, physX) => {
      if (code !== null) {
        keyMap[code] = physicalToIsomorphic(physX, physY);
      }
    });
  });
  
  if (includeExtended) {
    // Add Tab (to the left of Q row, so physX = -1, physY = 1)
    keyMap['Tab'] = physicalToIsomorphic(-1, 1);
    
    // Add CapsLock (to the left of home row, physX = -1, physY = 2)
    keyMap['CapsLock'] = physicalToIsomorphic(-1, 2);
    
    // Add Backspace (after Equal, physX = 13, physY = 0)
    keyMap['Backspace'] = physicalToIsomorphic(13, 0);
    
    // Add Enter (after Quote on ANSI, or same position on ISO)
    // This is approximately physX = 12, physY = 2
    keyMap['Enter'] = physicalToIsomorphic(12, 2);
  }
  
  return keyMap;
}

/**
 * Generate numpad key map
 * Numpad uses a separate coordinate space, offset to the right
 */
function generateNumpadKeyMap(): Record<string, KeyCoordinate> {
  const keyMap: Record<string, KeyCoordinate> = {};
  const xOffset = 16; // Offset to put numpad to the right of main keys
  
  EXTENDED_KEYS.numpad.forEach((row, physY) => {
    row.forEach((code, physX) => {
      if (code) {
        keyMap[code] = physicalToIsomorphic(physX + xOffset, physY);
      }
    });
  });
  
  return keyMap;
}

/**
 * Standard layout - works with all keyboard types
 * ANSI, ISO, QWERTY, Dvorak, Colemak, AZERTY, QWERTZ - all use the same physical codes!
 */
export const standardLayout: KeyboardLayout = {
  name: 'Standard',
  keyMap: generateKeyMap(true),
};

/**
 * Minimal layout - only main alphanumeric keys
 */
export const minimalLayout: KeyboardLayout = {
  name: 'Minimal',
  keyMap: generateKeyMap(false),
};

/**
 * Full layout - includes numpad for full-size keyboards
 */
export const fullLayout: KeyboardLayout = {
  name: 'Full (with Numpad)',
  keyMap: {
    ...generateKeyMap(true),
    ...generateNumpadKeyMap(),
  },
};

// Legacy exports for backward compatibility
export const qwertyUS = standardLayout;
export const qwertyUK = standardLayout; // Same physical codes!
export const qwertzDE = standardLayout; // Same physical codes!
export const azertyFR = standardLayout; // Same physical codes!

export const layouts: Record<string, KeyboardLayout> = {
  'standard': standardLayout,
  'minimal': minimalLayout,
  'full': fullLayout,
  // Legacy aliases
  'qwerty-us': standardLayout,
  'qwerty-uk': standardLayout,
  'qwertz': standardLayout,
  'azerty': standardLayout,
};

export function getLayout(id: string): KeyboardLayout {
  return layouts[id] || standardLayout;
}

/**
 * Get note name from coordinate
 * x = position in circle of fifths (0 = D)
 * 
 * Circle of fifths: ...Fb-Cb-Gb-Db-Ab-Eb-Bb-F-C-G-D-A-E-B-F#-C#-G#-D#-A#-E#-B#...
 * Where D is at x=0
 */
export function getNoteNameFromCoord(x: number): string {
  // Note names in circle of fifths order, with D at index 3
  const noteNamesBase = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  // Accidentals: double-flat, flat, natural, sharp, double-sharp
  const accidentals = ['\u266D\u266D', '\u266D', '', '\u266F', '\u00D7']; // 𝄫, ♭, , ♯, ×
  
  // Calculate note index: D (x=0) should map to index 3
  // x=0 → 3, x=1 → 4 (A), x=-1 → 2 (G), x=4 → 0 (F), x=-4 → 6 (B)
  const noteIndex = (((x + 3) % 7) + 7) % 7;
  
  // Calculate accidental: how many times we've wrapped around the 7-note cycle
  // x in [-3, 3] → natural, x in [4, 10] → sharp, x in [-10, -4] → flat
  const accidentalIndex = Math.floor((x + 3) / 7) + 2;
  
  const noteName = noteNamesBase[noteIndex];
  const accidental = accidentals[Math.max(0, Math.min(4, accidentalIndex))] || '';
  
  return noteName + accidental;
}

/**
 * Convert coordinate to MIDI note number
 * D4 (middle D, one whole step above middle C) = MIDI 62
 */
export function coordToMidi(x: number, y: number, octaveOffset: number = 0): number {
  // D4 = MIDI 62
  // Each fifth (x) = 7 semitones
  // Each octave (y) = 12 semitones
  const baseMidi = 62; // D4
  const semitones = x * 7 + y * 12 + octaveOffset * 12;
  return baseMidi + semitones;
}

/**
 * Convert coordinate to frequency in Hz
 * Uses 12-TET by default
 */
export function coordToFrequency(
  x: number, 
  y: number, 
  octaveOffset: number = 0,
  generator: [number, number] = [700, 1200], // fifth, octave in cents
  baseFreq: number = 293.66 // D4
): number {
  const cents = y * generator[1] + x * generator[0] + octaveOffset * 1200;
  return baseFreq * Math.pow(2, cents / 1200);
}

/**
 * Get all physical key codes that are mapped
 */
export function getAllMappedKeys(): string[] {
  return Object.keys(standardLayout.keyMap);
}

/**
 * Check if a key code is mapped
 */
export function isKeyMapped(code: string): boolean {
  return code in standardLayout.keyMap;
}

/**
 * Debug: Print the key map in a readable format
 */
export function debugKeyMap(): void {
  const map = standardLayout.keyMap;
  const entries = Object.entries(map).sort((a, b) => {
    // Sort by coordY desc, then coordX asc
    if (a[1][1] !== b[1][1]) return b[1][1] - a[1][1];
    return a[1][0] - b[1][0];
  });
  
  console.log('Key Map (sorted by position):');
  for (const [code, [x, y]] of entries) {
    const note = getNoteNameFromCoord(x);
    console.log(`  ${code.padEnd(15)} → [${x.toString().padStart(3)}, ${y.toString().padStart(2)}] = ${note}`);
  }
}
