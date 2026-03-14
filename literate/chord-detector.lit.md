# Chord Detector

Chord name detection from active MIDI notes using Tonal.js — converts grid coordinates to note names and detects chord symbols.

## Imports

Tonal.js provides two namespaces used here: `Chord` for detection and `Note` for MIDI-to-name conversion and pitch sorting.

``` {.typescript file=_generated/lib/chord-detector.ts}
import { Chord, Note } from 'tonal';
```

## Coordinate to Note Name

`coordToNoteName` maps an isomorphic grid coordinate `(x, y)` to a note name with octave (e.g. `"D4"`). The x-axis steps through the circle of fifths — D is the origin (index 3 in the base array), and each step is 7 semitones. Accidentals accumulate when `x` carries outside the 7-note base range. The octave is derived from the absolute MIDI number produced by the coordinate, anchored at D4 = MIDI 62.

``` {.typescript file=_generated/lib/chord-detector.ts}
export function coordToNoteName(x: number, y: number, octaveOffset = 0): string {
  const noteNamesBase = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];

  const noteIndex = (((x + 3) % 7) + 7) % 7;
  const accidentalCount = Math.floor((x + 3) / 7);

  let noteName = noteNamesBase[noteIndex];

  if (accidentalCount > 0) {
    noteName += '#'.repeat(Math.min(accidentalCount, 2));
  } else if (accidentalCount < 0) {
    noteName += 'b'.repeat(Math.min(-accidentalCount, 2));
  }

  const baseMidi = 62; // D at default reference
  const semitones = x * 7 + y * 12 + octaveOffset * 12;
  const midi = baseMidi + semitones;
  const octave = Math.floor(midi / 12) - 1;

  return noteName + String(octave);
}
```

## MIDI Note Number to Note Name

A thin wrapper around `Note.fromMidi` from Tonal.js, returning an empty string when the conversion yields nothing (Tonal returns `null` for out-of-range values).

``` {.typescript file=_generated/lib/chord-detector.ts}
export function midiToNoteName(midi: number): string {
  const noteName = Note.fromMidi(midi);
  return noteName || '';
}
```

## Chord Detection

`detectChord` takes an array of `[x, y, octaveOffset]` grid coordinates, converts each to a pitch-class name (ignoring octave), deduplicates, and passes the set to `Chord.detect`. The `assumePerfectFifth` option lets Tonal name power chords and incomplete triads. The trailing `M` major-chord suffix is stripped for cleaner display (e.g. `"DM"` → `"D"`).

``` {.typescript file=_generated/lib/chord-detector.ts}
export function detectChord(coords: [number, number, number][]): string[] {
  if (coords.length < 2) return [];

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

  const uniqueNotes = [...new Set(noteNames)];

  if (uniqueNotes.length < 2) return [];

  try {
    const detected = Chord.detect(uniqueNotes, { assumePerfectFifth: true });

    return detected.map(chord => chord.replace(/M($|(?=\/))/g, ''));
  } catch {
    return [];
  }
}
```

## Active Note Names (Sorted by Pitch)

`getActiveNoteNames` converts coordinates to full note names with octave and sorts them by MIDI pitch number ascending. Used by any display that wants an ordered list of sounding notes.

``` {.typescript file=_generated/lib/chord-detector.ts}
export function getActiveNoteNames(coords: [number, number, number][]): string[] {
  return coords
    .map(([x, y, oct]) => coordToNoteName(x, y, oct))
    .sort((a, b) => {
      const midiA = Note.midi(a) ?? 0;
      const midiB = Note.midi(b) ?? 0;
      return midiA - midiB;
    });
}
```
