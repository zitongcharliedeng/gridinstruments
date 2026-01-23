/**
 * DCompose Web - Main Application
 * 
 * A web-based isomorphic keyboard synthesizer with DCompose/Wicki-Hayden layout.
 * Play music with your computer keyboard or mouse - works on mobile with external keyboards!
 * 
 * Features:
 * - Continuous tuning slider (syntonic temperament continuum)
 * - Live tuning changes (notes update in real-time)
 * - Volume and EQ controls
 * - Works with ANY keyboard layout (QWERTY, Dvorak, AZERTY, etc.) - uses physical key codes
 */

import { getLayout, KeyboardLayout, KeyCoordinate, SPECIAL_KEYS } from './lib/keyboard-layouts';
import { Synth, WaveformType, TUNING_MARKERS, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { detectChord, getActiveNoteNames } from './lib/chord-detector';

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private currentLayout: KeyboardLayout;
  private octaveOffset: number = 0;
  
  // Track active notes - store VISUAL coordinates (without octave offset)
  private activeNotes: Map<string, { coordX: number; coordY: number }> = new Map();
  private keyRepeat: Set<string> = new Set();
  
  // Mouse/touch state
  private pointerDown: Map<number, { coordX: number; coordY: number } | null> = new Map();
  
  // DOM elements
  private canvas: HTMLCanvasElement;
  private octaveDisplay: HTMLElement;
  private sustainButton: HTMLButtonElement;
  private waveformSelect: HTMLSelectElement;
  private chordDisplay: HTMLElement;
  private notesDisplay: HTMLElement;
  
  // New control elements
  private tuningSlider: HTMLInputElement | null = null;
  private tuningValue: HTMLElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  private eqSlider: HTMLInputElement | null = null;
  
  constructor() {
    this.synth = new Synth();
    this.currentLayout = getLayout('standard'); // Physical layout - works for all keyboard types
    
    // Get DOM elements
    this.canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
    this.octaveDisplay = document.getElementById('octave-display') as HTMLElement;
    this.sustainButton = document.getElementById('sustain-toggle') as HTMLButtonElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.chordDisplay = document.getElementById('chord-display') as HTMLElement;
    this.notesDisplay = document.getElementById('notes-display') as HTMLElement;
    
    // New control elements (may not exist yet)
    this.tuningSlider = document.getElementById('tuning-slider') as HTMLInputElement;
    this.tuningValue = document.getElementById('tuning-value') as HTMLElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.eqSlider = document.getElementById('eq-slider') as HTMLInputElement;
    
    this.init();
  }
  
  private async init(): Promise<void> {
    this.setupEventListeners();
    this.setupVisualizer();
    this.setupTuningMarkers();
    this.render();
  }
  
  private setupVisualizer(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const width = Math.min(rect.width - 32, 900);
    const height = Math.min(rect.height - 32, 400);
    
    this.visualizer = new KeyboardVisualizer(this.canvas, { width, height });
    
    window.addEventListener('resize', () => {
      if (!this.visualizer) return;
      const newRect = container.getBoundingClientRect();
      this.visualizer.resize(
        Math.min(newRect.width - 32, 900),
        Math.min(newRect.height - 32, 400)
      );
    });
  }
  
  /**
   * Create clickable tuning markers alongside the slider
   * These are reference points - the slider is continuous
   */
  private setupTuningMarkers(): void {
    const markersContainer = document.getElementById('tuning-markers');
    if (!markersContainer) return;
    
    markersContainer.innerHTML = '';
    
    for (const marker of TUNING_MARKERS) {
      // Position on vertical slider (inverted: higher value = higher position)
      const position = ((marker.fifth - FIFTH_MIN) / (FIFTH_MAX - FIFTH_MIN)) * 100;
      
      const markerEl = document.createElement('div');
      markerEl.className = 'tuning-marker';
      markerEl.style.bottom = `${position}%`;
      markerEl.innerHTML = `<span class="marker-name">${marker.name}</span>`;
      markerEl.title = `${marker.fifth.toFixed(2)} cents - ${marker.description}`;
      
      // Click to jump to this tuning value
      markerEl.addEventListener('click', () => {
        this.setTuning(marker.fifth);
      });
      
      markersContainer.appendChild(markerEl);
    }
  }
  
  private async ensureAudioReady(): Promise<void> {
    if (!this.synth.isInitialized()) {
      await this.synth.init();
    }
  }
  
  /**
   * Set tuning - updates synth AND visualizer
   */
  private setTuning(fifthCents: number): void {
    this.synth.setFifth(fifthCents);
    
    // Update visualizer layout to match new tuning
    if (this.visualizer) {
      this.visualizer.setGenerator([fifthCents, 1200]);
    }
    
    // Update slider position
    if (this.tuningSlider) {
      this.tuningSlider.value = fifthCents.toString();
    }
    
    // Update display value
    if (this.tuningValue) {
      this.tuningValue.textContent = fifthCents.toFixed(1);
    }
  }
  
  private setupEventListeners(): void {
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Mouse/touch events
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    
    // Octave controls
    document.getElementById('octave-down')?.addEventListener('click', () => {
      this.octaveOffset = Math.max(-4, this.octaveOffset - 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
    });
    
    document.getElementById('octave-up')?.addEventListener('click', () => {
      this.octaveOffset = Math.min(4, this.octaveOffset + 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
    });
    
    // Sustain toggle
    this.sustainButton?.addEventListener('click', () => {
      const newSustain = !this.synth.getSustain();
      this.synth.setSustain(newSustain);
      this.sustainButton.textContent = `Sustain: ${newSustain ? 'ON' : 'OFF'}`;
      this.sustainButton.classList.toggle('active', newSustain);
    });
    
    // Waveform selector
    this.waveformSelect?.addEventListener('change', () => {
      this.synth.setWaveform(this.waveformSelect.value as WaveformType);
    });
    
    // === NEW CONTROLS ===
    
    // Tuning slider - CONTINUOUS from FIFTH_MIN to FIFTH_MAX
    if (this.tuningSlider) {
      this.tuningSlider.min = FIFTH_MIN.toString();
      this.tuningSlider.max = FIFTH_MAX.toString();
      this.tuningSlider.step = '0.1'; // Fine control
      this.tuningSlider.value = FIFTH_DEFAULT.toString();
      
      // Real-time update while sliding
      this.tuningSlider.addEventListener('input', () => {
        const value = parseFloat(this.tuningSlider!.value);
        this.synth.setFifth(value);
        if (this.visualizer) {
          this.visualizer.setGenerator([value, 1200]);
        }
        if (this.tuningValue) {
          this.tuningValue.textContent = value.toFixed(1);
        }
      });
    }
    
    // Volume slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', () => {
        this.synth.setMasterVolume(parseFloat(this.volumeSlider!.value));
      });
    }
    
    // EQ/Tone slider
    if (this.eqSlider) {
      this.eqSlider.addEventListener('input', () => {
        this.synth.setEQ(parseFloat(this.eqSlider!.value));
      });
    }
    
    // Prevent spacebar scroll
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
      }
    });
    
    // Stop all notes when window loses focus (good UX)
    window.addEventListener('blur', () => {
      this.stopAllNotes();
    });
  }
  
  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const code = event.code;
    
    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);
    
    // Special keys (on every keyboard)
    if (code === SPECIAL_KEYS.SUSTAIN) {
      // CapsLock = toggle sustain
      event.preventDefault();
      const newSustain = !this.synth.getSustain();
      this.synth.setSustain(newSustain);
      this.sustainButton.textContent = `Sustain: ${newSustain ? 'ON' : 'OFF'}`;
      this.sustainButton.classList.toggle('active', newSustain);
      return;
    }
    
    if (code === SPECIAL_KEYS.VIBRATO) {
      // Space = vibrato (hold)
      event.preventDefault();
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      return;
    }
    
    // All other keys play notes
    const coord = this.currentLayout.keyMap[code] as KeyCoordinate | undefined;
    if (!coord) return;
    
    event.preventDefault();
    await this.ensureAudioReady();
    
    const [coordX, coordY] = coord;
    const audioNoteId = `key_${code}_${coordX}_${coordY + this.octaveOffset}`;
    
    this.synth.playNote(audioNoteId, coordX, coordY, this.octaveOffset);
    this.activeNotes.set(code, { coordX, coordY });
    
    this.render();
    this.updateDisplay();
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);
    
    // Special key release
    if (code === SPECIAL_KEYS.VIBRATO) {
      this.synth.setVibrato(false);
      return;
    }
    
    // Note release
    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    
    const { coordX, coordY } = noteData;
    const audioNoteId = `key_${code}_${coordX}_${coordY + this.octaveOffset}`;
    this.synth.stopNote(audioNoteId);
    
    this.activeNotes.delete(code);
    this.render();
    this.updateDisplay();
  }
  
  private async handlePointerDown(event: PointerEvent): Promise<void> {
    await this.ensureAudioReady();
    this.canvas.setPointerCapture(event.pointerId);
    
    const button = this.getButtonAtPointer(event);
    if (button) {
      this.playPointerNote(event.pointerId, button.coordX, button.coordY);
    }
    this.pointerDown.set(event.pointerId, button);
  }
  
  private handlePointerMove(event: PointerEvent): void {
    if (!this.pointerDown.has(event.pointerId)) return;
    
    const currentButton = this.pointerDown.get(event.pointerId);
    const newButton = this.getButtonAtPointer(event);
    
    const currentId = currentButton ? `${currentButton.coordX}_${currentButton.coordY}` : null;
    const newId = newButton ? `${newButton.coordX}_${newButton.coordY}` : null;
    
    if (currentId !== newId) {
      if (currentButton) {
        this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
      }
      if (newButton) {
        this.playPointerNote(event.pointerId, newButton.coordX, newButton.coordY);
      }
      this.pointerDown.set(event.pointerId, newButton);
    }
  }
  
  private handlePointerUp(event: PointerEvent): void {
    const currentButton = this.pointerDown.get(event.pointerId);
    if (currentButton) {
      this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
    }
    this.pointerDown.delete(event.pointerId);
    this.canvas.releasePointerCapture(event.pointerId);
  }
  
  private getButtonAtPointer(event: PointerEvent): { coordX: number; coordY: number } | null {
    if (!this.visualizer) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const button = this.visualizer.getButtonAtPoint(x, y);
    return button ? { coordX: button.coordX, coordY: button.coordY } : null;
  }
  
  private playPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const audioNoteId = `ptr_${pointerId}_${coordX}_${coordY + this.octaveOffset}`;
    this.synth.playNote(audioNoteId, coordX, coordY, this.octaveOffset);
    this.activeNotes.set(`ptr_${pointerId}`, { coordX, coordY });
    this.render();
    this.updateDisplay();
  }
  
  private stopPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const audioNoteId = `ptr_${pointerId}_${coordX}_${coordY + this.octaveOffset}`;
    this.synth.stopNote(audioNoteId);
    this.activeNotes.delete(`ptr_${pointerId}`);
    this.render();
    this.updateDisplay();
  }
  
  public stopAllNotes(): void {
    this.synth.stopAll();
    this.activeNotes.clear();
    this.keyRepeat.clear();
    this.pointerDown.clear();
    this.render();
    this.updateDisplay();
  }
  
  private render(): void {
    if (!this.visualizer) return;
    const activeNoteIds = Array.from(this.activeNotes.values()).map(
      ({ coordX, coordY }) => `${coordX}_${coordY}`
    );
    this.visualizer.setActiveNotes(activeNoteIds);
    this.visualizer.render();
  }
  
  private updateDisplay(): void {
    const coords: Array<[number, number, number]> = Array.from(this.activeNotes.values()).map(
      ({ coordX, coordY }) => [coordX, coordY + this.octaveOffset, 0]
    );
    
    const chords = detectChord(coords);
    this.chordDisplay.textContent = chords.length > 0 ? chords.slice(0, 3).join(' / ') : '-';
    
    const noteNames = getActiveNoteNames(coords);
    this.notesDisplay.textContent = noteNames.length > 0 ? noteNames.join(', ') : '-';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new DComposeApp();
  
  // Expose for debugging and emergency stop
  (window as unknown as { dcomposeApp: DComposeApp }).dcomposeApp = app;
});
