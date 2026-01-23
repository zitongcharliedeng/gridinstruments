/**
 * DCompose/Wicki-Hayden Keyboard Visualizer
 * 
 * Renders an isomorphic grid layout matching the original WickiSynth:
 * - Vertical axis = pitch height (same pitch = same height)
 * - Horizontal axis = circle of fifths
 * - Proper spacing showing the musical relationships
 */

import { getNoteNameFromCoord } from './keyboard-layouts';

export interface VisualizerOptions {
  width: number;
  height: number;
  buttonRadius: number;
  generator: [number, number]; // [fifth, octave] in cents
}

interface Button {
  x: number;
  y: number;
  coordX: number;  // circle of fifths position (0 = D)
  coordY: number;  // octave offset
  noteName: string;
  isBlackKey: boolean;
  pitchCents: number; // pitch in cents from D
}

export class KeyboardVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buttons: Button[] = [];
  private activeNotes: Set<string> = new Set();
  private sustainedNotes: Set<string> = new Set();
  
  private options: VisualizerOptions = {
    width: 900,
    height: 400,
    buttonRadius: 15,
    generator: [700, 1200], // 12-TET: fifth=700cents, octave=1200cents
  };
  
  // Layout parameters - matching original WickiSynth more closely
  // In original: genx=[20,0], genyFact=0.07
  private genX = [20, 0];  // x offset per [fifth, octave]
  private genYFactor = 0.07; // y scale factor for pitch (matches original)
  
  // Colors
  private colors = {
    background: '#1a1a2e',
    whiteKey: '#f0f0f8',
    blackKey: '#2a2a3e',
    whiteKeyText: '#1a1a2e',
    blackKeyText: '#f0f0f8',
    activeKey: '#22c55e',
    activeKeyText: '#ffffff',
    sustainedKey: '#f59e0b',
    pitchLine: '#333344',
  };
  
  constructor(canvas: HTMLCanvasElement, options?: Partial<VisualizerOptions>) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    this.setupCanvas();
    this.generateButtons();
  }
  
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.options.width * dpr;
    this.canvas.height = this.options.height * dpr;
    this.canvas.style.width = `${this.options.width}px`;
    this.canvas.style.height = `${this.options.height}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  /**
   * Set the tuning generator (for different TETs)
   * This regenerates button positions to reflect the new pitch relationships
   */
  setGenerator(generator: [number, number]): void {
    this.options.generator = generator;
    this.generateButtons();
    this.render();
  }
  
  /**
   * Get current generator
   */
  getGenerator(): [number, number] {
    return [...this.options.generator] as [number, number];
  }
  
  private generateButtons(): void {
    this.buttons = [];
    
    const { width, height, buttonRadius, generator } = this.options;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate y offsets based on generator (pitch in cents)
    const genY = [
      generator[0] * this.genYFactor, // y offset per fifth
      generator[1] * this.genYFactor, // y offset per octave
    ];
    
    // Generate grid - i = circle of fifths, j = octave
    // Range to cover visible area with good density
    const iRange = 9;   // -9 to +9 in circle of fifths (covers Fb to B#)
    const jRange = 4;   // -4 to +4 octaves
    
    for (let i = -iRange; i <= iRange; i++) {
      for (let j = -jRange; j <= jRange; j++) {
        // Calculate screen position (matching original WickiSynth formula)
        const screenX = centerX + i * this.genX[0] + j * this.genX[1];
        const screenY = centerY - (i * genY[0] + j * genY[1]);
        
        // Calculate pitch in cents from center (D)
        const pitchCents = i * generator[0] + j * generator[1];
        
        // Only include buttons that are on screen (with padding)
        const padding = buttonRadius * 2;
        if (screenX < -padding || screenX > width + padding) continue;
        if (screenY < -padding || screenY > height + padding) continue;
        
        const noteName = getNoteNameFromCoord(i);
        
        // Determine if it's a "black key" based on note name
        // Black keys are sharps and flats (have accidentals)
        const isBlackKey = noteName.includes('\u266F') || noteName.includes('\u266D') || 
                          noteName.includes('#') || noteName.includes('b');
        
        this.buttons.push({
          x: screenX,
          y: screenY,
          coordX: i,
          coordY: j,
          noteName,
          isBlackKey,
          pitchCents,
        });
      }
    }
    
    // Sort buttons by y position (draw lower pitch first for proper overlap)
    this.buttons.sort((a, b) => b.y - a.y);
  }
  
  setActiveNotes(noteIds: string[]): void {
    this.activeNotes = new Set(noteIds);
  }
  
  setSustainedNotes(noteIds: string[]): void {
    this.sustainedNotes = new Set(noteIds);
  }
  
  /**
   * Render the keyboard
   */
  render(): void {
    const { width, height, buttonRadius } = this.options;
    
    // Clear
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw horizontal pitch lines (same pitch = same height)
    this.drawPitchLines();
    
    // Draw buttons
    for (const button of this.buttons) {
      this.drawButton(button, buttonRadius);
    }
  }
  
  private drawPitchLines(): void {
    const { width, height, generator } = this.options;
    const centerY = height / 2;
    const genY = generator[1] * this.genYFactor; // pixels per octave
    
    // D4 = 293.66 Hz (our center reference)
    const baseFreq = 293.66;
    const baseOctave = 4;
    
    this.ctx.strokeStyle = this.colors.pitchLine;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 10]);
    
    // Draw octave lines with labels
    for (let oct = -3; oct <= 3; oct++) {
      const y = centerY - oct * genY;
      if (y < 0 || y > height) continue;
      
      this.ctx.beginPath();
      this.ctx.moveTo(40, y); // Start after label area
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
      
      // Calculate frequency at this octave (D at each octave)
      const octaveNum = baseOctave + oct;
      const freq = baseFreq * Math.pow(2, oct);
      
      // Draw octave label on left side
      this.ctx.setLineDash([]);
      this.ctx.fillStyle = '#666677';
      this.ctx.font = '10px Inter, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`D${octaveNum}`, 4, y);
      this.ctx.fillStyle = '#555566';
      this.ctx.font = '8px Inter, sans-serif';
      this.ctx.fillText(`${freq.toFixed(0)}Hz`, 4, y + 10);
      this.ctx.setLineDash([5, 10]);
    }
    
    this.ctx.setLineDash([]);
    
    // Draw reference line for A4=440Hz
    // A is 3 fifths up from D, so pitch = 3 * fifth cents
    // At octave 0 (relative to D4), A4 is at coordX=3, coordY=0
    // But we need to find where A4 lands on screen
    const a4PitchCents = 3 * generator[0]; // A is 3 fifths from D
    const a4Y = centerY - (a4PitchCents * this.genYFactor);
    
    if (a4Y > 0 && a4Y < height) {
      this.ctx.strokeStyle = '#886644';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(40, a4Y);
      this.ctx.lineTo(width, a4Y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // A4=440Hz label
      this.ctx.fillStyle = '#aa8866';
      this.ctx.font = 'bold 9px Inter, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('A4=440', width - 4, a4Y - 4);
    }
  }
  
  private drawButton(button: Button, radius: number): void {
    const { x, y, coordX, coordY, noteName, isBlackKey } = button;
    const noteId = `${coordX}_${coordY}`;
    
    const isActive = this.activeNotes.has(noteId);
    const isSustained = this.sustainedNotes.has(noteId) && !isActive;
    
    // Determine colors
    let fillColor: string;
    let textColor: string;
    let strokeColor: string;
    
    if (isActive) {
      fillColor = this.colors.activeKey;
      textColor = this.colors.activeKeyText;
      strokeColor = '#16a34a';
    } else if (isSustained) {
      fillColor = this.colors.sustainedKey;
      textColor = this.colors.activeKeyText;
      strokeColor = '#d97706';
    } else if (isBlackKey) {
      fillColor = this.colors.blackKey;
      textColor = this.colors.blackKeyText;
      strokeColor = '#444455';
    } else {
      fillColor = this.colors.whiteKey;
      textColor = this.colors.whiteKeyText;
      strokeColor = '#888899';
    }
    
    // Draw button circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();
    
    // Draw border
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = isActive || isSustained ? 3 : 1.5;
    this.ctx.stroke();
    
    // Draw note name
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${radius * 0.85}px Inter, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(noteName, x, y);
  }
  
  /**
   * Resize the visualizer
   */
  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.setupCanvas();
    this.generateButtons();
    this.render();
  }
  
  /**
   * Get note ID from coordinates
   */
  static getNoteId(coordX: number, coordY: number): string {
    return `${coordX}_${coordY}`;
  }
  
  /**
   * Find button at screen coordinates (for mouse/touch)
   */
  getButtonAtPoint(screenX: number, screenY: number): { coordX: number; coordY: number; noteId: string } | null {
    const radius = this.options.buttonRadius;
    
    // Search in reverse order (top buttons drawn last, so check them first)
    for (let i = this.buttons.length - 1; i >= 0; i--) {
      const button = this.buttons[i];
      const dx = screenX - button.x;
      const dy = screenY - button.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        return {
          coordX: button.coordX,
          coordY: button.coordY,
          noteId: `${button.coordX}_${button.coordY}`,
        };
      }
    }
    
    return null;
  }
  
  /**
   * Get all buttons
   */
  getButtons(): Button[] {
    return this.buttons;
  }
}
