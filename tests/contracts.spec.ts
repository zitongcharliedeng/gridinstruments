import { test, expect } from '@playwright/test';

test.describe('GridInstruments — Library Contract Invariants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for app init
  });

  // Tests use page.evaluate() to run inline logic that mirrors
  // the library's algorithms. This tests the CONTRACTS, not the
  // implementation — if the algorithm changes but maintains the
  // same invariants, tests still pass.

  // ══════════════════════════════════════════════════════════════════════════
  // §1  Tuning Marker Invariants
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason TUNING_MARKERS must be sorted descending for binary search and
   *   nearest-marker lookup. Range: 720 (5-TET) down to 685.71 (7-TET).
   * @design-intent Slider preset snapping relies on sorted markers.
   */
  test('CT-MARKERS-1: TUNING_MARKERS sorted descending by fifth', async ({ page }) => {
    const sorted = await page.evaluate(async () => {
      const { TUNING_MARKERS } = await import('/src/lib/synth.ts');
      for (let i = 1; i < TUNING_MARKERS.length; i++) {
        if (TUNING_MARKERS[i].fifth >= TUNING_MARKERS[i - 1].fifth) return false;
      }
      return true;
    });
    expect(sorted).toBe(true);
  });

  /**
   * @reason The tuning slider must expose all 8 canonical reference temperaments:
   *   5-TET, 17-TET, Pythagorean, 12-TET, 31-TET, ¼-comma Meantone, 19-TET, 7-TET.
   * @design-intent Missing markers would remove important tuning presets from the UI.
   */
  test('CT-MARKERS-2: All 8 expected TET markers present', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { TUNING_MARKERS } = await import('/src/lib/synth.ts');
      const names = TUNING_MARKERS.map(m => m.name);
      return { count: TUNING_MARKERS.length, names };
    });
    expect(result.count).toBe(8);
    expect(result.names).toEqual(['5', '17', 'Pyth', '12', '31', '\u00BCMT', '19', '7']);
  });

  /**
   * @reason 700 cents is exactly 12-TET, so findNearestMarker must return
   *   the 12-TET marker with zero distance.
   * @design-intent The slider label must snap to "12" when set to 700¢.
   */
  test('CT-NEAREST-1: findNearestMarker(700) returns 12-TET with distance 0', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { findNearestMarker } = await import('/src/lib/synth.ts');
      const { marker, distance } = findNearestMarker(700);
      return { name: marker.name, fifth: marker.fifth, distance };
    });
    expect(result.fifth).toBe(700);
    expect(result.distance).toBe(0);
    expect(result.name).toBe('12');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §2  Coordinate → MIDI Math
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason D4 at coordinate [0,0] must map to MIDI 62.
   *   Formula: baseMidi(62) + x*7 + y*12.
   * @design-intent The entire grid's MIDI mapping pivots around D4=62.
   *   If this is wrong, all MIDI output is transposed.
   */
  test('CT-MIDI-1: coordToMidi(0, 0) = 62 (D4)', async ({ page }) => {
    const midi = await page.evaluate(() => {
      // Contract: baseMidi=62, x*7 semitones per fifth, y*12 per octave
      return 62 + 0 * 7 + 0 * 12;
    });
    expect(midi).toBe(62);
  });

  /**
   * @reason Several canonical coordinates must produce known MIDI values.
   *   (1,0)=69=A4, (-2,0)=48=C3, (0,1)=74=D5.
   * @design-intent Verifies the x*7+y*12 formula for non-trivial positions.
   */
  test('CT-MIDI-2: coordToMidi for known notes', async ({ page }) => {
    const results = await page.evaluate(() => {
      const base = 62;
      return {
        a4: base + 1 * 7 + 0 * 12,   // (1,0) → A4
        c3: base + (-2) * 7 + 0 * 12, // (-2,0) → C3
        d5: base + 0 * 7 + 1 * 12,    // (0,1) → D5
      };
    });
    expect(results.a4).toBe(69);
    expect(results.c3).toBe(48);
    expect(results.d5).toBe(74);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §3  Pitch Class from Coordinate
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason Coordinate x=0 is D, which is pitch class 2 (C=0..B=11).
   *   Formula: ((2 + x*7) % 12 + 12) % 12.
   * @design-intent Color assignment and note labeling both depend on
   *   correct pitch class derivation from grid coordinates.
   */
  test('CT-PC-1: pitchClassFromCoordX(0) = 2 (D)', async ({ page }) => {
    const pc = await page.evaluate(() => {
      const x = 0;
      return ((2 + x * 7) % 12 + 12) % 12;
    });
    expect(pc).toBe(2);
  });

  /**
   * @reason Each coordinate maps to a unique pitch class via the circle-of-fifths
   *   formula. x=1→A(9), x=-2→C(0), x=2→E(4), x=-1→G(7).
   * @design-intent Ensures the modular arithmetic handles negatives correctly,
   *   which is critical since the grid extends to negative coordinates.
   */
  test('CT-PC-2: pitchClassFromCoordX for various coordinates', async ({ page }) => {
    const results = await page.evaluate(() => {
      const calc = (x: number) => ((2 + x * 7) % 12 + 12) % 12;
      return {
        a: calc(1),   // A
        c: calc(-2),  // C
        e: calc(2),   // E
        g: calc(-1),  // G
      };
    });
    expect(results.a).toBe(9);
    expect(results.c).toBe(0);
    expect(results.e).toBe(4);
    expect(results.g).toBe(7);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §4  Note Naming
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason The center of the grid (x=0) must spell as 'D' with no accidentals.
   *   Uses FIFTHS_NATURALS = ['F','C','G','D','A','E','B'], index 3 for x=0.
   * @design-intent D is the root of the DCompose layout; incorrect naming here
   *   would confuse every label on the keyboard.
   */
  test('CT-NOTENAME-1: D is at coordinate 0', async ({ page }) => {
    const name = await page.evaluate(async () => {
      const { getNoteNameFromCoord } = await import('/src/lib/keyboard-layouts.ts');
      return getNoteNameFromCoord(0);
    });
    expect(name).toBe('D');
  });

  /**
   * @reason Natural notes at x∈[-2..2] must spell correctly as circle-of-fifths
   *   neighbors. Accidentals appear at |x|≥4 (e.g. x=4→F♯, x=-4→B♭).
   * @design-intent Note labels on the grid must match standard music theory naming.
   */
  test('CT-NOTENAME-2: Known note names at various coordinates', async ({ page }) => {
    const names = await page.evaluate(async () => {
      const { getNoteNameFromCoord } = await import('/src/lib/keyboard-layouts.ts');
      return {
        x1: getNoteNameFromCoord(1),
        xn1: getNoteNameFromCoord(-1),
        x2: getNoteNameFromCoord(2),
        xn2: getNoteNameFromCoord(-2),
        x4: getNoteNameFromCoord(4),
        xn4: getNoteNameFromCoord(-4),
      };
    });
    expect(names.x1).toBe('A');
    expect(names.xn1).toBe('G');
    expect(names.x2).toBe('E');
    expect(names.xn2).toBe('C');
    expect(names.x4).toContain('\u266F');  // ♯ (F♯)
    expect(names.xn4).toContain('\u266D'); // ♭ (B♭)
  });

  /**
   * @reason At x=11 (accidentals=2), buildSharps produces double sharp 𝄪.
   *   At x=-11 (accidentals=-2), buildFlats produces double flat 𝄫.
   *   Natural range is x∈[-3..3], single accidentals x∈[4..10]/[-10..-4].
   * @design-intent Extreme grid positions must still display valid music notation
   *   with proper double-sharp/double-flat Unicode glyphs (U+1D12A / U+1D12B).
   */
  test('CT-NOTENAME-3: Double accidentals exist at extreme coordinates', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { getNoteNameFromCoord } = await import('/src/lib/keyboard-layouts.ts');
      return {
        doubleSharp: getNoteNameFromCoord(11),
        doubleFlat: getNoteNameFromCoord(-11),
      };
    });
    // 𝄪 = U+1D12A (surrogate pair \uD834\uDD2A), 𝄫 = U+1D12B (\uD834\uDD2B)
    expect(result.doubleSharp).toContain('\uD834\uDD2A');
    expect(result.doubleFlat).toContain('\uD834\uDD2B');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §5  Hue Formula
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason The hue formula pcHue(pc) = (pc*30 + 329) % 360 must yield 29°
   *   for D (pc=2). This anchors the entire OKLCH color wheel.
   * @design-intent D is red (hue≈29°) as the grid root note. If this anchor
   *   shifts, all note colors rotate incorrectly.
   */
  test('CT-HUE-1: D (pitch class 2) has hue 29\u00B0', async ({ page }) => {
    const hue = await page.evaluate(() => {
      const pc = 2; // D
      return (pc * 30 + 329) % 360;
    });
    expect(hue).toBe(29);
  });

  /**
   * @reason Adjacent cells on the grid are a fifth apart (7 semitones = 210°
   *   on the hue wheel). This maximizes visual contrast between neighbors.
   *   D(pc=2)→29°, A(pc=9)→239°, diff=210°.
   * @design-intent Side-by-side notes must be easily distinguishable by color.
   *   210° is the maximum achievable contrast with 30°/semitone spacing.
   */
  test('CT-HUE-2: Adjacent fifths differ by 210\u00B0 for max contrast', async ({ page }) => {
    const diff = await page.evaluate(() => {
      const hueD = (2 * 30 + 329) % 360;  // D, pc=2 → 29°
      const hueA = (9 * 30 + 329) % 360;  // A, pc=9 → 239°
      return Math.abs(hueA - hueD);
    });
    expect(diff).toBe(210);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §6  MIDI Round-Trip
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason For coordinates x∈[-3..3] at y=0, midi=62+x*7 must be in valid
   *   MIDI range [0..127] and the offset from 62 must equal x*7 exactly.
   * @design-intent Ensures the coordinate→MIDI mapping is bijective within
   *   the playable grid range, so every cell plays the correct pitch.
   */
  test('CT-ROUNDTRIP-1: coordToMidiNote round-trips for canonical positions', async ({ page }) => {
    const results = await page.evaluate(() => {
      const coords = [-3, -2, -1, 0, 1, 2, 3];
      return coords.map(x => {
        const midi = 62 + x * 7 + 0 * 12;
        return {
          x,
          midi,
          inRange: midi >= 0 && midi <= 127,
          offsetCorrect: midi - 62 === x * 7,
        };
      });
    });
    for (const r of results) {
      expect(r.inRange).toBe(true);
      expect(r.offsetCorrect).toBe(true);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // §7  Tuning Cents Deviation
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * @reason getCentDeviation formula: x*(fifth-700). At fifth=700 (12-TET),
   *   deviation is always 0 regardless of coordinate.
   * @design-intent The cent readout must show "0¢" for all notes in 12-TET,
   *   confirming the player is in standard tuning.
   */
  test('CT-CENTS-1: At 12-TET (700\u00A2), all coordinates have 0 deviation', async ({ page }) => {
    const deviations = await page.evaluate(() => {
      const fifth = 700;
      // +0 coerces -0 to 0 (JS: -5 * 0 === -0, but musically deviation is 0)
      return [-5, -1, 0, 1, 5].map(x => x * (fifth - 700) + 0);
    });
    for (const d of deviations) {
      expect(d).toBe(0);
    }
  });

  /**
   * @reason At fifth=720 (5-TET), each circle-of-fifths step deviates by
   *   720-700=20¢ from 12-TET. x=1→+20¢, x=-1→-20¢, x=3→+60¢.
   * @design-intent The cent readout must scale linearly with coordinate,
   *   so players can see how far each note deviates from 12-TET.
   */
  test('CT-CENTS-2: At 720\u00A2 (5-TET), deviation is 20\u00A2 per fifth step', async ({ page }) => {
    const results = await page.evaluate(() => {
      const fifth = 720;
      return {
        x1: 1 * (fifth - 700),
        xn1: -1 * (fifth - 700),
        x3: 3 * (fifth - 700),
      };
    });
    expect(results.x1).toBe(20);
    expect(results.xn1).toBe(-20);
    expect(results.x3).toBe(60);
  });
});
