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

import { getLayout, KeyboardLayout, KeyCoordinate } from './lib/keyboard-layouts';
import { Synth, WaveformType, FIFTH_MIN, FIFTH_MAX, FIFTH_DEFAULT, findNearestMarker } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { Note } from 'tonal';
import { detectChord, getActiveNoteNames } from './lib/chord-detector';

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private currentLayout: KeyboardLayout;
  
  // Pitch offset system removed - all transposition now via D4 Hz
  // Kept as 0 for backward compatibility with existing code
  private octaveOffset: number = 0;
  private transposeOffset: number = 0;
  
  // Track active notes - store VISUAL coordinates (without offsets applied)
  // vibratoOnPress: whether vibrato was active when key was pressed (for sustained note retention)
  private activeNotes: Map<string, { coordX: number; coordY: number; vibratoOnPress: boolean }> = new Map();
  private keyRepeat: Set<string> = new Set();
  
  // Mouse/touch state
  private pointerDown: Map<number, { coordX: number; coordY: number } | null> = new Map();
  private draggingGoldenLine: boolean = false;
  private goldenLineDragStartY: number = 0;
  private goldenLineDragStartHz: number = 293.66;
  
  // DOM elements
  private canvas: HTMLCanvasElement;
  private waveformSelect: HTMLSelectElement;
  private chordDisplay: HTMLElement;
  private notesDisplay: HTMLElement;
  private vibratoIndicator: HTMLElement | null = null;
  private sustainIndicator: HTMLElement | null = null;
  
  // New control elements
  private tuningSlider: HTMLInputElement | null = null;
  private tuningValue: HTMLElement | null = null;
  private volumeSlider: HTMLInputElement | null = null;
  
  constructor() {
    this.synth = new Synth();
    this.currentLayout = getLayout('standard'); // Physical layout - works for all keyboard types
    
    // Get DOM elements
    this.canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.chordDisplay = document.getElementById('chord-display') as HTMLElement;
    this.notesDisplay = document.getElementById('notes-display') as HTMLElement;
    this.vibratoIndicator = document.getElementById('vibrato-indicator') as HTMLElement;
    this.sustainIndicator = document.getElementById('sustain-indicator') as HTMLElement;
    
    // New control elements (may not exist yet)
    this.tuningSlider = document.getElementById('tuning-slider') as HTMLInputElement;
    this.tuningValue = document.getElementById('tuning-value') as HTMLElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    
    this.init();
  }
  
  private async init(): Promise<void> {
    this.setupEventListeners();
    this.setupVisualizer();
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
  
  private async ensureAudioReady(): Promise<void> {
    if (!this.synth.isInitialized()) {
      await this.synth.init();
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
        // Show nearest tuning marker with color-coded cents offset
        if (nearestMarkerDisplay) {
          const { marker } = findNearestMarker(value);
          const offset = value - marker.fifth;
          const absOffset = Math.abs(offset);
          
          // Color coding based on distance from exact TET
          if (absOffset < 0.1) {
            // Exact match (within 0.1 cents) - green
            nearestMarkerDisplay.textContent = `= ${marker.name}`;
            nearestMarkerDisplay.style.color = '#88ff88';
          } else if (absOffset < 1.0) {
            // Very close (within 1 cent) - yellow
            nearestMarkerDisplay.textContent = `${marker.name} ${offset > 0 ? '+' : ''}${offset.toFixed(1)}¢`;
            nearestMarkerDisplay.style.color = '#ffff88';
          } else {
            // Further away - white/secondary
            nearestMarkerDisplay.textContent = `≈ ${marker.name} (${offset > 0 ? '+' : ''}${offset.toFixed(1)}¢)`;
            nearestMarkerDisplay.style.color = 'var(--text-secondary)';
          }
        }
      });
      
      // Double-click to snap to nearest TET marker
      this.tuningSlider.addEventListener('dblclick', () => {
        const currentValue = parseFloat(this.tuningSlider!.value);
        const { marker } = findNearestMarker(currentValue);
        
        // Snap to exact marker value
        this.tuningSlider!.value = marker.fifth.toString();
        this.synth.setFifth(marker.fifth);
        if (this.visualizer) {
          this.visualizer.setGenerator([marker.fifth, 1200]);
        }
        if (this.tuningValue) {
          this.tuningValue.textContent = marker.fifth.toFixed(1);
        }
        if (nearestMarkerDisplay) {
          nearestMarkerDisplay.textContent = `= ${marker.name}`;
          nearestMarkerDisplay.style.color = 'var(--accent-primary)';
        }
      });
      
    }
    
    // Volume slider
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', () => {
        this.synth.setMasterVolume(parseFloat(this.volumeSlider!.value));
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
    
    // D4 Reference Hz input
    const d4HzInput = document.getElementById('d4-hz-input') as HTMLInputElement;
    const d4NoteInput = document.getElementById('d4-note-input') as HTMLInputElement;
    
    if (d4HzInput) {
      d4HzInput.addEventListener('input', () => {
        const hz = parseFloat(d4HzInput.value) || 293.66;
        this.synth.setD4Hz(hz);
        if (this.visualizer) {
          this.visualizer.setD4Hz(hz);
        }
        
        // Update note name input (Hz → Note)
        if (d4NoteInput) {
          const noteName = Note.fromFreq(hz);
          d4NoteInput.value = noteName || '';
        }
      });
    }
    
    // D4 Reference Note Name input
    if (d4NoteInput) {
      d4NoteInput.addEventListener('input', () => {
        const noteName = d4NoteInput.value.trim().toUpperCase();
        if (!noteName) return;
        
        // Convert note name to frequency using Tonal.js
        const freq = Note.freq(noteName);
        if (freq && freq >= 100 && freq <= 2000) {
          const hz = Math.round(freq * 100) / 100; // Round to 2 decimals
          this.synth.setD4Hz(hz);
          if (this.visualizer) {
            this.visualizer.setD4Hz(hz);
          }
          
          // Update Hz input
          if (d4HzInput) {
            d4HzInput.value = hz.toFixed(2);
          }
        }
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
    // Skip if typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    
    // Use event.code (PHYSICAL key position) - works on ALL layouts
    const code = event.code;
    
    // Prevent default for most keys to avoid browser shortcuts
    // Allow F5, F11, F12, Escape
    const allowDefault = ['F5', 'F11', 'F12', 'Escape'].includes(code);
    if (!allowDefault) {
      event.preventDefault();
    }
    
    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);
    
    // === Special keys ===
    
    // Space = HOLD for vibrato
    if (code === 'Space') {
      await this.ensureAudioReady();
      this.synth.setVibrato(true);
      if (this.vibratoIndicator) this.vibratoIndicator.style.display = 'inline';
      return;
    }
    
    // Alt = HOLD for sustain
    if (code === 'AltLeft' || code === 'AltRight') {
      await this.ensureAudioReady();
      this.synth.setSustain(true);
      if (this.sustainIndicator) this.sustainIndicator.style.display = 'inline';
      return;
    }
    
    // Ctrl+ / Ctrl- = Zoom
    if (event.ctrlKey || event.metaKey) {
      if (code === 'Equal' || code === 'NumpadAdd') {
        event.preventDefault();
        if (this.visualizer) {
          const { scaleX, scaleY } = this.visualizer.getScale();
          this.visualizer.setScale(scaleX * 1.1, scaleY * 1.1);
        }
        return;
      }
      if (code === 'Minus' || code === 'NumpadSubtract') {
        event.preventDefault();
        if (this.visualizer) {
          const { scaleX, scaleY } = this.visualizer.getScale();
          this.visualizer.setScale(scaleX / 1.1, scaleY / 1.1);
        }
        return;
      }
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
    
    // === Special key releases ===
    
    // Space release = vibrato OFF
    if (code === 'Space') {
      this.synth.setVibrato(false);
      if (this.vibratoIndicator) this.vibratoIndicator.style.display = 'none';
      return;
    }
    
    // Alt release = sustain OFF
    if (code === 'AltLeft' || code === 'AltRight') {
      this.synth.setSustain(false);
      if (this.sustainIndicator) this.sustainIndicator.style.display = 'none';
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
    
    // Check if clicking near golden line (D4 reference line)
    const rect = this.canvas.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const goldenLineY = this.visualizer?.getGoldenLineY();
    
    if (goldenLineY !== undefined && Math.abs(clickY - goldenLineY) < 10) {
      // Start dragging golden line
      this.draggingGoldenLine = true;
      this.goldenLineDragStartY = clickY;
      this.goldenLineDragStartHz = this.synth.getD4Hz();
      return;
    }
    
    const button = this.getButtonAtPointer(event);
    if (button) {
      this.playPointerNote(event.pointerId, button.coordX, button.coordY);
    }
    this.pointerDown.set(event.pointerId, button);
  }
  
  private handlePointerMove(event: PointerEvent): void {
    // Handle golden line dragging
    if (this.draggingGoldenLine) {
      const rect = this.canvas.getBoundingClientRect();
      const currentY = event.clientY - rect.top;
      const deltaY = this.goldenLineDragStartY - currentY; // Inverted: up = increase Hz
      
      // Convert Y delta to Hz change (1 pixel = ~0.5 Hz)
      const hzChange = deltaY * 0.5;
      const newHz = Math.max(100, Math.min(2000, this.goldenLineDragStartHz + hzChange));
      
      // Update D4 Hz
      this.synth.setD4Hz(newHz);
      if (this.visualizer) {
        this.visualizer.setD4Hz(newHz);
      }
      
      // Update D4 Hz input if it exists
      const d4HzInput = document.getElementById('d4-hz-input') as HTMLInputElement;
      if (d4HzInput) {
        d4HzInput.value = newHz.toFixed(2);
      }
      
      // Update note name input if it exists
      const d4NoteInput = document.getElementById('d4-note-input') as HTMLInputElement;
      if (d4NoteInput) {
        const noteName = Note.fromFreq(newHz);
        d4NoteInput.value = noteName || '';
      }
      
      return;
    }
    
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
    // Reset golden line dragging
    if (this.draggingGoldenLine) {
      this.draggingGoldenLine = false;
      this.canvas.releasePointerCapture(event.pointerId);
      return;
    }
    
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
