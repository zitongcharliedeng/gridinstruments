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
   * 1.0 = full DCompose diagonal skew
   * 0.0 = MidiMech orthogonal rows (default)
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

  // W3C CSS reference pixel: 1 CSS px = 1/96 inch. Hardcoded because
  // measureCssPxPerInch() always returns 96/devicePixelRatio (not physical DPI).
  private readonly cssPxPerInch: number = 96;


  private options: VisualizerOptions = {
    width: 900,
    height: 400,
    generator: [700, 1200],
    d4Hz: 293.66,
    scaleX: 1.0,
    scaleY: 1.0,
    buttonSpacing: 0,
    skewFactor: 0,
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

  /** Binary-search actual screen DPI via CSS media queries, then convert to CSS px/inch. */
  // @ts-ignore TS6133 — kept for potential future use (task requirement)
  private static measureCssPxPerInch(): number {
    let lo = 50, hi = 800;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (window.matchMedia(`(min-resolution: ${mid}dpi)`).matches) lo = mid;
      else hi = mid;
    }
    // CSS px/inch = physicalDPI / devicePixelRatio
    return lo / (window.devicePixelRatio || 1);
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


  /**
   * Public grid geometry for external consumers (e.g. chord graffiti).
   * Returns cell half-vectors (parallelogram shape) and canvas dimensions.
   */
  getGridGeometry(): {
    cellHv1: { x: number; y: number };
    cellHv2: { x: number; y: number };
    width: number;
    height: number;
  } {
    const { cellHv1, cellHv2 } = this.getSpacing();
    return {
      cellHv1: { ...cellHv1 },
      cellHv2: { ...cellHv2 },
      width: this.options.width,
      height: this.options.height,
    };
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
    const { generator, skewFactor, scaleX, scaleY } = this.options;
    const t = skewFactor;
    // From WickiSynth by Piers Titus van der Torren.
    //   a = gen[0]/gen[1]  (fifth/octave ratio, ~0.583 for 12-TET)
    //   b = sqrt(2a/3 − a²) (horizontal spread for Wicki hex-like tiling)
    // The fifth vector leans at ~69° from horizontal (Striso angle).
    // genY1 = py = octave step in pixels (controls visible range).
    const a = generator[0] / generator[1];
    const bSq = Math.max(0.001, (2 / 3) * a - a * a);
    const b = Math.sqrt(bSq);

    // Physical key size: 18 mm (standard isomorphic keyboard key).
    // The canvas context is pre-scaled by window.devicePixelRatio in setupCanvas(),
    // so all drawing coordinates here are CSS pixels (1 CSS px ≡ 1/96 inch by W3C spec).
    // Formula: KEY_MM / MM_PER_INCH * CSS_DPI_REFERENCE = 18/25.4*96 ≈ 68 CSS px per half-span.
    // dPy is the full cell span (2 × half), so dPy = 2 × 68 = 136 CSS px.
    const KEY_SIZE_MM  = 23.5;  // mm — tuned for ~178 CSS px full cell span
    const MM_PER_INCH  = 25.4;
    // CSS px/inch = 96 (W3C reference pixel, hardcoded above)
    const dPy = 2 * Math.round(KEY_SIZE_MM / MM_PER_INCH * this.cssPxPerInch);
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
    // Derive tiling vectors from the CURRENT interpolated basis vectors.
    // wholetone = 2*fifth − octave  → always the horizontal-ish cell axis
    // fourth    = −fifth + octave   → always the vertical-ish cell axis
    // These ALWAYS tile because they're the reduced basis of the lattice.
    // At t=0 (MidiMech): wholetone is pure horizontal, fourth is pure vertical → rectangles.
    // At t=1 (DCompose): wholetone and fourth are both diagonal → parallelograms.
    // At ANY intermediate t: still tiles perfectly (reduced basis is always valid).
    const cellHv1 = {
      x: (2 * genX - genX1) / 2,           // half-wholetone x
      y: -(2 * genY0 - genY1) / 2,         // half-wholetone y
    };
    const cellHv2 = {
      x: (-genX + genX1) / 2,              // half-fourth x
      y: (genY0 - genY1) / 2,              // half-fourth y
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
    const { width, height } = this.options;
    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    const fifth = this.options.generator[0];
    const octave = this.options.generator[1];

    // ── Conceptual axes from pitch gradient ──────────────────────
    // The pitch gradient in screen space gives the direction of steepest
    // pitch increase. Its perpendicular is the iso-pitch direction:
    // movement through the Circle of Fifths at constant pitch.
    //   At DCompose (skew=1): CoF = horizontal, Pitch = vertical.
    //   At MidiMech (skew=0): both axes are diagonal.
    const cofDx = octave * genX - fifth * genX1;     // iso-pitch (⊥ gradient)
    const cofDy = fifth * genY1 - octave * genY0;
    const pitchDx = fifth * genY1 - octave * genY0;  // pitch gradient
    const pitchDy = fifth * genX1 - octave * genX;
    // ── Circle of Fifths axis ─────────────────────────────────────
    this.drawAxisLine(centerX, centerY, cofDx, cofDy, 'Circle of Fifths');

    // ── Pitch axis ───────────────────────────────────────────────
    this.drawAxisLine(centerX, centerY, pitchDx, pitchDy, 'Pitch');
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
    // ── Fifth index lines + note labels along CoF axis ─────────
    this.drawFifthIndexLines(
      centerX, centerY,
      cofDx, cofDy, pitchDx, pitchDy,
      genX, -genY0,
    );

    // ── Octave labels along Pitch axis ──────────────────────────
    this.drawOctaveLabels(
      centerX, centerY,
      pitchDx, pitchDy,
      genX1, -genY1,
    );
  }


  /**
   * Draw perpendicular index lines at each fifth step along the CoF axis,
   * labeled with the fifth name. Shows that all notes of the same fifth
   * (e.g. all D's) lie on the same iso-pitch line.
   */
  private drawFifthIndexLines(
    cx: number, cy: number,
    cofDx: number, cofDy: number,
    pitchDx: number, pitchDy: number,
    fifthDx: number, fifthDy: number,
  ): void {
    const cofLenSq = cofDx * cofDx + cofDy * cofDy;
    if (cofLenSq < 0.01) return;
    const pitchLen = Math.sqrt(pitchDx * pitchDx + pitchDy * pitchDy);
    if (pitchLen < 0.01) return;

    const pitchNx = pitchDx / pitchLen;
    const pitchNy = pitchDy / pitchLen;


    // Label offset: 90° CW from CoF axis ("above" at DCompose)
    const cofLen = Math.sqrt(cofLenSq);
    const perpX = cofDy / cofLen;
    const perpY = -cofDx / cofLen;

    this.ctx.save();
    this.ctx.font = '11px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (let i = -12; i <= 12; i++) {
      if (i === 0) continue;
      // Project i-th fifth offset ONTO the CoF axis line.
      // Ticks are ON the axis — not at floating cell centers that go off-screen at MidiMech.
      const t = (i * fifthDx * cofDx + i * fifthDy * cofDy) / cofLenSq;
      const ax = cx + t * cofDx;
      const ay = cy + t * cofDy;
      const { width: w, height: h } = this.options;
      if (ax < -20 || ax > w + 20 || ay < -20 || ay > h + 20) continue;
      const dist = Math.abs(i) / 12;
      const alpha = Math.max(0.08, 0.5 - dist * 0.2);
      // Short perpendicular notch ON the axis (like a real graph axis tick)
      const TICK = 6;
      this.ctx.strokeStyle = `rgba(255,255,255,${alpha + 0.2})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(ax - pitchNx * TICK, ay - pitchNy * TICK);
      this.ctx.lineTo(ax + pitchNx * TICK, ay + pitchNy * TICK);
      this.ctx.stroke();
      // Note name beside tick
      this.ctx.fillStyle = `rgba(255,255,255,${alpha + 0.15})`;
      const noteName = getNoteNameFromCoord(i);
      this.ctx.fillText(noteName, ax + perpX * 16, ay + perpY * 16);
    }

    this.ctx.restore();
  }


  /** Place octave labels along the Pitch axis, projected from grid positions. */
  private drawOctaveLabels(
    cx: number, cy: number,
    pitchDx: number, pitchDy: number,
    octaveDx: number, octaveDy: number,
  ): void {
    const pitchLenSq = pitchDx * pitchDx + pitchDy * pitchDy;
    if (pitchLenSq < 0.01) return;

    // Label offset: 90° CCW from Pitch axis ("right" at DCompose)
    const pitchLen = Math.sqrt(pitchLenSq);
    const perpX = -pitchDy / pitchLen;
    const perpY = pitchDx / pitchLen;

    this.ctx.save();
    this.ctx.font = '9px "JetBrains Mono", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (let j = -3; j <= 3; j++) {
      if (j === 0) continue;
      // Project j-th octave grid position onto Pitch axis
      const gx = j * octaveDx;
      const gy = j * octaveDy;
      const t = (gx * pitchDx + gy * pitchDy) / pitchLenSq;
      const x = cx + t * pitchDx;
      const y = cy + t * pitchDy;

      const { width: w, height: h } = this.options;
      if (x < 10 || x > w - 10 || y < 10 || y > h - 10) continue;
      const dist = Math.abs(j) / 3;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.35 - dist * 0.2})`;
      const octNum = 4 + j;
      this.ctx.fillText(`oct ${octNum}`, x + perpX * 20, y + perpY * 20);
    }

    this.ctx.restore();
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
