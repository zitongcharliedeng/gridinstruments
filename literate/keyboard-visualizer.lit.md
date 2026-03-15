# Keyboard Visualizer

Canvas 2D rendering of a
[DCompose](https://en.xen.wiki/w/DCompose)/[Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
isomorphic keyboard as a tiling of parallelogram cells.

The fundamental invariant: **every pixel maps to exactly one cell**. The grid is
a [Voronoi partition](https://en.wikipedia.org/wiki/Voronoi_diagram) where each
cell is a parallelogram -- no gaps, no overlaps. Inactive cells are shrunk by
`CELL_INSET` to reveal black background as "mortar" between keys. The
`skewFactor` parameter interpolates between the DCompose diagonal layout and
the MidiMech orthogonal layout.

## Imports

The visualizer depends on two sibling modules:

- **keyboard-layouts** provides note naming (`getNoteNameFromCoord`), 12-TET
  equivalents (`get12TETName`), and cent deviation from equal temperament
  (`getCentDeviation`).
- **note-colors** provides the
  [OKLCH](https://oklch.com/)-based `cellColors` function that maps grid
  coordinates and visual states to fill/text color pairs. See
  [note-colors.lit.md](note-colors.lit.md) for the full color system.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
import { getNoteNameFromCoord, get12TETName, getCentDeviation } from './keyboard-layouts';
import { cellColors } from './note-colors';
```

## VisualizerOptions

The options interface controls canvas dimensions, the generator interval pair
(fifth and octave sizes in
[cents](https://en.wikipedia.org/wiki/Cent_(music))), reference pitch, zoom,
and two layout parameters:

- **skewFactor**: interpolates between DCompose (1.0, diagonal parallelograms)
  and MidiMech (0.0, orthogonal rectangles). Values outside 0-1 are allowed for
  extrapolation.
- **bFact**: row-flattening shear toward
  [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
  layout. At 1.0 the wholetone direction becomes fully horizontal.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

export interface VisualizerOptions {
  width: number;
  height: number;
  generator: [number, number];
  d4Hz: number;
  scaleX: number;
  scaleY: number;
  buttonSpacing: number;
  skewFactor: number;
  bFact: number;
}
```

## Button -- internal cell model

Each cell on the grid is represented internally as a `Button`. The `x`/`y`
fields are the screen-space center of the cell (in CSS pixels), while
`coordX`/`coordY` are the lattice coordinates: `coordX` steps through the
[circle of fifths](https://en.wikipedia.org/wiki/Circle_of_fifths) (D = 0) and
`coordY` steps through octaves.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

interface Button {
  x: number;
  y: number;
  coordX: number;
  coordY: number;
  noteName: string;
  isBlackKey: boolean;
  pitchCents: number;
}
```

## CELL_INSET -- mortar between keys

Inactive cells are drawn at 93% of their full size. The remaining 7% reveals
the black canvas background, creating the visual appearance of mortar between
parallelogram bricks. Active, target, and target-pressed cells expand to 100%
to visually "pop" forward.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

const CELL_INSET = 0.93;

```

## Class definition and instance state

The visualizer class owns its `<canvas>` element and 2D rendering context.
Several `Set` and `Map` collections track which cells are in which visual
state -- active (currently pressed), sustained (held by pedal), target (game
mode hint), calibrated, and so on. These are populated by the application layer
and read during each `render()` call.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
export class KeyboardVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buttons: Button[] = [];
  private activeNotes = new Set<string>();
  private sustainedNotes = new Set<string>();
  private targetNotes = new Set<string>();
  private pressedTargetNotes = new Set<string>();
  private calibratedRange: ReadonlySet<string> | null = null;
  private qwertyLabels: Map<string, string> = new Map();
  private mpeExpression: Map<string, { pressure: number; pitchBend: number }> = new Map();

```

### Half-vectors -- parallelogram cell shape

Each cell is a parallelogram defined by two **half-vectors** (`hv1`, `hv2`).
The four corners are at center +/- hv1 +/- hv2. These vectors are recomputed
whenever `generateButtons()` runs (on construction, resize, zoom, or skew
change).

At MidiMech (skewFactor=0), `hv1` is purely horizontal (wholetone direction)
and `hv2` is purely vertical (fourth direction), producing upright rectangles.
At DCompose (skewFactor=1), both vectors are diagonal, producing the
characteristic leaning parallelograms.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  private hv1 = { x: 0, y: 0 };
  private hv2 = { x: 0, y: 0 };


```

### CSS pixel constant

The [W3C CSS specification](https://www.w3.org/TR/css-values-4/#absolute-lengths)
defines 1 CSS pixel as exactly 1/96 of an inch. This is a spec constant, not
a screen measurement. The `window.devicePixelRatio` property separately handles
the mapping from CSS pixels to physical device pixels.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  private readonly cssPxPerInch: number = 96;

```

### Default options and constructor

The defaults produce a 900x400 grid in standard 12-TET tuning (700-cent fifth,
1200-cent octave) with D4 at 293.66 Hz, no skew (MidiMech layout), and no
row-flattening.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  private options: VisualizerOptions = {
    width: 900,
    height: 400,
    generator: [700, 1200],
    d4Hz: 293.66,
    scaleX: 1.0,
    scaleY: 1.0,
    buttonSpacing: 0,
    skewFactor: 0,
    bFact: 0,
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



```

## Canvas setup

The canvas physical pixel buffer is sized to `width * devicePixelRatio` by
`height * devicePixelRatio`, then the 2D context is scaled by `dpr` so that
all subsequent drawing coordinates remain in CSS pixels. The CSS `width`/`height`
style properties are intentionally left unset -- the parent container controls
layout sizing via `width: 100%; height: 100%`.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
    this.canvas.width = this.options.width * dpr;
    this.canvas.height = this.options.height * dpr;
    this.ctx.scale(dpr, dpr);
  }
```

## Public API -- generator and tuning

The generator interval pair `[fifth, octave]` in cents defines the lattice
geometry. Changing the generator recomputes all button positions and re-renders.
For 12-TET the fifth is 700 cents; for
[quarter-comma meantone](https://en.wikipedia.org/wiki/Quarter-comma_meantone)
it is ~696.6 cents.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

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
    return [this.options.generator[0], this.options.generator[1]];
  }
```

## Public API -- zoom and scale

Scale controls independent X/Y stretching of the grid. Both axes are clamped to
[0.2, 5.0]. `setZoom` is a convenience that sets both axes uniformly. Changing
scale recomputes button positions and re-renders.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setScale(scaleX: number, scaleY: number): void {
    this.options.scaleX = Math.max(0.2, Math.min(5.0, scaleX));
    this.options.scaleY = Math.max(0.2, Math.min(5.0, scaleY));
    this.generateButtons();
    this.render();
  }

  setZoom(zoom: number): void {
    this.setScale(zoom, zoom);
  }

  getZoom(): number {
    return (this.options.scaleX + this.options.scaleY) / 2;
  }

  getScale(): { scaleX: number; scaleY: number } {
    return { scaleX: this.options.scaleX, scaleY: this.options.scaleY };
  }
```

## Public API -- button spacing (legacy)

Button spacing is a no-op. The gap between cells is entirely determined by
`CELL_INSET`. These methods exist for API compatibility with older code that
expected a configurable spacing parameter.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setButtonSpacing(_spacing: number): void {
    this.render();
  }

  getButtonSpacing(): number {
    return 0;
  }

  getButtonRadius(): number {
    return Math.min(
      Math.abs(this.hv1.x) + Math.abs(this.hv2.x),
      Math.abs(this.hv1.y) + Math.abs(this.hv2.y),
    );
  }
```

## Public API -- skew factor and bFact

The skew factor interpolates the layout between two endpoint geometries:

| skewFactor | Layout    | Cell shape            | Pitch direction |
|------------|-----------|-----------------------|-----------------|
| 0.0        | MidiMech  | upright rectangles    | diagonal (up-right) |
| 1.0        | DCompose  | leaning parallelograms| vertical        |

`bFact` applies a secondary row-flattening shear. At bFact=1.0 the wholetone
direction becomes horizontal, producing a
[Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
layout with DCompose cell shapes.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setSkewFactor(f: number): void {
    this.options.skewFactor = f;
    this.generateButtons();
    this.render();
  }

  getSkewFactor(): number {
    return this.options.skewFactor;
  }

  setBFact(f: number): void {
    this.options.bFact = f;
    this.generateButtons();
    this.render();
  }

  getBFact(): number {
    return this.options.bFact;
  }

```

## Public API -- grid geometry for external consumers

The `getGridGeometry` method exposes the cell half-vectors and canvas dimensions
so that external overlays (such as
[chord graffiti](chord-graffiti.lit.md)) can position their drawings
relative to the grid cells. The `getGoldenLineY` method returns the vertical
center of the canvas, used by the
[note history waterfall](note-history-visualizer.lit.md) to align its
scrolling display.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

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

```

## Grid geometry -- the spacing engine

The `getSpacing` method is the heart of the layout system. It computes two
pairs of basis vectors (one for DCompose, one for MidiMech) and interpolates
between them using the `skewFactor` parameter.

### DCompose basis vectors

The DCompose layout derives from
[WickiSynth](https://github.com/nicktickn/WickiSynth) by Piers Titus van der
Torren. Given the generator ratio `a = fifth/octave` (approximately 0.583 for
12-TET):

- **b** = sqrt(2a/3 - a^2) gives the horizontal spread for a
  [Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
  hex-like tiling
- The fifth vector leans at approximately 69 degrees from horizontal (the
  [Striso](https://www.striso.org/) angle)
- `dPy` is the octave step in pixels, derived from a piano white key width of
  23.5mm

### Physical key sizing

The cell size targets a standard piano white key width of 23.5mm. Since
`CELL_INSET` (0.93) shrinks the visible key from the full cell, the cell is
inflated to ~25.3mm to compensate. The conversion uses the W3C constant of 96
CSS pixels per inch.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
  private getSpacing(): {
    genX: number; genY0: number; genX1: number; genY1: number;
    cellHv1: { x: number; y: number }; cellHv2: { x: number; y: number };
  } {
    const { generator, skewFactor, scaleX, scaleY, bFact } = this.options;
    const t = skewFactor;
    const a = generator[0] / generator[1];
    const bSq = Math.max(0.001, (2 / 3) * a - a * a);
    const b = Math.sqrt(bSq);

    const PIANO_KEY_MM   = 23.5;   // standard white piano key width
    const KEY_SIZE_MM    = PIANO_KEY_MM / CELL_INSET;  // ~25.3mm cell → 23.5mm visible
    const MM_PER_INCH    = 25.4;
    const dPy = 2 * Math.round(KEY_SIZE_MM / MM_PER_INCH * this.cssPxPerInch);
    const dGenX  = Math.max(28, b * dPy);        // Striso X spread (min 28px for readability)
    const dGenY0 = a * dPy;                       // fifth Y lean (pitch-proportional)
    const dGenX1 = 0;                              // octave = pure vertical at DCompose
    const dGenY1 = dPy;                            // octave step
```

### MidiMech basis vectors

The MidiMech layout uses a simpler coordinate system where:

- Fifth = 1 wholetone-cell right + 1 fourth-cell up, giving vector (mCS, mCS)
- Octave = 1 wholetone-cell right + 2 fourth-cells up, giving vector (mCS, 2*mCS)

This makes the wholetone direction (2*fifth - octave) purely horizontal and the
fourth direction (-fifth + octave) purely vertical, producing an orthogonal
rectangular grid.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
    const mCS    = dPy * 0.5;
    const mGenX  = mCS;
    const mGenY0 = mCS;
    const mGenX1 = mCS;
    const mGenY1 = 2 * mCS;
```

### Interpolation and row-flattening

The final basis vectors are a linear interpolation between DCompose (t=0) and
MidiMech (t=1), scaled by `scaleX`/`scaleY`. The `bFact` parameter then
applies a secondary shear that pushes `genY0` toward `genY1/2`, making the
wholetone direction horizontal (Wicki-Hayden-style flat rows).

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
    const genX  = (dGenX  + t * (mGenX  - dGenX))  * scaleX;
    let   genY0 = (dGenY0 + t * (mGenY0 - dGenY0)) * scaleY;
    const genX1 = (dGenX1 + t * (mGenX1 - dGenX1)) * scaleX;
    const genY1 = (dGenY1 + t * (mGenY1 - dGenY1)) * scaleY;
    genY0 = genY0 + bFact * (genY1 / 2 - genY0);
```

### Cell half-vectors from the reduced lattice basis

The tiling vectors are derived from the interpolated basis by computing the
[reduced basis](https://en.wikipedia.org/wiki/Lattice_reduction) of the pitch
lattice:

- **wholetone** = 2 * fifth - octave (the horizontal-ish cell axis)
- **fourth** = -fifth + octave (the vertical-ish cell axis)

These ALWAYS tile perfectly because they form a reduced basis of the lattice,
regardless of the skew factor. At DCompose both vectors are diagonal
(parallelograms). At MidiMech they align with the axes (rectangles). At any
intermediate value the tiling remains valid.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
    const cellHv1 = {
      x: (2 * genX - genX1) / 2,
      y: -(2 * genY0 - genY1) / 2,
    };
    const cellHv2 = {
      x: (-genX + genX1) / 2,
      y: (genY0 - genY1) / 2,
    };

    return { genX, genY0, genX1, genY1, cellHv1, cellHv2 };
  }

```

## Button generation -- populating the grid

`generateButtons` fills the `buttons` array with all cells whose centers fall
within (or near) the visible canvas. It iterates over a grid of `(i, j)`
coordinates where `i` is the circle-of-fifths index and `j` is the octave
index. The iteration range scales inversely with zoom so that the visible area
is always fully covered.

Each cell's screen position is computed from the basis vectors:

    screenX = centerX + i * genX + j * genX1
    screenY = centerY - (i * genY0 + j * genY1)

Cells far off-screen are culled. The array is sorted by Y coordinate (back to
front) so that active cells render on top of their neighbors.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
  private generateButtons(): void {
    this.buttons = [];

    const { width, height } = this.options;
    const { genX, genY0, genX1, genY1, cellHv1, cellHv2 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    this.hv1 = cellHv1;
    this.hv2 = cellHv2;

    const effectiveScale = Math.min(this.options.scaleX, this.options.scaleY, 1);
    const iRange = Math.min(80, Math.ceil(20 / effectiveScale));
    const jRange = Math.min(48, Math.ceil(12 / effectiveScale));

    for (let i = -iRange; i <= iRange; i++) {
      for (let j = -jRange; j <= jRange; j++) {
        const screenX = centerX + i * genX + j * genX1;
        const screenY = centerY - (i * genY0 + j * genY1);

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

    this.buttons.sort((a, b) => a.y - b.y);
  }

```

## Note state setters -- active notes and MIDI lookup

The application layer drives the visualizer by setting which cells are in each
state. Note IDs use the format `"coordX_coordY"` (e.g. `"0_0"` for D4,
`"1_0"` for A4).

`getCellIdsForMidiNotes` maps MIDI note numbers back to cell IDs. Because the
isomorphic grid has multiple positions for the same pitch (enharmonic
equivalents at different octave offsets), this returns ALL matching cells.
The MIDI formula is: `midi = 62 + coordX * 7 + coordY * 12` (D4 = MIDI 62,
each fifth = 7 semitones, each octave = 12).

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
  setActiveNotes(noteIds: string[]): void {
    this.activeNotes = new Set(noteIds);
  }

  getCellIdsForMidiNotes(midiNotes: ReadonlySet<number>): string[] {
    const result: string[] = [];
    for (const b of this.buttons) {
      const midi = 62 + b.coordX * 7 + b.coordY * 12;
      if (midiNotes.has(midi)) result.push(`${b.coordX}_${b.coordY}`);
    }
    return result;
  }

  getCellIdsForPitchCents(pitchCentsSet: ReadonlySet<number>, fifth: number): string[] {
    const result: string[] = [];
    for (const b of this.buttons) {
      const pc = Math.round(b.coordX * fifth + b.coordY * 1200);
      if (pitchCentsSet.has(pc)) result.push(`${b.coordX}_${b.coordY}`);
    }
    return result;
  }

  setSustainedNotes(noteIds: string[]): void {
    this.sustainedNotes = new Set(noteIds);
  }

  setTargetNotes(noteIds: string[]): void {
    this.targetNotes = new Set(noteIds);
  }

  setPressedTargetNotes(noteIds: string[]): void {
    this.pressedTargetNotes = new Set(noteIds);
  }
```

## Calibration visual feedback

When an [MPE](https://www.midi.org/midi-articles/midi-polyphonic-expression-mpe)
controller is being calibrated, only the cells within the calibrated range
should appear in color. Cells outside the range are rendered in greyscale
(chroma = 0 in OKLCH) to visually communicate "this key is not yet mapped."
Setting `calibratedRange` to `null` disables the overlay and all cells render
normally.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setCalibratedRange(range: ReadonlySet<string> | null): void {
    this.calibratedRange = range;
  }
```

## QWERTY key label overlay

When the QWERTY overlay is enabled, each cell can display a keyboard shortcut
label (e.g. "Q", "W", "E") in its top-left corner. The labels are passed as a
Map from note ID to key string. See the QWERTY rendering code in
[drawCell](#rendering-a-single-cell----drawcell) for the visual treatment:
yellow text on a semi-transparent black pill for maximum contrast.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setQwertyLabels(labels: Map<string, string>): void {
    this.qwertyLabels = labels;
  }
```

## MPE expression state

[MPE (MIDI Polyphonic Expression)](https://www.midi.org/midi-articles/midi-polyphonic-expression-mpe)
provides per-note pressure and pitch bend data. The visualizer stores this as a
Map from note ID to `{ pressure, pitchBend }` and uses it during rendering to
modulate cell appearance:

- **Pressure** (0-1): controls cell opacity. At pressure=0 the cell renders at
  85% opacity; at pressure=1 it renders at 100%. This subtle dimming makes
  light touches visually distinct from firm presses.
- **Pitch bend** (-1 to +1): overlays the color of the target pitch. A bend of
  +0.5 (one semitone up) blends toward the color of the note one fifth-step
  away, providing real-time visual feedback of where the pitch is heading.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  setMPEExpression(expressions: Map<string, { pressure: number; pitchBend: number }>): void {
    this.mpeExpression = expressions;
  }

  setGameState(_state: string): void {
    this.render();
  }

  setGameProgress(_currentIndex: number, _totalGroups: number, _elapsedMs: number): void {
    this.render();
  }

```

## Rendering pipeline -- render()

The render loop is intentionally simple: clear to black, draw every cell, then
draw the overlay lines. The cell loop runs over the pre-sorted `buttons` array
(back-to-front by Y) so that active cells paint over their inactive neighbors.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
  render(): void {
    const { width, height } = this.options;

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    for (const button of this.buttons) {
      this.drawCell(button);
    }

    this.drawPitchLines();
  }
```

## Pitch lines and axis overlays

After all cells are drawn, `drawPitchLines` renders two labeled axis lines
through the grid center and a set of faint vertical guide lines:

1. **Pitch axis**: follows the octave direction (genX1, -genY1), passing
   through every D cell. At DCompose this is vertical; at MidiMech it is
   diagonal.
2. **Circle of Fifths axis**: the iso-pitch direction, perpendicular to pitch
   in the lattice. Computed as octave * fifthVector - fifth * octaveVector.
3. **Origin marker**: a small white dot at the grid center (D4).
4. **Fifth index lines**: faint lines through each column of same-fifth-index
   cells, extending in the octave direction. Alpha fades with distance from
   center.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  private drawPitchLines(): void {
    const { width, height } = this.options;
    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const centerX = width / 2;
    const centerY = height / 2;
    const fifth = this.options.generator[0];
    const octave = this.options.generator[1];

    const pitchDx = genX1;
    const pitchDy = -genY1;
    const cofDx = octave * genX - fifth * genX1;
    const cofDy = fifth * genY1 - octave * genY0;
    this.drawAxisLine(centerX, centerY, cofDx, cofDy, 'Circle of Fifths');

    this.drawAxisLine(centerX, centerY, pitchDx, pitchDy, 'Pitch');
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    this.ctx.fill();
    this.drawFifthIndexLines(
      centerX, centerY,
      genX, -genY0,
      genX1, -genY1,
    );

  }


```

## Fifth index lines

These faint guide lines connect cells that share the same circle-of-fifths
index (same pitch class), running in the octave direction. They help the player
visually track octave transpositions of the same note. The alpha decreases with
distance from the center so that edge columns are nearly invisible.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}


  private drawFifthIndexLines(
    cx: number, cy: number,
    genX: number, genY0: number,
    genX1: number, genY1: number,
  ): void {
    const octLen = Math.sqrt(genX1 * genX1 + genY1 * genY1);
    if (octLen < 0.01) return;
    const octNx = genX1 / octLen;
    const octNy = genY1 / octLen;

    const visibleFifths = new Set<number>();
    let maxAbsI = 1;
    for (const b of this.buttons) {
      if (b.coordX !== 0) visibleFifths.add(b.coordX);
      maxAbsI = Math.max(maxAbsI, Math.abs(b.coordX));
    }

    const { width: w, height: h } = this.options;
    const halfLen = Math.sqrt(w * w + h * h) * 2;

    this.ctx.save();
    for (const i of visibleFifths) {
      const ax = cx + i * genX;
      const ay = cy + i * genY0;
      const alpha = Math.max(0.03, 0.12 - (Math.abs(i) / maxAbsI) * 0.06);

      this.ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      this.ctx.lineWidth = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(ax - octNx * halfLen, ay - octNy * halfLen);
      this.ctx.lineTo(ax + octNx * halfLen, ay + octNy * halfLen);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }


```

## Labeled axis line with arrowhead

`drawAxisLine` draws a semi-transparent white line through the canvas center in
a given direction, with a filled arrowhead at the positive end and a rotated
text label near the tip. The arrowhead is positioned where the line hits the
canvas edge (with a 60px margin). The label text rotates to follow the axis
direction but flips to remain left-to-right readable.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

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

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - nx * ext, cy - ny * ext);
    this.ctx.lineTo(cx + nx * ext, cy + ny * ext);
    this.ctx.stroke();
```

The arrowhead tip position is found by ray-casting from the center along the
axis direction and finding the nearest canvas edge intersection, inset by a
60px margin. The arrowhead itself is a filled isoceles triangle with an opening
angle of 2 * PI/7 radians (approximately 51 degrees).

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

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
```

The label is positioned near the arrowhead, offset perpendicularly from the
axis by 14px. The text is rotated to follow the axis direction, but if the
angle would make the text upside-down (outside -90 to +90 degrees), it is
flipped by PI radians to remain readable.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

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

```

## Rendering a single cell -- drawCell

`drawCell` is the most complex rendering method. It handles eight visual states
and three overlay systems (MPE expression, note labels, QWERTY labels).

### Cell state determination

Each cell's visual state is determined by a priority cascade:

1. **active** -- currently pressed (MIDI note-on or mouse/touch)
2. **target-pressed** -- game mode target that has been correctly pressed
3. **target** -- game mode target awaiting press (near-white highlight)
4. **sustained** -- held by sustain pedal after key release
5. **uncalibrated-white/black** -- outside MPE calibration range (greyscale)
6. **white/black** -- default resting state (dark tinted)

The `cellColors` function from the OKLCH color system returns the fill and text
colors for the resolved state.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  private drawCell(button: Button): void {
    const { x, y, coordX, coordY, noteName, isBlackKey } = button;
    const noteId = `${coordX}_${coordY}`;

    const isActive = this.activeNotes.has(noteId);
    const isTarget = this.targetNotes.has(noteId) && !isActive;
    const isTargetPressed = isTarget && this.pressedTargetNotes.has(noteId);
    const isTargetUnpressed = isTarget && !this.pressedTargetNotes.has(noteId);
    const isSustained = this.sustainedNotes.has(noteId) && !isActive;
    const isUncalibrated = this.calibratedRange !== null && !this.calibratedRange.has(noteId);

    const state: 'active' | 'target' | 'target-pressed' | 'sustained' | 'uncalibrated-white' | 'uncalibrated-black' | 'white' | 'black' = isActive ? 'active'
      : isTargetPressed ? 'target-pressed'
      : isTargetUnpressed ? 'target'
      : isSustained ? 'sustained'
      : isUncalibrated ? (isBlackKey ? 'uncalibrated-black' : 'uncalibrated-white')
      : isBlackKey ? 'black'
      : 'white';
    const { fill: fillColor, text: textColor } = cellColors(coordX, state);
```

### MPE pressure -- opacity modulation

When MPE expression data is available for an active cell, the pressure value
(0-1) modulates the cell's opacity. At zero pressure the cell renders at 85%
opacity; at full pressure it renders at 100%. This creates a subtle visual
distinction between light and firm touches without making lightly-pressed keys
invisible.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

    const mpeExpr = this.mpeExpression.get(noteId);
    let cellAlpha = 1.0;
    if (mpeExpr && isActive) {
      cellAlpha = 0.85 + mpeExpr.pressure * 0.15;
    }
```

### Parallelogram drawing

The cell shape is drawn as a four-vertex polygon using the half-vectors. The
scale factor `s` is 1.0 for active/target cells (filling the full cell area) or
`CELL_INSET` (0.93) for inactive cells (revealing mortar). The four corners are
computed as center +/- (hv1 * s) +/- (hv2 * s).

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

    const { hv1, hv2 } = this;
    const s = (isActive || isTargetPressed || isTargetUnpressed) ? 1.0 : CELL_INSET;

    const h1x = hv1.x * s, h1y = hv1.y * s;
    const h2x = hv2.x * s, h2y = hv2.y * s;

    const px = (a: number, b: number): number => x + a * h1x + b * h2x;
    const py = (a: number, b: number): number => y + a * h1y + b * h2y;

    this.ctx.beginPath();
    this.ctx.moveTo(px(-1, -1), py(-1, -1));
    this.ctx.lineTo(px( 1, -1), py( 1, -1));
    this.ctx.lineTo(px( 1,  1), py( 1,  1));
    this.ctx.lineTo(px(-1,  1), py(-1,  1));
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.globalAlpha = cellAlpha;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
```

### MPE pitch bend -- color slide

When an active cell has a pitch bend value exceeding 0.01 (in semitone units),
the cell is overlaid with the OKLCH color of the target pitch. The bend is
quantized to whole steps (rounded to nearest `bendSteps = round(pitchBend * 2)`)
and the target color is fetched from `cellColors(coordX + bendSteps, 'active')`.

The overlay alpha is proportional to the bend magnitude (capped at 0.75), so a
small bend produces a subtle color tint while a full-semitone bend produces a
strong overlay. This gives the player real-time visual feedback of where
their pitch bend is heading on the
[circle of fifths](https://en.wikipedia.org/wiki/Circle_of_fifths) color wheel.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

    if (mpeExpr && isActive && Math.abs(mpeExpr.pitchBend) > 0.01) {
      const bendSteps = Math.round(mpeExpr.pitchBend * 2);
      if (bendSteps !== 0) {
        const { fill: bendFill } = cellColors(coordX + bendSteps, 'active');
        this.ctx.globalAlpha = Math.min(0.75, Math.abs(mpeExpr.pitchBend) * 0.8);
        this.ctx.fillStyle = bendFill;
        this.ctx.beginPath();
        this.ctx.moveTo(px(-1, -1), py(-1, -1));
        this.ctx.lineTo(px( 1, -1), py( 1, -1));
        this.ctx.lineTo(px( 1,  1), py( 1,  1));
        this.ctx.lineTo(px(-1,  1), py(-1,  1));
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
      }
    }
```

### Note name label

Each cell displays its note name (e.g. "D", "A", "Eb") centered in the cell.
The font size scales with the smaller cell dimension (38% of `cellMin`, clamped
to 10-22px).

When the generator is not standard 12-TET, or when a note's circle-of-fifths
name differs from its 12-TET equivalent, a **bracket sub-label** appears below
the main name showing the 12-TET pitch and/or cent deviation. For example, a
note named "D" that is 6 cents sharp of 12-TET D would show `(+6c)` below.
The sub-label renders at 60% of the main font size and 60% opacity.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

    const cellW = (Math.abs(hv1.x) + Math.abs(hv2.x)) * 2;
    const cellH = (Math.abs(hv1.y) + Math.abs(hv2.y)) * 2;
    const cellMin = Math.min(cellW, cellH);
    const fontSize = Math.max(10, Math.min(22, cellMin * 0.38));
    this.ctx.fillStyle = textColor;
    this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
    this.ctx.textAlign = 'center';
    const fifth = this.options.generator[0];
    const tetName = get12TETName(coordX);
    const deviation = getCentDeviation(coordX, fifth);
    const hasBracket = noteName !== tetName || Math.abs(deviation) >= 0.5;

    const midi = 62 + coordX * 7 + coordY * 12;
    const dRefOctave = Math.floor((midi - 62) / 12);
    const octStr = dRefOctave === 0 ? '' : (dRefOctave > 0 ? "'".repeat(dRefOctave) : ','.repeat(-dRefOctave));
```

When `hasBracket` is true and the cell is large enough, the note name renders flush to the baseline and the sub-label (showing 12-TET name and/or cent deviation) appears below it at 60% size and 60% opacity.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
    if (hasBracket && cellMin > 30) {
      this.ctx.textBaseline = 'bottom';
      if (octStr) {
        const nameW = this.ctx.measureText(noteName).width;
        const octFont = Math.max(6, fontSize * 0.45);
        this.ctx.font = `${octFont}px "JetBrains Mono", monospace`;
        this.ctx.textAlign = 'right';
        const octY = dRefOctave > 0
          ? y - fontSize * 0.85
          : y + octFont * 0.15;
        this.ctx.fillText(octStr, x - nameW / 2 - 1, octY);
        this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        this.ctx.textAlign = 'center';
      }
      this.ctx.fillText(noteName, x, y);
      const subSize = Math.max(7, fontSize * 0.6);
      this.ctx.font = `${subSize}px "JetBrains Mono", monospace`;
      this.ctx.fillStyle = textColor;
      this.ctx.globalAlpha = 0.6;
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
```

Without a bracket sub-label the note name is simply vertically centred. The octave superscript, when present, is positioned relative to the measured text width so it sits just left of the note name.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
      this.ctx.textBaseline = 'middle';
      if (octStr) {
        const nameW = this.ctx.measureText(noteName).width;
        const octFont = Math.max(6, fontSize * 0.45);
        this.ctx.font = `${octFont}px "JetBrains Mono", monospace`;
        this.ctx.textAlign = 'right';
        const octY = dRefOctave > 0
          ? y - fontSize * 0.35
          : y + fontSize * 0.15;
        this.ctx.fillText(octStr, x - nameW / 2 - 1, octY);
        this.ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
        this.ctx.textAlign = 'center';
      }
      this.ctx.fillText(noteName, x, y);
    }
    this.ctx.globalAlpha = 1;
```

### QWERTY key overlay

When QWERTY labels are enabled (for beginner key discovery), each mapped cell
shows its keyboard shortcut in the top-left corner. The label uses a
high-contrast treatment: yellow text (#ffff00) on a semi-transparent black pill
(rgba(0,0,0,0.7)). The pill is sized dynamically from `measureText` to fit any
key label width.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

    const qLabel = this.qwertyLabels.get(noteId);
    if (qLabel) {
      const qSize = Math.max(10, fontSize * 0.5);
      this.ctx.font = `bold ${qSize}px "JetBrains Mono", monospace`;
      const metrics = this.ctx.measureText(qLabel);
      const pad = 3;
      const kw = metrics.width + pad * 2 + 2;
      const kh = qSize + pad * 2 + 2;
      const corners = [
        { x: hv1.x + hv2.x, y: hv1.y + hv2.y },
        { x: hv1.x - hv2.x, y: hv1.y - hv2.y },
        { x: -hv1.x + hv2.x, y: -hv1.y + hv2.y },
        { x: -hv1.x - hv2.x, y: -hv1.y - hv2.y },
      ];
      corners.sort((a, b) => b.y - a.y || a.x - b.x);
      const bl = corners[0];
      const lx = x + bl.x + 2;
      const ly = y + bl.y - kh;
      this.ctx.fillStyle = '#222';
      this.ctx.fillRect(lx, ly + 2, kw, kh);
      this.ctx.fillStyle = '#444';
      this.ctx.fillRect(lx, ly, kw, kh);
      this.ctx.fillStyle = '#555';
      this.ctx.fillRect(lx + 1, ly + 1, kw - 2, kh - 3);
      this.ctx.fillStyle = '#ddd';
      this.ctx.globalAlpha = 1;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(qLabel, lx + pad + 1, ly + pad);
    }
  }

```

## Resize

`resize` updates the canvas dimensions, re-initializes the pixel buffer and 2D
context scaling, regenerates all button positions, and re-renders.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}
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
```

## Hit detection -- Voronoi nearest-neighbor

`getButtonAtPoint` maps a screen coordinate to the nearest grid cell. Because
the grid is a parallelogram Voronoi partition, this is equivalent to solving a
2x2 linear system to find the fractional lattice coordinates, then checking the
nearest integer neighbors.

The screen-to-lattice inversion solves:

    dx = i * genX + j * genX1
    dy = i * genY0 + j * genY1

using [Cramer's rule](https://en.wikipedia.org/wiki/Cramer%27s_rule):

    det = genX * genY1 - genX1 * genY0
    i = (dx * genY1 - genX1 * dy) / det
    j = (genX * dy - dx * genY0) / det

The fractional `(i, j)` is rounded to the nearest integer, then a small
neighborhood (radius 2 in each direction) is searched for the minimum Euclidean
distance. A full-scan fallback handles edge cases where the restricted search
misses. This approach is O(N) worst case but O(1) expected for well-behaved
grids.

``` {.typescript file=_generated/lib/keyboard-visualizer.ts}

  getButtonAtPoint(screenX: number, screenY: number): { coordX: number; coordY: number; noteId: string } | null {
    if (this.buttons.length === 0) return null;

    const { genX, genY0, genX1, genY1 } = this.getSpacing();
    const { width, height } = this.options;
    const dx = screenX - width / 2;
    const dy = -(screenY - height / 2);
    const det = genX * genY1 - genX1 * genY0;
    const iFloat = det !== 0 ? (dx * genY1 - genX1 * dy) / det : 0;
    const jFloat = det !== 0 ? (genX * dy - dx * genY0) / det : 0;

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
```
