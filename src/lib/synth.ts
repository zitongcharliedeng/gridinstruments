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
}

/**
 * Reference tuning markers for the continuous slider
 * These are just labels - the slider is continuous from ~650 to ~750+ cents
 * Users can set ANY value, these are just common reference points
 */
export const TUNING_MARKERS: Array<{ id: string; name: string; fifth: number; description: string }> = [
  { id: 'tet5', name: '5-TET', fifth: 720, description: 'Indonesian slendro' },
  { id: 'tet17', name: '17-TET', fifth: 705.88, description: '17 equal divisions' },
  { id: 'tet53', name: '53-TET', fifth: 701.89, description: 'Turkish classical' },
  { id: 'pythagorean', name: 'Pythagorean', fifth: 701.96, description: 'Pure fifths (3:2)' },
  { id: 'tet12', name: '12-TET', fifth: 700, description: 'Western standard' },
  { id: 'tet31', name: '31-TET', fifth: 696.77, description: '31 equal divisions' },
  { id: 'meantone', name: '1/4 Meantone', fifth: 696.58, description: 'Pure major thirds' },
  { id: 'tet19', name: '19-TET', fifth: 694.74, description: '19 equal divisions' },
  { id: 'tet7', name: '7-TET', fifth: 685.71, description: 'Thai, Mandinka balafon' },
];

// Slider range - can go beyond these but these are practical limits
export const FIFTH_MIN = 650;  // Below 7-TET
export const FIFTH_MAX = 750;  // Above 5-TET
export const FIFTH_DEFAULT = 700; // 12-TET

export class Synth {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private eqFilter: BiquadFilterNode | null = null;
  private voices: Map<string, Voice> = new Map();
  private sustainedVoices: Set<string> = new Set();
  private sustain: boolean = false;
  private waveform: WaveformType = 'sawtooth';
  
  // Tuning parameters (can be changed live!)
  private generator: [number, number] = [700, 1200]; // [fifth, octave] in cents
  private baseFreq: number = 293.66; // D4
  
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
    
    this.context = new AudioContext();
    
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
  
  // === Note Playing ===
  
  /**
   * Calculate frequency from isomorphic coordinates
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
    
    // If note is already playing, don't restart it
    if (this.voices.has(noteId)) return;
    
    const frequency = this.getFrequency(x, y, octaveOffset);
    
    // Create oscillator
    const oscillator = this.context.createOscillator();
    oscillator.type = this.waveform;
    oscillator.frequency.value = frequency;
    
    // Create gain node for envelope
    const gainNode = this.context.createGain();
    gainNode.gain.value = 0;
    
    // Connect to master
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start with attack envelope
    oscillator.start();
    gainNode.gain.setTargetAtTime(1, this.context.currentTime, this.attackTime);
    
    // Store voice with coordinates for live tuning updates
    this.voices.set(noteId, {
      oscillator,
      gainNode,
      coordX: x,
      coordY: y,
      octaveOffset,
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
