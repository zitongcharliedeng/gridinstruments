/**
 * Web MIDI API input handler — with per-device management and channel modes.
 *
 * Channel modes:
 *   omni       — listen to all channels, note identity = (note number)  [default]
 *   chPerNote  — MPE style: channel = note slot, note identity = channel
 *                (allows per-note pitch bend / expression)
 *   chPerRow   — channel N maps to keyboard row N on the isomorphic grid
 *                (Striso / Axis-64 style — each physical row sends on a different channel)
 */

export type MidiNoteCallback = (note: number, velocity: number, channel: number) => void;
export type MidiStatusCallback = (devices: MidiDeviceInfo[]) => void;

export type MidiChannelMode = 'omni' | 'chPerNote' | 'chPerRow';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  enabled: boolean;
  connected: boolean;
}

export class MidiInput {
  private access: MIDIAccess | null = null;

  // Map of MIDIInput id → the raw input + our enabled flag
  private inputs: Map<string, { input: MIDIInput; enabled: boolean }> = new Map();

  // Callbacks
  private noteOnCallbacks: MidiNoteCallback[] = [];
  private noteOffCallbacks: MidiNoteCallback[] = [];
  private statusCallbacks: MidiStatusCallback[] = [];

  // Settings
  private channelMode: MidiChannelMode = 'omni';

  // Public status
  private _available = false;

  get isAvailable() { return this._available; }

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

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      this._available = false;
      this.notifyStatus();
      return;
    }
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this._available = true;
      this.access.onstatechange = () => this.rescan();
      this.rescan();
    } catch {
      this._available = false;
      this.notifyStatus();
    }
  }

  private rescan(): void {
    if (!this.access) return;

    const currentIds = new Set(this.access.inputs.keys());

    // Detach listeners from disappeared devices
    for (const [id, { input }] of this.inputs) {
      if (!currentIds.has(id)) {
        input.onmidimessage = null;
        this.inputs.delete(id);
      }
    }

    // Attach listeners to newly appeared devices (preserve enabled state)
    for (const [id, input] of this.access.inputs) {
      if (!this.inputs.has(id)) {
        // New device: enabled by default
        input.onmidimessage = (e) => this.handleMessage(id, e);
        this.inputs.set(id, { input, enabled: true });
      } else {
        // Existing device: re-attach listener in case it was disrupted
        const entry = this.inputs.get(id)!;
        entry.input.onmidimessage = entry.enabled
          ? (e) => this.handleMessage(id, e)
          : null;
      }
    }

    this.notifyStatus();
  }

  // ─── Per-device enable/disable ────────────────────────────────────────────

  /** Toggle a specific device on or off (to prevent loopback doubling etc.) */
  setDeviceEnabled(id: string, enabled: boolean): void {
    const entry = this.inputs.get(id);
    if (!entry) return;
    entry.enabled = enabled;
    entry.input.onmidimessage = enabled
      ? (e) => this.handleMessage(id, e)
      : null;
    this.notifyStatus();
  }

  /** Get list of all known devices with their current state */
  getDevices(): MidiDeviceInfo[] {
    return [...this.inputs.entries()].map(([id, { input, enabled }]) => ({
      id,
      name: input.name ?? 'Unknown device',
      manufacturer: input.manufacturer ?? '',
      enabled,
      connected: input.state === 'connected',
    }));
  }

  // ─── Channel mode ─────────────────────────────────────────────────────────

  setChannelMode(mode: MidiChannelMode): void {
    this.channelMode = mode;
  }

  getChannelMode(): MidiChannelMode {
    return this.channelMode;
  }

  // ─── Message handling ─────────────────────────────────────────────────────

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

    // Channel mode filtering
    if (this.channelMode === 'omni') {
      // All channels pass through
    } else if (this.channelMode === 'chPerNote') {
      // Pass through as-is — consumer uses channel as note slot identity
      // (no filtering here; caller responsible for MPE-style tracking)
    } else if (this.channelMode === 'chPerRow') {
      // Channel N = keyboard row N (1–4 for ZXCV/ASDF/QWER/digits rows)
      // Notes outside channel 1–4 are ignored in chPerRow mode
      if (channel < 1 || channel > 4) return;
    }

    if (type === 0x90 && velocity > 0) {
      for (const cb of this.noteOnCallbacks) cb(note, velocity, channel);
    } else if (type === 0x80 || (type === 0x90 && velocity === 0)) {
      for (const cb of this.noteOffCallbacks) cb(note, velocity, channel);
    }
  }

  // ─── Callbacks ────────────────────────────────────────────────────────────

  onNoteOn(cb: MidiNoteCallback): void { this.noteOnCallbacks.push(cb); }
  onNoteOff(cb: MidiNoteCallback): void { this.noteOffCallbacks.push(cb); }

  /** Called whenever device list or enabled state changes */
  onStatusChange(cb: MidiStatusCallback): void { this.statusCallbacks.push(cb); }

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
