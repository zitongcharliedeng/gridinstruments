/**
 * PHYSICAL POSITION Keyboard to Isomorphic Coordinate Mapping
 * 
 * This module uses PHYSICAL POSITION mapping (event.code):
 * - Maps PHYSICAL KEY POSITIONS to isomorphic coordinates
 * - Works with ALL keyboard layouts (Dvorak, Colemak, AZERTY, etc.)
 * - Physical 'H' position plays D (center note) on ANY layout
 * 
 * The DCompose/Wicki-Hayden layout:
 * - Moving right increases pitch by a fifth (700 cents)
 * - Moving up increases pitch by an octave (1200 cents)
 * - D is the central note (coordinate [0, 0]) at KeyH physical position
 */

export type KeyCoordinate = [number, number]; // [x, y] where x=fifths, y=octave

export interface KeyboardLayout {
  name: string;
  keyMap: Record<string, KeyCoordinate>;
}

/**
 * PHYSICAL keyboard mapping (uses event.code)
 * Maps physical key positions to DCompose/Wicki-Hayden coordinates
 * 
 * Physical layout (HOME ROW centered on KeyH):
 *   Digit1  Digit2  Digit3  Digit4  Digit5  Digit6  Digit7  Digit8  Digit9  Digit0  Minus  Equal
 *    KeyQ  KeyW  KeyE  KeyR  KeyT  KeyY  KeyU  KeyI  KeyO  KeyP  BracketLeft  BracketRight
 *     KeyA  KeyS  KeyD  KeyF  KeyG  KeyH  KeyJ  KeyK  KeyL  Semicolon  Quote
 *      KeyZ  KeyX  KeyC  KeyV  KeyB  KeyN  KeyM  Comma  Period  Slash
 * 
 * KeyH = center note (D, coordinate [0,0])
 */
const PHYSICAL_KEY_MAP: Record<string, KeyCoordinate> = {
  // ZXCV row (bottom letter row)
  'KeyZ': [-9, 4],
  'KeyX': [-7, 3],
  'KeyC': [-5, 2],
  'KeyV': [-3, 1],
  'KeyB': [-1, 0],
  'KeyN': [ 1,-1],
  'KeyM': [ 3,-2],
  'Comma': [ 5,-3],
  'Period': [ 7,-4],
  'Slash': [ 9,-5],

  // ASDF row (home row) - KeyH is CENTER [0,0]
  'KeyA': [-10, 5],
  'KeyS': [-8, 4],
  'KeyD': [-6, 3],
  'KeyF': [-4, 2],
  'KeyG': [-2, 1],
  'KeyH': [ 0, 0], // CENTER NOTE (D)
  'KeyJ': [ 2,-1],
  'KeyK': [ 4,-2],
  'KeyL': [ 6,-3],
  'Semicolon': [ 8,-4],
  'Quote': [10,-5],

  // QWER row (top letter row)
  'KeyQ': [-9, 5],
  'KeyW': [-7, 4],
  'KeyE': [-5, 3],
  'KeyR': [-3, 2],
  'KeyT': [-1, 1],
  'KeyY': [ 1, 0],
  'KeyU': [ 3,-1],
  'KeyI': [ 5,-2],
  'KeyO': [ 7,-3],
  'KeyP': [ 9,-4],
  'BracketLeft': [11,-5],
  'BracketRight': [13,-6],

  // Number row
  'Backquote': [-10, 6],
  'Digit1': [-8, 5],
  'Digit2': [-6, 4],
  'Digit3': [-4, 3],
  'Digit4': [-2, 2],
  'Digit5': [ 0, 1],
  'Digit6': [ 2, 0],
  'Digit7': [ 4,-1],
  'Digit8': [ 6,-2],
  'Digit9': [ 8,-3],
  'Digit0': [10,-4],
  'Minus': [12,-5],
  'Equal': [14,-6],

  // Additional keys
  'Backslash': [15,-7],
  'Tab': [-11, 6],
  'CapsLock': [-11, 5],
  'ShiftLeft': [-10, 4],
  'ShiftRight': [11,-6],
  'Enter': [11,-4],
  'Backspace': [16,-7],
  'IntlBackslash': [-8, 3], // ISO keyboard extra key
};

/**
 * Special keys that are NOT notes
 * Bottom row (Ctrl, Alt, Space) is reserved for modifiers
 * This prevents accidental browser shortcuts (Ctrl+W, Alt+Tab, etc.)
 * 
 * Philosophy:
 * - Alt = HOLD for sustain (not toggle)
 * - Space = HOLD for vibrato  
 * - Ctrl = reserved (avoid browser shortcuts like Ctrl+W)
 * - All other keys = play notes
 */
export const SPECIAL_KEYS = {
  SUSTAIN: 'AltLeft',   // Hold for sustain (AltLeft or AltRight)
  SUSTAIN_RIGHT: 'AltRight',
  VIBRATO: 'Space',     // Hold for vibrato
};

// Bottom row keys that are NOT notes (modifier row)
export const MODIFIER_ROW_KEYS = new Set([
  'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 
  'MetaLeft', 'MetaRight',  // Windows/Command key
  'Space',
  'ShiftLeft', 'ShiftRight',
  'CapsLock',
  'ContextMenu',
  'Fn', // Function key (if present)
]);



/**
 * Generate key map - return the physical key map
 */
function generateKeyMap(): Record<string, KeyCoordinate> {
  return { ...PHYSICAL_KEY_MAP };
}

/**
 * Standard layout - works with ALL keyboard layouts (Dvorak, Colemak, AZERTY, etc.)
 * Uses physical position mapping (event.code)
 */
export const standardLayout: KeyboardLayout = {
  name: 'Standard',
  keyMap: generateKeyMap(),
};



export const layouts: Record<string, KeyboardLayout> = {
  'standard': standardLayout,
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
