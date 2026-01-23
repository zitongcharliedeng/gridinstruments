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

import { getLayout, KeyboardLayout, KeyCoordinate, SPECIAL_KEYS, MODIFIER_ROW_KEYS } from './lib/keyboard-layouts';
import { Synth, WaveformType, TUNING_MARKERS, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { detectChord, getActiveNoteNames } from './lib/chord-detector';

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private currentLayout: KeyboardLayout;
  
  // Pitch offset system (unified logic for both octave and transpose)
  // octaveOffset: shifts by octaves (y-axis, ±12 semitones per step)
  // transposeOffset: shifts by fifths (x-axis, ±7 semitones per step)
  private octaveOffset: number = 0;
  private transposeOffset: number = 0;
  
  // Track active notes - store VISUAL coordinates (without offsets applied)
  // vibratoOnPress: whether vibrato was active when key was pressed (for sustained note retention)
  private activeNotes: Map<string, { coordX: number; coordY: number; vibratoOnPress: boolean }> = new Map();
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
    // Octave controls (Y-axis shift, ±12 semitones per step)
    document.getElementById('octave-down')?.addEventListener('click', () => {
      this.octaveOffset = Math.max(-4, this.octaveOffset - 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
    });
    
    document.getElementById('octave-up')?.addEventListener('click', () => {
      this.octaveOffset = Math.min(4, this.octaveOffset + 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
    });
    
    // Transpose controls (X-axis shift, ±7 semitones per step = circle of fifths)
    // Same logic as octave, just different axis. No duped code - both are just offsets.
    const transposeDisplay = document.getElementById('transpose-display');
    
    document.getElementById('transpose-down')?.addEventListener('click', () => {
      this.transposeOffset = Math.max(-7, this.transposeOffset - 1);
      if (transposeDisplay) transposeDisplay.textContent = this.transposeOffset.toString();
    });
    
    document.getElementById('transpose-up')?.addEventListener('click', () => {
      this.transposeOffset = Math.min(7, this.transposeOffset + 1);
      if (transposeDisplay) transposeDisplay.textContent = this.transposeOffset.toString();
    });
    
    // Sustain toggle (button click - Alt key is the primary method)
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
    const nearestMarkerDisplay = document.getElementById('nearest-marker');
    
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
        // Show nearest tuning marker
        if (nearestMarkerDisplay) {
          const { marker, distance } = findNearestMarker(value);
          if (distance < 2) {
            nearestMarkerDisplay.textContent = `= ${marker.name}`;
            nearestMarkerDisplay.style.color = 'var(--accent-primary)';
          } else {
            nearestMarkerDisplay.textContent = `≈ ${marker.name} (${distance > 0 ? '+' : ''}${(value - marker.fifth).toFixed(1)}¢)`;
            nearestMarkerDisplay.style.color = 'var(--text-secondary)';
          }
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
    
    // === Visualizer scale controls (decimal inputs) ===
    const scaleXInput = document.getElementById('scale-x-input') as HTMLInputElement;
    const scaleYInput = document.getElementById('scale-y-input') as HTMLInputElement;
    
    if (scaleXInput) {
      scaleXInput.addEventListener('input', () => {
        if (!this.visualizer) return;
        const { scaleY } = this.visualizer.getScale();
        this.visualizer.setScale(parseFloat(scaleXInput.value) || 1, scaleY);
      });
    }
    
    if (scaleYInput) {
      scaleYInput.addEventListener('input', () => {
        if (!this.visualizer) return;
        const { scaleX } = this.visualizer.getScale();
        this.visualizer.setScale(scaleX, parseFloat(scaleYInput.value) || 1);
      });
    }
    
    // Button spacing is auto-calculated, but user can adjust the gap percentage
    const spacingInput = document.getElementById('spacing-input') as HTMLInputElement;
    if (spacingInput) {
      spacingInput.addEventListener('input', () => {
        if (!this.visualizer) return;
        this.visualizer.setButtonSpacing(parseFloat(spacingInput.value) || 0);
      });
    }
    
    // A4 Reference Hz input
    const a4HzInput = document.getElementById('a4-hz-input') as HTMLInputElement;
    if (a4HzInput) {
      a4HzInput.addEventListener('input', () => {
        const hz = parseFloat(a4HzInput.value) || 440;
        this.synth.setA4Hz(hz);
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
    
    // Prevent default for ALL keys to avoid browser shortcuts (Ctrl+W, Alt+Tab, etc.)
    // EXCEPT for F-keys, Escape, and system shortcuts we explicitly want to allow
    const allowDefault = ['F5', 'F11', 'F12', 'Escape'].includes(code);
    if (!allowDefault) {
      event.preventDefault();
    }
    
    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);
    
    // === Modifier row keys (Ctrl, Alt, Space) - NOT notes ===
    
    // Alt = HOLD for sustain
    if (code === SPECIAL_KEYS.SUSTAIN || code === SPECIAL_KEYS.SUSTAIN_RIGHT) {
      await this.ensureAudioReady();
      this.synth.setSustain(true);
      this.sustainButton.textContent = 'Sustain: ON';
      this.sustainButton.classList.add('active');
      return;
    }
    
    // Space = HOLD for vibrato (only affects actively pressed notes, not sustained)
    if (code === SPECIAL_KEYS.VIBRATO) {
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      return;
    }
    
    // Skip other modifier row keys (Ctrl, Meta/Win) - they do nothing
    if (MODIFIER_ROW_KEYS.has(code)) {
      return;
    }
    
    // === All other keys play notes ===
    const coord = this.currentLayout.keyMap[code] as KeyCoordinate | undefined;
    if (!coord) return;
    
    await this.ensureAudioReady();
    
    const [coordX, coordY] = coord;
    // Apply transpose offset (fifths) AND octave offset
    const effectiveCoordX = coordX + this.transposeOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${coordY + this.octaveOffset}`;
    
    // Track if vibrato is active when this note starts (for sustained note vibrato retention)
    const vibratoActive = this.synth.getVibrato();
    
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset, vibratoActive);
    this.activeNotes.set(code, { coordX, coordY, vibratoOnPress: vibratoActive });
    
    this.render();
    this.updateDisplay();
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);
    
    // === Modifier key releases ===
    
    // Alt release = sustain OFF (releases all sustained notes)
    if (code === SPECIAL_KEYS.SUSTAIN || code === SPECIAL_KEYS.SUSTAIN_RIGHT) {
      this.synth.setSustain(false);
      this.sustainButton.textContent = 'Sustain: OFF';
      this.sustainButton.classList.remove('active');
      return;
    }
    
    // Space release = vibrato OFF
    if (code === SPECIAL_KEYS.VIBRATO) {
      this.synth.setVibrato(false);
      return;
    }
    
    // Skip other modifier row keys
    if (MODIFIER_ROW_KEYS.has(code)) {
      return;
    }
    
    // === Note release ===
    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    
    const { coordX, coordY } = noteData;
    const effectiveCoordX = coordX + this.transposeOffset;
    const audioNoteId = `key_${code}_${effectiveCoordX}_${coordY + this.octaveOffset}`;
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
    const effectiveCoordX = coordX + this.transposeOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${coordY + this.octaveOffset}`;
    const vibratoActive = this.synth.getVibrato();
    this.synth.playNote(audioNoteId, effectiveCoordX, coordY, this.octaveOffset, vibratoActive);
    this.activeNotes.set(`ptr_${pointerId}`, { coordX, coordY, vibratoOnPress: vibratoActive });
    this.render();
    this.updateDisplay();
  }
  
  private stopPointerNote(pointerId: number, coordX: number, coordY: number): void {
    const effectiveCoordX = coordX + this.transposeOffset;
    const audioNoteId = `ptr_${pointerId}_${effectiveCoordX}_${coordY + this.octaveOffset}`;
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
    // Apply BOTH transpose (X) and octave (Y) offsets to show the ACTUAL pitch being played
    const coords: Array<[number, number, number]> = Array.from(this.activeNotes.values()).map(
      ({ coordX, coordY }) => [coordX + this.transposeOffset, coordY + this.octaveOffset, 0]
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
