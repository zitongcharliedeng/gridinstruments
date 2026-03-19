# Note History Visualizer

Three-panel canvas strip rendered at 60fps. The layout from left to right:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Chord Panel (25%)  │  Piano Keys (52px)  │  Note Roll (remaining)       │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Chord panel** (left): Large chord name, alternate voicings, and active note list in D-relative octave notation.
- **Piano strip** (center): Vertical keyboard strip with active key highlights and ghost note indicator for game mode.
- **Note roll** (right): Synthesia-style piano roll — notes emit from the piano keys and scroll rightward (left = now, right = past).

## Imports and Types

The visualizer imports `noteColor` for per-pitch-class OKLCH colors, `detectChord` for Tonal.js-backed chord detection, and `formatNoteWithOctavePrefix` from `keyboard-layouts` — the single source of truth for D-relative note name formatting. Two interfaces describe the note lifecycle: `ActiveNote` for held notes (no end time yet) and `HistoryNote` for released notes (with an end time for fade-out).

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
import { noteColor } from './note-colors';
import { detectChord } from './chord-detector';
import { formatNoteWithOctavePrefix, pitchClassName } from './keyboard-layouts';

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
```

## Word-wrap Helper

The idle state renders a multi-line hint message. `wrapText` splits a string into lines that each fit within `maxWidth` canvas pixels, using the current canvas font for measurement.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
```

## Class Declaration and Fields

The class holds canvas state, note collections, display parameters, and idle animation state. Key constants:

- `PIANO_W = 52` — fixed pixel width of the piano key strip.
- `BLACK_KEYS = [1, 3, 6, 8, 10]` — pitch classes that are black keys.
- `historyWindowMs` — how far back the roll displays (default 3 seconds, adjustable 1–10s).
- `idleAlpha` / `idleTarget` — lerped opacity for the "Play some notes" hint text.
- `ghostNote` — the next expected MIDI note in game mode, shown as a faint outline on the piano strip.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
export class NoteHistoryVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 900;
  private height = 220;

  private activeNotes = new Map<string, ActiveNote>();
  private history: HistoryNote[] = [];

  private historyWindowMs = 3000;
  private maxHistoryAgeMs = 4000;

  private midiMin = 36;
  private midiMax = 96;

  private readonly PIANO_W = 52;
  private readonly BLACK_KEYS = [1, 3, 6, 8, 10];

  private animFrame: number | null = null;

  private idleAlpha = 0;
  private idleTarget = 1;
  private readonly IDLE_LERP_SPEED = 0.04;

  private ghostNote: number | null = null;
```

## Constructor and Resize

The constructor grabs the 2D context and sizes the canvas to its current DOM dimensions (falling back to 900×220 if it has not yet been laid out). `resize` applies device pixel ratio scaling so the canvas is crisp on HiDPI displays.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    this.ctx = ctx;
    this.resize(canvas.offsetWidth > 0 ? canvas.offsetWidth : 900, canvas.offsetHeight > 0 ? canvas.offsetHeight : 220);
  }

  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    this.width = width;
    this.height = height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
  }
```

## Public Configuration API

Four small methods let the host application tune the display. Time window and note range changes take effect on the next render frame with no re-initialization.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  setTimeWindow(seconds: number): void {
    const clamped = Math.max(1, Math.min(10, seconds));
    this.historyWindowMs = clamped * 1000;
    this.maxHistoryAgeMs = this.historyWindowMs + 1000;
  }

  getTimeWindow(): number {
    return this.historyWindowMs / 1000;
  }

  setNoteRange(min: number, max: number): void {
    this.midiMin = Math.max(0, Math.min(127, min));
    this.midiMax = Math.max(this.midiMin + 12, Math.min(127, max));
  }

  getNoteRange(): { min: number; max: number } {
    return { min: this.midiMin, max: this.midiMax };
  }
```

## Note Lifecycle and Idle State API

`noteOn` / `noteOff` move notes between `activeNotes` and `history`. `clearAll` flushes all active notes to history (used on focus loss or stop-all). The idle helpers manage the "Play some notes" overlay: `setIdleState(true)` fades it in, `setIdleState(false)` snaps alpha to 0 immediately for responsiveness. Ghost note methods control the game-mode next-note indicator on the piano strip.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  noteOn(coordX: number, coordY: number, midiNote: number): void {
    this.idleAlpha = 0;
    this.idleTarget = 0;
    const key = `${coordX}_${coordY}`;
    this.activeNotes.set(key, { coordX, coordY, midiNote, startTime: performance.now() });
  }

  noteOff(coordX: number, coordY: number): void {
    const key = `${coordX}_${coordY}`;
    const note = this.activeNotes.get(key);
    if (note) {
      this.history.push({ ...note, endTime: performance.now() });
      this.activeNotes.delete(key);
    }
  }

  setMidiStatus(_status: 'unavailable' | 'no-devices' | 'connected', _deviceName = ''): void {
  }

  clearAll(): void {
    const now = performance.now();
    for (const note of this.activeNotes.values()) {
      this.history.push({ ...note, endTime: now });
    }
    this.activeNotes.clear();
    this.idleAlpha = 0;
    this.idleTarget = 0;
  }

  resetIdleAlpha(): void {
    this.idleAlpha = 0;
    this.idleTarget = 0;
  }

  setIdleState(idle: boolean): void {
    this.idleTarget = idle ? 1 : 0;
    if (!idle) {
      this.idleAlpha = 0;
    }
  }

  setGhostNote(midiNote: number | null): void {
    this.ghostNote = midiNote;
  }

  clearGhostNote(): void {
    this.ghostNote = null;
  }
```

## Render Loop

The `requestAnimationFrame` loop calls `render()` at up to 60fps. `start()` is idempotent — calling it when already running is a no-op.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  start(): void {
    if (this.animFrame !== null) return;
    const loop = (): void => {
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }
```

## Main Render Method

Each frame: trim stale history, clear the canvas, and either show the idle overlay (when no notes exist) or draw all three panels. The idle text fades in/out via per-frame lerp toward `idleTarget`. When notes are present the three panels render in left-to-right order with a 1px divider between the chord panel and the roll.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  private render(): void {
    const now = performance.now();

    this.history = this.history.filter(n => now - n.endTime < this.maxHistoryAgeMs);

    const { width, height } = this;
    const pianoW = this.PIANO_W;
    const chordW = Math.floor(width * 0.25);
    const rollW = width - pianoW - chordW;

    this.ctx.fillStyle = '#0d0d0d';
    this.ctx.fillRect(0, 0, width, height);

    if (this.history.length === 0 && this.activeNotes.size === 0) {
      if (this.idleAlpha < this.idleTarget) {
        this.idleAlpha = Math.min(this.idleTarget, this.idleAlpha + this.IDLE_LERP_SPEED);
      } else if (this.idleAlpha > this.idleTarget) {
        this.idleAlpha = Math.max(this.idleTarget, this.idleAlpha - this.IDLE_LERP_SPEED);
      }
      const ctx = this.ctx;
      const titleSize = Math.min(48, width * 0.06);
      const subSize = Math.min(11, width * 0.018);
      ctx.globalAlpha = this.idleAlpha;
      ctx.fillStyle = '#555';
      ctx.font = `${titleSize}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Play some notes', width / 2, height / 2 - 16);
      ctx.font = `${subSize}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = '#b8960a';
      ctx.globalAlpha = this.idleAlpha * 0.85;
      const maxTextWidth = width * 0.85;
      const lines = wrapText(ctx, 'tl;dr: notes that are mathematically more harmonious are closer together spatially \u2014 make it hard to suck!', maxTextWidth);
      const lineHeight = subSize * 1.4;
      lines.forEach((line, i) => {
        ctx.fillText(line, width / 2, height / 2 + 24 + i * lineHeight);
      });
      ctx.globalAlpha = 1;
      return;
    }

    this.drawChordPanel(0, chordW, height, now);
    this.drawNoteRoll(chordW + pianoW, rollW, height, now);
    this.drawPianoKeys(chordW, pianoW, height, now);

    this.ctx.strokeStyle = '#2a2a2a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(chordW, 0);
    this.ctx.lineTo(chordW, height);
    this.ctx.stroke();
  }
```

## Piano Keys Strip

The piano strip draws white keys at full width then black keys on top at 60% width, mimicking a real keyboard cross-section. Active notes get a bright fill overlay; ghost notes get a white outline. C notes are labelled in D-relative octave notation (e.g. "C'" for the octave above D-ref). A thin vertical line on the right edge marks the "now" boundary where notes enter the roll.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  private drawPianoKeys(x: number, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    const midiRange = this.midiMax - this.midiMin + 1;
    const noteH = h / midiRange;

    const isBlackKey = (midi: number): boolean => this.BLACK_KEYS.includes(((midi % 12) + 12) % 12);
    const midiToY = (midi: number): number => h - (midi - this.midiMin + 1) * noteH;

    const activeMidis = new Set<number>();
    for (const n of this.activeNotes.values()) activeMidis.add(n.midiNote);

    const ghostMidi = (this.ghostNote !== null && !activeMidis.has(this.ghostNote))
      ? this.ghostNote
      : null;
```

White keys are drawn first as a base layer. Active notes receive a bright fill overlay; the ghost note (the hovered-but-not-played suggestion) gets a white outline instead.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
    for (let midi = this.midiMin; midi <= this.midiMax; midi++) {
      if (isBlackKey(midi)) continue;
      const ky = midiToY(midi);

      ctx.fillStyle = '#222222';
      ctx.fillRect(x, ky, w, noteH);

      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, ky);
      ctx.lineTo(x + w, ky);
      ctx.stroke();

      if (activeMidis.has(midi)) {
        ctx.fillStyle = '#ffffff33';
        ctx.fillRect(x, ky, w, noteH);
      }
      if (ghostMidi === midi) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, ky + 1, w - 2, noteH - 2);
      }
    }
```

Black keys are drawn in a second pass at 60% width, on top of the white key layer. The same active/ghost treatment applies.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
    for (let midi = this.midiMin; midi <= this.midiMax; midi++) {
      if (!isBlackKey(midi)) continue;
      const ky = midiToY(midi);
      const bw = w * 0.6;

      ctx.fillStyle = '#111111';
      ctx.fillRect(x, ky, bw, noteH);

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, ky, bw, noteH);

      if (activeMidis.has(midi)) {
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect(x, ky, bw, noteH);
      }
      if (ghostMidi === midi) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1, ky + 1, bw - 2, noteH - 2);
      }
    }
```

C notes are labelled right-aligned using D-relative octave notation. A thin bright vertical line marks the right edge as the "now" boundary where notes enter the roll.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
    ctx.font = `bold ${Math.max(6, noteH * 0.75)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let midi = this.midiMin; midi <= this.midiMax; midi++) {
      const pc = ((midi % 12) + 12) % 12;
      if (pc !== 2) continue;
      const ky = midiToY(midi) + noteH / 2;
      ctx.fillText(formatNoteWithOctavePrefix(midi), x + w - 2, ky);
    }

    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, 0);
    ctx.lineTo(x + w, h);
    ctx.stroke();
  }
```

## Note Roll

The roll maps time to horizontal position: `t = now` is the left edge (piano boundary) and `t = now - window` is the right edge. Released notes fade out linearly with age. Active notes are anchored to the left edge and grow rightward; notes wide enough to show a label get their name printed inside the bar.

Background stripes alternate between a slightly darker shade for black-key rows, and horizontal lines mark octave boundaries at each C note.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  private drawNoteRoll(x: number, w: number, h: number, now: number): void {
    const ctx = this.ctx;

    const midiRange = this.midiMax - this.midiMin + 1;
    const noteH = h / midiRange;

    const isBlackKey = (midi: number): boolean => this.BLACK_KEYS.includes(((midi % 12) + 12) % 12);
    const midiToY = (midi: number): number => h - (midi - this.midiMin + 1) * noteH;
    const timeToX = (t: number): number => x + (now - t) / this.historyWindowMs * w;
```

Background stripes alternate between a slightly darker shade for black-key rows. Horizontal lines at each C note mark octave boundaries.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
    for (let midi = this.midiMin; midi <= this.midiMax; midi++) {
      const ky = midiToY(midi);
      ctx.fillStyle = isBlackKey(midi) ? '#0a0808' : '#0d0d0d';
      ctx.fillRect(x, ky, w, noteH);
    }

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let midi = this.midiMin; midi <= this.midiMax; midi++) {
      const pc = ((midi % 12) + 12) % 12;
      if (pc !== 2) continue;
      const ky = midiToY(midi) + noteH;
      ctx.beginPath();
      ctx.moveTo(x, ky);
      ctx.lineTo(x + w, ky);
      ctx.stroke();
    }

    if (this.history.length === 0 && this.activeNotes.size === 0) return;
```

Released notes scroll rightward and fade out linearly with age over the history window. Active (still-held) notes are anchored to the left "now" edge and grow rightward; bars wide enough to show a label get the pitch-class name printed inside.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
    for (const note of this.history) {
      const age = now - note.endTime;
      if (age > this.historyWindowMs) continue;
      const alpha = Math.max(0, 1 - age / this.historyWindowMs);

      const xRight = timeToX(note.endTime);
      const xLeft = timeToX(note.startTime);
      const barW = Math.max(2, xLeft - xRight);
      const ny = midiToY(note.midiNote);

      if (xRight > x + w) continue;

      ctx.fillStyle = noteColor(note.midiNote, alpha * 0.65);
      ctx.fillRect(xRight, ny, barW, Math.max(2, noteH - 1));
    }

    for (const note of this.activeNotes.values()) {
      const xStart = timeToX(note.startTime);
      const barW = Math.max(4, xStart - x);
      const ny = midiToY(note.midiNote);

      ctx.fillStyle = noteColor(note.midiNote, 1.0);
      ctx.fillRect(x, ny, barW, Math.max(2, noteH - 1));

      if (barW > 20) {
        const noteName = this.midiToNoteName(note.midiNote);
        ctx.fillStyle = '#ffffffcc';
        ctx.font = `bold ${Math.max(9, noteH * 0.75)}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(noteName, x + 2, ny + noteH / 2);
      }
    }

    ctx.strokeStyle = '#ffffff22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
```

## Note Name Helpers

One private name formatter for the waterfall. `midiToNoteName` returns a plain pitch class name (e.g. "F#") used for bar labels inside the waterfall where octave context is provided by vertical position. For the chord panel note list, `formatNoteWithOctavePrefix` from `keyboard-layouts` is the canonical single source of truth for D-relative names.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  private midiToNoteName(midi: number): string {
    return pitchClassName(midi);
  }
```

## Chord Panel

The chord panel occupies the leftmost 25% of the canvas. When notes are active, Tonal.js detection yields a primary chord name rendered in the note's color and up to two alternate voicings in grey below it. Active notes are listed below in D-relative octave notation, sorted highest to lowest, colored per pitch class.

``` {.typescript file=_generated/lib/note-history-visualizer.ts}
  private drawChordPanel(x: number, w: number, h: number, _now: number): void {
    const ctx = this.ctx;
    const pad = 12;

    const activeCoords: [number, number, number][] = [];
    for (const n of this.activeNotes.values()) {
      activeCoords.push([n.coordX, n.coordY, 0]);
    }

    const chords = detectChord(activeCoords);
    const chordText = chords.length > 0 ? chords[0] : '';

    const chordY = h * 0.22;
    if (chordText) {
      const firstNote = [...this.activeNotes.values()][0];
      const chordColor = noteColor(firstNote.midiNote, 1);

      ctx.font = `bold ${Math.min(42, w * 0.28)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = chordColor;
      ctx.fillText(chordText, x + pad, chordY);

      if (chords.length > 1) {
        ctx.font = `${Math.min(14, w * 0.1)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#888888';
        ctx.fillText(chords.slice(1, 3).join(' / '), x + pad, chordY + 28);
      }
    } else {
      ctx.font = `bold ${Math.min(28, w * 0.2)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222222';
      ctx.fillText('—', x + pad, chordY);
    }

    const noteNames: string[] = [];
    const sortedNotes = [...this.activeNotes.values()].sort((a, b) => b.midiNote - a.midiNote);
    for (const n of sortedNotes) {
      noteNames.push(formatNoteWithOctavePrefix(n.midiNote));
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
```
