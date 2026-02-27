/**
 * Note History Visualizer — Top Panel
 *
 * Three-panel canvas strip rendered at 60fps:
 *
 *   ┌──────────────────────────────────────────────────────────────────────────┐
 *   │  Staff notation (25%)  │  Waterfall history (50%)  │  Chord + MIDI (25%)│
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Left panel: Treble clef staff, note heads at correct staff positions, ledger lines.
 * Center: Piano-roll waterfall — notes scroll right→left, colored by pitch class, fade over 3s.
 * Right: Large chord name, note list, MIDI device status.
 */

import { NOTE_COLORS, noteColor } from './note-colors';
import { detectChord } from './chord-detector';

interface ActiveNote {
  coordX: number;
  coordY: number;
  midiNote: number;
  startTime: number; // performance.now()
}

interface HistoryNote {
  coordX: number;
  coordY: number;
  midiNote: number;
  startTime: number;
  endTime: number;
}

export type ClefType = 'treble' | 'bass' | 'alto';

export class NoteHistoryVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 900;
  private height: number = 220;

  // State
  private activeNotes: Map<string, ActiveNote> = new Map();
  private history: HistoryNote[] = [];

  // History display window: 3 seconds visible
  private readonly HISTORY_WINDOW_MS = 3000;
  // Trim history older than this
  private readonly MAX_HISTORY_AGE_MS = 4000;

  // MIDI range for waterfall (C2–C7, MIDI 36–96)
  private readonly MIDI_MIN = 36;
  private readonly MIDI_MAX = 96;

  private animFrame: number | null = null;
  private clef: ClefType = 'treble';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    this.ctx = ctx;
    this.resize(canvas.offsetWidth || 900, canvas.offsetHeight || 220);
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  /** Call when a note starts (from keyboard or MIDI) */
  noteOn(coordX: number, coordY: number, midiNote: number): void {
    const key = `${coordX}_${coordY}`;
    this.activeNotes.set(key, { coordX, coordY, midiNote, startTime: performance.now() });
  }

  /** Call when a note ends */
  noteOff(coordX: number, coordY: number): void {
    const key = `${coordX}_${coordY}`;
    const note = this.activeNotes.get(key);
    if (note) {
      this.history.push({ ...note, endTime: performance.now() });
      this.activeNotes.delete(key);
    }
  }

  /** Update MIDI connection status */
  setMidiStatus(_status: 'unavailable' | 'no-devices' | 'connected', _deviceName: string = ''): void {
    // No-op: MIDI status is shown in the MIDI settings panel only
  }

  /** Set the clef type for staff notation rendering */
  setClef(clef: ClefType): void {
    this.clef = clef;
  }

  /** Clear all active notes (e.g. on blur / stop-all) */
  clearAll(): void {
    const now = performance.now();
    for (const note of this.activeNotes.values()) {
      this.history.push({ ...note, endTime: now });
    }
    this.activeNotes.clear();
  }

  /** Start the 60fps render loop */
  start(): void {
    if (this.animFrame !== null) return;
    const loop = () => {
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  /** Stop the render loop */
  stop(): void {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  private render(): void {
    const now = performance.now();

    // Trim old history
    this.history = this.history.filter(n => now - n.endTime < this.MAX_HISTORY_AGE_MS);

    const { width, height } = this;
    const leftW = Math.floor(width * 0.23);
    const rightW = Math.floor(width * 0.27);
    const centerW = width - leftW - rightW;

    this.ctx.fillStyle = '#0d0d0d';
    this.ctx.fillRect(0, 0, width, height);

    // Empty state — single centered message across full canvas
    if (this.history.length === 0 && this.activeNotes.size === 0) {
      const ctx = this.ctx;
      ctx.fillStyle = '#555';
      ctx.font = "48px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Play some notes', width / 2, height / 2 - 16);
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#b8960a';
      ctx.globalAlpha = 0.85;
      ctx.fillText('tl;dr: notes that are mathematically more harmonious are closer together spatially \u2014 make it hard to suck!', width / 2, height / 2 + 24);
      ctx.globalAlpha = 1;
      return;
    }

    // Dividers
    this.ctx.strokeStyle = '#2a2a2a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(leftW, 0); this.ctx.lineTo(leftW, height);
    this.ctx.moveTo(leftW + centerW, 0); this.ctx.lineTo(leftW + centerW, height);
    this.ctx.stroke();

    this.drawStaff(0, leftW, height, now);
    this.drawWaterfall(leftW, centerW, height, now);
    this.drawChordPanel(leftW + centerW, rightW, height, now);
  }

  // ─── LEFT: Staff notation ────────────────────────────────────────────────

  private drawStaff(x: number, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    const padX = 18;
    const padY = 16;

    // Staff lines (treble clef: E4–F5 = 5 lines)
    // We draw 5 lines + 3 ledger extensions
    const lineCount = 5;
    const staffH = h - padY * 2 - 20;
    const lineSpacing = staffH / (lineCount + 3); // a bit extra for ledger lines
    const staffTop = padY + lineSpacing * 1.5; // offset down to allow ledger lines above

    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    for (let l = 0; l < lineCount; l++) {
      const ly = staffTop + l * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(x + padX, ly);
      ctx.lineTo(x + w - padX, ly);
      ctx.stroke();
    }

    // Draw clef symbol (low opacity — "dry" rendering)
    ctx.save();
    ctx.globalAlpha = 0.25;
    this.drawClefSymbol(ctx, x + padX / 2 + 3, staffTop, lineSpacing);
    ctx.restore();

    // Collect notes to display (active + recently ended within 1s)
    const now = performance.now();
    const allNotes: number[] = [];
    for (const n of this.activeNotes.values()) allNotes.push(n.midiNote);
    for (const n of this.history) {
      if (now - n.endTime < 1000) allNotes.push(n.midiNote);
    }

    if (allNotes.length === 0) return;

    // Draw note heads
    // Staff mapping: treble clef B4=line0 top, G4=line2, E4=line4 bottom
    // MIDI: B4=71, G4=67, E4=64, C4=60
    // We map MIDI note → staff position (diatonic steps from B4 downward)
    for (const midi of [...new Set(allNotes)]) {
      const staffPos = this.midiToStaffPos(midi); // 0=top line, positive=down
      const ny = staffTop + staffPos * (lineSpacing / 2);

      if (ny < padY / 2 || ny > h - padY / 2) continue;

      const pc = ((midi % 12) + 12) % 12;
      const color = NOTE_COLORS[pc];
      const isActive = [...this.activeNotes.values()].some(n => n.midiNote === midi);
      const r = lineSpacing * 0.42;

      // Ledger lines if needed
      const lineIdxFloat = (ny - staffTop) / lineSpacing;
      if (lineIdxFloat < -0.25) {
        // Ledger lines above staff
        const topLine = staffTop;
        let ly = topLine - lineSpacing;
        while (ly > ny - lineSpacing * 0.1) {
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + padX * 1.5, ly);
          ctx.lineTo(x + w - padX * 1.5, ly);
          ctx.stroke();
          ly -= lineSpacing;
        }
      } else if (lineIdxFloat > lineCount - 0.75) {
        // Ledger lines below staff
        const bottomLine = staffTop + (lineCount - 1) * lineSpacing;
        let ly = bottomLine + lineSpacing;
        while (ly < ny + lineSpacing * 0.1) {
          ctx.strokeStyle = '#444444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + padX * 1.5, ly);
          ctx.lineTo(x + w - padX * 1.5, ly);
          ctx.stroke();
          ly += lineSpacing;
        }
      }

      // Note head (ellipse)
      ctx.beginPath();
      ctx.ellipse(x + w / 2, ny, r * 1.3, r * 0.85, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? color : color + '99';
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Note name label
      const noteName = this.midiToNoteName(midi);
      ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
      ctx.font = `bold ${Math.max(8, r * 0.9)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(noteName, x + w / 2, ny);
    }
  }

  /** Map MIDI note to staff position. 0=B4 line, each step = semidiatonic. */
  private midiToStaffPos(midi: number): number {
    // Diatonic steps from B4 (MIDI 71) downward → staff position increases
    // Treble staff: B4(0), A4(1), G4(2), F4(3), E4(4), D4(5), C4(6), B3(7)…
    const diatonicFromB4 = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6]; // pitch class → diatonic step offset
    const octaveDiatonic = 7;
    const b4Midi = 71;
    const diff = b4Midi - midi;
    const octave = Math.floor(diff / 12);
    const pc = ((midi % 12) + 12) % 12;
    // Position relative to B of that octave
    const diatonicOffset = diatonicFromB4[pc];
    // B is always step 0 in its octave; C is 6 steps above B in diatonic
    const pcDiatonic = diatonicOffset;
    return octave * octaveDiatonic + pcDiatonic;
  }

  private midiToNoteName(midi: number): string {
    const names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    return names[((midi % 12) + 12) % 12];
  }

  // ─── CENTER: Waterfall ───────────────────────────────────────────────────

  private drawWaterfall(x: number, w: number, h: number, now: number): void {
    const ctx = this.ctx;
    const pad = 8;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(x, 0, w, h);

    if (this.history.length === 0 && this.activeNotes.size === 0) return;

    const midiRange = this.MIDI_MAX - this.MIDI_MIN;
    const noteH = (h - pad * 2) / midiRange;

    const midiToY = (midi: number) => {
      const clamped = Math.max(this.MIDI_MIN, Math.min(this.MIDI_MAX, midi));
      return pad + (this.MIDI_MAX - clamped) * noteH;
    };

    const timeToX = (t: number) => {
      // rightmost = now, leftmost = now - HISTORY_WINDOW_MS
      const age = now - t;
      return x + w - (age / this.HISTORY_WINDOW_MS) * w;
    };

    // Draw history notes
    for (const note of this.history) {
      const age = now - note.endTime;
      if (age > this.HISTORY_WINDOW_MS) continue;
      const alpha = Math.max(0, 1 - age / this.HISTORY_WINDOW_MS);

      const nx = timeToX(note.startTime);
      const ex = timeToX(note.endTime);
      const ny = midiToY(note.midiNote);
      const bw = Math.max(2, ex - nx);

      ctx.fillStyle = noteColor(note.midiNote, alpha * 0.65);
      ctx.fillRect(nx, ny, bw, Math.max(2, noteH - 1));
    }

    // Draw active notes (extends to now)
    for (const note of this.activeNotes.values()) {
      const nx = timeToX(note.startTime);
      const ny = midiToY(note.midiNote);
      const bw = Math.max(4, x + w - nx);

      ctx.fillStyle = noteColor(note.midiNote, 1.0);
      ctx.fillRect(nx, ny, bw, Math.max(2, noteH - 1));

      // Note name inside bar (if wide enough)
      if (bw > 20) {
        const noteName = this.midiToNoteName(note.midiNote);
        ctx.fillStyle = '#ffffffcc';
        ctx.font = `bold ${Math.max(9, noteH * 0.75)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(noteName, Math.max(nx + 2, x + 2), ny + noteH / 2);
      }
    }

    // Time ruler: subtle gridlines every 0.5s
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let t = 0; t <= this.HISTORY_WINDOW_MS; t += 500) {
      const gx = x + w - (t / this.HISTORY_WINDOW_MS) * w;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // "NOW" line
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + w - 1, 0);
    ctx.lineTo(x + w - 1, h);
    ctx.stroke();
  }

  private drawChordPanel(x: number, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    const pad = 12;

    // Collect active note coords for chord detection
    const activeCoords: Array<[number, number, number]> = [];
    for (const n of this.activeNotes.values()) {
      activeCoords.push([n.coordX, n.coordY, 0]);
    }

    // Large chord name
    const chords = detectChord(activeCoords);
    const chordText = chords.length > 0 ? chords[0] : '';

    const chordY = h * 0.22;
    if (chordText) {
      // Gradient: pick first note color
      const firstNote = [...this.activeNotes.values()][0];
      const chordColor = firstNote ? noteColor(firstNote.midiNote, 1) : '#6366f1';

      ctx.font = `bold ${Math.min(42, w * 0.28)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = chordColor;
      ctx.fillText(chordText, x + w / 2, chordY);

      // Alternate chord names
      if (chords.length > 1) {
        ctx.font = `${Math.min(14, w * 0.1)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#888888';
        ctx.fillText(chords.slice(1, 3).join(' / '), x + w / 2, chordY + 28);
      }
    } else {
      ctx.font = `bold ${Math.min(28, w * 0.2)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222222';
      ctx.fillText('—', x + w / 2, chordY);
    }

    // Active note names (sorted by pitch, stacked vertically)
    const noteNames: string[] = [];
    const sortedNotes = [...this.activeNotes.values()].sort((a, b) => b.midiNote - a.midiNote);
    for (const n of sortedNotes) {
      noteNames.push(this.midiToNoteName(n.midiNote) + (Math.floor(n.midiNote / 12) - 1));
    }

    const noteListY = h * 0.58;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lineH = Math.min(18, (h - noteListY - pad) / Math.max(1, noteNames.length));

    for (let i = 0; i < noteNames.length && i < 8; i++) {
      const ny = noteListY + i * lineH;
      const midi = sortedNotes[i].midiNote;
      ctx.font = `${Math.min(14, lineH * 0.8)}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = noteColor(midi, 0.9);
      ctx.fillText(noteNames[i], x + w / 2, ny);
    }
  }

  // ─── Clef Drawing (canvas paths, no font dependency) ─────────────────

  /** Dispatch to the correct clef drawing method based on current clef type. */
  private drawClefSymbol(
    ctx: CanvasRenderingContext2D,
    cx: number, staffTop: number, lineSpacing: number,
  ): void {
    switch (this.clef) {
      case 'treble': this.drawTrebleClef(ctx, cx, staffTop, lineSpacing); break;
      case 'bass':   this.drawBassClef(ctx, cx, staffTop, lineSpacing); break;
      case 'alto':   this.drawAltoClef(ctx, cx, staffTop, lineSpacing); break;
    }
  }

  /**
   * Draw treble clef (G clef) centered on the G line (2nd line from bottom = line index 3).
   * Uses bezier curves to approximate the classic shape.
   */
  private drawTrebleClef(
    ctx: CanvasRenderingContext2D,
    cx: number, staffTop: number, ls: number,
  ): void {
    // G line = staff line index 3 (0-indexed from top)
    const gY = staffTop + 3 * ls;
    const scale = ls / 10;
    ctx.save();
    ctx.translate(cx, gY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.8 / scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main S-curve body of treble clef
    ctx.beginPath();
    // Start at bottom curl
    ctx.moveTo(1, 18);
    // Bottom curl (small loop below staff)
    ctx.bezierCurveTo(-3, 20, -6, 16, -4, 12);
    // Sweep up through the staff
    ctx.bezierCurveTo(-1, 6, 5, -2, 5, -10);
    // Curve over the top
    ctx.bezierCurveTo(5, -18, -2, -24, -5, -20);
    // Come back down through center
    ctx.bezierCurveTo(-8, -16, -6, -10, -2, -6);
    // Continue down through G line
    ctx.bezierCurveTo(2, -2, 6, 4, 4, 10);
    // Curl at bottom back to near start
    ctx.bezierCurveTo(2, 16, -4, 16, -3, 12);
    ctx.stroke();

    // Vertical stem line
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 20);
    ctx.stroke();

    // Small filled circle at bottom
    ctx.beginPath();
    ctx.arc(0, 20, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw bass clef (F clef) centered on the F line (2nd line from top = line index 1).
   * Classic shape: curved body + two dots.
   */
  private drawBassClef(
    ctx: CanvasRenderingContext2D,
    cx: number, staffTop: number, ls: number,
  ): void {
    // F line = staff line index 3 (4th line from top in standard bass clef,
    // but conventionally the dots sit between lines 2 and 3 from top)
    const fY = staffTop + 1 * ls;
    const scale = ls / 10;
    ctx.save();
    ctx.translate(cx, fY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.8 / scale;
    ctx.lineCap = 'round';

    // Main curve
    ctx.beginPath();
    ctx.arc(-2, 0, 5, -Math.PI * 0.8, Math.PI * 0.5, false);
    ctx.stroke();

    // Filled dot at the origin (F line marker)
    ctx.beginPath();
    ctx.arc(-2, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Two dots to the right
    ctx.beginPath();
    ctx.arc(6, -3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, 3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw alto clef (C clef) centered on the middle line (line index 2).
   * Classic shape: two vertical bars + a bracket.
   */
  private drawAltoClef(
    ctx: CanvasRenderingContext2D,
    cx: number, staffTop: number, ls: number,
  ): void {
    const midY = staffTop + 2 * ls;
    const halfH = 2 * ls;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'butt';

    // Thick left bar
    ctx.fillRect(cx - 6, midY - halfH, 3, halfH * 2);

    // Thin bar
    ctx.fillRect(cx - 2, midY - halfH, 1.5, halfH * 2);

    // Right bracket curves
    const bx = cx + 2;
    ctx.beginPath();
    ctx.moveTo(bx, midY - halfH);
    ctx.bezierCurveTo(bx + 8, midY - halfH, bx + 8, midY - 2, bx, midY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, midY + halfH);
    ctx.bezierCurveTo(bx + 8, midY + halfH, bx + 8, midY + 2, bx, midY);
    ctx.stroke();

    ctx.restore();
  }
}
