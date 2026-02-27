import { test, expect } from '@playwright/test';

test.describe('DCompose Web — Visual Regression (State-Machine Tests)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Wait for canvas + JS init (badge positions, slider fills, TET presets)
    await page.waitForTimeout(2000);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDER BADGE POSITION INVARIANTS
  // Pattern: badge bottom edge ≤ track top edge (badge is ABOVE track)
  // CSS: .slider-value-badge { position: absolute; bottom: 100%; }
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Slider Badge Position Invariants', () => {
    /**
     * @reason Badge position changed from inside-track to above-track (bottom:100%)
     *   so users can see the value while dragging the slider thumb.
     * @design-intent Badges must float above the slider track, never overlapping
     *   the interactive area, to prevent click interference.
     */
    test('SM-BADGE-1: Tuning badge is above slider track', async ({ page }) => {
      const track = await page.locator('.tuning-slider-area .slider-track').boundingBox();
      const badge = await page.locator('#tuning-thumb-badge').boundingBox();
      expect(track).toBeTruthy();
      expect(badge).toBeTruthy();
      // Badge bottom edge (y + height) must be at or above track top edge (y)
      expect(badge!.y + badge!.height).toBeLessThanOrEqual(track!.y + 2);
    });

    /**
     * @reason Skew badge uses same above-track pattern as tuning badge.
     * @design-intent All slider badges follow the same above-track layout
     *   for visual consistency across the controls strip.
     */
    test('SM-BADGE-2: Skew badge is above slider track', async ({ page }) => {
      const track = await page.locator('.skew-slider-area .slider-track').boundingBox();
      const badge = await page.locator('#skew-thumb-badge').boundingBox();
      expect(track).toBeTruthy();
      expect(badge).toBeTruthy();
      expect(badge!.y + badge!.height).toBeLessThanOrEqual(track!.y + 2);
    });

    /**
     * @reason Zoom badge sits above its 120px-wide slider track in the controls strip.
     * @design-intent Zoom badge must not visually overlap the slider thumb or track,
     *   preserving the clean minimal aesthetic.
     */
    test('SM-BADGE-3: Zoom badge is above its slider track', async ({ page }) => {
      const track = await page.locator('#zoom-slider').locator('..').boundingBox();
      const badge = await page.locator('#zoom-thumb-badge').boundingBox();
      expect(track).toBeTruthy();
      expect(badge).toBeTruthy();
      expect(badge!.y + badge!.height).toBeLessThanOrEqual(track!.y + 2);
    });

    /**
     * @reason Volume badge sits above the 80px-wide header slider track.
     * @design-intent Volume badge in the header row must float above its track
     *   to avoid occluding the compact header layout.
     */
    test('SM-BADGE-4: Volume badge is above its slider track', async ({ page }) => {
      const track = await page.locator('#volume-slider').locator('..').boundingBox();
      const badge = await page.locator('#volume-thumb-badge').boundingBox();
      expect(track).toBeTruthy();
      expect(badge).toBeTruthy();
      expect(badge!.y + badge!.height).toBeLessThanOrEqual(track!.y + 2);
    });

    /**
     * @reason Badges have pointer-events:none so clicks pass through to the slider
     *   thumb beneath them. Without this, the badge intercepts drags.
     * @design-intent Badges are display-only overlays; all mouse/touch interaction
     *   must reach the underlying range input for slider dragging to work.
     */
    test('SM-BADGE-PASSTHROUGH-1: Non-editable badges have pointer-events none', async ({ page }) => {
      // Only volume and zoom badges are non-editable spans with pointer-events:none
      // Tuning and skew badges are now editable <input> elements with pointer-events:auto
      const nonEditableBadgeIds = [
        '#zoom-thumb-badge',
        '#volume-thumb-badge',
      ];
      for (const sel of nonEditableBadgeIds) {
        const pe = await page.locator(sel).evaluate(
          el => getComputedStyle(el).pointerEvents
        );
        expect(pe, `${sel} pointer-events`).toBe('none');
      }
      // Editable badges must have pointer-events:auto
      const editableBadgeIds = [
        '#tuning-thumb-badge',
        '#skew-thumb-badge',
      ];
      for (const sel of editableBadgeIds) {
        const pe = await page.locator(sel).evaluate(
          el => getComputedStyle(el).pointerEvents
        );
        expect(pe, `${sel} pointer-events`).toBe('auto');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDER LABEL POSITION INVARIANTS
  // Pattern: label is inside the track (mix-blend-mode:difference for contrast)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Slider Label Position Invariants', () => {
    /**
     * @reason Tuning label "FIFTHS TUNING (cents)" sits inside the slider track
     *   using position:absolute + mix-blend-mode:difference for readability.
     * @design-intent Labels inside the track maximize vertical density while
     *   inverting color against the slider fill for legibility.
     */
    test('SM-LABEL-1: Tuning label is inside slider track', async ({ page }) => {
      const track = await page.locator('.tuning-slider-area .slider-track').boundingBox();
      const label = await page.locator('.tuning-slider-area .slider-label-overlay').boundingBox();
      expect(track).toBeTruthy();
      expect(label).toBeTruthy();
      // Label Y is within track bounds
      expect(label!.y).toBeGreaterThanOrEqual(track!.y - 1);
      expect(label!.y + label!.height).toBeLessThanOrEqual(track!.y + track!.height + 1);
    });

    /**
     * @reason Skew label "Skew" follows the same inside-track positioning pattern.
     * @design-intent Consistent label placement across all slider areas prevents
     *   visual jitter when switching attention between controls.
     */
    test('SM-LABEL-2: Skew label is inside slider track', async ({ page }) => {
      const track = await page.locator('.skew-slider-area .slider-track').boundingBox();
      const label = await page.locator('.skew-slider-area .slider-label-overlay').boundingBox();
      expect(track).toBeTruthy();
      expect(label).toBeTruthy();
      // Label Y is within track bounds
      expect(label!.y).toBeGreaterThanOrEqual(track!.y - 1);
      expect(label!.y + label!.height).toBeLessThanOrEqual(track!.y + track!.height + 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SLIDER VALUE DISPLAY INVARIANTS
  // Pattern: verify badge text format matches spec after JS init
  // Tuning/Skew badges are <input> elements — use inputValue()
  // Volume/Zoom badges are <span> elements — use textContent()

  test.describe('Slider Value Display Invariants', () => {
    /**
     * @reason Tuning badge shows the raw fifth-interval size without unit suffixes;
     *   the unit "cents" is displayed in the label "FIFTHS TUNING (cents)".
     * @design-intent Separating value from unit keeps the badge compact and
     *   prevents visual clutter at small font sizes (9px).
     */
    test('SM-VAL-1: Tuning badge shows plain number without ¢ symbol', async ({ page }) => {
      const val = await page.locator('#tuning-thumb-badge').inputValue();
      expect(val).not.toContain('¢');
      // JS formats as value.toFixed(1) → "700.0"
      expect(parseFloat(val!)).toBeCloseTo(700, 0);
    });

    /**
     * @reason Volume badge shows the dB-converted value (20*log10(gain)).
     *   Default gain 0.3 → ≈ -10.5 dB. No "dB" suffix — unit is in label.
     * @design-intent Volume is displayed in dB for musician familiarity,
     *   while the underlying slider operates in linear gain [0,1].
     */
    test('SM-VAL-2: Volume badge shows dB value', async ({ page }) => {
      const val = await page.locator('#volume-thumb-badge').textContent();
      // 20 * log10(0.3) ≈ -10.5
      expect(parseFloat(val!)).toBeCloseTo(-10.5, 0);
    });

    /**
     * @reason Zoom badge shows "1.00" without an "x" suffix. The multiplier
     *   indicator "x" is part of the label title "Zoom (x)", not the badge value.
     * @design-intent Badge text is the raw number; units/symbols belong in the
     *   label to keep all badges visually consistent.
     */
    test('SM-VAL-3: Zoom badge shows value without x suffix', async ({ page }) => {
      const val = await page.locator('#zoom-thumb-badge').textContent();
      // "1.00" — no trailing x
      expect(val).not.toContain('x');
      expect(parseFloat(val!)).toBeCloseTo(1.0, 1);
    });

    /**
     * @reason Skew badge at default position (MidiMech layout) shows "0.00".
     * @design-intent Two decimal places for skew gives fine-grained visual
     *   feedback as the user drags between MidiMech (0) and DCompose (1).
     */
    test('SM-VAL-4: Skew badge shows 0.00 at default', async ({ page }) => {
      const val = await page.locator('#skew-thumb-badge').inputValue();
      expect(val).toBe('0.00');
    });

    /**
     * @reason The tuning slider label reads "FIFTHS TUNING (cents)" to describe
     *   the fifth interval size, not "PITCH TUNING".
     * @design-intent "Fifths tuning" is the musically precise term — the slider
     *   adjusts the size of the perfect fifth interval on the syntonic continuum.
     */
    test('SM-VAL-5: Tuning label reads FIFTHS TUNING (cents)', async ({ page }) => {
      const label = page.locator('.tuning-slider-area .slider-label-overlay');
      const text = await label.textContent();
      expect(text?.toUpperCase()).toContain('FIFTHS TUNING');
      expect(text?.toUpperCase()).toContain('CENTS');
    });

    /**
     * @reason D-ref input shows the default D4 frequency 293.66 Hz on load.
     *   The annotation (e.g. "D4") is shown in the label overlay brackets.
     * @design-intent D4 is the default reference pitch for the isomorphic layout;
     *   displaying the numeric Hz value in the badge lets users verify or change it.
     */
    test('SM-VAL-6: D-ref badge shows plain Hz number', async ({ page }) => {
      const val = await page.locator('#d-ref-input').inputValue();
      expect(val).toBe('293.66');
      // Annotation lives in label overlay, not badge
      const labelText = await page.locator('#d-ref-label').textContent();
      expect(labelText).toContain('D4');
    });

    /**
     * @reason The D-ref label uses .slider-label-overlay class (not .ctrl-label)
     *   to match the positioning pattern of all slider labels.
     * @design-intent D-ref label sits in the same visual zone as slider labels
     *   even though d-ref uses a text input instead of a range slider.
     */
    test('SM-VAL-7: D-ref label reads D REF (Hz)', async ({ page }) => {
      const label = page.locator('.d-ref-group .slider-label-overlay');
      const text = await label.textContent();
      expect(text?.toUpperCase()).toContain('D REF');
      expect(text?.toUpperCase()).toContain('HZ');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TET PRESET POSITION INVARIANTS
  // Pattern: preset marks sit below the tuning slider track
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('TET Preset Invariants', () => {
    /**
     * @reason TET tick marks originate from the slider track center line (ISC-FS-4)
     *   via .tet-presets { top: 50% }. Ticks bridge downward to their labels.
     * @design-intent Ticks create a ruler-like visual connecting the slider
     *   position to the TET preset labels below.
     */
    test('SM-TET-BELOW-1: TET ticks start at track center, buttons below track', async ({ page }) => {
      const track = await page.locator('.tuning-slider-area .slider-track').boundingBox();
      expect(track).toBeTruthy();
      const marks = page.locator('.tet-preset-mark');
      const count = await marks.count();
      expect(count).toBeGreaterThan(0);
      const trackCenter = track!.y + track!.height / 2;
      for (let i = 0; i < count; i++) {
        // Tick top edge starts at or near track center (±3px tolerance)
        const tick = await marks.nth(i).locator('.tet-tick').boundingBox();
        expect(tick).toBeTruthy();
        expect(Math.abs(tick!.y - trackCenter)).toBeLessThanOrEqual(3);
        // Preset button text is below the track bottom edge
        const btn = await marks.nth(i).locator('.tet-preset').boundingBox();
        expect(btn).toBeTruthy();
        expect(btn!.y).toBeGreaterThanOrEqual(track!.y + track!.height - 2);
      }
    });

    // 53-TET removed per user request — no longer in TUNING_MARKERS
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR AND FONT INVARIANTS
  // Pattern: verify computed styles match design spec
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Color and Font Invariants', () => {
    /**
     * @reason Header control labels (Wave, Layout) are explicitly overridden
     *   to white (#fff) via .header-controls .ctrl-label, while other .ctrl-label
     *   elements use --dim (#666).
     * @design-intent Header labels must stand out against the dark header background
     *   for quick scanning of waveform and layout selections.
     */
    test('SM-COLOR-1: Wave and Layout labels are white', async ({ page }) => {
      const colors = await page.locator('.sidebar-section .ctrl-label').evaluateAll(
        els => els.map(el => getComputedStyle(el).color)
      );
      for (const c of colors) {
        expect(c).toBe('rgb(255, 255, 255)');
      }
    });

    /**
     * @reason D-ref annotation (e.g. "D4", "+2¢ A4") is shown in the label
     *   overlay brackets, not embedded in the badge input value.
     * @design-intent Visible annotation in the slider label is more
     *   discoverable than a hidden tooltip or embedded in the value.
     */
    test('SM-COLOR-2: D-ref annotation is in label overlay, not badge', async ({ page }) => {
      const val = await page.locator('#d-ref-input').inputValue();
      // Badge is just a number
      expect(val).not.toContain('(');
      expect(val).not.toContain('[');
      // Annotation in label overlay
      const labelText = await page.locator('#d-ref-label').textContent();
      expect(labelText).toContain('D4');
    });

    /**
     * @reason Slider label overlays use white text for readability against the
     *   dark slider track background.
     * @design-intent All slider labels share the same white color for visual
     *   uniformity across the controls strip.
     */
    test('SM-COLOR-3: Slider label overlay is white', async ({ page }) => {
      const color = await page.locator('.tuning-slider-area .slider-label-overlay').evaluate(
        el => getComputedStyle(el).color
      );
      expect(color).toBe('rgb(255, 255, 255)');
    });

    /**
     * @reason Title bar text ("DCompose Web"), GitHub mark SVG fill, and
     *   action buttons all use white for contrast on the dark overlay.
     * @design-intent The title bar floats over the history canvas — white text
     *   ensures readability regardless of canvas content.
     */
    test('SM-COLOR-4: Title bar text and icons are white', async ({ page }) => {
      const titleColor = await page.locator('.site-title').evaluate(
        el => getComputedStyle(el).color
      );
      expect(titleColor).toBe('rgb(255, 255, 255)');

      const ghSvgFill = await page.locator('.gh-mark svg').evaluate(
        el => getComputedStyle(el).fill
      );
      expect(ghSvgFill).toBe('rgb(255, 255, 255)');

      const btnColors = await page.locator('.gh-btn').evaluateAll(
        els => els.map(el => getComputedStyle(el).color)
      );
      for (const c of btnColors) {
        expect(c).toBe('rgb(255, 255, 255)');
      }
    });

    /**
     * @reason The body background is pure black (#000) to maximize contrast
     *   and create the dark-terminal aesthetic.
     * @design-intent Black background is foundational to the design —
     *   all colors, borders, and text are calibrated against it.
     */
    test('SM-COLOR-5: Black background on body', async ({ page }) => {
      const bodyBg = await page.locator('body').evaluate(
        el => getComputedStyle(el).backgroundColor
      );
      expect(bodyBg).toBe('rgb(0, 0, 0)');
    });

    /**
     * @reason D-ref label in the .d-ref-group uses .slider-label-overlay which
     *   has color:#fff. This verifies the label is white, not inheriting --dim.
     * @design-intent D-ref label must be as legible as other slider labels,
     *   maintaining the white-on-dark consistency.
     */
    test('SM-DREF-WHITE-1: D-ref label is white', async ({ page }) => {
      const color = await page.locator('.d-ref-group .slider-label-overlay').evaluate(
        el => getComputedStyle(el).color
      );
      expect(color).toBe('rgb(255, 255, 255)');
    });

    /**
     * @reason JetBrains Mono is the primary font loaded via Google Fonts, with
     *   Courier New as fallback. All UI text should resolve to this font family.
     * @design-intent Monospace font ensures consistent character widths in
     *   numeric displays (badges, Hz values) and musical notation.
     */
    test('SM-FONT-1: Body font family includes JetBrains Mono', async ({ page }) => {
      const fontFamily = await page.locator('body').evaluate(
        el => getComputedStyle(el).fontFamily
      );
      expect(fontFamily).toContain('JetBrains Mono');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL INVARIANTS
  // Pattern: verify DOM structure matches Wave 4 spec
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Structural Invariants', () => {
    /**
     * @reason MPE output was added in Wave 4 — the MIDI panel must contain
     *   the enable checkbox and output device select dropdown.
     * @design-intent MPE output UI lives inside the collapsible MIDI panel
     *   to keep the main interface uncluttered for non-MIDI users.
     */
    test('SM-STRUCT-1: MPE output row exists in MIDI panel', async ({ page }) => {
      await page.locator('#midi-settings-toggle').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#mpe-output-row')).toBeVisible();
      await expect(page.locator('#mpe-enabled')).toBeVisible();
      await expect(page.locator('#mpe-output-select')).toBeVisible();
    });

    /**
     * @reason Every slider/input has a reset button showing ↻ to restore defaults.
     *   This prevents users from getting stuck on unfamiliar tuning values.
     * @design-intent Reset buttons provide a safety net — one click returns any
     *   parameter to its known-good default state.
     */
    test('SM-STRUCT-2: All sliders have reset buttons with ↻', async ({ page }) => {
      const resetIds = ['tuning-reset', 'skew-reset', 'zoom-reset', 'volume-reset', 'd-ref-reset'];
      for (const id of resetIds) {
        const btn = page.locator(`#${id}`);
        await expect(btn).toBeVisible();
        const text = await btn.textContent();
        expect(text).toBe('↻');
      }
    });

    /**
     * @reason The design uses sharp 0px border-radius everywhere for a brutalist
     *   terminal aesthetic — no rounded corners on any interactive or structural element.
     * @design-intent Zero border-radius is a deliberate style choice that reinforces
     *   the monospace/terminal identity. Rounding would break the visual language.
     */
    test('SM-STRUCT-3: No rounded corners on controls', async ({ page }) => {
      const selectors = [
        '#sidebar', '#keyboard-container', 'select', 'input[type="text"]',
      ];
      for (const sel of selectors) {
        const els = page.locator(sel);
        const count = await els.count();
        for (let i = 0; i < count; i++) {
          const br = await els.nth(i).evaluate(el => getComputedStyle(el).borderRadius);
          expect(br, `${sel}[${i}]`).toBe('0px');
        }
      }
    });

    /**
     * @reason D-ref input is 80px wide for the Hz number value in JetBrains Mono.
     * @design-intent Fixed width prevents the controls strip from reflowing
     *   when the user types different-length Hz values.
     */
    test('SM-STRUCT-4: D-ref badge input is 80px wide', async ({ page }) => {
      const width = await page.locator('#d-ref-input').evaluate(
        el => getComputedStyle(el).width
      );
      expect(parseFloat(width)).toBeCloseTo(80, -1);
    });

    /**
     * @reason Star, bug-report, and MIDI-settings icons use inline-flex with
     *   align-items:center to vertically center SVGs/text within their containers.
     * @design-intent Icon containers must be vertically centered so the header
     *   row looks clean at any viewport width.
     */
    test('SM-ICON-CENTER-1: Header icon containers are vertically centered', async ({ page }) => {
      const selectors = ['.gh-btn', '#midi-settings-toggle'];
      for (const sel of selectors) {
        const els = page.locator(sel);
        const count = await els.count();
        for (let i = 0; i < count; i++) {
          const styles = await els.nth(i).evaluate(el => {
            const cs = getComputedStyle(el);
            return { display: cs.display, alignItems: cs.alignItems };
          });
          expect(['flex', 'inline-flex']).toContain(styles.display);
          expect(styles.alignItems, `${sel}[${i}] align-items`).toBe('center');
        }
      }
    });

    /**
     * @reason The tuning slider area explicitly sets padding-top:0 to prevent
     *   the slider from being pushed down relative to its siblings.
     * @design-intent The tuning area has TET presets below it (margin-bottom:28px),
     *   but nothing should push it down from above — it aligns with sibling controls.
     */
    test('SM-TUNING-ALIGN-1: Tuning slider area has no extra top padding', async ({ page }) => {
      const paddingTop = await page.locator('.tuning-slider-area').evaluate(
        el => getComputedStyle(el).paddingTop
      );
      expect(paddingTop).toBe('0px');
    });

    /**
     * @reason The history canvas shows a "Play a note" prompt and note history.
     *   It must be present and visible in the DOM on initial load.
     * @design-intent The history canvas is the first visual element users see —
     *   its visibility confirms the app initialized correctly.
     */
    test('SM-CANVAS-PLAYNOTE-1: History canvas is visible', async ({ page }) => {
      const canvas = page.locator('#history-canvas');
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThanOrEqual(220);
    });
  });

  test.describe('Key Sizing Invariants', () => {
    /**
     * @reason Keys must be physically sized using metric measurements and
     *   devicePixelRatio for DPI-aware rendering (ISC-KS-1, ISC-KS-2).
     *   Target: visible key ≈ 21.3mm (midpoint piano/QWERTY) at default zoom.
     * @design-intent Touch ergonomics require consistent physical key sizes
     *   across devices. The sizing uses CSS media queries to measure DPI.
     */
    test('SM-KS-1: Keyboard uses devicePixelRatio for canvas scaling', async ({ page }) => {
      const result = await page.evaluate(() => {
        const canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
        const dpr = window.devicePixelRatio || 1;
        return {
          canvasWidth: canvas.width,
          styleWidth: parseInt(canvas.style.width),
          dpr,
          ratio: canvas.width / parseInt(canvas.style.width),
        };
      });
      // Canvas internal resolution should be ~dpr × CSS width
      expect(Math.abs(result.ratio - result.dpr)).toBeLessThan(0.1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GOLDEN SCREENSHOTS — FAST PATH
  // First run: npx playwright test --update-snapshots
  // Subsequent: pixel-exact comparison (no LLM judge needed)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('Golden Screenshots — Fast Path', () => {
    /**
     * @reason Sidebar contains all settings controls — tuning, skew, zoom, d-ref, wave, layout, MIDI.
     * @design-intent Pixel-level snapshot catches regressions in sidebar layout.
     */
    test('GOLDEN-1: Sidebar snapshot', async ({ page }) => {
      const sidebar = page.locator('#sidebar');
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixelRatio: 0.01,
      });
    });

    /**
     * @reason Title bar contains site name and GitHub action buttons.
     * @design-intent Snapshot catches unintended reflows or color changes.
     */
    test('GOLDEN-2: Title bar snapshot', async ({ page }) => {
      await expect(page.locator('#title-bar')).toHaveScreenshot('title-bar-overlay.png', {
        maxDiffPixelRatio: 0.015,
      });
    });

    /**
     * @reason History canvas renders note history visualization — its initial
     *   state (empty, with "Play a note" text) should be stable.
     * @design-intent Higher tolerance (0.5%) accounts for anti-aliased text
     *   rendering differences across environments.
     */
    test('GOLDEN-3: History canvas snapshot', async ({ page }) => {
      await expect(page.locator('#history-canvas')).toHaveScreenshot('history-canvas.png', {
        maxDiffPixelRatio: 0.005,
      });
    });

    /**
     * @reason Full page snapshot captures overall layout including header,
     *   canvas, keyboard, controls, about section, and footer.
     * @design-intent Catches global layout shifts, z-index issues, or
     *   elements overflowing their containers.
     */
    test('GOLDEN-4: Full page snapshot', async ({ page }) => {
      await expect(page).toHaveScreenshot('full-page.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });

    /**
     * @reason Title bar floats over the history canvas with absolute positioning.
     *   Text, GitHub actions, and star count must render correctly.
     * @design-intent Title bar is the brand identity — any drift in positioning
     *   or text rendering is immediately noticeable.
     */
    test('GOLDEN-5: Title bar snapshot', async ({ page }) => {
      await expect(page.locator('#title-bar')).toHaveScreenshot('title-bar.png', {
        maxDiffPixelRatio: 0.01,
      });
    });

    /**
     * @reason Tuning slider area includes the slider, badge, label, and
     *   TET preset ruler — the most complex control group.
     * @design-intent Snapshot validates the tuning slider + TET preset
     *   alignment that is critical for the syntonic continuum UX.
     */
    test('GOLDEN-6: Tuning slider area snapshot', async ({ page }) => {
      await expect(page.locator('.tuning-slider-area')).toHaveScreenshot('tuning-slider-area.png', {
        maxDiffPixelRatio: 0.01,
      });
    });

    /**
     * @reason Keyboard canvas is the main interactive area — its initial render
     *   (with note labels, hexagonal keys, bracket annotations) must be stable.
     * @design-intent Higher tolerance (5%) because the canvas rendering includes
     *   anti-aliased text that varies slightly across GPU/driver combos.
     */
    test('GOLDEN-7: Keyboard canvas snapshot', async ({ page }) => {
      await expect(page.locator('#keyboard-canvas')).toHaveScreenshot('keyboard-canvas.png', {
        maxDiffPixelRatio: 0.05,
      });
    });
  });
});
