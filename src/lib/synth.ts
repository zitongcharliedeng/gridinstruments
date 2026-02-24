/**
 * Low-latency Web Audio API Synthesizer
 * 
 * Polyphonic oscillator-based synth with envelope, EQ, and dynamic tuning
 * Based on original WickiSynth by Piers Titus van der Torren
 * 
 * Key features:
 * - Live tuning changes (setGenerator updates all playing notes)
 * - Volume control with smooth transitions
 * - EQ filter for tone shaping (treble/bass boost)
 * - Multiple waveforms
 */

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface Voice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  coordX: number;  // Store coordinates for live tuning updates
  coordY: number;
  octaveOffset: number;
  vibratoGainNode: GainNode;

}

/**
 * Reference tuning markers for the continuous slider
 * These are just labels - the slider is continuous from ~650 to ~750+ cents
 * Users can set ANY value, these are just common reference points
 */
export const TUNING_MARKERS: Array<{ id: string; name: string; fifth: number; description: string }> = [
  { id: 'tet5', name: '5', fifth: 720, description: '5-TET · Indonesian slendro' },
  { id: 'tet17', name: '17', fifth: 705.88, description: '17-TET · 17 equal divisions' },
  { id: 'pythagorean', name: 'Pyth', fifth: 701.96, description: 'Pythagorean · Pure fifths (3:2)' },
  { id: 'tet53', name: '53', fifth: 701.89, description: '53-TET · Turkish/Arabic comma' },
  { id: 'tet12', name: '12', fifth: 700, description: '12-TET · Western standard' },
  { id: 'tet31', name: '31', fifth: 696.77, description: '31-TET · 31 equal divisions' },
  { id: 'meantone', name: '¼MT', fifth: 696.58, description: '1/4 Meantone · Pure major thirds' },
  { id: 'tet19', name: '19', fifth: 694.74, description: '19-TET · 19 equal divisions' },
  { id: 'tet7', name: '7', fifth: 685.71, description: '7-TET · Thai, Mandinka balafon' },
];

// Slider range — tightly covers all TET presets (7-TET=685.71¢ to 5-TET=720¢)
export const FIFTH_MIN = 683;  // Just below 7-TET (685.71¢)
export const FIFTH_MAX = 722;  // Just above 5-TET (720¢)
export const FIFTH_DEFAULT = 700; // 12-TET

/**
 * Find the nearest tuning marker to a given fifth value
 * Returns the marker and how far away it is in cents
 */
export function findNearestMarker(fifthCents: number): { marker: typeof TUNING_MARKERS[0]; distance: number } {
  let nearest = TUNING_MARKERS[0];
  let minDistance = Math.abs(fifthCents - nearest.fifth);
  
  for (const marker of TUNING_MARKERS) {
    const distance = Math.abs(fifthCents - marker.fifth);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = marker;
    }
  }
  
  return { marker: nearest, distance: minDistance };
}

export class Synth {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private eqFilter: BiquadFilterNode | null = null;
  private voices: Map<string, Voice> = new Map();
  private sustainedVoices: Set<string> = new Set();
  private sustain: boolean = false;
  private waveform: WaveformType = 'sawtooth';
  
  // Vibrato (LFO modulating pitch)
  // Shared LFO for all voices, per-voice gain nodes for individual control
  private vibratoLFO: OscillatorNode | null = null;
  private _vibratoEnabled: boolean = false;
  private vibratoRate: number = 5; // Hz
  private vibratoDepth: number = 10; // cents
  
  // Tuning parameters (can be changed live!)
  private generator: [number, number] = [700, 1200]; // [fifth, octave] in cents
  private baseFreq: number = 293.66; // D4 base frequency
  private _d4Hz: number = 293.66; // D4 reference frequency
  
  // Envelope parameters
  private attackTime: number = 0.01;
  private releaseTime: number = 0.1;
  private _masterVolume: number = 0.3;
  
  // EQ parameter (-1 = bass boost, 0 = flat, +1 = treble boost)
  private _eqValue: number = 0;
  
  constructor() {
    // AudioContext will be created on first user interaction
  }
  
  async init(): Promise<void> {
    if (this.context) return;
    
    this.context = new AudioContext({ latencyHint: 'interactive' });
    
    // Create EQ filter (highshelf for treble control)
    this.eqFilter = this.context.createBiquadFilter();
    this.eqFilter.type = 'highshelf';
    this.eqFilter.frequency.value = 3000; // 3kHz crossover
    this.eqFilter.gain.value = 0; // Flat by default
    
    // Create master gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this._masterVolume;
    
    // Connect: oscillators -> masterGain -> eqFilter -> destination
    this.masterGain.connect(this.eqFilter);
    this.eqFilter.connect(this.context.destination);
    
    // Resume context if suspended (required by browsers)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }
  
  isInitialized(): boolean {
    return this.context !== null && this.context.state === 'running';
  }
  
  // === Waveform ===
  
  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
    // Update existing voices
    for (const voice of this.voices.values()) {
      voice.oscillator.type = waveform;
    }
  }
  
  getWaveform(): WaveformType {
    return this.waveform;
  }
  
  // === Tuning (Generator) ===
  
  /**
   * Set the tuning generator [fifth, octave] in cents
   * This updates ALL currently playing notes in real-time!
   */
  setGenerator(generator: [number, number]): void {
    this.generator = generator;
    
    // Update baseFreq (already set to D4 Hz, no recalculation needed)
    this.recalculateBaseFreq();
    
    // Update all playing voices with new frequencies
    for (const voice of this.voices.values()) {
      const newFreq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
      voice.oscillator.frequency.value = newFreq;
    }
  }
  
  getGenerator(): [number, number] {
    return [...this.generator] as [number, number];
  }
  
  /**
   * Set just the fifth size (keeping octave at 1200)
   */
  setFifth(cents: number): void {
    this.setGenerator([cents, 1200]);
  }
  
  getFifth(): number {
    return this.generator[0];
  }
  
  /**
   * Jump to a tuning marker (convenience method)
   */
  setTuningMarker(markerId: string): void {
    const marker = TUNING_MARKERS.find(m => m.id === markerId);
    if (marker) {
      this.setFifth(marker.fifth);
    }
  }
  
  // === D4 Reference Frequency ===
  
  /**
   * Set D4 reference frequency (default 293.66Hz)
   * This updates baseFreq and all playing notes
   * 
   * D4 is the center note of the DCompose layout (coordinate [0,0])
   */
  setD4Hz(hz: number): void {
    this._d4Hz = Math.max(100, Math.min(2000, hz));
    this.baseFreq = this._d4Hz;
    
    // Update all playing voices with new frequencies
    for (const voice of this.voices.values()) {
      const newFreq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
      voice.oscillator.frequency.value = newFreq;
    }
  }
  
  getD4Hz(): number {
    return this._d4Hz;
  }
  
  /**
   * Recalculate base frequency (currently unused - will be updated in TASK 12)
   * Kept for future when we implement proper frequency calculations
   */
  private recalculateBaseFreq(): void {
    // TODO: Update this in TASK 12 to properly handle D4-based calculations
    this.baseFreq = this._d4Hz;
  }
  
  // === Volume ===
  
  setMasterVolume(volume: number): void {
    this._masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.context) {
      // Smooth transition to avoid clicks
      this.masterGain.gain.setTargetAtTime(
        this._masterVolume,
        this.context.currentTime,
        0.01
      );
    }
  }
  
  getMasterVolume(): number {
    return this._masterVolume;
  }
  
  // === EQ/Tone ===
  
  /**
   * Set EQ value: -1 = bass boost, 0 = flat, +1 = treble boost
   */
  setEQ(value: number): void {
    this._eqValue = Math.max(-1, Math.min(1, value));
    if (this.eqFilter && this.context) {
      // Map -1..+1 to -12dB..+12dB
      const gainDb = this._eqValue * 12;
      this.eqFilter.gain.setTargetAtTime(
        gainDb,
        this.context.currentTime,
        0.01
      );
    }
  }
  
  getEQ(): number {
    return this._eqValue;
  }
  
  // === Sustain ===
  
  setSustain(enabled: boolean): void {
    this.sustain = enabled;
    
    // If sustain is turned off, release all sustained notes
    if (!enabled) {
      for (const noteId of this.sustainedVoices) {
        this.stopNote(noteId, true);
      }
      this.sustainedVoices.clear();
    }
  }
  
  getSustain(): boolean {
    return this.sustain;
  }
  
  // === Vibrato ===
  
  /**
   * Initialize the shared vibrato LFO (called once on first use)
   */
  private ensureVibratoLFO(): void {
    if (!this.context || this.vibratoLFO) return;
    
    this.vibratoLFO = this.context.createOscillator();
    this.vibratoLFO.type = 'sine';
    this.vibratoLFO.frequency.value = this.vibratoRate;
    this.vibratoLFO.start();
  }
  
  /**
   * Enable/disable vibrato (pitch modulation) on ALL currently-playing voices in real-time.
   * When enabled: connects shared LFO → per-voice gain → oscillator.frequency for every voice.
   * When disabled: zeros gain and disconnects LFO from every voice.
   */
  setVibrato(enabled: boolean): void {
    if (!this.context) return;
    this._vibratoEnabled = enabled;
    const now = this.context.currentTime;
    
    if (enabled) {
      this.ensureVibratoLFO();
      for (const voice of this.voices.values()) {
        const freq = this.getFrequency(voice.coordX, voice.coordY, voice.octaveOffset);
        const depthHz = freq * (this.vibratoDepth / 1200);
        voice.vibratoGainNode.gain.setValueAtTime(depthHz, now);
        this.vibratoLFO!.connect(voice.vibratoGainNode);
        voice.vibratoGainNode.connect(voice.oscillator.frequency);
      }
    } else {
      for (const voice of this.voices.values()) {
        voice.vibratoGainNode.gain.setValueAtTime(0, now);
        try { this.vibratoLFO?.disconnect(voice.vibratoGainNode); } catch {}
      }
    }
  }
  
  getVibrato(): boolean {
    return this._vibratoEnabled;
  }
  
  // === Note Playing ===
  
  /**
   * Calculate frequency from isomorphic coordinates
   * ALL frequencies are relative to D4 (baseFreq = _d4Hz)
   * - Doubling D4 Hz = up 1 octave (multiply by 2)
   * - Halving D4 Hz = down 1 octave (divide by 2)
   * - Formula: freq = D4 * 2^(cents/1200)
   */
  private getFrequency(x: number, y: number, octaveOffset: number = 0): number {
    const cents = y * this.generator[1] + x * this.generator[0] + octaveOffset * 1200;
    return this.baseFreq * Math.pow(2, cents / 1200);
  }
  
  /**
   * Play a note
   * @param noteId Unique identifier for this note instance
   * @param x Circle of fifths position
   * @param y Octave offset
   * @param octaveOffset Global octave offset
   */
  playNote(noteId: string, x: number, y: number, octaveOffset: number = 0): void {
    if (!this.context || !this.masterGain) return;
    if (this.voices.has(noteId)) return;
    const frequency = this.getFrequency(x, y, octaveOffset);
    // Create oscillator
    const oscillator = this.context.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.value = frequency;
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    oscillator.start();
    gainNode.gain.setTargetAtTime(1, this.context.currentTime, this.attackTime);
    // Always create vibrato gain node (gain=0 = no modulation by default)
    const vibratoGainNode = this.context.createGain();
    vibratoGainNode.gain.value = 0;
    
    // If vibrato is currently active, connect immediately
    if (this._vibratoEnabled && this.vibratoLFO) {
      const depthHz = frequency * (this.vibratoDepth / 1200);
      vibratoGainNode.gain.setValueAtTime(depthHz, this.context.currentTime);
      this.vibratoLFO.connect(vibratoGainNode);
      vibratoGainNode.connect(oscillator.frequency);
    }
    // Store voice with coordinates for live tuning updates
    this.voices.set(noteId, {
      oscillator,
      gainNode,
      coordX: x,
      coordY: y,
      octaveOffset,
      vibratoGainNode,
    });
  }
  
  /**
   * Stop a note
   * @param noteId The note to stop
   * @param force Force stop even if sustained
   */
  stopNote(noteId: string, force: boolean = false): void {
    if (!this.context) return;
    
    const voice = this.voices.get(noteId);
    if (!voice) return;
    
    // If sustain is on and not forcing, add to sustained list
    if (this.sustain && !force) {
      this.sustainedVoices.add(noteId);
      return;
    }
    
    // Release envelope
    const { gainNode, oscillator } = voice;
    const now = this.context.currentTime;
    
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setTargetAtTime(0, now, this.releaseTime);
    
    // Stop oscillator after release
    oscillator.stop(now + this.releaseTime * 5);
    
    // Clean up
    // Disconnect vibrato gain node
    try { this.vibratoLFO?.disconnect(voice.vibratoGainNode); } catch {}

    this.voices.delete(noteId);
    this.sustainedVoices.delete(noteId);
  }
  
  /**
   * Stop all notes
   */
  stopAll(): void {
    for (const noteId of this.voices.keys()) {
      this.stopNote(noteId, true);
    }
    this.sustainedVoices.clear();
  }
  
  /**
   * Get list of currently playing note IDs
   */
  getActiveNotes(): string[] {
    return Array.from(this.voices.keys());
  }
  
  /**
   * Get count of active voices
   */
  getVoiceCount(): number {
    return this.voices.size;
  }
  
  /**
   * Dispose of the synth
   */
  dispose(): void {
    this.stopAll();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.masterGain = null;
    this.eqFilter = null;
  }
}
