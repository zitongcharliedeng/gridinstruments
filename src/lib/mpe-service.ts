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

// ─── Service ────────────────────────────────────────────────────────────────

export class MPEService {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private settings: MPESettings;
  private freeChannels: number[];
  private voiceByNoteId: Map<string, MPEVoice> = new Map();
  private listeners: Set<MPEListener> = new Set();
  private _enabled = false;

  constructor(settings?: Partial<MPESettings>) {
    this.settings = { ...DEFAULT_MPE_SETTINGS, ...settings };
    this.freeChannels = this.buildChannelPool();
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (!navigator.requestMIDIAccess) return;
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

  // ─── Subscription ─────────────────────────────────────────────────────────

  subscribe(listener: MPEListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  activeVoices(): MPEVoice[] {
    return Array.from(this.voiceByNoteId.values()).filter(v => v.state === 'active');
  }

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
    return this.freeChannels.shift()!;
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
