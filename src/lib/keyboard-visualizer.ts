/**
 * DCompose/Wicki-Hayden Keyboard Visualizer
 * 
 * Renders an isomorphic grid layout with slanted hexagonal buttons
 * showing note names and highlighting active notes.
 */

import { getNoteNameFromCoord } from './keyboard-layouts';

export interface VisualizerOptions {
  width: number;
  height: number;
  buttonSize: number;
  buttonSpacing: number;
  slantAngle: number; // degrees
}

interface Button {
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  noteName: string;
  isBlackKey: boolean;
}

export class KeyboardVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buttons: Button[] = [];
  private activeNotes: Set<string> = new Set();
  private sustainedNotes: Set<string> = new Set();
  
  private options: VisualizerOptions = {
    width: 900,
    height: 320,
    buttonSize: 38,
    buttonSpacing: 44,
    slantAngle: 15, // degrees - slant like dcompose
  };
  
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
    gridLine: '#333344',
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
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.options.width * dpr;
    this.canvas.height = this.options.height * dpr;
    this.canvas.style.width = `${this.options.width}px`;
    this.canvas.style.height = `${this.options.height}px`;
    this.ctx.scale(dpr, dpr);
  }
  
  private generateButtons(): void {
    this.buttons = [];
    
    const { width, height, buttonSize, buttonSpacing, slantAngle } = this.options;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Slant factor
    const slantRad = (slantAngle * Math.PI) / 180;
    const slantFactor = Math.tan(slantRad);
    
    // Generate grid of buttons
    // x = circle of fifths position, y = octave
    // We want a range that covers the typical keyboard
    const xRange = 12; // -12 to +12 in circle of fifths
    const yRange = 4;  // -4 to +4 octaves
    
    for (let coordX = -xRange; coordX <= xRange; coordX++) {
      for (let coordY = -yRange; coordY <= yRange; coordY++) {
        // Position calculation for DCompose layout
        // x-axis: circle of fifths
        // y-axis: pitch height (with slant)
        
        // In DCompose, pitch goes up vertically
        // Circle of fifths goes horizontally
        const pitchOffset = coordY * 1200 + coordX * 700; // in cents from D
        const normalizedPitch = pitchOffset / 100; // semitones
        
        // Calculate screen position
        const screenX = centerX + coordX * buttonSpacing * 0.5;
        const screenY = centerY - normalizedPitch * buttonSpacing * 0.07 + coordX * slantFactor * buttonSpacing * 0.3;
        
        // Only include buttons that are on screen
        if (screenX < -buttonSize || screenX > width + buttonSize) continue;
        if (screenY < -buttonSize || screenY > height + buttonSize) continue;
        
        // Determine if it's a "black key" (sharp/flat)
        // In circle of fifths, positions far from center tend to have accidentals
        const isBlackKey = Math.abs(coordX) > 3 && Math.abs(coordX) < 9;
        
        const noteName = getNoteNameFromCoord(coordX);
        
        this.buttons.push({
          x: screenX,
          y: screenY,
          coordX,
          coordY,
          noteName,
          isBlackKey,
        });
      }
    }
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
    const { width, height, buttonSize } = this.options;
    
    // Clear
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw buttons
    for (const button of this.buttons) {
      this.drawButton(button, buttonSize / 2);
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
    
    if (isActive) {
      fillColor = this.colors.activeKey;
      textColor = this.colors.activeKeyText;
    } else if (isSustained) {
      fillColor = this.colors.sustainedKey;
      textColor = this.colors.activeKeyText;
    } else if (isBlackKey) {
      fillColor = this.colors.blackKey;
      textColor = this.colors.blackKeyText;
    } else {
      fillColor = this.colors.whiteKey;
      textColor = this.colors.whiteKeyText;
    }
    
    // Draw hexagon-ish rounded button
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();
    
    // Draw border
    this.ctx.strokeStyle = isActive ? '#16a34a' : isSustained ? '#d97706' : '#444455';
    this.ctx.lineWidth = isActive || isSustained ? 3 : 1;
    this.ctx.stroke();
    
    // Draw note name
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${radius * 0.7}px Inter, sans-serif`;
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
}
