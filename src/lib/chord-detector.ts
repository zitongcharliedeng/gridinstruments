/**
 * Chord Detection using Tonal.js
 * 
 * Detects chord names from a set of active MIDI notes
 */

import { Chord, Note } from 'tonal';

/**
 * Convert coordinate to note name with octave
 * @param x Circle of fifths position
 * @param y Octave offset
 * @param octaveOffset Global octave offset
 */
export function coordToNoteName(x: number, y: number, octaveOffset: number = 0): string {
  // Circle of fifths note names (D at index 3)
  const noteNamesBase = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  
  // Calculate note name: D (x=0) → index 3
  const noteIndex = (((x + 3) % 7) + 7) % 7;
  const accidentalCount = Math.floor((x + 3) / 7);
  
  let noteName = noteNamesBase[noteIndex];
  
  // Add accidentals
  if (accidentalCount > 0) {
    noteName += '#'.repeat(Math.min(accidentalCount, 2));
  } else if (accidentalCount < 0) {
    noteName += 'b'.repeat(Math.min(-accidentalCount, 2));
  }
  
  // Calculate octave
  // D4 is at coordinate (0, 0)
  // Each y step = 1 octave
  // Each x step = 7 semitones (fifth)
  const baseMidi = 62; // D4
  const semitones = x * 7 + y * 12 + octaveOffset * 12;
  const midi = baseMidi + semitones;
  const octave = Math.floor(midi / 12) - 1;
  
  return noteName + octave;
}

/**
 * Convert MIDI note number to note name
 */
export function midiToNoteName(midi: number): string {
  const noteName = Note.fromMidi(midi);
  return noteName || '';
}

/**
 * Detect chord from a set of note coordinates
 * @param coords Array of [x, y, octaveOffset] coordinates
 * @returns Detected chord names or empty array
 */
export function detectChord(coords: Array<[number, number, number]>): string[] {
  if (coords.length < 2) return [];
  
  // Convert coords to note names (without octave for chord detection)
  const noteNames = coords.map(([x, _y, _oct]) => {
    const noteNamesBase = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    const noteIndex = (((x + 3) % 7) + 7) % 7; // D (x=0) → index 3
    const accidentalCount = Math.floor((x + 3) / 7);
    
    let noteName = noteNamesBase[noteIndex];
    
    if (accidentalCount > 0) {
      noteName += '#'.repeat(Math.min(accidentalCount, 2));
    } else if (accidentalCount < 0) {
      noteName += 'b'.repeat(Math.min(-accidentalCount, 2));
    }
    
    return noteName;
  });
  
  // Remove duplicates (same note different octaves)
  const uniqueNotes = [...new Set(noteNames)];
  
  if (uniqueNotes.length < 2) return [];
  
  try {
    // Use Tonal.js to detect chord
    const detected = Chord.detect(uniqueNotes, { assumePerfectFifth: true });
    
    // Clean up chord names (remove 'M' for major)
    return detected.map(chord => chord.replace(/M($|(?=\/))/g, ''));
  } catch {
    return [];
  }
}

/**
 * Get list of note names from coordinates
 */
export function getActiveNoteNames(coords: Array<[number, number, number]>): string[] {
  return coords
    .map(([x, y, oct]) => coordToNoteName(x, y, oct))
    .sort((a, b) => {
      // Sort by pitch (MIDI note number)
      const midiA = Note.midi(a) || 0;
      const midiB = Note.midi(b) || 0;
      return midiA - midiB;
    });
}
