# Note Colors

[OKLCH](https://oklch.com/)-based note color system for the isomorphic grid
keyboard. OKLCH is a
[perceptually uniform](https://en.wikipedia.org/wiki/Color_difference#Tolerance)
color space -- equal numeric steps produce equal *perceived* color differences,
unlike HSL where a 30 degree hue shift near yellow looks very different from the
same shift near blue.

The color wheel has 360 degrees and 12 pitch classes, so each semitone maps to
exactly **30 degrees** of hue. The anchor point is **D = 29 degrees** (OKLCH
red). Adjacent cells on the
[Wicki-Hayden](https://en.wikipedia.org/wiki/Wicki%E2%80%93Hayden_note_layout)
grid are a
[perfect fifth](https://en.wikipedia.org/wiki/Circle_of_fifths) apart (7
semitones), which means they differ by 7 * 30 = **210 degrees** -- nearly
opposite on the hue circle, giving maximum visual contrast between neighbors.

### Hue assignments

Each pitch class maps to a fixed OKLCH hue angle. The table shows both the
chromatic (semitone) order and the
[circle-of-fifths](https://en.wikipedia.org/wiki/Circle_of_fifths) order used by
the grid layout:

| Pitch class | Semitones from C | Hue (degrees) | Grid color region |
|-------------|-----------------|---------------|-------------------|
| C           | 0               | 329           | magenta           |
| C sharp     | 1               | 359           | red-magenta       |
| **D**       | 2               | **29**        | **red (anchor)**  |
| E flat      | 3               | 59            | orange            |
| E           | 4               | 89            | yellow            |
| F           | 5               | 119           | yellow-green      |
| F sharp     | 6               | 149           | green             |
| G           | 7               | 179           | cyan              |
| A flat      | 8               | 209           | blue-cyan         |
| A           | 9               | 239           | blue              |
| B flat      | 10              | 269           | blue-violet       |
| B           | 11              | 299           | violet            |

## OKLCH to sRGB Conversion

The
[OKLCH color space](https://www.w3.org/TR/css-color-4/#ok-lab) represents color
as Lightness (0-1), Chroma (saturation, 0-0.4), and Hue (0-360 degrees). To
render on screen we must convert to sRGB hex strings.

The conversion pipeline is: **OKLCH -> OKLAB -> LMS -> linear sRGB -> gamma sRGB**.

1. OKLCH to OKLAB: polar to cartesian (`a = C * cos(H)`, `b = C * sin(H)`)
2. OKLAB to LMS (cube-root space): multiply by the inverse of the OKLAB matrix
3. LMS cube-root to LMS: cube each component (`l = l_cuberoot ^ 3`)
4. LMS to linear sRGB: multiply by the LMS-to-sRGB matrix
5. Linear to gamma sRGB: apply the
   [sRGB transfer function](https://en.wikipedia.org/wiki/SRGB#Transfer_function_(%22gamma%22))

``` {.typescript file=_generated/lib/note-colors.ts}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
  const hRad = H * Math.PI / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);


  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;


  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;


  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;


  const gamma = (x: number): number =>
    x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x;

  return [
    Math.round(Math.max(0, Math.min(1, gamma(lr))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(lg))) * 255),
    Math.round(Math.max(0, Math.min(1, gamma(lb))) * 255),
  ];
}
```


The `oklchToRgb` result is a triple of 0-255 integers. Two helpers turn that
into the `#rrggbb` hex format used by the Canvas 2D API, and provide a
convenient single-call `oklch(L, C, H)` shorthand.

``` {.typescript file=_generated/lib/note-colors.ts}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function oklch(L: number, C: number, H: number): string {
  return rgbToHex(...oklchToRgb(L, C, H));
}
```


## Chromatic Hue Mapping

The hue formula anchors D at 29 degrees. Since C is 2 semitones below D, C's hue
is `2 * 30 + 329 = 389 = 329 mod 360`. The general formula for pitch class `pc`
(where 0 = C) is:

    hue = (pc * 30 + 329) % 360

The offset 329 comes from: D is pitch class 2, and we want D = 29 degrees, so
`offset = 29 - 2 * 30 = -31`, which wraps to 329 mod 360.

`chromaticHue` converts from circle-of-fifths grid coordinate (where D = 0) to
hue by first recovering the pitch class. Each step on the x-axis is 7 semitones
(a fifth), so `pc = (2 + coordX * 7) mod 12`. The double-modulo idiom
`((n % 12) + 12) % 12` handles negative coordinates correctly in JavaScript
(where `%` can return negative values).

``` {.typescript file=_generated/lib/note-colors.ts}


function pcHue(pc: number): number {
  return (pc * 30 + 329) % 360;
}

function chromaticHue(coordX: number): number {
  const pc = ((2 + coordX * 7) % 12 + 12) % 12;
  return pcHue(pc);
}
```


## Circle-of-Fifths Lookup Table

The grid coordinate system uses the
[circle of fifths](https://en.wikipedia.org/wiki/Circle_of_fifths) for the
x-axis: D is the origin (0), and each step is a perfect fifth (7 semitones).
`COF_FROM_PC` maps standard pitch class numbers (0 = C through 11 = B) to their
circle-of-fifths position relative to D:

| Pitch class | pc | CoF position (D=0) |
|-------------|----|--------------------|
| C           | 0  | -2                 |
| C sharp     | 1  | +5                 |
| D           | 2  | 0                  |
| E flat      | 3  | -5                 |
| E           | 4  | +2                 |
| F           | 5  | -3                 |
| F sharp     | 6  | +4                 |
| G           | 7  | -1                 |
| A flat      | 8  | +6                 |
| A           | 9  | +1                 |
| B flat      | 10 | -4                 |
| B           | 11 | +3                 |

This table is the inverse of the `chromaticHue` mapping: given a MIDI note, find
its pitch class, look up the CoF position, then compute the grid coordinate.

``` {.typescript file=_generated/lib/note-colors.ts}


const COF_FROM_PC: readonly number[] = [
  -2,  // C
   5,  // C#
   0,  // D
  -5,  // D#/Eb
   2,  // E
  -3,  // F
   4,  // F#
  -1,  // G
   6,  // G#/Ab
   1,  // A
  -4,  // A#/Bb
   3,  // B
];
```


## Pre-computed Color Arrays

Two lookup arrays indexed by pitch class (0 = C through 11 = B) provide fast
color access without recomputing OKLCH conversions on every frame.

The OKLCH parameters used:

| Array            | Lightness (L) | Chroma (C) | Purpose                          |
|------------------|---------------|------------|----------------------------------|
| `NOTE_COLORS`    | 0.72          | 0.19       | Vivid -- active notes, history   |
| `NOTE_COLORS_DIM`| 0.32          | 0.07       | Dim -- history trail fade        |

Lightness 0.72 with chroma 0.19 produces saturated, clearly distinguishable
colors. The dim variant drops to lightness 0.32 and chroma 0.07 for a subtle
background presence without visual clutter.

``` {.typescript file=_generated/lib/note-colors.ts}


export const NOTE_COLORS: readonly string[] = Array.from({ length: 12 }, (_, pc) =>
  oklch(0.72, 0.19, pcHue(pc)));

export const NOTE_COLORS_DIM: readonly string[] = Array.from({ length: 12 }, (_, pc) =>
  oklch(0.32, 0.07, pcHue(pc)));
```


## Public API -- Note Color by MIDI Number

`noteColor` is the primary entry point for coloring active notes and
visualizations. It extracts the pitch class from a MIDI note number using the
safe double-modulo pattern, then returns a pre-computed hex string. When an alpha
value other than 1 is needed (for transparency effects), it falls back to
computing an `rgba()` string on the fly.

``` {.typescript file=_generated/lib/note-colors.ts}


export function noteColor(midiNote: number, alpha = 1): string {
  const pc = ((midiNote % 12) + 12) % 12;
  if (alpha === 1) return NOTE_COLORS[pc];
  const [r, g, b] = oklchToRgb(0.72, 0.19, pcHue(pc));
  return `rgba(${r},${g},${b},${alpha})`;
}
```


## Public API -- Color from Grid Coordinate

`colorFromCoordX` converts directly from a circle-of-fifths grid x-coordinate to
a vivid hex color. This is used by the grid renderer when it knows the coordinate
but not the MIDI note number.

``` {.typescript file=_generated/lib/note-colors.ts}

export function colorFromCoordX(coordX: number): string {
  return oklch(0.72, 0.19, chromaticHue(coordX));
}
```


## Cell Colors -- Keyboard Grid States

`cellColors` returns fill and text color pairs for every visual state a grid cell
can be in. The design constraint: parallelogram key shapes must always be visible
against the pure-black canvas background, and sharp/flat vs natural distinction
is conveyed by the note name label, not by brightness differences.

Color is always derived from the circle-of-fifths coordinate (`coordX`) via
`chromaticHue`, never from the actual pitch frequency. This ensures that
enharmonically equivalent notes — and notes that sound the same pitch class
across octaves — always share the same color regardless of tuning.

The OKLCH parameters for each state:

| State              | Fill L | Fill C | Text          | Intent                          |
|--------------------|--------|--------|---------------|---------------------------------|
| active             | 0.72   | 0.19   | white         | vivid saturated key press       |
| target             | 0.96   | 0.03   | black         | near-white highlight for games  |
| target-pressed     | 0.55   | 0.01   | L=0.80, C=0.01| muted confirmation              |
| sustained          | 0.38   | 0.11   | L=0.82, C=0.16| warm glow for held notes        |
| uncalibrated-white | 0.24   | 0      | L=0.50, C=0   | greyscale before MPE calibration|
| uncalibrated-black | 0.24   | 0      | L=0.50, C=0   | greyscale before MPE calibration|
| white              | 0.24   | 0.055  | L=0.75, C=0.14| dark tinted resting state       |
| black              | 0.24   | 0.055  | L=0.75, C=0.14| uniform with white keys         |

The uncalibrated states use chroma 0 (greyscale) because lightness is reserved
for MPE pressure visualization once calibration is complete.

``` {.typescript file=_generated/lib/note-colors.ts}

export function cellColors(
  coordX: number,
  state: 'active' | 'target' | 'target-pressed' | 'sustained' | 'uncalibrated-white' | 'uncalibrated-black' | 'white' | 'black',
): { fill: string; text: string } {
  const h = chromaticHue(coordX);
  switch (state) {
    case 'active':
      return { fill: oklch(0.72, 0.19, h), text: '#ffffff' };
    case 'target':
      return { fill: oklch(0.96, 0.03, h), text: '#000000' };
    case 'target-pressed':
      return { fill: oklch(0.55, 0.01, h), text: oklch(0.80, 0.01, h) };
    case 'sustained':
      return { fill: oklch(0.38, 0.11, h), text: oklch(0.82, 0.16, h) };
    case 'uncalibrated-white':
      return { fill: oklch(0.24, 0, h), text: oklch(0.50, 0, h) };
    case 'uncalibrated-black':
      return { fill: oklch(0.24, 0, h), text: oklch(0.50, 0, h) };
    case 'white':
      return { fill: oklch(0.24, 0.055, h), text: oklch(0.75, 0.14, h) };
    case 'black':
      return { fill: oklch(0.24, 0.055, h), text: oklch(0.75, 0.14, h) };
  }
}
```


## Coordinate Conversions

The grid uses the
[DCompose](https://en.xen.wiki/w/Wicki-Hayden_note_layout) isomorphic layout
where coordinate (0, 0) is D. The x-axis steps through the circle of fifths (7
semitones per step) and the y-axis steps through octaves (12 semitones per step).

`pitchClassFromCoordX` recovers the pitch class (0-11) from a grid x-coordinate
using the same formula as `chromaticHue`.

`coordToMidiNote` computes the MIDI note number from grid coordinates. D at
(0, 0) maps to MIDI 62 (D4 in standard numbering). Each x-step adds 7
semitones and each y-step adds 12:

    midiNote = 62 + coordX * 7 + coordY * 12

`midiToCoord` is the inverse: given a MIDI note number, find the canonical
(shortest-path) grid coordinate. It looks up the pitch class in the
`COF_FROM_PC` table for the x-coordinate, then solves for y using the
pitch-cents formula:

    y = round((pitchCents - x * 700) / 1200)

where `pitchCents = (midi - 62) * 100` measures the interval from D4 in cents.

``` {.typescript file=_generated/lib/note-colors.ts}

export function pitchClassFromCoordX(coordX: number): number {
  return ((2 + coordX * 7) % 12 + 12) % 12;
}

export function coordToMidiNote(coordX: number, coordY: number): number {

  return 62 + coordX * 7 + coordY * 12;
}

export function midiToCoord(midi: number): [number, number] {
  const pitchClass = ((midi % 12) + 12) % 12;
  const x = COF_FROM_PC[pitchClass];
  const pitchCents = (midi - 62) * 100;
  const y = Math.round((pitchCents - x * 700) / 1200);
  return [x, y];
}
```
