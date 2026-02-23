/**
 * DCompose/Wicki-Hayden Keyboard Visualizer
 *
 * Renders an isomorphic grid as a tiling of parallelograms.
 * - Every pixel on the canvas maps to exactly one cell (Voronoi = parallelogram partition).
 * - No gaps, no overlaps — a continuous discrete space.
 * - CELL_INSET shrinks inactive cells to reveal black background as "mortar".
 * - skewFactor: 1.0 = full DCompose diagonal, 0.0 = MidiMech (octave axis leans right, pitch ↗).
 */

import { getNoteNameFromCoord, get12TETName, getCentDeviation } from './keyboard-layouts';
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

  // (spacing is computed dynamically from canvas size and generator ratio)

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
    this.options.scaleX = Math.max(0.2, Math.min(5.0, scaleX));
    this.options.scaleY = Math.max(0.2, Math.min(5.0, scaleY));
    this.generateButtons();
    this.render();
  }

  /** Uniform zoom: sets both scaleX and scaleY to the same value. */
  setZoom(zoom: number): void {
    this.setScale(zoom, zoom);
  }

  getZoom(): number {
    return (this.options.scaleX + this.options.scaleY) / 2;
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

  private getSpacing(): {
    genX: number; genY0: number; genX1: number; genY1: number;
    cellHv1: { x: number; y: number }; cellHv2: { x: number; y: number };
  } {
    const { generator, skewFactor, scaleX, scaleY, height } = this.options;
    const t = skewFactor;
    // From WickiSynth by Piers Titus van der Torren.
    //   a = gen[0]/gen[1]  (fifth/octave ratio, ~0.583 for 12-TET)
    //   b = sqrt(2a/3 − a²) (horizontal spread for Wicki hex-like tiling)
    // The fifth vector leans at ~69° from horizontal (Striso angle).
    // genY1 = py = octave step in pixels (controls visible range).
    const a = generator[0] / generator[1];
    const bSq = Math.max(0.001, (2 / 3) * a - a * a);
    const b = Math.sqrt(bSq);

    const dPy   = height / 3;                   // ~3 visible octave rows (zoomed in for playability)
    const dGenX  = Math.max(28, b * dPy);        // Striso X spread (min 28px for readability)
    const dGenY0 = a * dPy;                       // fifth Y lean (pitch-proportional)
    const dGenX1 = 0;                              // octave = pure vertical at DCompose
    const dGenY1 = dPy;                            // octave step
    // In (fifth, octave) coordinates:
    //   Fifth  = 1 wholetone-cell right + 1 fourth-cell up  → (mCS, mCS)
    //   Octave = 1 wholetone-cell right + 2 fourth-cells up → (mCS, 2·mCS)
    // This makes: wholetone = (2·fifth − octave) → pure horizontal,
    //             fourth   = (−fifth + octave)  → pure vertical.
    const mCS    = dPy * 0.5;
    const mGenX  = mCS;
    const mGenY0 = mCS;
    const mGenX1 = mCS;
    const mGenY1 = 2 * mCS;
    // ── Interpolate basis vectors ────────────────────────────────────────
    const genX  = (mGenX  + t * (dGenX  - mGenX))  * scaleX;
    const genY0 = (mGenY0 + t * (dGenY0 - mGenY0)) * scaleY;
    const genX1 = (mGenX1 + t * (dGenX1 - mGenX1)) * scaleX;
    const genY1 = (mGenY1 + t * (dGenY1 - mGenY1)) * scaleY;
    // ── Cell half-vectors (parallelogram shape) ─────────────────────────
    // At DCompose (t=1): cells tile along fifth and octave directions
    //   hv1_d = half-fifth = (dGenX/2, -dGenY0/2)
    //   hv2_d = half-octave = (0, -dGenY1/2)
    // At MidiMech (t=0): cells tile along wholetone (horizontal) and fourth (vertical)
    //   wholetone = 2*fifth − octave → screen (mCS, 0)  → hv1_m = (mCS/2, 0)
    //   fourth = −fifth + octave     → screen (0, -mCS) → hv2_m = (0, -mCS/2)
    // Interpolate cell shape between layouts.
    const dHv1x = dGenX * scaleX / 2;
    const dHv1y = -dGenY0 * scaleY / 2;
    const dHv2x = 0;
    const dHv2y = -dGenY1 * scaleY / 2;

    const mHv1x = mCS * scaleX / 2;
    const mHv1y = 0;
    const mHv2x = 0;
    const mHv2y = -mCS * scaleY / 2;

    const cellHv1 = {
      x: mHv1x + t * (dHv1x - mHv1x),
      y: mHv1y + t * (dHv1y - mHv1y),
    };
    const cellHv2 = {
      x: mHv2x + t * (dHv2x - mHv2x),
      y: mHv2y + t * (dHv2y - mHv2y),
    };

    return { genX, genY0, genX1, genY1, cellHv1, cellHv2 };
  }

  private generateButtons(): void {
    this.buttons = [];

    const { width, height } = this.options;
    const { genX, genY0, genX1, genY1, cellHv1, cellHv2 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    // Cell half-vectors: at MidiMech = wholetone/fourth aligned (upright rectangle),
    // at DCompose = fifth/octave aligned (leaning parallelogram).
    // Interpolated by getSpacing().
    this.hv1 = cellHv1;
    this.hv2 = cellHv2;

    const iRange = 20;
    const jRange = 12;

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
        const tetName = get12TETName(i);
        const isBlackKey = tetName.includes('\u266F') || tetName.includes('\u266D');

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

    for (const button of this.buttons) {
      this.drawCell(button);
    }

    this.drawPitchLines();
  }

  private drawPitchLines(): void {
    const { width, height, generator } = this.options;
    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    // ── Circle of Fifths axis ─────────────────────────────────────
    // Screen direction for increasing fifths (coordX): (genX, -genY0)
    this.drawAxisLine(centerX, centerY, genX, -genY0, 'Circle of Fifths');

    // ── Pitch (octave) axis ───────────────────────────────────────
    // Screen direction for increasing octaves (coordY): (genX1, -genY1)
    this.drawAxisLine(centerX, centerY, genX1, -genY1, 'Pitch');

    // ── Origin marker (D4) ────────────────────────────────────────
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.font = 'bold 9px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`D4 ${this.options.d4Hz.toFixed(0)}Hz`, centerX + 6, centerY - 4);

    // ── Tuning label ──────────────────────────────────────────────
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

  /** Draw a labeled axis line through center with arrowhead at the positive end. */
  private drawAxisLine(
    cx: number, cy: number,
    dx: number, dy: number,
    label: string
  ): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) return;

    const { width, height } = this.options;
    const nx = dx / len;
    const ny = dy / len;
    const ext = Math.sqrt(width * width + height * height);

    // Axis line (white, semi-transparent)
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - nx * ext, cy - ny * ext);
    this.ctx.lineTo(cx + nx * ext, cy + ny * ext);
    this.ctx.stroke();

    // Find where positive direction hits canvas edge (with margin)
    const margin = 60;
    const candidates: number[] = [];
    if (nx > 0.001) candidates.push((width - margin - cx) / nx);
    if (nx < -0.001) candidates.push((margin - cx) / nx);
    if (ny > 0.001) candidates.push((height - margin - cy) / ny);
    if (ny < -0.001) candidates.push((margin - cy) / ny);
    const positiveCandidates = candidates.filter(t => t > 0);
    const tMax = positiveCandidates.length > 0
      ? Math.min(...positiveCandidates)
      : ext * 0.4;

    const tipX = cx + nx * tMax;
    const tipY = cy + ny * tMax;

    // Arrowhead (filled triangle)
    const arrowLen = 12;
    const arrowHalf = Math.PI / 7;
    const angle = Math.atan2(ny, nx);

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.beginPath();
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(
      tipX - arrowLen * Math.cos(angle - arrowHalf),
      tipY - arrowLen * Math.sin(angle - arrowHalf)
    );
    this.ctx.lineTo(
      tipX - arrowLen * Math.cos(angle + arrowHalf),
      tipY - arrowLen * Math.sin(angle + arrowHalf)
    );
    this.ctx.closePath();
    this.ctx.fill();

    // Label near arrowhead, offset perpendicular to axis
    const labelDist = 28;
    const lx = tipX - nx * labelDist;
    const ly = tipY - ny * labelDist;
    const perpX = -ny;
    const perpY = nx;
    const perpOff = 14;

    this.ctx.font = 'bold 11px "JetBrains Mono", monospace';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    // Rotate text to follow axis direction (keep readable left-to-right)
    this.ctx.save();
    this.ctx.translate(lx + perpX * perpOff, ly + perpY * perpOff);
    let textAngle = angle;
    if (textAngle > Math.PI / 2) textAngle -= Math.PI;
    if (textAngle < -Math.PI / 2) textAngle += Math.PI;
    this.ctx.rotate(textAngle);
    this.ctx.fillText(label, 0, 0);
    this.ctx.restore();

    this.ctx.restore();
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

    // Vignette: fade cells near canvas edges
    const { width: cw, height: ch } = this.options;
    const distFrac = Math.max(Math.abs(x - cw / 2) / (cw / 2), Math.abs(y - ch / 2) / (ch / 2));
    const fade = Math.max(0, 1 - Math.pow(distFrac, 2));
    this.ctx.globalAlpha = fade;

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
    // Bracket sub-label: show 12-TET equivalent ± cents when useful
    const fifth = this.options.generator[0];
    const tetName = get12TETName(coordX);
    const deviation = getCentDeviation(coordX, fifth);
    const hasBracket = noteName !== tetName || Math.abs(deviation) >= 0.5;

    if (hasBracket && cellMin > 30) {
      // Two-line: main name above center, bracket below
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(noteName, x, y);
      // Bracket sub-label (smaller, dimmer)
      const subSize = Math.max(7, fontSize * 0.6);
      this.ctx.font = `${subSize}px "JetBrains Mono", monospace`;
      this.ctx.fillStyle = textColor;
      this.ctx.globalAlpha = fade * 0.6;
      this.ctx.textBaseline = 'top';
      let bracket: string;
      if (Math.abs(deviation) < 0.5) {
        bracket = `(${tetName})`;
      } else if (noteName === tetName) {
        bracket = `(${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}¢)`;
      } else {
        bracket = `(${tetName}${deviation > 0 ? '+' : ''}${deviation.toFixed(0)}¢)`;
      }
      this.ctx.fillText(bracket, x, y + 1);
    } else {
      // Single-line centered
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(noteName, x, y);
    }
    this.ctx.globalAlpha = 1;
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
