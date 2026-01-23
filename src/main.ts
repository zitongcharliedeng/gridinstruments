/**
 * DCompose Web - Main Application
 * 
 * A web-based isomorphic keyboard synthesizer with DCompose/Wicki-Hayden layout.
 * Play music with your computer keyboard or mouse - works on mobile with external keyboards!
 */

import { getLayout, KeyboardLayout, KeyCoordinate } from './lib/keyboard-layouts';
import { Synth, WaveformType } from './lib/synth';
import { KeyboardVisualizer } from './lib/keyboard-visualizer';
import { detectChord, getActiveNoteNames } from './lib/chord-detector';

class DComposeApp {
  private synth: Synth;
  private visualizer: KeyboardVisualizer | null = null;
  private currentLayout: KeyboardLayout;
  private octaveOffset: number = 0;
  
  // Track active notes - store VISUAL coordinates (without octave offset)
  // Key = source identifier (keyCode or "mouse_pointerId")
  // Value = { coordX, coordY } in VISUAL space (for highlighting)
  private activeNotes: Map<string, { coordX: number; coordY: number }> = new Map();
  private keyRepeat: Set<string> = new Set();
  
  // Mouse/touch state
  private pointerDown: Map<number, { coordX: number; coordY: number } | null> = new Map();
  
  // DOM elements
  private canvas: HTMLCanvasElement;
  private layoutSelect: HTMLSelectElement;
  private octaveDisplay: HTMLElement;
  private sustainButton: HTMLButtonElement;
  private waveformSelect: HTMLSelectElement;
  private chordDisplay: HTMLElement;
  private notesDisplay: HTMLElement;
  
  constructor() {
    this.synth = new Synth();
    this.currentLayout = getLayout('qwerty-us');
    
    // Get DOM elements
    this.canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
    this.layoutSelect = document.getElementById('layout-select') as HTMLSelectElement;
    this.octaveDisplay = document.getElementById('octave-display') as HTMLElement;
    this.sustainButton = document.getElementById('sustain-toggle') as HTMLButtonElement;
    this.waveformSelect = document.getElementById('waveform-select') as HTMLSelectElement;
    this.chordDisplay = document.getElementById('chord-display') as HTMLElement;
    this.notesDisplay = document.getElementById('notes-display') as HTMLElement;
    
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
    
    // Mouse/touch events - full support for click, hold, and drag
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
    
    // Prevent default touch behaviors on canvas
    this.canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    
    // Layout selector
    this.layoutSelect.addEventListener('change', () => {
      this.currentLayout = getLayout(this.layoutSelect.value);
      this.stopAllNotes();
    });
    
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
    this.sustainButton.addEventListener('click', () => {
      const newSustain = !this.synth.getSustain();
      this.synth.setSustain(newSustain);
      this.sustainButton.textContent = `Sustain: ${newSustain ? 'ON' : 'OFF'}`;
      this.sustainButton.classList.toggle('active', newSustain);
    });
    
    // Waveform selector
    this.waveformSelect.addEventListener('change', () => {
      this.synth.setWaveform(this.waveformSelect.value as WaveformType);
    });
    
    // Prevent spacebar scroll
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
      }
    });
  }
  
  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const code = event.code;
    
    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);
    
    // Special keys
    if (code === 'Space') {
      event.preventDefault();
      const newSustain = !this.synth.getSustain();
      this.synth.setSustain(newSustain);
      this.sustainButton.textContent = `Sustain: ${newSustain ? 'ON' : 'OFF'}`;
      this.sustainButton.classList.toggle('active', newSustain);
      return;
    }
    
    if (code === 'Equal' || code === 'NumpadAdd') {
      this.octaveOffset = Math.min(4, this.octaveOffset + 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
      return;
    }
    
    if (code === 'Minus' || code === 'NumpadSubtract') {
      this.octaveOffset = Math.max(-4, this.octaveOffset - 1);
      this.octaveDisplay.textContent = this.octaveOffset.toString();
      return;
    }
    
    const coord = this.currentLayout.keyMap[code] as KeyCoordinate | undefined;
    if (!coord) return;
    
    event.preventDefault();
    await this.ensureAudioReady();
    
    const [coordX, coordY] = coord;
    
    // Create unique note ID for audio (includes octave offset)
    const audioNoteId = `key_${code}_${coordX}_${coordY + this.octaveOffset}`;
    
    // Play note with octave offset applied to audio
    this.synth.playNote(audioNoteId, coordX, coordY, this.octaveOffset);
    
    // Store VISUAL coordinates (without octave offset) for highlighting
    this.activeNotes.set(code, { coordX, coordY });
    
    this.render();
    this.updateDisplay();
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyRepeat.delete(code);
    
    const noteData = this.activeNotes.get(code);
    if (!noteData) return;
    
    const { coordX, coordY } = noteData;
    
    // Stop the audio note (with octave offset that was used when playing)
    const audioNoteId = `key_${code}_${coordX}_${coordY + this.octaveOffset}`;
    this.synth.stopNote(audioNoteId);
    
    this.activeNotes.delete(code);
    this.render();
    this.updateDisplay();
  }
  
  private async handlePointerDown(event: PointerEvent): Promise<void> {
    await this.ensureAudioReady();
    
    // Capture pointer for drag support
    this.canvas.setPointerCapture(event.pointerId);
    
    const button = this.getButtonAtPointer(event);
    if (button) {
      this.playPointerNote(event.pointerId, button.coordX, button.coordY);
    }
    this.pointerDown.set(event.pointerId, button);
  }
  
  private handlePointerMove(event: PointerEvent): void {
    // Only process if this pointer is down
    if (!this.pointerDown.has(event.pointerId)) return;
    
    const currentButton = this.pointerDown.get(event.pointerId);
    const newButton = this.getButtonAtPointer(event);
    
    // Check if we moved to a different button
    const currentId = currentButton ? `${currentButton.coordX}_${currentButton.coordY}` : null;
    const newId = newButton ? `${newButton.coordX}_${newButton.coordY}` : null;
    
    if (currentId !== newId) {
      // Stop old note if any
      if (currentButton) {
        this.stopPointerNote(event.pointerId, currentButton.coordX, currentButton.coordY);
      }
      
      // Play new note if any
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
    
    // Store VISUAL coordinates for highlighting
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
  
  private stopAllNotes(): void {
    this.synth.stopAll();
    this.activeNotes.clear();
    this.keyRepeat.clear();
    this.pointerDown.clear();
    this.render();
    this.updateDisplay();
  }
  
  private render(): void {
    if (!this.visualizer) return;
    
    // Convert active notes to visual note IDs (using VISUAL coordinates)
    const activeNoteIds = Array.from(this.activeNotes.values()).map(
      ({ coordX, coordY }) => `${coordX}_${coordY}`
    );
    
    this.visualizer.setActiveNotes(activeNoteIds);
    this.visualizer.render();
  }
  
  private updateDisplay(): void {
    // Get coordinates with octave offset for correct note name display
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
  new DComposeApp();
});
