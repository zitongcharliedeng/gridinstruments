/**
 * DCompose/Wicki-Hayden Keyboard Visualizer
 *
 * Renders an isomorphic grid as a tiling of parallelograms.
 * - Every pixel on the canvas maps to exactly one cell (Voronoi = parallelogram partition).
 * - No gaps, no overlaps — a continuous discrete space.
 * - CELL_INSET shrinks inactive cells to reveal black background as "mortar".
 * - skewFactor: 1.0 = full DCompose diagonal, 0.0 = MidiMech (octave axis leans right, pitch ↗).
 */

import { getNoteNameFromCoord } from './keyboard-layouts';
import { cellColors } from './note-colors';
import { TUNING_MARKERS, findNearestMarker } from './synth';

export interface VisualizerOptions {
  width: number;
  height: number;
  generator: [number, number]; // [fifth, octave] in cents
  d4Hz: number;
  scaleX: number;
  scaleY: number;
  buttonSpacing: number; // kept for API compat, not used in rendering
  /**
   * DCompose ↔ MidiMech skew factor.
   * 1.0 = full DCompose diagonal skew (default)
   * 0.0 = MidiMech orthogonal rows (horizontal rows, no diagonal)
   */
  skewFactor: number;
}

interface Button {
  x: number;    // screen center X
  y: number;    // screen center Y
  coordX: number;
  coordY: number;
  noteName: string;
  isBlackKey: boolean;
  pitchCents: number;
}

// Fraction of cell size used for inactive cells.
// Gap = 1 - CELL_INSET appears as black "mortar" between cells.
const CELL_INSET = 0.93;

export class KeyboardVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buttons: Button[] = [];
  private activeNotes: Set<string> = new Set();
  private sustainedNotes: Set<string> = new Set();

  // Half-vectors for parallelogram cells (computed in generateButtons)
  private hv1 = { x: 0, y: 0 }; // half-step in coordX direction
  private hv2 = { x: 0, y: 0 }; // half-step in coordY direction

  private options: VisualizerOptions = {
    width: 900,
    height: 400,
    generator: [700, 1200],
    d4Hz: 293.66,
    scaleX: 1.0,
    scaleY: 1.0,
    buttonSpacing: 0,
    skewFactor: 1.0,
  };

  private baseGenYFactor = 0.07;

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

  setGenerator(generator: [number, number]): void {
    this.options.generator = generator;
    this.generateButtons();
    this.render();
  }

  setD4Hz(hz: number): void {
    this.options.d4Hz = hz;
    this.render();
  }

  getGenerator(): [number, number] {
    return [...this.options.generator] as [number, number];
  }

  setScale(scaleX: number, scaleY: number): void {
    this.options.scaleX = Math.max(0.5, Math.min(2.0, scaleX));
    this.options.scaleY = Math.max(0.5, Math.min(2.0, scaleY));
    this.generateButtons();
    this.render();
  }

  getScale(): { scaleX: number; scaleY: number } {
    return { scaleX: this.options.scaleX, scaleY: this.options.scaleY };
  }

  setButtonSpacing(_spacing: number): void {
    // No-op: gap is determined by CELL_INSET, not a spacing parameter
    this.render();
  }

  getButtonSpacing(): number {
    return 0;
  }

  // Kept for API compat (used by NoteHistoryVisualizer waterfall golden line)
  getButtonRadius(): number {
    return Math.min(
      Math.abs(this.hv1.x) + Math.abs(this.hv2.x),
      Math.abs(this.hv1.y) + Math.abs(this.hv2.y),
    );
  }

  /** Set the DCompose↔MidiMech skew factor (0–1). Triggers re-render. */
  setSkewFactor(f: number): void {
    this.options.skewFactor = Math.max(0, Math.min(1, f));
    this.generateButtons();
    this.render();
  }

  getSkewFactor(): number {
    return this.options.skewFactor;
  }

  getGoldenLineY(): number | undefined {
    const { height } = this.options;
    const centerY = height / 2;
    if (centerY > 0 && centerY < height) return centerY;
    return undefined;
  }

  private getSpacing(): { genX: number; genY0: number; genX1: number; genY1: number } {
    const { generator, skewFactor, scaleX, scaleY } = this.options;
    const f = this.baseGenYFactor;
    const baseSkew = generator[0] * f;
    const genX  = generator[0] * f * scaleX;               // X per coordX step (constant)
    const genY0 = baseSkew * scaleY * skewFactor;           // Y lean of coordX axis (DCompose diagonal)
    const genX1 = baseSkew * scaleX * (1 - skewFactor);     // X lean of coordY axis (MidiMech diagonal)
    const genY1 = generator[1] * f * scaleY;                // Y per coordY step (constant)
    return { genX, genY0, genX1, genY1 };
  }

  private generateButtons(): void {
    this.buttons = [];

    const { width, height } = this.options;
    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;

    // Parallelogram half-vectors:
    //   hv1 = half-step along coordX direction  → (genX/2, -genY0/2)
    //   hv2 = half-step along coordY direction  → (genX1/2, -genY1/2)
    //   At skew=1 (DCompose): hv2.x=0 (octave vertical), hv1.y≠0 (fifth leans up)
    //   At skew=0 (MidiMech): hv1.y=0 (fifth horizontal), hv2.x≠0 (octave leans right)
    this.hv1 = { x: genX / 2,   y: -genY0 / 2 };
    this.hv2 = { x: genX1 / 2,  y: -genY1 / 2 };

    const iRange = 12;
    const jRange = 5;

    for (let i = -iRange; i <= iRange; i++) {
      for (let j = -jRange; j <= jRange; j++) {
        const screenX = centerX + i * genX + j * genX1;
        const screenY = centerY - (i * genY0 + j * genY1);

        // Broad cull — keep cells whose center is near the canvas
        const margin = (Math.abs(this.hv1.x) + Math.abs(this.hv2.x) + Math.abs(this.hv1.y) + Math.abs(this.hv2.y)) * 2;
        if (screenX < -margin || screenX > width + margin) continue;
        if (screenY < -margin || screenY > height + margin) continue;

        const pitchCents = i * this.options.generator[0] + j * this.options.generator[1];
        const noteName = getNoteNameFromCoord(i);
        const isBlackKey = noteName.includes('♯') || noteName.includes('♭') ||
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

    // Sort back to front (lower Y = further back) so active cells render on top
    this.buttons.sort((a, b) => a.y - b.y);
  }

  setActiveNotes(noteIds: string[]): void {
    this.activeNotes = new Set(noteIds);
  }

  setSustainedNotes(noteIds: string[]): void {
    this.sustainedNotes = new Set(noteIds);
  }

  render(): void {
    const { width, height } = this.options;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    this.drawPitchLines();

    for (const button of this.buttons) {
      this.drawCell(button);
    }
  }

  private drawPitchLines(): void {
    const { width, height, generator } = this.options;
    const { genX, genY1 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    const octavePixels = genY1; // genY1 = octave size in pixels

    const baseOctave = 4;

    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 10]);

    for (let oct = -3; oct <= 3; oct++) {
      const y = centerY - oct * octavePixels;
      if (y < 0 || y > height) continue;

      this.ctx.beginPath();
      this.ctx.moveTo(40, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();

      const octaveNum = baseOctave + oct;
      const freq = 293.66 * Math.pow(2, oct);

      this.ctx.setLineDash([]);
      this.ctx.fillStyle = '#333';
      this.ctx.font = '10px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`D${octaveNum}`, 4, y);
      this.ctx.fillStyle = '#222';
      this.ctx.font = '8px "JetBrains Mono", monospace';
      this.ctx.fillText(`${freq.toFixed(0)}Hz`, 4, y + 10);
      this.ctx.setLineDash([5, 10]);
    }

    this.ctx.setLineDash([]);

    // D4 center line
    const d4Y = centerY;
    if (d4Y > 0 && d4Y < height) {
      this.ctx.strokeStyle = '#2a1e0a';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([2, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(40, d4Y);
      this.ctx.lineTo(width, d4Y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = '#553322';
      this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`D4=${this.options.d4Hz.toFixed(2)}Hz`, width - 4, d4Y - 4);
    }

    // Center vertical line (D column)
    this.ctx.strokeStyle = '#2a2a0a';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([6, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, 25);
    this.ctx.lineTo(centerX, height - 40);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Tuning label
    const currentFifth = generator[0];
    const { marker } = findNearestMarker(currentFifth);
    const isExact = Math.abs(currentFifth - marker.fifth) < 0.5;
    const labelText = isExact
      ? `${marker.name} (${currentFifth.toFixed(1)}¢)`
      : `5th = ${currentFifth.toFixed(1)}¢`;

    this.ctx.font = 'bold 13px "JetBrains Mono", monospace';
    const textWidth = this.ctx.measureText(labelText).width;
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(centerX - textWidth / 2 - 8, 2, textWidth + 16, 20);
    this.ctx.strokeStyle = '#333300';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(centerX - textWidth / 2 - 8, 2, textWidth + 16, 20);
    this.ctx.fillStyle = '#887744';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(labelText, centerX, 5);

    this.drawCircleOfFifthsLabels(centerX, genX);
    this.drawTuningMarkersInline(centerX, genX);
  }

  private drawTuningMarkersInline(centerX: number, genX: number): void {
    const { width, height, generator } = this.options;
    const currentFifth = generator[0];
    const markerY = height - 16;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';

    for (const marker of TUNING_MARKERS) {
      const centerFifth = 700;
      const gridColumn = (marker.fifth - centerFifth) / currentFifth;
      const x = centerX + gridColumn * genX;

      if (x < 20 || x > width - 20) continue;

      const isCurrent = Math.abs(marker.fifth - currentFifth) < 2;

      if (isCurrent) {
        this.ctx.fillStyle = '#6644aa';
        this.ctx.font = 'bold 10px "JetBrains Mono", monospace';
        this.ctx.beginPath();
        this.ctx.moveTo(x, markerY + 2);
        this.ctx.lineTo(x - 3, markerY + 6);
        this.ctx.lineTo(x + 3, markerY + 6);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = '#333333';
        this.ctx.font = '8px "JetBrains Mono", monospace';
      }

      this.ctx.fillText(marker.name, x, markerY);
    }
  }

  private drawCircleOfFifthsLabels(centerX: number, genX: number): void {
    const { width, height } = this.options;
    const labelY = height - 4;

    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';

    for (let i = -9; i <= 9; i++) {
      const x = centerX + i * genX;
      if (x < 30 || x > width - 30) continue;

      const noteName = getNoteNameFromCoord(i);

      if (i === 0) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 26px "JetBrains Mono", monospace';
      } else if (Math.abs(i) <= 2) {
        this.ctx.fillStyle = '#cccccc';
        this.ctx.font = 'bold 18px "JetBrains Mono", monospace';
      } else if (Math.abs(i) <= 5) {
        this.ctx.fillStyle = '#888888';
        this.ctx.font = 'bold 14px "JetBrains Mono", monospace';
      } else {
        this.ctx.fillStyle = '#444444';
        this.ctx.font = '12px "JetBrains Mono", monospace';
      }

      this.ctx.fillText(noteName, x, labelY);
    }
  }

  private drawCell(button: Button): void {
    const { x, y, coordX, coordY, noteName, isBlackKey } = button;
    const noteId = `${coordX}_${coordY}`;

    const isActive = this.activeNotes.has(noteId);
    const isSustained = this.sustainedNotes.has(noteId) && !isActive;

    const state = isActive ? 'active' as const
      : isSustained ? 'sustained' as const
      : isBlackKey ? 'black' as const
      : 'white' as const;
    const { fill: fillColor, text: textColor } = cellColors(coordX, state);

    const { hv1, hv2 } = this;
    const s = isActive ? 1.0 : CELL_INSET;

    // 4 corners of the parallelogram cell, scaled by s around center
    const h1x = hv1.x * s, h1y = hv1.y * s;
    const h2x = hv2.x * s, h2y = hv2.y * s;

    // corners: ±hv1 ± hv2
    const px = (a: number, b: number) => x + a * h1x + b * h2x;
    const py = (a: number, b: number) => y + a * h1y + b * h2y;

    this.ctx.beginPath();
    this.ctx.moveTo(px(-1, -1), py(-1, -1)); // bottom-left
    this.ctx.lineTo(px( 1, -1), py( 1, -1)); // bottom-right
    this.ctx.lineTo(px( 1,  1), py( 1,  1)); // top-right
    this.ctx.lineTo(px(-1,  1), py(-1,  1)); // top-left
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    // Note label — size from full cell span, not half-vectors
    const cellW = (Math.abs(hv1.x) + Math.abs(hv2.x)) * 2;
    const cellH = (Math.abs(hv1.y) + Math.abs(hv2.y)) * 2;
    const cellMin = Math.min(cellW, cellH);
    const fontSize = Math.max(10, Math.min(22, cellMin * 0.38));
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(noteName, x, y);
  }

  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.setupCanvas();
    this.generateButtons();
    this.render();
  }

  static getNoteId(coordX: number, coordY: number): string {
    return `${coordX}_${coordY}`;
  }

  /**
   * Find the button nearest to screen coordinates using the exact parallelogram
   * Voronoi partition — O(N) nearest-neighbor, no dead zones.
   */
  getButtonAtPoint(screenX: number, screenY: number): { coordX: number; coordY: number; noteId: string } | null {
    if (this.buttons.length === 0) return null;

    // Use parallelogram metric: solve 2×2 linear system for grid coords.
    // Screen: x = cx + i*genX + j*genX1,  y = cy - (i*genY0 + j*genY1)
    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const { width, height } = this.options;
    const dx = screenX - width / 2;
    const dy = -(screenY - height / 2); // flip Y: screen Y↓ vs coord Y↑
    // Solve: dx = i*genX + j*genX1,  dy = i*genY0 + j*genY1
    const det = genX * genY1 - genX1 * genY0;
    const iFloat = det !== 0 ? (dx * genY1 - genX1 * dy) / det : 0;
    const jFloat = det !== 0 ? (genX * dy - dx * genY0) / det : 0;

    // Check integer neighbours (±1 in each direction due to rounding)
    let nearest = this.buttons[0];
    let nearestDist = Infinity;

    const iRound = Math.round(iFloat);
    const jRound = Math.round(jFloat);

    for (const button of this.buttons) {
      if (Math.abs(button.coordX - iRound) > 2 || Math.abs(button.coordY - jRound) > 2) continue;
      const bx = screenX - button.x;
      const by = screenY - button.y;
      const dist = bx * bx + by * by;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = button;
      }
    }

    // Fallback: full scan if restricted search missed everything
    if (nearestDist === Infinity) {
      for (const button of this.buttons) {
        const bx = screenX - button.x;
        const by = screenY - button.y;
        const dist = bx * bx + by * by;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = button;
        }
      }
    }

    return {
      coordX: nearest.coordX,
      coordY: nearest.coordY,
      noteId: `${nearest.coordX}_${nearest.coordY}`,
    };
  }

  getButtons(): Button[] {
    return this.buttons;
  }
}
