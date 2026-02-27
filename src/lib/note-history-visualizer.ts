/**
 * Note History Visualizer — Top Panel
 *
 * Three-panel canvas strip rendered at 60fps:
 *
 *   ┌──────────────────────────────────────────────────────────────────────────┐
 *   │  Piano Keys (52px)  │  Note Roll (scroll left→right)  │  Chord + MIDI (25%)│
 *   └──────────────────────────────────────────────────────────────────────────┘
 *
 * Left panel: Vertical piano keyboard strip — active keys highlighted.
 * Center: Synthesia-style piano roll — notes emitted from piano keys, scroll rightward (left=now, right=past).
 * Right: Large chord name, note list, MIDI device status.
 */

import { noteColor } from './note-colors';
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

  // MIDI range for piano roll (C2–C7, MIDI 36–96)
  private readonly MIDI_MIN = 36;
  private readonly MIDI_MAX = 96;

  // Piano strip width in logical pixels
  private readonly PIANO_W = 52;

  // Black key pitch classes
  private readonly BLACK_KEYS = [1, 3, 6, 8, 10];

  private animFrame: number | null = null;

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
    const pianoW = this.PIANO_W;
    const chordW = Math.floor(width * 0.25);
    const rollW = width - pianoW - chordW;

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

    this.drawPianoKeys(0, pianoW, height, now);
    this.drawNoteRoll(pianoW, rollW, height, now);
    this.drawChordPanel(pianoW + rollW, chordW, height, now);

    // Divider between chord panel and roll
    this.ctx.strokeStyle = '#2a2a2a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(pianoW + rollW, 0);
    this.ctx.lineTo(pianoW + rollW, height);
    this.ctx.stroke();
  }

  // ─── LEFT: Piano Keys Strip ───────────────────────────────────────────────

  private drawPianoKeys(x: number, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    const midiRange = this.MIDI_MAX - this.MIDI_MIN + 1; // 61 notes
    const noteH = h / midiRange;

    const isBlackKey = (midi: number) => this.BLACK_KEYS.includes(((midi % 12) + 12) % 12);

    const midiToY = (midi: number) => h - (midi - this.MIDI_MIN + 1) * noteH;

    // Collect active midi notes set
    const activeMidis = new Set<number>();
    for (const n of this.activeNotes.values()) activeMidis.add(n.midiNote);

    // Draw white keys first (full width)
    for (let midi = this.MIDI_MIN; midi <= this.MIDI_MAX; midi++) {
      if (isBlackKey(midi)) continue;
      const ky = midiToY(midi);

      ctx.fillStyle = '#222222';
      ctx.fillRect(x, ky, w, noteH);

      // Border between white keys
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ky);
      ctx.lineTo(x + w, ky);
      ctx.stroke();

      // Active highlight
      if (activeMidis.has(midi)) {
        ctx.fillStyle = '#ffffff33';
        ctx.fillRect(x, ky, w, noteH);
      }
    }

    // Draw black keys on top (narrower)
    for (let midi = this.MIDI_MIN; midi <= this.MIDI_MAX; midi++) {
      if (!isBlackKey(midi)) continue;
      const ky = midiToY(midi);
      const bw = w * 0.6;

      ctx.fillStyle = '#111111';
      ctx.fillRect(x, ky, bw, noteH);

      // Border
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, ky, bw, noteH);

      // Active highlight
      if (activeMidis.has(midi)) {
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect(x, ky, bw, noteH);
      }
    }

    // Octave labels (C notes)
    ctx.font = `bold ${Math.max(6, noteH * 0.75)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let midi = this.MIDI_MIN; midi <= this.MIDI_MAX; midi++) {
      const pc = ((midi % 12) + 12) % 12;
      if (pc !== 0) continue; // Only C notes
      const octave = Math.floor(midi / 12) - 1;
      const ky = midiToY(midi) + noteH / 2;
      ctx.fillText(`C${octave}`, x + w - 2, ky);
    }

    // "Now" boundary — thin white line on right edge of piano strip
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, 0);
    ctx.lineTo(x + w, h);
    ctx.stroke();
  }

  // ─── CENTER: Note Roll (left=now, right=past) ─────────────────────────────

  private drawNoteRoll(x: number, w: number, h: number, now: number): void {
    const ctx = this.ctx;

    const midiRange = this.MIDI_MAX - this.MIDI_MIN + 1;
    const noteH = h / midiRange;

    const isBlackKey = (midi: number) => this.BLACK_KEYS.includes(((midi % 12) + 12) % 12);

    const midiToY = (midi: number) => h - (midi - this.MIDI_MIN + 1) * noteH;

    // Time-to-x mapping: t=now → x=rollX (piano edge), t=now-WINDOW → x=rollX+rollW
    // LEFT = now, RIGHT = past
    const timeToX = (t: number) => x + (now - t) / this.HISTORY_WINDOW_MS * w;

    // Background stripes per semitone
    for (let midi = this.MIDI_MIN; midi <= this.MIDI_MAX; midi++) {
      const ky = midiToY(midi);
      ctx.fillStyle = isBlackKey(midi) ? '#0a0808' : '#0d0d0d';
      ctx.fillRect(x, ky, w, noteH);
    }

    // Subtle octave lines at each C note
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let midi = this.MIDI_MIN; midi <= this.MIDI_MAX; midi++) {
      const pc = ((midi % 12) + 12) % 12;
      if (pc !== 0) continue;
      const ky = midiToY(midi) + noteH;
      ctx.beginPath();
      ctx.moveTo(x, ky);
      ctx.lineTo(x + w, ky);
      ctx.stroke();
    }

    if (this.history.length === 0 && this.activeNotes.size === 0) return;

    // Draw released notes
    for (const note of this.history) {
      const age = now - note.endTime;
      if (age > this.HISTORY_WINDOW_MS) continue;
      const alpha = Math.max(0, 1 - age / this.HISTORY_WINDOW_MS);

      // t_start < t_end, so timeToX(t_start) > timeToX(t_end)
      const xRight = timeToX(note.endTime);   // end time (more recent) → closer to piano
      const xLeft = timeToX(note.startTime);  // start time (older) → further right
      const barW = Math.max(2, xLeft - xRight);
      const ny = midiToY(note.midiNote);

      // Skip if entirely off the right edge
      if (xRight > x + w) continue;

      ctx.fillStyle = noteColor(note.midiNote, alpha * 0.65);
      ctx.fillRect(xRight, ny, barW, Math.max(2, noteH - 1));
    }

    // Draw active notes (bar attached to piano left edge, growing rightward)
    for (const note of this.activeNotes.values()) {
      const xStart = timeToX(note.startTime); // older start → further right
      const barW = Math.max(4, xStart - x);
      const ny = midiToY(note.midiNote);

      ctx.fillStyle = noteColor(note.midiNote, 1.0);
      ctx.fillRect(x, ny, barW, Math.max(2, noteH - 1));

      // Note name inside bar (if wide enough)
      if (barW > 20) {
        const noteName = this.midiToNoteName(note.midiNote);
        ctx.fillStyle = '#ffffffcc';
        ctx.font = `bold ${Math.max(9, noteH * 0.75)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(noteName, x + 2, ny + noteH / 2);
      }
    }

    // "Now" line at the piano-roll junction (x = rollX)
    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  private midiToNoteName(midi: number): string {
    const names = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    return names[((midi % 12) + 12) % 12];
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
}
