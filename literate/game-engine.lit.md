# Game Engine

Converts `NoteEvent[]` (MIDI parser output) into `NoteGroup[]` (game machine input).

Handles chord grouping, range-aware transposition and cropping, median-note calculation for D-ref centering, and quantization for Piano Tiles-style gameplay.

## Imports and constants

The engine depends on three modules: the MIDI parser for event types, the game machine for the `NoteGroup` shape, and `note-colors` for the Circle of Fifths coordinate mapping.

`CHORD_THRESHOLD_MS` defines the simultaneity window. Two notes whose `startMs` values fall within 20 ms of each other are treated as a single chord. This matches typical human MIDI performance timing where notes intended as simultaneous arrive slightly apart.

``` {.typescript file=_generated/lib/game-engine.ts}
import { NoteEvent, TempoEvent, TimeSigEvent } from './midi-parser';
import { NoteGroup } from '../machines/gameMachine';
import { midiToCoord } from './note-colors';

const CHORD_THRESHOLD_MS = 20;

export type GameNoteGroup = NoteGroup;
```

## MIDI note to grid cell ID

The grid is a Circle of Fifths layout. Each cell is addressed by a string `"x_y"` derived from the CoF position of the note's pitch class and octave. `midiToCoord` returns the canonical shortest-path coordinates; this function simply serializes them.

``` {.typescript file=_generated/lib/game-engine.ts}
export function midiToCellId(midiNote: number): string {
  const [x, y] = midiToCoord(midiNote);
  return `${x}_${y}`;
}
```

## Chord grouping

Chord grouping converts a flat sequence of `NoteEvent`s into time-grouped `NoteGroup`s. The algorithm is a single linear pass over events sorted by `startMs`.

A new group opens whenever the current event starts more than `CHORD_THRESHOLD_MS` after the last group's start time. Within a group, duplicate `cellId`s are silently dropped — two notes mapping to the same grid cell (e.g. an octave pair whose pitch classes share a CoF cell) would produce only one tap.

Channel 9 (General MIDI drums) is filtered defensively; `parseMidi` already excludes drums but this guard prevents malformed inputs from breaking the grouper.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

## Median note for D-ref centering

The game grid is anchored at D (MIDI 62). To auto-center a song's pitch content on the grid, the UI computes the median MIDI note of all events and shifts the D-ref so it lands on that median. Returns 62 (D4) for an empty input.

``` {.typescript file=_generated/lib/game-engine.ts}
export function computeMedianMidiNote(events: NoteEvent[]): number {
  if (events.length === 0) return 62;
  const sorted = [...events].map(e => e.midiNote).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
```

## Transposition

`transposeSong` shifts every note in every group by a fixed number of semitones. It returns a new array; the originals are not mutated.

Notes that land outside the valid MIDI range (0–127) after transposition are dropped individually. Groups that become entirely empty after the cull are also removed. This means a very large transposition applied to a song with notes near the edges of the MIDI range will silently lose those notes rather than producing invalid data.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

## Range cropping

After transposition the song may still contain notes that fall outside the instrument's calibrated physical range. `cropToRange` filters each group against the set of `cellId`s that the device actually reports. Notes outside that set are removed note-by-note; groups emptied by the crop are dropped entirely.

This is applied after `findOptimalTransposition` has already maximized in-range coverage, so in practice only edge notes are cropped.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

## Octave folding

Instead of dropping out-of-range notes (`cropToRange`), `foldOctaves` tries to wrap each note into the available range by shifting it ±12 semitones (one octave at a time). This preserves the song's harmonic identity while fitting it to a narrow calibrated range. Notes that can't be folded into range after ±4 octaves are dropped.

``` {.typescript file=_generated/lib/game-engine.ts}
export function foldOctaves(groups: GameNoteGroup[], availableRange: ReadonlySet<string>): GameNoteGroup[] {
  return groups.map(group => {
    const foldedCellIds: string[] = [];
    const foldedMidiNotes: number[] = [];
    for (let i = 0; i < group.cellIds.length; i++) {
      const cellId = group.cellIds[i];
      const midi = group.midiNotes[i];
      if (availableRange.has(cellId)) {
        foldedCellIds.push(cellId);
        foldedMidiNotes.push(midi);
        continue;
      }
      let found = false;
      for (let octShift = 1; octShift <= 4; octShift++) {
        for (const dir of [1, -1]) {
          const shifted = midi + dir * octShift * 12;
          const [sx, sy] = midiToCoord(shifted);
          const sCellId = `${sx}_${sy}`;
          if (availableRange.has(sCellId)) {
            foldedCellIds.push(sCellId);
            foldedMidiNotes.push(shifted);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    return { startMs: group.startMs, cellIds: foldedCellIds, midiNotes: foldedMidiNotes };
  }).filter(g => g.cellIds.length > 0);
}
```

## Optimal transposition search

Before loading a song the engine searches ±24 semitones (two octaves in each direction) for the transposition that places the most notes within the instrument's available range. This is a brute-force linear scan — 49 candidates, each costing one `transposeSong` pass.

Ties are broken by proximity to zero: a transposition of 0 semitones (no change) is preferred over ±12 when both produce the same in-range count. This keeps the song as close to its original key as possible.

``` {.typescript file=_generated/lib/game-engine.ts}
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
    if (count > bestCount || (count === bestCount && Math.abs(semitones) < Math.abs(bestSemitones))) {
      bestCount = count;
      bestSemitones = semitones;
    }
  }

  return bestSemitones;
}
```

## Quantization

### Level type and divisors

Quantization snaps note timing to a regular beat grid, turning a performance with subtle timing imperfections into a clean sequence of equally-spaced tap targets. This is how Piano Tiles and similar games work: the song is discretized so that every note lands on a predictable grid point.

Four levels are supported:

| Level | Divisor | Notes per beat | Difficulty |
|-------|---------|----------------|------------|
| `1/4` | 1 | 1 | Beginner |
| `1/8` | 2 | 2 | Intermediate |
| `1/16` | 4 | 4 | Advanced |
| `none` | — | raw timing | No quantization |

The divisor is how many grid points fit in one quarter-note beat. A higher divisor = finer grid = more events to hit.

``` {.typescript file=_generated/lib/game-engine.ts}
export type QuantizationLevel = '1/4' | '1/8' | '1/16' | 'none';

const QUANTIZE_DIVISOR: Record<Exclude<QuantizationLevel, 'none'>, number> = {
  '1/4': 1,
  '1/8': 2,
  '1/16': 4,
};
```

### Tick position to milliseconds

MIDI stores timing in ticks. Converting a tick position to wall-clock milliseconds requires walking the tempo map: each tempo segment contributes `(ticks_in_segment × µs_per_quarter) / ppq / 1000` milliseconds.

`ppq` (pulses per quarter note) comes from the file header. The default of 480 matches the most common MIDI resolution.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

### Beat grid construction

The beat grid is the set of valid snap targets. For each tempo segment the grid spacing in milliseconds is:

```
gridSpacingMs = (60000 / bpm) / divisor
```

A song with a single tempo at 120 BPM quantized to `1/8` produces grid points every 250 ms. Tempo changes produce segments with different spacings; each segment's grid starts at the segment boundary and ends just past the next boundary. The grid intentionally extends slightly beyond `endMs` so that notes near the very end of the song have a valid snap target.

Odd meters (5/4, 7/8, etc.) are handled automatically because the grid is purely BPM-based. The time signature determines how humans hear groupings of beats but does not affect the millisecond spacing between grid points.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

### Quantize notes

`quantizeNotes` is the main entry point for the Piano Tiles-style discretization. It combines beat grid construction, snapping, long-note splitting, deduplication, and sorting into a single pipeline.

**Snapping** uses binary search over the grid array to find the nearest grid point to each note's `startMs`. This is O(log N) per note where N is the number of grid points.

**Long-note splitting** handles sustained notes (notes whose duration spans multiple grid intervals). A note spanning three grid points is replaced by three shorter notes, one at each grid point. This follows the Piano Tiles convention where a held note becomes a series of repeated taps rather than a single prolonged event. Each split note receives an equal share of the original duration.

**Deduplication** removes double-hits: if two notes snap to the same grid point and have the same `midiNote` (common when a melody note and a chord note are near-simultaneous and share the same pitch), only the first is kept. The key is `"startMs_midiNote"` rounded to two decimal places to absorb floating-point noise.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

`snapToGrid` is a binary search over the sorted grid array. It finds the closest grid point to a given millisecond value in O(log N) time, checking both the upper-bound candidate and its predecessor.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```

For each event, snapping finds the start grid point. Long notes spanning multiple grid points are split into one event per grid point, each with an equal share of the original duration.

``` {.typescript file=_generated/lib/game-engine.ts}
  for (const event of events) {
    const snappedStart = snapToGrid(event.startMs);
    const noteEndMs = event.startMs + event.durationMs;

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
```

Deduplication removes double-hits where two source events snap to the same grid point with the same pitch. The key uses `toFixed(2)` to absorb floating-point noise without treating genuinely distinct times as equal.

``` {.typescript file=_generated/lib/game-engine.ts}
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
```
