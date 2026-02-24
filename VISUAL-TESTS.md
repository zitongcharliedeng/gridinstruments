> **⚠️ DEPRECATED**: The Playwright tests in `tests/` are the canonical source of truth.
> Each test includes `@reason` and `@design-intent` explaining the design decision.
> This file is preserved as historical reference only. Do not update it — update the tests instead.

---

# DCompose Web — Visual Test Invariants

**For use by multimodal agents (screenshot + vision LLM verification).**

Each invariant is a single atomic design decision that can be verified from a screenshot.
The agent should take a screenshot, then check each invariant one by one.

See `AGENTS.md` for the testing workflow and tooling instructions.

---

## How to Use This File

1. Start the dev server: `npm run dev` (default: http://localhost:5173)
2. Open the URL in a browser (Playwright or headless Chrome)
3. Take a full-page screenshot at 1920x1080 resolution
4. For each invariant below, verify using vision LLM analysis
5. For slider-state tests, interact with sliders programmatically before screenshotting
6. Report PASS/FAIL for each invariant with a brief explanation

---

## State 1: Default (DCompose Layout, 12-TET)

This is the initial page load state. No user interaction needed.

### Global Styling
- [ ] `GS-01` Background is pure black (#000) — no dark gray, no gradients
- [ ] `GS-02` All text is white (#fff) or dim gray (#666) — no other text colors except accent colors
- [ ] `GS-03` Font is JetBrains Mono everywhere — monospace, no serif/sans-serif fallback visible
- [ ] `GS-04` No rounded corners on any container, panel, or control element (border-radius: 0)
- [ ] `GS-05` No gradients on any chrome/UI element (only canvas content may have color gradients)

### Title Bar
- [ ] `TB-01` "DCompose Web" title text is visible, centered horizontally at top of page
- [ ] `TB-02` GitHub button group is adjacent to the title (octicon + Star + Report a bug)
- [ ] `TB-03` Title bar floats/overlays on top of the history canvas — does NOT take its own full-width row
- [ ] `TB-04` Title bar has z-index above the canvas content beneath it

### Header Bar
- [ ] `HB-01` MIDI button is pinned to the LEFT side of the header
- [ ] `HB-02` Quote text is on the RIGHT side of the header, filling remaining space
- [ ] `HB-03` Quote text is readable — golden/colored, not too small, with visible quotation marks
- [ ] `HB-04` Wave, Layout, Vol controls are between MIDI button and quote
- [ ] `HB-05` VIBRATO and SUSTAIN indicators are hidden (not active at load)

### Note History Canvas
- [ ] `NH-01` History canvas strip is visible at top (220px height)
- [ ] `NH-02` Three panels visible: staff (left ~23%), waterfall (center ~50%), chord (right ~27%)
- [ ] `NH-03` Canvas has a 1px border (#333)
- [ ] `NH-04` No MIDI status indicator visible on the history canvas (status is only in MIDI settings)

### Keyboard Canvas (DCompose Layout)
- [ ] `KC-01` Keyboard grid fills the main content area (flex: 1, min-height: 380px)
- [ ] `KC-02` Cells are **parallelograms** (leaning shapes), NOT circles or rectangles
- [ ] `KC-03` Cells lean diagonally — consistent with DCompose/Wicki-Hayden stagger (skew=1.0)
- [ ] `KC-04` No gaps between cells — edges touch (continuous surface, CELL_INSET=0.93 shows thin mortar)
- [ ] `KC-05` No overlapping cells — each cell has its own distinct space
- [ ] `KC-06` D is at the center of the grid (golden D-line visible)
- [ ] `KC-07` Note names are visible on each cell — readable size, white text
 [ ] `KC-08` Double sharps render as 𝄪, double flats as 𝄫 (proper Unicode musical glyphs, not Fx/Bbb ASCII)
- [ ] `KC-09` Cell colors are chromesthesia-based — different pitch classes have distinct hues
- [ ] `KC-10` Adjacent cells on the grid (fifths apart) have high color contrast (near-complementary hues)
- [ ] `KC-11` D cell is red/reddish (root color)
- [ ] `KC-12` Grid cells render BENEATH the axis lines (axes visible on top)
- [ ] `KC-13` Two axis lines visible through center: CoF axis and Pitch axis (white lines)
- [ ] `KC-14` Pitch axis is vertical in DCompose mode (skew=1.0)
- [ ] `KC-15` Grid cells fade out near canvas edges (vignette effect)
- [ ] `KC-16` Axis labels are readable, not covered by grid cells
- [ ] `KC-17` AWD keys (physical keyboard) should map to a major chord shape on the grid

### Controls Strip
- [ ] `CS-01` Tuning slider is wide (300px+), not cramped
- [ ] `CS-02` Tuning slider shows "700.0" and "= 12-TET" at default
- [ ] `CS-03` TET preset buttons visible below the tuning slider as a row
- [ ] `CS-04` 12-TET preset button is highlighted/active at default
- [ ] `CS-05` Preset buttons include: 5-TET, 7-TET, 12-TET, 17-TET, 19-TET, 31-TET, Pythagorean, 1/4 Meantone (at minimum)
- [ ] `CS-06` Skew slider shows "MidiMech" on left end, "DCompose" on right end
- [ ] `CS-07` Skew slider is at least 200px wide
- [ ] `CS-08` Skew slider is at the DCompose end (right/max) at default
 [ ] `CS-09` Zoom slider visible in controls strip (range input)
 [ ] `CS-10` Zoom reset button (↻) visible next to zoom slider
 [ ] `CS-11` Default zoom shows approximately 3–4 octaves on desktop (1920x1080)

### Chord Shape Graffiti
- [ ] `CG-01` At least one major chord triangle shape (yellow, spray-painted) is visible on the page
- [ ] `CG-02` At least one minor chord inverted triangle shape (yellow, spray-painted) is visible
- [ ] `CG-03` Chord shapes have rough/hand-drawn edges (not perfect geometric shapes)
- [ ] `CG-04` Chord shapes are yellow/gold (#FFD700 or similar) on black background
- [ ] `CG-05` Chord shapes use `mix-blend-mode: screen` effect (additive glow, no dark box)
- [ ] `CG-06` Scribbled text labels visible near shapes ("psst... this is a major chord" or similar)
- [ ] `CG-07` Chord shapes do NOT have their own container/section — they float over existing content
- [ ] `CG-08` Chord shapes do not block interaction with underlying elements

### About Section
- [ ] `AB-01` About section is visible with "ABOUT" heading
- [ ] `AB-02` Three columns: Isomorphic Layout, Creator, This Project
- [ ] `AB-03` Links to Striso, Wicki-Hayden Wikipedia, MidiMech, WickiSynth present
- [ ] `AB-04` Creator social links present (GitHub, YouTube, Instagram, TikTok)

### Footer
- [ ] `FT-01` Footer credits visible: WickiSynth, MIDImech, Striso
- [ ] `FT-02` GitHub link in footer

---

## State 2: MidiMech Layout (Skew Slider at 0.0)

**Setup**: Move the skew slider (#skew-slider) to value 0.0 (leftmost position).

### Keyboard Canvas (MidiMech Layout)
- [ ] `MM-01` Cells are now **rectangles** (no lean) — MidiMech orthogonal grid
- [ ] `MM-02` Grid rows are horizontal (no diagonal stagger)
- [ ] `MM-03` Right = whole tone (+2 semitones), Up = fourth (+5 semitones) relationship maintained
- [ ] `MM-04` Pitch axis now leans to the right (it tilts with skew)
- [ ] `MM-05` CoF axis is now horizontal
- [ ] `MM-06` Major chord on the grid forms a triangle pointing UP
- [ ] `MM-07` Minor chord on the grid forms an inverted triangle pointing DOWN

### Chord Shape Graffiti (MidiMech)
- [ ] `MM-08` Chord shape graffiti has updated to match the rectangular MidiMech grid geometry
- [ ] `MM-09` The major triangle graffiti shape matches the actual grid cell arrangement at skew=0

### Skew Slider
- [ ] `MM-10` Skew slider is at the MidiMech end (left/min)
- [ ] `MM-11` "MidiMech" label is on the left end of the slider
- [ ] `MM-12` Slider value or state name visible within/near the slider

---

## State 3: Mid-Skew (Slider at 0.5)

**Setup**: Move the skew slider (#skew-slider) to value 0.5.

- [ ] `MS-01` Cells are parallelograms with intermediate lean (between rectangle and full DCompose lean)
- [ ] `MS-02` Both axis lines visible, at intermediate angles
- [ ] `MS-03` Chord shape graffiti geometry matches the intermediate grid state

---

## State 4: TET Variation Tests

### 19-TET (fifth = 694.74 cents)
**Setup**: Click the 19-TET preset button or set slider to 694.74.
- [ ] `T19-01` Slider shows approximately "694.7" value
- [ ] `T19-02` Nearest marker shows "= 19-TET" (green text)
- [ ] `T19-03` 19-TET preset button is highlighted
- [ ] `T19-04` Grid layout has adjusted — cells may be spaced differently due to different fifth size
- [ ] `T19-05` Note labels still readable

### 5-TET (fifth = 720 cents)
**Setup**: Click the 5-TET preset button or set slider to 720.
- [ ] `T5-01` Slider shows "720.0" value
- [ ] `T5-02` Nearest marker shows "= 5-TET" (green text)
- [ ] `T5-03` Grid layout reflects wider fifth interval
- [ ] `T5-04` Fewer distinct note names visible (5-TET has only 5 notes per octave)

### 7-TET (fifth = 685.71 cents)
**Setup**: Click the 7-TET preset button or set slider to 685.71.
- [ ] `T7-01` Slider shows approximately "685.7" value
- [ ] `T7-02` Nearest marker shows "= 7-TET" (green text)
- [ ] `T7-03` Grid layout reflects narrower fifth interval

---

## State 5: Interactive Behavior Tests

These require interaction beyond just taking screenshots:

### Keyboard Input
- [ ] `IB-01` Pressing A key: a note sounds AND the corresponding cell on the keyboard canvas lights up
- [ ] `IB-02` Pressing A+W+D simultaneously: three cells light up forming a triangle (major chord)
- [ ] `IB-03` Chord panel shows "D" or "Dmaj" when A+W+D are held
- [ ] `IB-04` Waterfall panel shows three colored bars scrolling left when A+W+D held
- [ ] `IB-05` Staff panel shows note heads when keys are held

### Slider Focus
- [ ] `IB-06` After clicking the volume slider, pressing a letter key still plays a note (focus not stolen)
- [ ] `IB-07` After clicking the tuning slider, pressing a letter key still plays a note
- [ ] `IB-08` After clicking the skew slider, pressing a letter key still plays a note

### TET Preset Interaction
- [ ] `IB-09` Clicking a TET preset button snaps the tuning slider to its exact value
- [ ] `IB-10` The nearest marker text updates immediately to show the selected TET
- [ ] `IB-11` Double-clicking the tuning slider snaps to the nearest TET
- [ ] `IB-12` Dragging the tuning slider smoothly updates the grid layout in real-time

### MIDI Settings
- [ ] `IB-13` Clicking MIDI toggle opens the MIDI settings panel
- [ ] `IB-14` Clicking MIDI toggle again closes the panel
- [ ] `IB-15` MIDI devices list shows "No MIDI devices detected" when no devices connected

---

## Invariant IDs Reference

All invariants use a prefix code for quick reference:
- `GS-xx` = Global Styling
- `TB-xx` = Title Bar
- `HB-xx` = Header Bar
- `NH-xx` = Note History
- `KC-xx` = Keyboard Canvas
- `CS-xx` = Controls Strip
- `CG-xx` = Chord Graffiti
- `AB-xx` = About Section
- `FT-xx` = Footer
- `MM-xx` = MidiMech State
- `MS-xx` = Mid-Skew State
- `Txx-xx` = TET Variation
- `IB-xx` = Interactive Behavior
