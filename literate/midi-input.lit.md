# MIDI Input

Web MIDI API input handler — per-device management, channel modes, and expression callbacks.

Channel modes:
- `omni` — listen to all channels (default)
- `chPerNote` — MPE style: channel = note slot identity
- `chPerRow` — channel N maps to keyboard row N (Striso / Axis-64 style)

## Exported Types

Four exported types form the public contract. `MidiNoteCallback` carries the note number, velocity, 1-indexed channel, and source device ID. `MidiExpressionCallback` is used for pitch bend, CC74 slide, and channel pressure — all normalized to a common range. `MidiChannelMode` is a string union of the three supported routing strategies.

``` {.typescript file=_generated/lib/midi-input.ts}
export type MidiNoteCallback = (note: number, velocity: number, channel: number, deviceId: string) => void;
export type MidiStatusCallback = (devices: MidiDeviceInfo[]) => void;
export type MidiExpressionCallback = (channel: number, value: number, deviceId: string) => void;

export type MidiChannelMode = 'omni' | 'chPerNote' | 'chPerRow';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  enabled: boolean;
  connected: boolean;
}
```

## Class Declaration and Fields

`MidiInput` wraps a single `MIDIAccess` handle. Each physical input port is stored in the `inputs` map keyed by port ID, paired with the user-facing `enabled` flag. Six callback arrays cover the full expression surface: note on/off, device status, pitch bend, CC74 slide, and channel pressure.

``` {.typescript file=_generated/lib/midi-input.ts}
export class MidiInput {
  private access: MIDIAccess | null = null;

  private inputs = new Map<string, { input: MIDIInput; enabled: boolean }>();

  private noteOnCallbacks: MidiNoteCallback[] = [];
  private noteOffCallbacks: MidiNoteCallback[] = [];
  private statusCallbacks: MidiStatusCallback[] = [];
  private pitchBendCallbacks: MidiExpressionCallback[] = [];
  private slideCallbacks: MidiExpressionCallback[] = [];
  private pressureCallbacks: MidiExpressionCallback[] = [];

  private channelMode: MidiChannelMode = 'omni';

  private _available = false;

  get isAvailable(): boolean { return this._available; }

  get overallStatus(): 'unavailable' | 'no-devices' | 'connected' {
    if (!this._available) return 'unavailable';
    const connected = [...this.inputs.values()].filter(d => d.enabled);
    return connected.length > 0 ? 'connected' : 'no-devices';
  }

  get connectedDeviceName(): string {
    return [...this.inputs.values()]
      .filter(d => d.enabled)
      .map(d => d.input.name ?? 'Unknown')
      .join(', ');
  }
```

## Initialization

`init` requests MIDI access with `sysex: false`. If the browser does not support the Web MIDI API, or the user denies permission, `_available` is set to false and status callbacks are notified. On success, `onstatechange` is wired to `rescan` so hot-plug events (USB connect/disconnect) are handled automatically.

``` {.typescript file=_generated/lib/midi-input.ts}
  async init(): Promise<void> {
    if (!('requestMIDIAccess' in navigator)) {
      this._available = false;
      this.notifyStatus();
      return;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this._available = true;
      this.access.onstatechange = () => { this.rescan(); };
      this.rescan();
    } catch {
      this._available = false;
      this.notifyStatus();
    }
  }
```

## Device Rescan

`rescan` reconciles the live `MIDIAccess.inputs` map with the internal `inputs` map. Disappeared devices have their listeners removed and are deleted. Newly appeared devices get a message handler and default to enabled. Existing devices have their listeners re-attached (the browser may have torn them down on a USB reconnect), preserving the user's enabled/disabled choice.

``` {.typescript file=_generated/lib/midi-input.ts}
  private rescan(): void {
    if (!this.access) return;

    const currentIds = new Set(this.access.inputs.keys());

    for (const [id, { input }] of this.inputs) {
      if (!currentIds.has(id)) {
        input.onmidimessage = null;
        this.inputs.delete(id);
      }
    }

    for (const [id, input] of this.access.inputs) {
      if (!this.inputs.has(id)) {
        input.onmidimessage = (e) => { this.handleMessage(id, e); };
        this.inputs.set(id, { input, enabled: true });
      } else {
        const entry = this.inputs.get(id);
        if (!entry) continue;
        entry.input.onmidimessage = entry.enabled
          ? (e) => { this.handleMessage(id, e); }
          : null;
      }
    }

    this.notifyStatus();
  }
```

## Per-Device Enable/Disable

`setDeviceEnabled` lets the user mute individual devices — useful when a software MIDI loopback would otherwise double-trigger notes. `getDevices` returns a snapshot of all known devices for rendering a settings UI.

``` {.typescript file=_generated/lib/midi-input.ts}
  setDeviceEnabled(id: string, enabled: boolean): void {
    const entry = this.inputs.get(id);
    if (!entry) return;
    entry.enabled = enabled;
    entry.input.onmidimessage = enabled
      ? (e) => { this.handleMessage(id, e); }
      : null;
    this.notifyStatus();
  }

  getDevices(): MidiDeviceInfo[] {
    return [...this.inputs.entries()].map(([id, { input, enabled }]) => ({
      id,
      name: input.name ?? 'Unknown device',
      manufacturer: input.manufacturer ?? '',
      enabled,
      connected: input.state === 'connected',
    }));
  }
```

## Channel Mode

The channel mode controls how multi-channel MIDI data is routed. In `omni` and `chPerNote` modes all channels pass through; the distinction is semantic — callers use the channel field differently. In `chPerRow` mode only channels 1–4 are passed, mapping to the four physical keyboard rows.

``` {.typescript file=_generated/lib/midi-input.ts}
  setChannelMode(mode: MidiChannelMode): void {
    this.channelMode = mode;
  }

  getChannelMode(): MidiChannelMode {
    return this.channelMode;
  }
```

## Message Handling

`handleMessage` decodes the raw MIDI status byte into type and channel, applies channel-mode filtering, then dispatches to the appropriate callback arrays. Pitch bend uses the standard 14-bit encoding (LSB in byte 1, MSB in byte 2) normalized to −1…+1. CC74 (slide/timbre), channel pressure (0xD0), and polyphonic aftertouch (0xA0) are normalized to 0…1. Note-on with velocity 0 is treated as note-off per the MIDI spec.

Polyphonic Aftertouch (0xA0) is the per-note pressure message used by MPE instruments (LinnStrument, Seaboard, etc.). It carries the note number in byte 1 and the pressure value in byte 2. Channel Aftertouch (0xD0) is a channel-wide pressure message with only one data byte. Both are routed to `pressureCallbacks` because in MPE mode each note is on its own channel, making channel aftertouch functionally per-note. Supporting both ensures compatibility with instruments that send either message type.

``` {.typescript file=_generated/lib/midi-input.ts}
  private handleMessage(deviceId: string, event: MIDIMessageEvent): void {
    const entry = this.inputs.get(deviceId);
    if (!entry?.enabled) return;

    const data = event.data;
    if (!data || data.length < 2) return;

    const statusByte = data[0];
    const type = statusByte & 0xF0;
    const channel = (statusByte & 0x0F) + 1; // 1-indexed
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    if (this.channelMode === 'omni') {
    } else if (this.channelMode === 'chPerNote') {
    } else {
      if (channel < 1 || channel > 4) return;
    }

    if (type === 0x90 && velocity > 0) {
      for (const cb of this.noteOnCallbacks) cb(note, velocity, channel, deviceId);
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      for (const cb of this.noteOffCallbacks) cb(note, velocity, channel, deviceId);
    } else if (type === 0xE0) {
      const raw = (data[2] << 7) | data[1];
      const normalized = raw / 8191.5 - 1; // range -1..+1
      for (const cb of this.pitchBendCallbacks) cb(channel, normalized, deviceId);
    } else if (type === 0xB0 && note === 74) {
      const normalized = velocity / 127;
      for (const cb of this.slideCallbacks) cb(channel, normalized, deviceId);
    } else if (type === 0xA0) {
      if (data.length < 3) return;
      const normalized = data[2] / 127;
      for (const cb of this.pressureCallbacks) cb(channel, normalized, deviceId);
    } else if (type === 0xD0) {
      const normalized = data[1] / 127;
      for (const cb of this.pressureCallbacks) cb(channel, normalized, deviceId);
    }
  }
```

## Callback Registration and Teardown

Registration methods follow a simple push-onto-array pattern. Removal uses `filter` identity comparison, which requires callers to hold a stable function reference. `dispose` detaches all `onmidimessage` handlers and clears the inputs map — call this when the component unmounts to prevent leaks.

``` {.typescript file=_generated/lib/midi-input.ts}
  onNoteOn(cb: MidiNoteCallback): void { this.noteOnCallbacks.push(cb); }
  onNoteOff(cb: MidiNoteCallback): void { this.noteOffCallbacks.push(cb); }

  onStatusChange(cb: MidiStatusCallback): void { this.statusCallbacks.push(cb); }

  onPitchBend(cb: MidiExpressionCallback): void { this.pitchBendCallbacks.push(cb); }
  onSlide(cb: MidiExpressionCallback): void { this.slideCallbacks.push(cb); }
  onPressure(cb: MidiExpressionCallback): void { this.pressureCallbacks.push(cb); }

  removeNoteOn(cb: MidiNoteCallback): void {
    this.noteOnCallbacks = this.noteOnCallbacks.filter(c => c !== cb);
  }
  removeNoteOff(cb: MidiNoteCallback): void {
    this.noteOffCallbacks = this.noteOffCallbacks.filter(c => c !== cb);
  }
  removeStatusChange(cb: MidiStatusCallback): void {
    this.statusCallbacks = this.statusCallbacks.filter(c => c !== cb);
  }

  private notifyStatus(): void {
    const devices = this.getDevices();
    for (const cb of this.statusCallbacks) cb(devices);
  }

  dispose(): void {
    for (const { input } of this.inputs.values()) {
      input.onmidimessage = null;
    }
    this.inputs.clear();
  }
}
```
