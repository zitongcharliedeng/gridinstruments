/**
 * DCompose/Wicki-Hayden Keyboard Visualizer
 * 
 * Renders an isomorphic grid layout matching the original WickiSynth:
 * - Vertical axis = pitch height (same pitch = same height)
 * - Horizontal axis = circle of fifths
 * - Proper spacing showing the musical relationships
 */

import { getNoteNameFromCoord } from './keyboard-layouts';
import { TUNING_MARKERS, findNearestMarker } from './synth';

export interface VisualizerOptions {
  width: number;
  height: number;
  generator: [number, number]; // [fifth, octave] in cents
  d4Hz: number; // Current D4 reference frequency
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
    d4Hz: 293.66, // Default D4 frequency
    scaleX: 1.0, // Horizontal zoom (1.0 = default)
    scaleY: 1.0, // Vertical zoom (1.0 = default)
    buttonSpacing: 0.35, // 35% gap between buttons to prevent overlap
  };
  
  // Layout parameters - TRUE 1:1 ISOMETRIC GRID
  // Both axes use the same cents-per-pixel ratio (baseGenYFactor)
  // This makes genX = genY[0] at all tunings → truly isometric layout
  private baseGenYFactor = 0.07; // cents-per-pixel ratio for BOTH axes
  
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
   * Set the D4 reference frequency
   */
  setD4Hz(hz: number): void {
    this.options.d4Hz = hz;
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
   * Get Y position of the golden line (D4 reference line)
   * Returns undefined if line is not visible
   */
  getGoldenLineY(): number | undefined {
    const { height } = this.options;
    const { genYFactor } = this.getSpacing();
    const centerY = height / 2;
    
    // D is at the center (0 fifths from D), so pitch = 0 cents
    const d4PitchCents = 0;
    const d4Y = centerY - (d4PitchCents * genYFactor);
    
    // Only return if visible on screen
    if (d4Y > 0 && d4Y < height) {
      return d4Y;
    }
    return undefined;
  }
  
  /**
   * Get effective spacing values (base * scale)
   * genYFactor auto-adjusts based on fifth size to maintain visual stability
   */
  private getSpacing(): { genX: number; genYFactor: number } {
    // TRUE 1:1 SCALE: Both axes use the same cents-per-pixel ratio
    // Both X and Y scale proportionally with fifth size
    // This makes the grid truly isometric - 1 cent = 1 cent on both axes
    const currentFifth = this.options.generator[0];
    
    // Use the SAME scaling factor for both axes (no inverse adjustment)
    // genX and genY[0] will be equal at all tunings → TRUE 1:1 ratio
    const genX = currentFifth * this.baseGenYFactor * this.options.scaleX;
    const genYFactor = this.baseGenYFactor * this.options.scaleY;
    
    return {
      genX,
      genYFactor,
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
        
        // Only include buttons that are on screen (with margins for labels)
        const padding = buttonRadius * 2;
        const topMargin = 30;    // Space for tuning label at top
        const bottomMargin = 45; // Space for X-axis labels at bottom
        if (screenX < -padding || screenX > width + padding) continue;
        if (screenY < topMargin - padding || screenY > height - bottomMargin + padding) continue;
        
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
    
    // Draw reference line for current D4 Hz (HORIZONTAL - Y-axis)
    // D is at the center (0 fifths from D), so pitch = 0 cents
    const d4PitchCents = 0; // D is the center reference
    const d4Y = centerY - (d4PitchCents * genYFactor);
    
    if (d4Y > 0 && d4Y < height) {
      this.ctx.strokeStyle = '#886644';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(40, d4Y);
      this.ctx.lineTo(width, d4Y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // D4 label with current Hz value
      const d4HzValue = this.options.d4Hz.toFixed(2);
      this.ctx.fillStyle = '#aa8866';
      this.ctx.font = 'bold 9px Inter, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`D4=${d4HzValue}Hz`, width - 4, d4Y - 4);
    }
    
    // Draw reference line for current Fifth size (VERTICAL - X-axis)
    // This is THE key indicator - the X-axis fifth spacing IS the tuning
    const centerLineX = centerX;
    
    // Draw vertical line through entire grid
    this.ctx.strokeStyle = '#bb9966';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerLineX, 25);
    this.ctx.lineTo(centerLineX, height - 50);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Fifth label - PROMINENT at top of canvas
    const currentFifth = generator[0];
    const { marker } = findNearestMarker(currentFifth);
    const isExact = Math.abs(currentFifth - marker.fifth) < 0.5;
    
    // Draw label box background
    const labelText = isExact 
      ? `${marker.name} (${currentFifth.toFixed(1)}¢)`
      : `5th = ${currentFifth.toFixed(1)}¢`;
    
    this.ctx.font = 'bold 14px Inter, sans-serif';
    const textWidth = this.ctx.measureText(labelText).width;
    
    // Draw background rectangle for visibility
    this.ctx.fillStyle = 'rgba(30, 30, 50, 0.9)';
    this.ctx.fillRect(centerLineX - textWidth/2 - 8, 2, textWidth + 16, 22);
    this.ctx.strokeStyle = '#bb9966';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(centerLineX - textWidth/2 - 8, 2, textWidth + 16, 22);
    
    // Draw text
    this.ctx.fillStyle = '#ffcc88';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(labelText, centerLineX, 6);
    
    // Draw circle of fifths labels at bottom (X-axis)
    this.drawCircleOfFifthsLabels(centerX, genX);
    
    // Draw tuning markers inline with grid
    this.drawTuningMarkersInline(centerX, genX);
  }
  
  /**
   * Draw tuning markers inline with the circle of fifths grid
   * Each marker appears at its corresponding X position based on fifth size
   */
  private drawTuningMarkersInline(centerX: number, genX: number): void {
    const { width, height, generator } = this.options;
    const currentFifth = generator[0]; // Current fifth size in cents
    const markerY = height - 20; // Position inline with grid X-axis (slightly above circle-of-fifths labels)
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    for (const marker of TUNING_MARKERS) {
      // Calculate X position based on circle-of-fifths grid
      // Each column in the grid represents one step in the circle of fifths
      // The current tuning's fifth size determines the spacing
      // Position: i = (marker.fifth - currentFifth) / currentFifth gives the grid column
      const centerFifth = 700; // 12-TET reference (D is at center)
      const gridColumn = (marker.fifth - centerFifth) / currentFifth;
      const x = centerX + gridColumn * genX;
      
      // Only draw if on screen
      if (x < 20 || x > width - 20) continue;
      
      // Highlight current tuning
      const isCurrent = Math.abs(marker.fifth - currentFifth) < 2;
      
      if (isCurrent) {
        // Current tuning - bold and highlighted
        this.ctx.fillStyle = '#aa88ff';
        this.ctx.font = 'bold 10px Inter, sans-serif';
        
        // Draw arrow pointing to it
        this.ctx.beginPath();
        this.ctx.moveTo(x, markerY + 2);
        this.ctx.lineTo(x - 3, markerY + 6);
        this.ctx.lineTo(x + 3, markerY + 6);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Other markers - subtle
        this.ctx.fillStyle = '#555566';
        this.ctx.font = '8px Inter, sans-serif';
      }
      
      this.ctx.fillText(marker.name, x, markerY);
    }
  }
  
  /**
   * Draw circle of fifths labels at the bottom of the visualizer
   * Shows note names for each column (Bb, F, C, G, D, A, E, B, F#, etc.)
   */
  private drawCircleOfFifthsLabels(centerX: number, genX: number): void {
    const { width, height } = this.options;
    const labelY = height - 10; // Position at bottom edge, in the reserved margin area
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    // Draw labels for visible columns - HUGE VISIBLE FONTS
    for (let i = -9; i <= 9; i++) {
      const x = centerX + i * genX;
      if (x < 30 || x > width - 30) continue;
      
      const noteName = getNoteNameFromCoord(i);
      
      // Highlight D (center) with VERY LARGE text, others still readable
      if (i === 0) {
        // D is CENTER - make it HUGE and BRIGHT
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 28px Inter, sans-serif';
      } else if (Math.abs(i) <= 2) {
        // Nearby notes (G, A, C, E) - large and bright
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 20px Inter, sans-serif';
      } else if (Math.abs(i) <= 5) {
        // Medium distance - visible
        this.ctx.fillStyle = '#ddddee';
        this.ctx.font = 'bold 16px Inter, sans-serif';
      } else {
        // Far notes - still readable
        this.ctx.fillStyle = '#bbbbcc';
        this.ctx.font = '14px Inter, sans-serif';
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
