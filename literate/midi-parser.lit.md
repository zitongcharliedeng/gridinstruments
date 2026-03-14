# MIDI Parser

An inline Standard MIDI File (SMF) parser with no npm dependencies. Supports Type 0 (single-track) and Type 1 (multi-track) files, running status byte compression, and automatic drum channel filtering.

The [Standard MIDI File specification](https://www.midi.org/specifications/file-format-specifications/standard-midi-files/) defines a chunk-based binary format. Every file begins with an `MThd` header chunk followed by one or more `MTrk` track chunks. Within each track, events are encoded as a variable-length delta time followed by a status byte and data bytes. The parser reconstructs absolute tick positions, applies a tempo map to convert ticks to milliseconds, and returns typed note events ready for the game engine.

## Public Note Event Type

A `NoteEvent` is the primary output unit — one record per sounded note, with timing already converted to milliseconds.

``` {.typescript file=_generated/lib/midi-parser.ts}
/** Inline MIDI file parser — no npm dependencies. Type 0 + Type 1, running status, drum filter. */

export interface NoteEvent {
  midiNote: number;    // 0-127 MIDI note number
  startMs: number;     // note start in milliseconds (from tempo map)
  durationMs: number;  // note duration in milliseconds
  velocity: number;    // 0-127
  channel: number;     // 0-indexed MIDI channel (channel 10 drums = channel index 9)
  track: number;       // 0-indexed track number
}
```

## Tempo and Time Signature Event Types

The MIDI spec encodes tempo as microseconds per quarter note rather than BPM. Meta event `FF 51 03 tt tt tt` carries a 24-bit value; 500 000 µs/quarter = 120 BPM. The `bpm` field is pre-computed as `60_000_000 / microsecondsPerQuarter` for convenience.

Time signatures use a compact encoding: the denominator is stored as a power of two (`dd`), so `2` means `2^2 = 4` (quarter note), `3` means `2^3 = 8` (eighth note). Meta event `FF 58 04 nn dd cc bb` carries numerator, denominator power, MIDI clocks per click, and 32nd notes per quarter.

``` {.typescript file=_generated/lib/midi-parser.ts}
/** Set Tempo meta event (FF 51): defines microseconds per quarter note at a tick position. */
export interface TempoEvent {
  tickPosition: number;
  microsecondsPerQuarter: number;
  bpm: number;         // 60_000_000 / microsecondsPerQuarter
}

/**
 * Time Signature meta event (FF 58): defines meter at a tick position.
 *
 * MIDI binary format: FF 58 04 nn dd cc bb
 *   nn = numerator (e.g. 4 for 4/4)
 *   dd = denominator as a power of 2 (e.g. 2 → 2^2 = 4, so 4/4; 3 → 2^3 = 8, so 7/8)
 *   cc = MIDI clocks per metronome click (typically 24)
 *   bb = 32nd notes per quarter note (typically 8)
 */
export interface TimeSigEvent {
  tickPosition: number;
  numerator: number;
  denominatorPower: number;
  ticksPerQuarter: number;  // ppq from header — included for grid spacing convenience
}

/** Parsed output of a MIDI file: note events plus extracted tempo and time signature maps. */
export interface ParsedMidi {
  events: NoteEvent[];
  tempoMap: TempoEvent[];
  timeSigMap: TimeSigEvent[];
}
```

## Internal Accumulator Types

These four interfaces are used only during parsing and are not exported. `TempoEntry` and `TimeSigEntry` are the raw accumulated entries before conversion to the exported forms. `TickNote` holds a fully closed note in tick coordinates. `PendingNote` tracks an open Note On waiting for its matching Note Off.

``` {.typescript file=_generated/lib/midi-parser.ts}
interface TempoEntry {
  tick: number;
  tempoUs: number;
}

interface TimeSigEntry {
  tick: number;
  numerator: number;
  denominatorPower: number;
}

interface TickNote {
  midiNote: number;
  startTick: number;
  endTick: number;
  velocity: number;
  channel: number;
  track: number;
}

interface PendingNote {
  midiNote: number;
  channel: number;
  track: number;
  velocity: number;
  startTick: number;
}

```

## Variable-Length Integer Decoder

MIDI uses a variable-length quantity (VLQ) encoding for delta times and meta-event lengths. Each byte contributes 7 bits of value; the high bit is a continuation flag. Reading stops at the first byte where bit 7 is clear. A single byte encodes values 0–127; two bytes reach 16 383; four bytes reach the maximum of 268 435 455 ticks.

``` {.typescript file=_generated/lib/midi-parser.ts}
/** Variable-length integer encoding used throughout MIDI binary format. */
function readVarLen(view: DataView, offset: number): { value: number; bytesRead: number } {
  let value = 0;
  let bytesRead = 0;
  let byte: number;
  do {
    byte = view.getUint8(offset + bytesRead);
    value = (value << 7) | (byte & 0x7f);
    bytesRead++;
  } while ((byte & 0x80) !== 0);
  return { value, bytesRead };
}
```

## Tick-to-Millisecond Conversion and Small Helpers

Tick time is converted to wall-clock milliseconds by walking the sorted tempo map. Each tempo segment contributes `deltaTicks * tempoUs / ppq / 1000` milliseconds. The default tempo of 500 000 µs/quarter (120 BPM) applies if no `FF 51` event precedes the target tick.

`readUint24` reads a big-endian 24-bit integer — the wire format for tempo values. `closePending` finalises an open note by moving it from the pending map into the completed notes array.

``` {.typescript file=_generated/lib/midi-parser.ts}
/** ms = sum(deltaTicks * tempoUs / ppq / 1000) across tempo segments. */
function tickToMs(tick: number, tempoMap: ReadonlyArray<TempoEntry>, ppq: number): number {
  let ms = 0;
  let prevTick = 0;
  let tempoUs = 500000; // 120 BPM default

  for (const entry of tempoMap) {
    if (entry.tick >= tick) break;
    ms += ((entry.tick - prevTick) * tempoUs) / ppq / 1000;
    prevTick = entry.tick;
    tempoUs = entry.tempoUs;
  }

  ms += ((tick - prevTick) * tempoUs) / ppq / 1000;
  return ms;
}

function readUint24(view: DataView, offset: number): number {
  return (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
}

function closePending(pending: Map<string, PendingNote>, key: string, endTick: number, notes: TickNote[]): void {
  const p = pending.get(key);
  if (!p) return;
  notes.push({
    midiNote: p.midiNote,
    startTick: p.startTick,
    endTick,
    velocity: p.velocity,
    channel: p.channel,
    track: p.track,
  });
  pending.delete(key);
}

```

## Track Parser: Setup and Delta-Time Loop

`parseTrack` processes one `MTrk` chunk entirely within the DataView. It receives the absolute byte offset and byte length of the track data, plus the running `tempoMap` and `timeSigEntries` arrays (written to only when `collectTempo` is true — track 0 in Type 1 files is the tempo track).

Running status is a MIDI bandwidth optimisation: if the current byte is a data byte (value < 128 / 0x80), the previous status byte is reused without retransmission. The parser tracks `runningStatus` across events within the track.

``` {.typescript file=_generated/lib/midi-parser.ts}
function parseTrack(
  view: DataView,
  trackStart: number,
  trackLength: number,
  trackIndex: number,
  tempoMap: TempoEntry[],
  timeSigEntries: TimeSigEntry[],
  collectTempo: boolean,
): TickNote[] {
  const notes: TickNote[] = [];
  const pending = new Map<string, PendingNote>();
  let offset = trackStart;
  const trackEnd = trackStart + trackLength;
  let tick = 0;
  let runningStatus = 0;

  while (offset < trackEnd) {
    const delta = readVarLen(view, offset);
    offset += delta.bytesRead;
    tick += delta.value;

    if (offset >= trackEnd) break;

    let statusByte = view.getUint8(offset);

    // Running status: data byte (< 0x80) reuses previous status
    if (statusByte < 0x80) {
      statusByte = runningStatus;
    } else {
      offset++;
    }
```

## Track Parser: Meta Events (FF)

Meta events (`0xFF`) carry non-audio information. The type byte immediately follows the `0xFF` status, then a variable-length data length, then the payload.

Three meta types matter here. `FF 51` (Set Tempo) updates the tempo map — collected only from the authoritative tempo track. `FF 58` (Time Signature) updates the meter map similarly. `FF 2F` (End of Track) is mandatory at the end of every `MTrk` chunk; on encountering it the parser advances past the payload and exits the loop.

``` {.typescript file=_generated/lib/midi-parser.ts}
    // 0xFF = meta event
    if (statusByte === 0xff) {
      const metaType = view.getUint8(offset);
      offset++;
      const len = readVarLen(view, offset);
      offset += len.bytesRead;

      // 0x51 = tempo (3 bytes: microseconds per quarter note)
      if (metaType === 0x51 && len.value === 3 && collectTempo) {
        tempoMap.push({ tick, tempoUs: readUint24(view, offset) });
      }

      // 0x58 = time signature (4 bytes: nn dd cc bb)
      if (metaType === 0x58 && len.value === 4 && collectTempo) {
        timeSigEntries.push({
          tick,
          numerator: view.getUint8(offset),
          denominatorPower: view.getUint8(offset + 1),
        });
      }

      // 0x2F = end of track
      if (metaType === 0x2f) {
        offset += len.value;
        break;
      }

      offset += len.value;
      continue;
    }
```

## Track Parser: SysEx, System Messages, and Channel Voice Messages

SysEx messages (`0xF0` / `0xF7`) carry manufacturer-specific data and are skipped entirely — their length is variable and encoded as a VLQ after the status byte. Other system-common messages (`0xF1`–`0xF6`) have fixed data byte counts: MTC quarter frame and Song Select take one byte; Song Position Pointer takes two.

Channel voice messages occupy the lower nybble of the status byte for channel (0–15) and the upper nybble for message type. Note On (`0x90`) with velocity zero is treated as Note Off per the MIDI 1.0 spec. Aftertouch (`0xA0`), Control Change (`0xB0`), and Pitch Bend (`0xE0`) each consume two data bytes; Program Change (`0xC0`) and Channel Pressure (`0xD0`) consume one. Any notes still open when the track ends are closed at the final tick.

``` {.typescript file=_generated/lib/midi-parser.ts}
    // 0xF0/0xF7 = sysex
    if (statusByte === 0xf0 || statusByte === 0xf7) {
      const len = readVarLen(view, offset);
      offset += len.bytesRead + len.value;
      continue;
    }

    // Other system messages (0xF1-0xF6, 0xF8-0xFE)
    if ((statusByte & 0xf0) === 0xf0) {
      switch (statusByte) {
        case 0xf1: offset += 1; break; // MTC quarter frame
        case 0xf2: offset += 2; break; // Song position
        case 0xf3: offset += 1; break; // Song select
        default: break;
      }
      continue;
    }

    runningStatus = statusByte;
    const msgType = statusByte & 0xf0;
    const channel = statusByte & 0x0f;

    switch (msgType) {
      // 0x80 = Note Off
      case 0x80: {
        const note = view.getUint8(offset);
        offset += 2;
        closePending(pending, `${channel}-${note}`, tick, notes);
        break;
      }

      // 0x90 = Note On (vel=0 is Note Off per MIDI spec)
      case 0x90: {
        const note = view.getUint8(offset);
        const vel = view.getUint8(offset + 1);
        offset += 2;
        const key = `${channel}-${note}`;

        if (vel === 0) {
          closePending(pending, key, tick, notes);
        } else {
          closePending(pending, key, tick, notes);
          pending.set(key, { midiNote: note, channel, track: trackIndex, velocity: vel, startTick: tick });
        }
        break;
      }

      case 0xa0: // Aftertouch
      case 0xb0: // Control Change
      case 0xe0: // Pitch Bend
        offset += 2;
        break;

      case 0xc0: // Program Change
      case 0xd0: // Channel Pressure
        offset += 1;
        break;

      default:
        break;
    }
  }

  for (const [key] of pending) {
    closePending(pending, key, tick, notes);
  }

  return notes;
}

```

## Main Entry Point: Header Validation and Track Iteration

`parseMidi` is the single public function. It validates the four-byte `MThd` tag, reads the six-byte header payload (format, track count, division), rejects unsupported formats (Type 2; SMPTE time division), then iterates every `MTrk` chunk.

The SMF header layout: bytes 0–3 are the tag `MThd`; bytes 4–7 are the 32-bit header length (always 6 for SMF 1.0); bytes 8–9 are format (0, 1, or 2); bytes 10–11 are track count; bytes 12–13 are the division word. If bit 15 of the division word is clear, the value is pulses per quarter note (PPQ / ticks per beat). If bit 15 is set, the value encodes SMPTE frames — not supported here.

In Type 1 files only track 0 is authoritative for tempo and time signature data; subsequent tracks may duplicate these meta events for DAW compatibility but the parser ignores them.

``` {.typescript file=_generated/lib/midi-parser.ts}
/**
 * Parse a Standard MIDI File (Type 0 or Type 1) from an ArrayBuffer.
 * Returns ParsedMidi with events sorted by startMs, plus tempo and time signature maps.
 * Channel 9 (drums) is filtered from events.
 */
export function parseMidi(buffer: ArrayBuffer): ParsedMidi {
  const view = new DataView(buffer);

  const headerTag =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2)) +
    String.fromCharCode(view.getUint8(3));

  if (headerTag !== 'MThd') {
    throw new Error('Not a valid MIDI file: missing MThd header');
  }

  const headerLength = view.getUint32(4, false);
  const format = view.getUint16(8, false);
  const ntrks = view.getUint16(10, false);
  const division = view.getUint16(12, false);

  if (format === 2) throw new Error('MIDI Type 2 not supported');
  if (format !== 0 && format !== 1) throw new Error(`Unknown MIDI format: ${format}`);
  if ((division & 0x8000) !== 0) throw new Error('SMPTE time division not supported');

  const ppq = division;
  const tempoMap: TempoEntry[] = [];
  const timeSigEntries: TimeSigEntry[] = [];
  const allTickNotes: TickNote[] = [];
  let offset = 8 + headerLength;

  for (let t = 0; t < ntrks; t++) {
    const trkTag =
      String.fromCharCode(view.getUint8(offset)) +
      String.fromCharCode(view.getUint8(offset + 1)) +
      String.fromCharCode(view.getUint8(offset + 2)) +
      String.fromCharCode(view.getUint8(offset + 3));

    if (trkTag !== 'MTrk') throw new Error(`Expected MTrk at offset ${offset}, got "${trkTag}"`);

    const trackLength = view.getUint32(offset + 4, false);
    const trackDataStart = offset + 8;

    // Type 0: single track collects tempo. Type 1: only track 0 is authoritative for tempo.
    const collectTempo = format === 0 || t === 0;
    allTickNotes.push(...parseTrack(view, trackDataStart, trackLength, t, tempoMap, timeSigEntries, collectTempo));
    offset = trackDataStart + trackLength;
  }
```

## Tempo Map, Drum Filter, and Output Assembly

After all tracks are parsed, the tempo and time-signature entries are sorted by tick position. If no `FF 58` event was found, 4/4 is assumed — the overwhelming default in practice.

Channel 9 (General MIDI drum channel, labelled "channel 10" in 1-indexed notation) is excluded from the note events. The tick-based notes are converted to millisecond timing via the now-complete tempo map. Events are sorted by `startMs` for efficient sequential rendering.

The exported tempo map adds the pre-computed `bpm` field. If no tempo events were found at all, a single 120 BPM entry is inserted at tick 0 — the MIDI default.

``` {.typescript file=_generated/lib/midi-parser.ts}
  tempoMap.sort((a, b) => a.tick - b.tick);
  timeSigEntries.sort((a, b) => a.tick - b.tick);

  // Default 4/4 if no FF 58 event found
  if (timeSigEntries.length === 0) {
    timeSigEntries.push({ tick: 0, numerator: 4, denominatorPower: 2 });
  }

  const events: NoteEvent[] = [];
  for (const tn of allTickNotes) {
    if (tn.channel === 9) continue; // Filter channel 9 (drums)

    const startMs = tickToMs(tn.startTick, tempoMap, ppq);
    const endMs = tickToMs(tn.endTick, tempoMap, ppq);
    events.push({
      midiNote: tn.midiNote,
      startMs,
      durationMs: Math.max(0, endMs - startMs),
      velocity: tn.velocity,
      channel: tn.channel,
      track: tn.track,
    });
  }

  events.sort((a, b) => a.startMs - b.startMs);

  // Build exported tempo map with BPM calculated
  const exportedTempoMap: TempoEvent[] = tempoMap.map(e => ({
    tickPosition: e.tick,
    microsecondsPerQuarter: e.tempoUs,
    bpm: 60_000_000 / e.tempoUs,
  }));

  // Default 120 BPM if no tempo events found
  if (exportedTempoMap.length === 0) {
    exportedTempoMap.push({ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 });
  }

  const exportedTimeSigMap: TimeSigEvent[] = timeSigEntries.map(e => ({
    tickPosition: e.tick,
    numerator: e.numerator,
    denominatorPower: e.denominatorPower,
    ticksPerQuarter: ppq,
  }));

  return { events, tempoMap: exportedTempoMap, timeSigMap: exportedTimeSigMap };
}
```
