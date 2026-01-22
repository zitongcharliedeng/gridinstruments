/**
 * Low-latency Web Audio API Synthesizer
 * 
 * Polyphonic oscillator-based synth with envelope
 * Based on original WickiSynth by Piers Titus van der Torren
 */

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface Voice {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  frequency: number;
}

export class Synth {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices: Map<string, Voice> = new Map();
  private sustainedVoices: Set<string> = new Set();
  private sustain: boolean = false;
  private waveform: WaveformType = 'sawtooth';
  
  // Tuning parameters
  private generator: [number, number] = [700, 1200]; // fifth and octave in cents
  private baseFreq: number = 293.66; // D4
  
  // Envelope parameters
  private attackTime: number = 0.01;
  private releaseTime: number = 0.1;
  private masterVolume: number = 0.3;
  
  constructor() {
    // AudioContext will be created on first user interaction
  }
  
  async init(): Promise<void> {
    if (this.context) return;
    
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.context.destination);
    
    // Resume context if suspended (required by browsers)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }
  
  isInitialized(): boolean {
    return this.context !== null && this.context.state === 'running';
  }
  
  setWaveform(waveform: WaveformType): void {
    this.waveform = waveform;
    // Update existing voices
    for (const voice of this.voices.values()) {
      voice.oscillator.type = waveform;
    }
  }
  
  setGenerator(generator: [number, number]): void {
    this.generator = generator;
  }
  
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }
  
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
    
    // Connect
    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start with attack envelope
    oscillator.start();
    gainNode.gain.setTargetAtTime(1, this.context.currentTime, this.attackTime);
    
    // Store voice
    this.voices.set(noteId, { oscillator, gainNode, frequency });
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
   * Dispose of the synth
   */
  dispose(): void {
    this.stopAll();
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    this.masterGain = null;
  }
}
