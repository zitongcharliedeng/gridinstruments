/**
 * DCompose Web - Main Application
 * 
 * A web-based isomorphic keyboard synthesizer with DCompose/Wicki-Hayden layout.
 * Play music with your computer keyboard - works on mobile with external keyboards!
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
  private activeKeys: Map<string, { coordX: number; coordY: number }> = new Map();
  private keyRepeat: Set<string> = new Set(); // Prevent key repeat
  
  // DOM elements
  private canvas: HTMLCanvasElement;
  private layoutSelect: HTMLSelectElement;
  private octaveDisplay: HTMLElement;
  private sustainButton: HTMLButtonElement;
  private waveformSelect: HTMLSelectElement;
  private chordDisplay: HTMLElement;
  private notesDisplay: HTMLElement;
  private touchOverlay: HTMLElement;
  
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
    this.touchOverlay = document.getElementById('touch-overlay') as HTMLElement;
    
    this.init();
  }
  
  private async init(): Promise<void> {
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup visualizer
    this.setupVisualizer();
    
    // Initial render
    this.render();
  }
  
  private setupVisualizer(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const width = Math.min(rect.width - 32, 900);
    const height = Math.min(rect.height - 32, 320);
    
    this.visualizer = new KeyboardVisualizer(this.canvas, {
      width,
      height,
    });
    
    // Handle resize
    window.addEventListener('resize', () => {
      if (!this.visualizer) return;
      const newRect = container.getBoundingClientRect();
      const newWidth = Math.min(newRect.width - 32, 900);
      const newHeight = Math.min(newRect.height - 32, 320);
      this.visualizer.resize(newWidth, newHeight);
    });
  }
  
  private setupEventListeners(): void {
    // Touch overlay - initialize audio on first interaction
    const initAudio = async () => {
      await this.synth.init();
      if (this.synth.isInitialized()) {
        this.touchOverlay.classList.add('hidden');
      }
    };
    
    this.touchOverlay.addEventListener('click', initAudio);
    this.touchOverlay.addEventListener('touchstart', initAudio);
    
    // Also init on first keydown
    document.addEventListener('keydown', async () => {
      if (!this.synth.isInitialized()) {
        await this.synth.init();
        if (this.synth.isInitialized()) {
          this.touchOverlay.classList.add('hidden');
        }
      }
    }, { once: true });
    
    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Layout selector
    this.layoutSelect.addEventListener('change', () => {
      this.currentLayout = getLayout(this.layoutSelect.value);
      this.stopAllNotes();
      this.render();
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
      this.render();
    });
    
    // Waveform selector
    this.waveformSelect.addEventListener('change', () => {
      this.synth.setWaveform(this.waveformSelect.value as WaveformType);
    });
    
    // Prevent spacebar from scrolling
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
      }
    });
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    const code = event.code;
    
    // Prevent key repeat
    if (this.keyRepeat.has(code)) return;
    this.keyRepeat.add(code);
    
    // Special keys
    if (code === 'Space') {
      event.preventDefault();
      // Toggle sustain
      const newSustain = !this.synth.getSustain();
      this.synth.setSustain(newSustain);
      this.sustainButton.textContent = `Sustain: ${newSustain ? 'ON' : 'OFF'}`;
      this.sustainButton.classList.toggle('active', newSustain);
      this.render();
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
    
    // Get note coordinate from layout
    const coord = this.currentLayout.keyMap[code] as KeyCoordinate | undefined;
    if (!coord) return;
    
    event.preventDefault();
    
    const [coordX, coordY] = coord;
    const noteId = `${coordX}_${coordY + this.octaveOffset}`;
    
    // Play note
    this.synth.playNote(noteId, coordX, coordY, this.octaveOffset);
    this.activeKeys.set(code, { coordX, coordY: coordY + this.octaveOffset });
    
    this.render();
    this.updateDisplay();
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    
    // Clear key repeat flag
    this.keyRepeat.delete(code);
    
    // Get stored coordinate for this key
    const keyData = this.activeKeys.get(code);
    if (!keyData) return;
    
    const { coordX, coordY } = keyData;
    const noteId = `${coordX}_${coordY}`;
    
    // Stop note
    this.synth.stopNote(noteId);
    this.activeKeys.delete(code);
    
    this.render();
    this.updateDisplay();
  }
  
  private stopAllNotes(): void {
    this.synth.stopAll();
    this.activeKeys.clear();
    this.keyRepeat.clear();
    this.render();
    this.updateDisplay();
  }
  
  private render(): void {
    if (!this.visualizer) return;
    
    // Get active note IDs
    const activeNoteIds = Array.from(this.activeKeys.values()).map(
      ({ coordX, coordY }) => `${coordX}_${coordY}`
    );
    
    this.visualizer.setActiveNotes(activeNoteIds);
    this.visualizer.render();
  }
  
  private updateDisplay(): void {
    // Get active coordinates
    const coords: Array<[number, number, number]> = Array.from(this.activeKeys.values()).map(
      ({ coordX, coordY }) => [coordX, coordY, 0]
    );
    
    // Detect chord
    const chords = detectChord(coords);
    this.chordDisplay.textContent = chords.length > 0 ? chords.slice(0, 3).join(' / ') : '-';
    
    // Get note names
    const noteNames = getActiveNoteNames(coords);
    this.notesDisplay.textContent = noteNames.length > 0 ? noteNames.join(', ') : '-';
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DComposeApp();
});
