/**
 * MPE (MIDI Polyphonic Expression) output — sends MPE messages to external MIDI outputs.
 *
 * Lower zone only: manager channel = 1, member channels = 2–16 (15 voices).
 * FIFO channel allocator — oldest freed channel is reused first.
 *
 * Uses the Web MIDI API MIDIOutput directly (no npm deps).
 */

export class MpeOutput {
  private access: MIDIAccess | null = null;
  private output: MIDIOutput | null = null;
  private freeChannels: number[];              // FIFO queue of available member channels (1-indexed: 2–16)
  private channelByNoteId: Map<string, number> = new Map();
  private _enabled = false;
  private _bendRange = 48;                     // pitch bend range in semitones

  constructor() {
    // Initialize all 15 member channels as free (channels 2–16)
    this.freeChannels = [];
    for (let ch = 2; ch <= 16; ch++) this.freeChannels.push(ch);
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

  // ─── Output management ─────────────────────────────────────────────────────

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

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    if (!enabled) this.allNotesOff();
  }

  isEnabled(): boolean {
    return this._enabled;
  }

  setBendRange(semitones: number): void {
    this._bendRange = Math.max(1, Math.min(96, semitones));
  }

  // ─── Channel allocation (FIFO) ────────────────────────────────────────────

  private allocate(noteId: string): number | null {
    if (this.freeChannels.length === 0) return null;
    const ch = this.freeChannels.shift()!;
    this.channelByNoteId.set(noteId, ch);
    return ch;
  }

  private release(noteId: string): void {
    const ch = this.channelByNoteId.get(noteId);
    if (ch === undefined) return;
    this.channelByNoteId.delete(noteId);
    this.freeChannels.push(ch);
  }

  // ─── MPE messages ─────────────────────────────────────────────────────────

  noteOn(noteId: string, midiNote: number, velocity: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.allocate(noteId);
    if (ch === null) return;

    const chIdx = ch - 1; // 0-indexed for status byte

    // Reset per-note state before note-on
    this.output.send([0xE0 | chIdx, 0x00, 0x40]);          // pitch bend center
    this.output.send([0xB0 | chIdx, 74, 64]);               // CC74 center (slide)
    this.output.send([0xD0 | chIdx, 0]);                     // channel pressure 0
    this.output.send([0x90 | chIdx, midiNote, Math.round(velocity * 127)]); // note on
  }

  noteOff(noteId: string, midiNote: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.channelByNoteId.get(noteId);
    if (ch === undefined) return;

    const chIdx = ch - 1;
    this.output.send([0x80 | chIdx, midiNote, 64]);         // note off, release velocity 64
    this.release(noteId);
  }

  sendPressure(noteId: string, pressure: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.channelByNoteId.get(noteId);
    if (ch === undefined) return;

    const chIdx = ch - 1;
    this.output.send([0xD0 | chIdx, Math.round(pressure * 127)]);
  }

  sendSlide(noteId: string, value: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.channelByNoteId.get(noteId);
    if (ch === undefined) return;

    const chIdx = ch - 1;
    this.output.send([0xB0 | chIdx, 74, Math.round(value * 127)]);
  }

  sendPitchBend(noteId: string, semitones: number): void {
    if (!this._enabled || !this.output) return;
    const ch = this.channelByNoteId.get(noteId);
    if (ch === undefined) return;

    const chIdx = ch - 1;
    const normalized = semitones / this._bendRange;                 // -1..+1
    const uint14 = Math.round((normalized + 1) * 8191.5);          // 0..16383
    const lsb = uint14 & 0x7F;
    const msb = (uint14 >> 7) & 0x7F;
    this.output.send([0xE0 | chIdx, lsb, msb]);
  }

  // ─── Zone configuration ───────────────────────────────────────────────────

  /** Send MCM (MPE Configuration Message) + Pitch Bend Sensitivity for lower zone. */
  sendMCM(): void {
    if (!this.output) return;
    // ── Lower zone MCM: manager = ch1 (index 0), 15 member channels ─────
    // RPN 0x00/0x06 = MPE Configuration, data entry = member count
    this.output.send([0xB0, 101, 0]);    // CC101 = 0 (RPN MSB)
    this.output.send([0xB0, 100, 6]);    // CC100 = 6 (RPN LSB = MCM)
    this.output.send([0xB0, 6, 15]);     // CC6 = 15 (15 member channels)
    this.output.send([0xB0, 101, 127]);  // null RPN
    this.output.send([0xB0, 100, 127]);

    // ── Disable upper zone: ch16 (index 15), member count = 0 ───────────
    this.output.send([0xBF, 101, 0]);
    this.output.send([0xBF, 100, 6]);
    this.output.send([0xBF, 6, 0]);
    this.output.send([0xBF, 101, 127]);
    this.output.send([0xBF, 100, 127]);

    // ── Pitch Bend Sensitivity (RPN 0x00/0x00) ─────────────────────────
    // Per MPE spec: send on manager channel to set default for all members.
    // Value = bend range in semitones. 48 = ±24 semitones (MPE standard).
    // Without this, synths default to ±2 semitones (standard MIDI default),
    // making our pitch bends sound completely wrong.
    this.sendPitchBendSensitivity(0, this._bendRange);  // ch1 (manager)

    // Also send per-member-channel for synths that don't propagate from manager
    for (let ch = 1; ch <= 15; ch++) {
      this.sendPitchBendSensitivity(ch, this._bendRange);  // ch2–16 (members)
    }
  }

  /** Send RPN 0x00/0x00 (Pitch Bend Sensitivity) on a 0-indexed channel. */
  private sendPitchBendSensitivity(chIdx: number, semitones: number): void {
    if (!this.output) return;
    const status = 0xB0 | chIdx;
    this.output.send([status, 101, 0]);              // RPN MSB = 0
    this.output.send([status, 100, 0]);              // RPN LSB = 0 (Pitch Bend Sensitivity)
    this.output.send([status, 6, semitones & 0x7F]); // Data Entry MSB = semitones
    this.output.send([status, 38, 0]);               // Data Entry LSB = 0 cents
    this.output.send([status, 101, 127]);            // null RPN
    this.output.send([status, 100, 127]);
  }

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  allNotesOff(): void {
    if (this.output) {
      // Send note-off on all member channels via CC123 (All Notes Off)
      for (let ch = 2; ch <= 16; ch++) {
        this.output.send([0xB0 | (ch - 1), 123, 0]);
      }
    }
    this.channelByNoteId.clear();
    this.freeChannels = [];
    for (let ch = 2; ch <= 16; ch++) this.freeChannels.push(ch);
  }

  dispose(): void {
    this.allNotesOff();
    this.output = null;
    this.access = null;
  }
}
