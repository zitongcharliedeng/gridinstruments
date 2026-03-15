# Chord Detector

Chord name detection from active MIDI notes using Tonal.js — converts grid coordinates to note names and detects chord symbols.

## Imports

Tonal.js provides `Chord` for detection and `Note` for pitch sorting. Note naming is delegated to `keyboard-layouts` — the single source of truth for D-relative naming.

``` {.typescript file=_generated/lib/chord-detector.ts}
import { Chord, Note } from 'tonal';
import { getNoteNameFromCoord, midiToDRefNoteName } from './keyboard-layouts';
```

## Coordinate to Note Name

`coordToNoteName` maps an isomorphic grid coordinate `(x, y)` to a D-relative note name with numeric octave suffix (e.g. `"D"`, `"A1"`, `"C1"`). It delegates pitch-class naming to `getNoteNameFromCoord` and octave computation to `midiToDRefNoteName` — both from `keyboard-layouts.ts`, the single source of truth.

``` {.typescript file=_generated/lib/chord-detector.ts}
export function coordToNoteName(x: number, y: number, octaveOffset = 0): string {
  const midi = 62 + x * 7 + y * 12 + octaveOffset * 12;
  return midiToDRefNoteName(midi);
}
```

## MIDI Note Number to Note Name

Delegates to `midiToDRefNoteName` from keyboard-layouts — the single source of truth for D-relative note names with numeric octave suffixes.

``` {.typescript file=_generated/lib/chord-detector.ts}
export function midiToNoteName(midi: number): string {
  return midiToDRefNoteName(midi);
}
```

## Chord Detection

`detectChord` takes an array of `[x, y, octaveOffset]` grid coordinates, converts each to a pitch-class name via `getNoteNameFromCoord` (the single source of truth), deduplicates, and passes the set to `Chord.detect`. The `assumePerfectFifth` option lets Tonal name power chords and incomplete triads. The trailing `M` major-chord suffix is stripped for cleaner display (e.g. `"DM"` → `"D"`).

``` {.typescript file=_generated/lib/chord-detector.ts}
export function detectChord(coords: [number, number, number][]): string[] {
  if (coords.length < 2) return [];

  const noteNames = coords.map(([x, _y, _oct]) => getNoteNameFromCoord(x));

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
