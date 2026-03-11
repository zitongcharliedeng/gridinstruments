/**
 * Game Engine — converts NoteEvent[] (MIDI parser) into NoteGroup[] (game machine).
 *
 * Chord grouping, range-aware transposition/cropping, and median-note
 * calculation for D-ref centering.
 */

import { NoteEvent, TempoEvent, TimeSigEvent } from './midi-parser';
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

/**
 * Quantization level for the Piano Tiles-style game engine.
 *
 * - '1/4': quarter notes — easiest, fewest events, beginner-friendly
 * - '1/8': eighth notes — intermediate, doubles the grid density
 * - '1/16': sixteenth notes — advanced, four events per beat
 * - 'none': raw MIDI timing, no quantization applied
 *
 * Higher quantization (fewer divisions) makes the game more accessible by
 * reducing the number of events the player must hit. Long notes that span
 * multiple grid points are split into repeated events at each grid point,
 * following the Piano Tiles convention where held notes become repeated taps.
 */
export type QuantizationLevel = '1/4' | '1/8' | '1/16' | 'none';

const QUANTIZE_DIVISOR: Record<Exclude<QuantizationLevel, 'none'>, number> = {
  '1/4': 1,
  '1/8': 2,
  '1/16': 4,
};

/**
 * Build a beat grid of positions in ms from the tempo map at a given quantization level.
 *
 * For each tempo segment, computes evenly spaced grid points:
 *   gridSpacingMs = (60000 / bpm) / divisor
 *
 * The grid extends up to `endMs` (the last note's end position).
 * Handles tempo changes mid-song: each tempo segment produces grid points
 * at its own spacing. Odd meters (e.g. 7/8, 5/4) are handled correctly
 * because the grid spacing is purely BPM-based — the time signature only
 * affects how humans group beats, not the quantization grid itself.
 */
function buildBeatGrid(
  tempoMap: TempoEvent[],
  timeSigMap: TimeSigEvent[],
  level: Exclude<QuantizationLevel, 'none'>,
  endMs: number,
): number[] {
  const divisor = QUANTIZE_DIVISOR[level];
  const grid: number[] = [];
  const ppq = timeSigMap.length > 0 ? timeSigMap[0].ticksPerQuarter : 480;

  const segmentBoundariesMs = tempoMap.map(entry =>
    tickPositionToMs(tempoMap, entry.tickPosition, ppq),
  );

  for (let i = 0; i < tempoMap.length; i++) {
    const bpm = tempoMap[i].bpm;
    const spacingMs = (60000 / bpm) / divisor;
    const segmentStartMs = segmentBoundariesMs[i] ?? 0;
    const segmentEndMs = i + 1 < tempoMap.length
      ? (segmentBoundariesMs[i + 1] ?? endMs + spacingMs)
      : endMs + spacingMs;

    let t = segmentStartMs;
    while (t < segmentEndMs && t <= endMs + spacingMs) {
      grid.push(t);
      t += spacingMs;
    }
  }

  return grid;
}

function tickPositionToMs(tempoMap: TempoEvent[], tickPosition: number, ppq: number): number {
  if (tempoMap.length === 0) return 0;
  let ms = 0;
  let prevTick = 0;
  let usPerQuarter = 500000;

  for (const entry of tempoMap) {
    if (entry.tickPosition >= tickPosition) break;
    ms += ((entry.tickPosition - prevTick) * usPerQuarter) / ppq / 1000;
    prevTick = entry.tickPosition;
    usPerQuarter = entry.microsecondsPerQuarter;
  }

  ms += ((tickPosition - prevTick) * usPerQuarter) / ppq / 1000;
  return ms;
}

/**
 * Quantize note events to a beat grid for Piano Tiles-style gameplay.
 *
 * Algorithm:
 * 1. Build beat grid from tempo map at the given quantization level
 * 2. Snap each note's startMs to the nearest grid point
 * 3. Long note splitting: if a note's duration spans multiple grid points,
 *    split it into repeated NoteEvents at each grid point (Piano Tiles
 *    convention — sustained notes become repeated taps)
 * 4. Deduplicate: if two notes snap to the same grid point AND have the
 *    same midiNote, keep only one (prevents double-hits from close notes)
 * 5. Sort output by snapped startMs
 */
export function quantizeNotes(
  events: NoteEvent[],
  tempoMap: TempoEvent[],
  timeSigMap: TimeSigEvent[],
  level: QuantizationLevel,
): NoteEvent[] {
  if (level === 'none') return events;
  if (events.length === 0) return [];

  const lastEvent = events[events.length - 1];
  if (!lastEvent) return [];
  const endMs = lastEvent.startMs + lastEvent.durationMs;

  const grid = buildBeatGrid(tempoMap, timeSigMap, level, endMs);
  if (grid.length === 0) return events;

  const snapToGrid = (ms: number): number => {
    let lo = 0;
    let hi = grid.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (grid[mid] < ms) lo = mid + 1;
      else hi = mid;
    }
    const candidate = grid[lo];
    if (candidate === undefined) return grid[grid.length - 1] ?? ms;
    if (lo > 0) {
      const prev = grid[lo - 1];
      if (prev !== undefined && Math.abs(ms - prev) < Math.abs(ms - candidate)) return prev;
    }
    return candidate;
  };

  const result: NoteEvent[] = [];

  for (const event of events) {
    const snappedStart = snapToGrid(event.startMs);
    const noteEndMs = event.startMs + event.durationMs;

    // Long note splitting: find all grid points within the note's duration
    const gridPointsInNote: number[] = [];
    for (const gp of grid) {
      if (gp >= snappedStart && gp < noteEndMs) {
        gridPointsInNote.push(gp);
      }
      if (gp >= noteEndMs) break;
    }

    if (gridPointsInNote.length <= 1) {
      result.push({ ...event, startMs: snappedStart });
    } else {
      for (const gp of gridPointsInNote) {
        result.push({
          midiNote: event.midiNote,
          startMs: gp,
          durationMs: event.durationMs / gridPointsInNote.length,
          velocity: event.velocity,
          channel: event.channel,
          track: event.track,
        });
      }
    }
  }

  // Deduplicate: same grid point + same midiNote → keep first
  const seen = new Set<string>();
  const deduped: NoteEvent[] = [];
  for (const event of result) {
    const key = `${event.startMs.toFixed(2)}_${event.midiNote}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(event);
    }
  }

  deduped.sort((a, b) => a.startMs - b.startMs);
  return deduped;
}
