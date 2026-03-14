# MIDI Parser

Inline MIDI file parser — no npm dependencies. Supports Type 0 and Type 1 MIDI files, running status, and drum channel filtering.

Parses the binary Standard MIDI File format: reads the MThd header, iterates MTrk chunks, decodes variable-length integers, handles meta events (tempo FF 51, time signature FF 58, end-of-track FF 2F), sysex, and all channel voice messages. Converts tick-based note events to milliseconds using the extracted tempo map.

## Types

Public interfaces for note events, tempo events, time signature events, and the parsed output. Internal interfaces for tempo/time-sig entries, tick-based notes, and pending (open) notes.

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

## Header Parsing Utilities

Variable-length integer decoding, tick-to-millisecond conversion, 24-bit read, and pending note closure.

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

## Track Parsing

Iterates all events in a single MTrk chunk: delta times, running status, meta events (tempo, time signature, end-of-track), sysex, system messages, and channel voice messages (Note On/Off, Aftertouch, CC, Program Change, Channel Pressure, Pitch Bend).

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

## Event Types and Main Entry Point

Validates the MThd header, iterates MTrk chunks, converts tick notes to millisecond events, filters drums (channel 9), sorts by startMs, and builds the exported tempo and time signature maps.

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
