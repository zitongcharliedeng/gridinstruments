/**
 * Game Engine — converts NoteEvent[] (MIDI parser) into NoteGroup[] (game machine).
 *
 * Chord grouping, range-aware transposition/cropping, and median-note
 * calculation for D-ref centering.
 */

import { NoteEvent } from './midi-parser';
import { NoteGroup } from '../machines/gameMachine';
import { midiToCoord } from './note-colors';

/**
 * Chord grouping threshold in ms.
 * Notes starting within this window of the current group start are considered simultaneous.
 */
const CHORD_THRESHOLD_MS = 20;

/** Type alias for NoteGroup used in game engine (now identical to base NoteGroup). */
export type GameNoteGroup = NoteGroup;

/**
 * Convert MIDI note number to grid cell ID: "${coordX}_${coordY}"
 * Uses the canonical short-path CoF position from midiToCoord().
 */
export function midiToCellId(midiNote: number): string {
  const [x, y] = midiToCoord(midiNote);
  return `${x}_${y}`;
}

/**
 * Build NoteGroup[] from NoteEvent[].
 *
 * Algorithm:
 * 1. Sort events by startMs (ascending)
 * 2. Walk events; open a new group when the current event's startMs is
 *    more than CHORD_THRESHOLD_MS after the current group's startMs
 * 3. Within each group, collect unique cellIds (duplicates silently discarded)
 * 4. Skip drums (channel 9) — already filtered by parseMidi, but be safe
 *
 * Returns groups sorted by startMs.
 */
export function buildNoteGroups(events: NoteEvent[]): GameNoteGroup[] {
  const sorted = [...events]
    .filter(e => e.channel !== 9)
    .sort((a, b) => a.startMs - b.startMs);

  const groups: GameNoteGroup[] = [];

  for (const event of sorted) {
    const last = groups[groups.length - 1];
    if (last && event.startMs - last.startMs <= CHORD_THRESHOLD_MS) {
      const cellId = midiToCellId(event.midiNote);
      if (!last.cellIds.includes(cellId)) {
        last.cellIds.push(cellId);
        last.midiNotes.push(event.midiNote);
      }
    } else {
      groups.push({
        startMs: event.startMs,
        cellIds: [midiToCellId(event.midiNote)],
        midiNotes: [event.midiNote],
      });
    }
  }

  return groups;
}

/**
 * Compute the median MIDI note number of a NoteEvent array.
 * Returns 62 (D) if events is empty.
 * Used to auto-center D-ref on the median pitch of a song.
 */
export function computeMedianMidiNote(events: NoteEvent[]): number {
  if (events.length === 0) return 62;
  const sorted = [...events].map(e => e.midiNote).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Transpose all NoteGroups by a fixed number of semitones.
 * Returns new GameNoteGroup[] with recalculated cellIds.
 * Semitones must be a whole number. Negative = down, positive = up.
 *
 * Notes transposed outside MIDI range (0-127) are dropped.
 * Groups that become empty after dropping out-of-range notes are removed.
 * The original groups are not mutated.
 */
export function transposeSong(groups: GameNoteGroup[], semitones: number): GameNoteGroup[] {
  return groups.map(group => {
    const transposedMidi = group.midiNotes.map(m => m + semitones);
    const newCellIds: string[] = [];
    const newMidiNotes: number[] = [];
    for (let i = 0; i < transposedMidi.length; i++) {
      const midi = transposedMidi[i];
      if (midi >= 0 && midi <= 127) {
        newCellIds.push(midiToCellId(midi));
        newMidiNotes.push(midi);
      }
    }
    return { startMs: group.startMs, cellIds: newCellIds, midiNotes: newMidiNotes };
  }).filter(g => g.cellIds.length > 0);
}

/**
 * Filter NoteGroups to only include notes whose cellIds are in the available range.
 * Groups where ALL notes are out of range are removed.
 * Groups where SOME notes are out of range have those notes removed.
 * Groups that become empty are removed.
 *
 * Used after auto-transposition to crop notes outside the calibrated input range.
 */
export function cropToRange(groups: GameNoteGroup[], availableRange: ReadonlySet<string>): GameNoteGroup[] {
  return groups.map(group => {
    const filtered = group.cellIds.reduce<{ cellIds: string[]; midiNotes: number[] }>(
      (acc, cellId, i) => {
        if (availableRange.has(cellId)) {
          acc.cellIds.push(cellId);
          acc.midiNotes.push(group.midiNotes[i]);
        }
        return acc;
      },
      { cellIds: [], midiNotes: [] },
    );
    return { startMs: group.startMs, cellIds: filtered.cellIds, midiNotes: filtered.midiNotes };
  }).filter(g => g.cellIds.length > 0);
}

/**
 * Find the optimal transposition (in semitones) to maximize notes within availableRange.
 * Tries transpositions from -24 to +24 semitones (2 octaves each direction).
 * Returns the semitone offset that results in the most notes within range.
 *
 * Algorithm:
 * 1. For each candidate transposition (-24 to +24):
 *    - Transpose all groups
 *    - Count how many cellIds are in availableRange
 * 2. Return the semitone value with the highest count (ties: prefer closer to 0)
 */
export function findOptimalTransposition(groups: GameNoteGroup[], availableRange: ReadonlySet<string>): number {
  let bestSemitones = 0;
  let bestCount = -1;

  for (let semitones = -24; semitones <= 24; semitones++) {
    const transposed = transposeSong(groups, semitones);
    let count = 0;
    for (const g of transposed) {
      for (const cellId of g.cellIds) {
        if (availableRange.has(cellId)) count++;
      }
    }
    // Prefer closer to 0 on tie
    if (count > bestCount || (count === bestCount && Math.abs(semitones) < Math.abs(bestSemitones))) {
      bestCount = count;
      bestSemitones = semitones;
    }
  }

  return bestSemitones;
}
