# MPE Service

[MIDI Polyphonic Expression](https://www.midi.org/midi-articles/midi-polyphonic-expression-mpe) is a MIDI extension that assigns each note its own channel, enabling independent per-note pitch bend, pressure (aftertouch), and timbre (slide) on instruments like the [ROLI Seaboard](https://roli.com/products/seaboard) and [LinnStrument](https://www.rogerlinndesign.com/linnstrument). This service wraps the Web MIDI API to produce conformant MPE output, with configurable zone layout, pressure routing, and FIFO voice allocation.

The [MPE specification (MIDI Association, 2018)](https://www.midi.org/specifications/midi2-specifications/midi-polyphonic-expression-mpe/) defines two zones — a Lower Zone anchored on channel 1 and an Upper Zone anchored on channel 16. Each zone has a manager channel (which carries zone-wide messages) and a pool of member channels (which carry per-note expression). This service implements one zone at a time.

## Types and Defaults

`MPESettings` captures every tunable parameter for the zone. `masterChannel` is either `1` (Lower Zone) or `16` (Upper Zone). `memberChannelCount` controls how many of the 15 available member channels to use — LinnStrument defaults to 15, Seaboard typically uses 8. `pitchBendRange` is in semitones; 48 (±4 octaves) is the LinnStrument default and covers the full slide range of the instrument. `pressureMode` selects how per-note pressure is transmitted: Channel Aftertouch (`0xDn`) is the most compatible, Poly Aftertouch (`0xAn`) is higher-resolution but less widely supported, and CC mode allows routing to any arbitrary controller number.

`MPEVoice` is the runtime snapshot of a single sounding note — its assigned channel, normalized expression values, and lifecycle state. `MPEListener` is a callback type for UI subscribers that receive the full voice list on every state change.

``` {.typescript file=_generated/lib/mpe-service.ts}
/**
 * MPE (MIDI Polyphonic Expression) Service — configurable MPE output with voice tracking.
 *
 * Standalone service wrapping the Web MIDI API with:
 * - Configurable MPE zone (lower or upper zone, flexible member channel count)
 * - Per-note pitch bend, pressure, and timbre (slide) with configurable CC/mode
 * - Voice state tracking with listener subscription for real-time UI updates
 * - FIFO channel allocator — oldest freed channel is reused first
 *
 * Reference: François Georgy's MPE Tester (https://studiocode.dev/mpe-monitor/)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MPESettings {
  masterChannel: 1 | 16;
  memberChannelCount: number;
  pitchBendRange: number;
  pressureMode: 'channel-at' | 'poly-at' | 'cc';
  pressureCC: number;
  timbreCC: number;
  bendAutoReset: boolean;
}

export interface MPEVoice {
  noteId: string;
  channel: number;
  midiNote: number;
  velocity: number;
  pitchBend: number;
  pressure: number;
  timbre: number;
  state: 'active' | 'released';
}

export type MPEListener = (voices: MPEVoice[]) => void;

export const DEFAULT_MPE_SETTINGS: MPESettings = {
  masterChannel: 1,
  memberChannelCount: 15,
  pitchBendRange: 48,
  pressureMode: 'channel-at',
  pressureCC: 11,
  timbreCC: 74,
  bendAutoReset: true,
};
```

## Service Class and Constructor

The service holds a reference to the `MIDIAccess` object (obtained during `init()`), the currently selected `MIDIOutput`, the current settings, and a queue of free member channels. `voiceByNoteId` maps caller-supplied note identifiers to voice state; callers use their own IDs (e.g. a grid cell index or pointer ID) rather than MIDI note numbers, because MPE allows multiple simultaneous instances of the same pitch on different channels.

The constructor accepts an optional partial settings override and immediately builds the free-channel pool from the resulting settings.

``` {.typescript file=_generated/lib/mpe-service.ts}

// ─── Service ────────────────────────────────────────────────────────────────

export class MPEService {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private settings: MPESettings;
  private freeChannels: number[];
  private voiceByNoteId = new Map<string, MPEVoice>();
  private listeners = new Set<MPEListener>();
  private _enabled = false;

  constructor(settings?: Partial<MPESettings>) {
    this.settings = { ...DEFAULT_MPE_SETTINGS, ...settings };
    this.freeChannels = this.buildChannelPool();
  }
```

## Initialisation and Settings

`init()` requests Web MIDI access without sysex permissions and degrades gracefully if the browser denies it or the API is absent (e.g. Firefox without the Jazz plugin). The try/catch is intentionally silent — callers can check `getMidiAccess()` to determine whether MIDI is available.

`updateSettings()` applies a partial patch and selectively reacts: changing `masterChannel` or `memberChannelCount` requires a full channel-pool reset (which also panics to avoid orphaned notes on the old channels), and if an output is connected the MCM is re-sent immediately so the receiving synth updates its zone configuration.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (!('requestMIDIAccess' in navigator)) return;
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      // MIDI not available — degrade gracefully
    }
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  getSettings(): Readonly<MPESettings> {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<MPESettings>): void {
    this.settings = { ...this.settings, ...patch };
    if ('memberChannelCount' in patch || 'masterChannel' in patch) {
      this.resetChannelPool();
    }
    if (this.output) this.sendMCM();
  }
```

## Enable / Output Selection

`setEnabled(false)` calls `panic()` to immediately silence all sounding notes — useful when the user toggles MIDI off in the UI. `setOutput()` wires up a new `MIDIOutput` and immediately sends the MCM so the connected device knows its zone configuration without requiring a manual reconnect.

`getAvailableOutputs()` iterates the `MIDIAccess.outputs` map (a `MIDIOutputMap`, not a plain array) and returns it as a plain array for easier rendering in select UI elements.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Enable / Output ─────────────────────────────────────────────────────

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) this.panic();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setOutput(output: MIDIOutput | null): void {
    this.output = output;
    if (output) this.sendMCM();
  }

  getAvailableOutputs(): MIDIOutput[] {
    if (!this.access) return [];
    const outputs: MIDIOutput[] = [];
    this.access.outputs.forEach((o) => outputs.push(o));
    return outputs;
  }

  getMidiAccess(): MIDIAccess | null {
    return this.access;
  }
```

## Subscriptions

The listener set implements a simple pub/sub for reactive UI. `subscribe()` returns an unsubscribe function following the common Svelte/React pattern, so callers can clean up in `onDestroy` / `useEffect` return. `activeVoices()` provides a one-shot snapshot filtered to only `'active'` voices (excluding voices that have been released but not yet removed from the map).

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Subscription ─────────────────────────────────────────────────────────

  subscribe(listener: MPEListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  activeVoices(): MPEVoice[] {
    return Array.from(this.voiceByNoteId.values()).filter(v => v.state === 'active');
  }
```

## Note On and Note Off

`noteOn()` allocates the next free channel from the FIFO queue, pre-resets per-note expression state on that channel (pitch bend to centre `0x00/0x40`, timbre to centre 64, pressure to 0), then fires the Note On. Pre-resetting matters because the channel was previously used by a different note — without it, the new note would inherit stale bend or pressure from the previous voice.

`bendAutoReset` can be disabled for instruments or use-cases where the host handles bend reset, or where pre-note bend messages arrive on a tight timing budget.

`noteOff()` sends Note Off with a fixed release velocity of 64 (the MPE-conventional "no-op" value), marks the voice as `'released'`, notifies listeners (so the UI can show the release state), then pushes the channel back onto the free queue via `release()`.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── MPE messages ─────────────────────────────────────────────────────────

  noteOn(noteId: string, midiNote: number, velocity: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.allocate();
    if (ch === null) return;

    const chIdx = ch - 1; // 0-indexed for status byte

    // Reset per-note state before note-on
    if (this.settings.bendAutoReset) {
      this.output.send([0xE0 | chIdx, 0x00, 0x40]);                // pitch bend center
    }
    this.output.send([0xB0 | chIdx, this.settings.timbreCC, 64]);  // timbre center
    this.sendPressureRaw(chIdx, midiNote, 0);                       // pressure 0
    this.output.send([0x90 | chIdx, midiNote, Math.round(velocity * 127)]); // note on

    // Track voice state
    const voice: MPEVoice = {
      noteId,
      channel: ch,
      midiNote,
      velocity,
      pitchBend: 0,
      pressure: 0,
      timbre: 0.5,
      state: 'active',
    };
    this.voiceByNoteId.set(noteId, voice);
    this.notify();
  }

  noteOff(noteId: string, midiNote: number): void {
    if (!this._enabled || !this.output) return;
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;

    const chIdx = voice.channel - 1;
    this.output.send([0x80 | chIdx, midiNote, 64]); // note off, release velocity 64
    voice.state = 'released';
    this.notify();
    this.release(noteId);
  }
```

## Pressure, Slide, and Pitch Bend

These three methods deliver the "3D" expression that distinguishes MPE from standard MIDI. All three look up the voice by `noteId` to retrieve its assigned channel.

**Pressure** delegates to `sendPressureRaw()` (shared with the pre-note-on reset), normalising the 0–1 float to a 7-bit value. The routing mode is determined by `pressureMode` in settings.

**Slide** (timbre / CC 74) is CC-based. [CC 74 "Brightness"](https://www.midi.org/specifications/item/table-3-control-change-messages-data-bytes-2) is the MPE-designated timbre controller. ROLI and Seaboard use it for the Y-axis (lateral finger movement). The value is rescaled from 0–1 to 0–127.

**Pitch Bend** encodes a semitone offset as a 14-bit unsigned integer. The formula `(normalised + 1) × 8191.5` maps the −1..+1 range to 0..16383, where 8192 is centre (no bend). The `pitchBendRange` setting must match the value sent in the MCM (see `sendPitchBendSensitivity`) for the semitone arithmetic to be accurate.

``` {.typescript file=_generated/lib/mpe-service.ts}

  sendPressure(noteId: string, pressure: number): void {
    if (!this._enabled || !this.output) return;
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;

    this.sendPressureRaw(voice.channel - 1, voice.midiNote, pressure);
    voice.pressure = pressure;
    this.notify();
  }

  sendSlide(noteId: string, value: number): void {
    if (!this._enabled || !this.output) return;
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;

    const chIdx = voice.channel - 1;
    this.output.send([0xB0 | chIdx, this.settings.timbreCC, Math.round(value * 127)]);
    voice.timbre = value;
    this.notify();
  }

  sendPitchBend(noteId: string, semitones: number): void {
    if (!this._enabled || !this.output) return;
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;

    const chIdx = voice.channel - 1;
    const normalized = semitones / this.settings.pitchBendRange;       // -1..+1
    const uint14 = Math.round((normalized + 1) * 8191.5);             // 0..16383
    const lsb = uint14 & 0x7F;
    const msb = (uint14 >> 7) & 0x7F;
    this.output.send([0xE0 | chIdx, lsb, msb]);
    voice.pitchBend = semitones;
    this.notify();
  }
```

## Panic and Dispose

`panic()` sends CC 123 (All Notes Off) on every member channel, which is the standard MIDI emergency mute. It then clears the voice map and rebuilds the free-channel pool from scratch, so the allocator is in a clean state. This is called on `setEnabled(false)` and on channel-count changes.

`dispose()` extends panic by also clearing all listeners and nulling references — intended for component teardown.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  /** Send All Notes Off on every member channel and reset channel pool. */
  panic(): void {
    if (this.output) {
      const channels = this.buildChannelPool();
      for (const ch of channels) {
        this.output.send([0xB0 | (ch - 1), 123, 0]); // CC123 All Notes Off
      }
    }
    this.voiceByNoteId.clear();
    this.freeChannels = this.buildChannelPool();
    this.notify();
  }

  dispose(): void {
    this.panic();
    this.listeners.clear();
    this.output = null;
    this.access = null;
  }
```

## FIFO Channel Allocator

The MIDI spec allows any voice-allocation strategy; this implementation uses a simple FIFO queue. When a note starts, `allocate()` shifts the front channel off the queue. When a note ends, `release()` pushes its channel to the back. This means the channel that has been idle the longest is always reused next — giving physical synths the most recovery time before being assigned a new note.

`buildChannelPool()` derives the member channel numbers from the current zone settings. For the Lower Zone (master = 1) the members are channels 2 through `1 + memberChannelCount`, capped at 16. For the Upper Zone (master = 16) the members are channels `16 − memberChannelCount` through 15, floored at 1. `resetChannelPool()` delegates to `panic()` rather than just rebuilding the queue, because any in-flight notes on the old channels must be silenced first.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Private: channel pool (FIFO) ────────────────────────────────────────

  /** Build the full set of member channels based on current settings. */
  private buildChannelPool(): number[] {
    const channels: number[] = [];
    if (this.settings.masterChannel === 1) {
      // Lower zone: members = 2 .. (1 + memberChannelCount), capped at 16
      const end = Math.min(1 + this.settings.memberChannelCount, 16);
      for (let ch = 2; ch <= end; ch++) channels.push(ch);
    } else {
      // Upper zone: members = (16 - memberChannelCount) .. 15, floored at 1
      const start = Math.max(16 - this.settings.memberChannelCount, 1);
      for (let ch = start; ch <= 15; ch++) channels.push(ch);
    }
    return channels;
  }

  /** Reset channel allocation — panics first to avoid orphaned notes. */
  private resetChannelPool(): void {
    this.panic();
  }

  private allocate(): number | null {
    if (this.freeChannels.length === 0) return null;
    const ch = this.freeChannels.shift();
    if (ch === undefined) return null;
    return ch;
  }

  private release(noteId: string): void {
    const voice = this.voiceByNoteId.get(noteId);
    if (!voice) return;
    this.freeChannels.push(voice.channel);
    this.voiceByNoteId.delete(noteId);
  }

  private notify(): void {
    const voices = Array.from(this.voiceByNoteId.values());
    for (const listener of this.listeners) {
      listener(voices);
    }
  }
```

## Pressure Routing

The MPE spec leaves pressure routing open to the implementer. Channel Aftertouch (`0xDn`) is a single data byte and is supported by virtually every synth; it is the default here. Poly Aftertouch (`0xAn`) is per-note (requiring the note number as the first data byte) but many older synths ignore it entirely. CC mode (`0xBn`) routes pressure to an arbitrary CC number — useful for synths that expose pressure only through their modulation matrix (e.g. many software instruments that map CC 11 Expression to filter cutoff).

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Private: pressure routing ────────────────────────────────────────────

  /** Send pressure using the configured mode (channel aftertouch, poly AT, or CC). */
  private sendPressureRaw(chIdx: number, midiNote: number, pressure: number): void {
    if (!this.output) return;
    const val = Math.round(pressure * 127);
    switch (this.settings.pressureMode) {
      case 'channel-at':
        this.output.send([0xD0 | chIdx, val]);
        break;
      case 'poly-at':
        this.output.send([0xA0 | chIdx, midiNote, val]);
        break;
      case 'cc':
        this.output.send([0xB0 | chIdx, this.settings.pressureCC, val]);
        break;
    }
  }
```

## Zone Configuration: MCM and Pitch Bend Sensitivity

The MPE Configuration Message (MCM) is an RPN (Registered Parameter Number) sequence that tells the receiving synth how many member channels belong to a zone. RPN 0x00/0x06 (MSB 0, LSB 6) is the MCM; its Data Entry value is the member channel count. Sending count = 0 to the opposite zone master disables that zone, preventing the synth from treating both zones as active simultaneously.

Pitch Bend Sensitivity (RPN 0x00/0x00) must be sent on the manager channel and on each member channel individually, because some synths (notably many hardware MPE devices) do not propagate the manager-channel sensitivity to members automatically. Sending it per-member guarantees correct operation across all conformant receivers.

Both RPNs are terminated with a null RPN (CC 101 = 127, CC 100 = 127) to prevent accidental data entry from being interpreted as further RPN changes.

``` {.typescript file=_generated/lib/mpe-service.ts}

  // ─── Private: zone configuration ──────────────────────────────────────────

  /** Send MCM (MPE Configuration Message) + Pitch Bend Sensitivity. */
  private sendMCM(): void {
    if (!this.output) return;

    const managerIdx = this.settings.masterChannel - 1; // 0-indexed
    const status = 0xB0 | managerIdx;

    // ── Zone MCM: RPN 0x00/0x06 = MPE Configuration ────────────────────
    this.output.send([status, 101, 0]);    // CC101 = 0 (RPN MSB)
    this.output.send([status, 100, 6]);    // CC100 = 6 (RPN LSB = MCM)
    this.output.send([status, 6, this.settings.memberChannelCount]); // member count
    this.output.send([status, 101, 127]);  // null RPN
    this.output.send([status, 100, 127]);

    // ── Disable opposite zone ──────────────────────────────────────────
    const otherZoneIdx = this.settings.masterChannel === 1 ? 15 : 0;
    const otherStatus = 0xB0 | otherZoneIdx;
    this.output.send([otherStatus, 101, 0]);
    this.output.send([otherStatus, 100, 6]);
    this.output.send([otherStatus, 6, 0]);
    this.output.send([otherStatus, 101, 127]);
    this.output.send([otherStatus, 100, 127]);

    // ── Pitch Bend Sensitivity (RPN 0x00/0x00) ────────────────────────
    // Send on manager channel to set default for all members
    this.sendPitchBendSensitivity(managerIdx, this.settings.pitchBendRange);

    // Also send per-member-channel for synths that don't propagate from manager
    const memberChannels = this.buildChannelPool();
    for (const ch of memberChannels) {
      this.sendPitchBendSensitivity(ch - 1, this.settings.pitchBendRange);
    }
  }

  /** Send RPN 0x00/0x00 (Pitch Bend Sensitivity) on a 0-indexed channel. */
  private sendPitchBendSensitivity(chIdx: number, semitones: number): void {
    if (!this.output) return;
    const status = 0xB0 | chIdx;
    this.output.send([status, 101, 0]);              // RPN MSB = 0
    this.output.send([status, 100, 0]);              // RPN LSB = 0
    this.output.send([status, 6, semitones & 0x7F]); // Data Entry MSB = semitones
    this.output.send([status, 38, 0]);               // Data Entry LSB = 0 cents
    this.output.send([status, 101, 127]);            // null RPN
    this.output.send([status, 100, 127]);
  }
}
```
