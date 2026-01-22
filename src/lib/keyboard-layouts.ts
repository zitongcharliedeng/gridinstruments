/**
 * Keyboard Layout Mappings
 * 
 * Maps physical keyboard keys to isomorphic coordinates [x, y]
 * where x = position along circle of fifths, y = octave offset
 * 
 * The DCompose/Wicki-Hayden layout:
 * - Moving right increases pitch by a fifth (700 cents)
 * - Moving up increases pitch by an octave (1200 cents)
 * - D is the central note (coordinate [0, 0])
 */

export type KeyCoordinate = [number, number]; // [x, y] where x=fifths, y=octave

export interface KeyboardLayout {
  name: string;
  keyMap: Record<string, KeyCoordinate>;
}

// Base Wicki-Hayden layout for US QWERTY
// Row 4 (number row): higher octave
// Row 3 (QWERTY): mid-high  
// Row 2 (ASDF): middle
// Row 1 (ZXCV): lower
const baseWickiLayout: Record<string, KeyCoordinate> = {
  // Bottom row (ZXCV) - lowest octave
  'KeyZ': [-9, 4],
  'KeyX': [-7, 3],
  'KeyC': [-5, 2],
  'KeyV': [-3, 1],
  'KeyB': [-1, 0],
  'KeyN': [1, -1],
  'KeyM': [3, -2],
  'Comma': [5, -3],
  'Period': [7, -4],
  'Slash': [9, -5],
  
  // Home row (ASDF)
  'KeyA': [-10, 5],
  'KeyS': [-8, 4],
  'KeyD': [-6, 3],
  'KeyF': [-4, 2],
  'KeyG': [-2, 1],
  'KeyH': [0, 0],   // D - center of the layout
  'KeyJ': [2, -1],
  'KeyK': [4, -2],
  'KeyL': [6, -3],
  'Semicolon': [8, -4],
  'Quote': [10, -5],
  
  // QWERTY row
  'KeyQ': [-11, 6],
  'KeyW': [-9, 5],
  'KeyE': [-7, 4],
  'KeyR': [-5, 3],
  'KeyT': [-3, 2],
  'KeyY': [-1, 1],
  'KeyU': [1, 0],
  'KeyI': [3, -1],
  'KeyO': [5, -2],
  'KeyP': [7, -3],
  'BracketLeft': [9, -4],
  'BracketRight': [11, -5],
  
  // Number row - highest
  'Digit1': [-12, 7],
  'Digit2': [-10, 6],
  'Digit3': [-8, 5],
  'Digit4': [-6, 4],
  'Digit5': [-4, 3],
  'Digit6': [-2, 2],
  'Digit7': [0, 1],
  'Digit8': [2, 0],
  'Digit9': [4, -1],
  'Digit0': [6, -2],
  'Minus': [8, -3],
  'Equal': [10, -4],
};

// QWERTY US Layout
export const qwertyUS: KeyboardLayout = {
  name: 'QWERTY (US)',
  keyMap: { ...baseWickiLayout },
};

// QWERTY UK Layout - has extra key (IntlBackslash) and different positions
export const qwertyUK: KeyboardLayout = {
  name: 'QWERTY (UK)',
  keyMap: {
    ...baseWickiLayout,
    // UK has IntlBackslash between left shift and Z
    'IntlBackslash': [-10, 4],
    // UK Quote is different position but same key
    'Quote': [10, -5],
    // UK has # key next to Enter
    'Backslash': [12, -6],
  },
};

// QWERTZ German Layout
export const qwertzDE: KeyboardLayout = {
  name: 'QWERTZ (DE)',
  keyMap: {
    // Bottom row
    'KeyY': [-9, 4],  // Y and Z are swapped
    'KeyX': [-7, 3],
    'KeyC': [-5, 2],
    'KeyV': [-3, 1],
    'KeyB': [-1, 0],
    'KeyN': [1, -1],
    'KeyM': [3, -2],
    'Comma': [5, -3],
    'Period': [7, -4],
    'Slash': [9, -5],
    
    // Home row
    'KeyA': [-10, 5],
    'KeyS': [-8, 4],
    'KeyD': [-6, 3],
    'KeyF': [-4, 2],
    'KeyG': [-2, 1],
    'KeyH': [0, 0],
    'KeyJ': [2, -1],
    'KeyK': [4, -2],
    'KeyL': [6, -3],
    'Semicolon': [8, -4],
    'Quote': [10, -5],
    
    // QWERTZ row
    'KeyQ': [-11, 6],
    'KeyW': [-9, 5],
    'KeyE': [-7, 4],
    'KeyR': [-5, 3],
    'KeyT': [-3, 2],
    'KeyZ': [-1, 1],  // Z is here in QWERTZ
    'KeyU': [1, 0],
    'KeyI': [3, -1],
    'KeyO': [5, -2],
    'KeyP': [7, -3],
    'BracketLeft': [9, -4],
    'BracketRight': [11, -5],
    
    // Number row
    'Digit1': [-12, 7],
    'Digit2': [-10, 6],
    'Digit3': [-8, 5],
    'Digit4': [-6, 4],
    'Digit5': [-4, 3],
    'Digit6': [-2, 2],
    'Digit7': [0, 1],
    'Digit8': [2, 0],
    'Digit9': [4, -1],
    'Digit0': [6, -2],
    'Minus': [8, -3],
    'Equal': [10, -4],
  },
};

// AZERTY French Layout
export const azertyFR: KeyboardLayout = {
  name: 'AZERTY (FR)',
  keyMap: {
    // Bottom row
    'KeyW': [-9, 4],  // W is in Z position
    'KeyX': [-7, 3],
    'KeyC': [-5, 2],
    'KeyV': [-3, 1],
    'KeyB': [-1, 0],
    'KeyN': [1, -1],
    'Comma': [3, -2],  // Different punctuation positions
    'Semicolon': [5, -3],
    'Period': [7, -4],
    'Slash': [9, -5],
    
    // Home row
    'KeyQ': [-10, 5],  // Q is in A position
    'KeyS': [-8, 4],
    'KeyD': [-6, 3],
    'KeyF': [-4, 2],
    'KeyG': [-2, 1],
    'KeyH': [0, 0],
    'KeyJ': [2, -1],
    'KeyK': [4, -2],
    'KeyL': [6, -3],
    'KeyM': [8, -4],   // M is here in AZERTY
    'Quote': [10, -5],
    
    // AZERTY row (top letters)
    'KeyA': [-11, 6],  // A is in Q position
    'KeyZ': [-9, 5],   // Z is in W position
    'KeyE': [-7, 4],
    'KeyR': [-5, 3],
    'KeyT': [-3, 2],
    'KeyY': [-1, 1],
    'KeyU': [1, 0],
    'KeyI': [3, -1],
    'KeyO': [5, -2],
    'KeyP': [7, -3],
    'BracketLeft': [9, -4],
    'BracketRight': [11, -5],
    
    // Number row (AZERTY has symbols, need Shift for numbers)
    'Digit1': [-12, 7],
    'Digit2': [-10, 6],
    'Digit3': [-8, 5],
    'Digit4': [-6, 4],
    'Digit5': [-4, 3],
    'Digit6': [-2, 2],
    'Digit7': [0, 1],
    'Digit8': [2, 0],
    'Digit9': [4, -1],
    'Digit0': [6, -2],
    'Minus': [8, -3],
    'Equal': [10, -4],
  },
};

export const layouts: Record<string, KeyboardLayout> = {
  'qwerty-us': qwertyUS,
  'qwerty-uk': qwertyUK,
  'qwertz': qwertzDE,
  'azerty': azertyFR,
};

export function getLayout(id: string): KeyboardLayout {
  return layouts[id] || qwertyUS;
}

/**
 * Get note name from coordinate
 * x = position in circle of fifths (0 = D)
 */
export function getNoteNameFromCoord(x: number): string {
  // Circle of fifths from F to B#
  // D is at position 0
  const noteNamesBase = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const accidentals = ['\u266D\u266D', '\u266D', '', '\u266F', '\u00D7']; // bb, b, natural, #, x
  
  // Calculate which note and accidental
  const noteIndex = ((x % 7) + 7) % 7; // 0-6, wraps around
  const accidentalIndex = Math.floor((x + 3) / 7) + 2; // offset so D=0 maps to natural
  
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
