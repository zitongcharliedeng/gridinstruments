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
  generator: [number, number]; // [fifth, octave] in cents
  // Scale factors for zoom control (can be set via decimal input or drag)
  scaleX: number; // Horizontal spacing multiplier (1.0 = default)
  scaleY: number; // Vertical spacing multiplier (1.0 = default)
  // Spacing between buttons (0 = touching, 0.1 = 10% gap, etc.)
  // Button radius is AUTO-CALCULATED to be as large as possible without overlap
  buttonSpacing: number;
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
    generator: [700, 1200], // 12-TET: fifth=700cents, octave=1200cents
    scaleX: 1.0, // Horizontal zoom (1.0 = default)
    scaleY: 1.0, // Vertical zoom (1.0 = default)
    buttonSpacing: 0.05, // 5% gap between buttons (0 = touching)
  };
  
  // Layout parameters - matching original WickiSynth more closely
  // In original: genx=[20,0], genyFact=0.07
  // These are BASE values, multiplied by scaleX/scaleY options
  private baseGenX = 20;  // Base x spacing per fifth
  private baseGenYFactor = 0.07; // Base y scale factor for pitch
  
  // Cached auto-calculated button radius
  private calculatedButtonRadius: number = 15;
  
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
  
  /**
   * Set zoom/scale factors
   * scaleX affects horizontal spacing (circle of fifths)
   * scaleY affects vertical spacing (pitch)
   */
  setScale(scaleX: number, scaleY: number): void {
    this.options.scaleX = Math.max(0.5, Math.min(2.0, scaleX));
    this.options.scaleY = Math.max(0.5, Math.min(2.0, scaleY));
    this.generateButtons();
    this.render();
  }
  
  /**
   * Get current scale factors
   */
  getScale(): { scaleX: number; scaleY: number } {
    return { scaleX: this.options.scaleX, scaleY: this.options.scaleY };
  }
  
  /**
   * Set button spacing (0 = touching, 0.1 = 10% gap)
   * Button radius is auto-calculated to maximize size without overlap
   */
  setButtonSpacing(spacing: number): void {
    this.options.buttonSpacing = Math.max(0, Math.min(0.5, spacing));
    this.generateButtons();
    this.render();
  }
  
  /**
   * Get current button spacing
   */
  getButtonSpacing(): number {
    return this.options.buttonSpacing;
  }
  
  /**
   * Get current auto-calculated button radius
   */
  getButtonRadius(): number {
    return this.calculatedButtonRadius;
  }
  
  /**
   * Get effective spacing values (base * scale)
   */
  private getSpacing(): { genX: number; genYFactor: number } {
    return {
      genX: this.baseGenX * this.options.scaleX,
      genYFactor: this.baseGenYFactor * this.options.scaleY,
    };
  }
  
  /**
   * Calculate optimal button radius to maximize size without overlap
   * Based on the minimum distance between any two adjacent buttons
   */
  private calculateOptimalButtonRadius(genX: number, genY: [number, number]): number {
    // In the DCompose grid, adjacent buttons can be:
    // 1. Same column, adjacent octave: vertical distance = genY[1]
    // 2. Adjacent column (same pitch level): horizontal distance = genX, vertical = genY[0]
    //    The actual distance is sqrt(genX² + genY[0]²)
    
    // Calculate distances for different neighbor relationships
    const verticalDist = Math.abs(genY[1]); // octave neighbor
    const diagonalDist = Math.sqrt(genX * genX + genY[0] * genY[0]); // fifth neighbor
    
    // Minimum distance between any two neighbors
    const minDist = Math.min(verticalDist, diagonalDist);
    
    // Maximum radius = half the min distance, minus spacing
    const spacing = this.options.buttonSpacing;
    const maxRadius = (minDist / 2) * (1 - spacing);
    
    // Clamp to reasonable bounds
    return Math.max(6, Math.min(40, maxRadius));
  }
  
  private generateButtons(): void {
    this.buttons = [];
    
    const { width, height, generator } = this.options;
    const { genX, genYFactor } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate y offsets based on generator (pitch in cents)
    const genY: [number, number] = [
      generator[0] * genYFactor, // y offset per fifth
      generator[1] * genYFactor, // y offset per octave
    ];
    
    // AUTO-CALCULATE button radius to maximize size without overlap
    this.calculatedButtonRadius = this.calculateOptimalButtonRadius(genX, genY);
    const buttonRadius = this.calculatedButtonRadius;
    
    // Generate grid - i = circle of fifths, j = octave
    // Range to cover visible area with good density
    const iRange = 9;   // -9 to +9 in circle of fifths (covers Fb to B#)
    const jRange = 4;   // -4 to +4 octaves
    
    for (let i = -iRange; i <= iRange; i++) {
      for (let j = -jRange; j <= jRange; j++) {
        // Calculate screen position (matching original WickiSynth formula)
        // X position: each fifth moves right by genX pixels
        // Y position: pitch determines height (higher pitch = higher on screen)
        const screenX = centerX + i * genX;
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
    const { width, height } = this.options;
    const buttonRadius = this.calculatedButtonRadius;
    
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
    const { genX, genYFactor } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    const octavePixels = generator[1] * genYFactor; // pixels per octave
    
    // D4 = 293.66 Hz (our center reference)
    const baseFreq = 293.66;
    const baseOctave = 4;
    
    this.ctx.strokeStyle = this.colors.pitchLine;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 10]);
    
    // Draw octave lines with labels (Y-axis)
    for (let oct = -3; oct <= 3; oct++) {
      const y = centerY - oct * octavePixels;
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
    const a4PitchCents = 3 * generator[0]; // A is 3 fifths from D
    const a4Y = centerY - (a4PitchCents * genYFactor);
    
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
    
    // Draw circle of fifths labels at bottom (X-axis)
    this.drawCircleOfFifthsLabels(centerX, genX);
  }
  
  /**
   * Draw circle of fifths labels at the bottom of the visualizer
   * Shows note names for each column (Bb, F, C, G, D, A, E, B, F#, etc.)
   */
  private drawCircleOfFifthsLabels(centerX: number, genX: number): void {
    const { width, height } = this.options;
    const labelY = height - 8; // Position near bottom
    
    this.ctx.fillStyle = '#555566';
    this.ctx.font = '9px Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    // Draw labels for visible columns
    for (let i = -9; i <= 9; i++) {
      const x = centerX + i * genX;
      if (x < 20 || x > width - 20) continue;
      
      const noteName = getNoteNameFromCoord(i);
      
      // Highlight D (center) and naturals
      if (i === 0) {
        this.ctx.fillStyle = '#8888aa';
        this.ctx.font = 'bold 10px Inter, sans-serif';
      } else if (Math.abs(i) <= 3) {
        this.ctx.fillStyle = '#666677';
        this.ctx.font = '9px Inter, sans-serif';
      } else {
        this.ctx.fillStyle = '#444455';
        this.ctx.font = '8px Inter, sans-serif';
      }
      
      this.ctx.fillText(noteName, x, labelY);
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
    const radius = this.calculatedButtonRadius;
    
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
