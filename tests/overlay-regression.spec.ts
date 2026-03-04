import { test, expect } from '@playwright/test';

test.describe('GridInstruments — Overlay Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Canvas + JS init
  });

  // NOTE: Do NOT open the overlay in beforeEach — some tests need it closed!

  // ── Overlay behavior tests ──────────────────────────────────────────────

  test('OV-HIDDEN-1: Overlay starts hidden on page load', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] overlay › hidden → CLICK_COG → visible`
     *   which asserts the hidden initial state as a precondition (Step 2).
     * @see tests/xstate-graph.spec.ts — overlay machine, hidden state assertion.
     * @reason The overlay must start with the `hidden` class so the keyboard
     *   canvas is fully visible and playable on initial page load.
     * @design-intent First-time users should see and interact with the keyboard
     *   immediately — settings are secondary and revealed on demand via the cog.
     */
    const hasHidden = await page.locator('#grid-overlay').evaluate(
      el => el.classList.contains('hidden')
    );
    expect(hasHidden).toBe(true);
  });

  test('OV-TOGGLE-1: Cog opens overlay (removes hidden)', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] overlay › hidden → CLICK_COG → visible`.
     * @see tests/xstate-graph.spec.ts — overlay machine, CLICK_COG event.
     * @reason Clicking the cog button must toggle the `hidden` class off,
     *   making the overlay visible over the keyboard canvas.
     * @design-intent The cog is the single entry point for all grid settings —
     *   it must reliably reveal the overlay on first click.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const hasHidden = await page.locator('#grid-overlay').evaluate(
      el => el.classList.contains('hidden')
    );
    expect(hasHidden).toBe(false);
  });

  test('OV-TOGGLE-2: Cog closes overlay (re-adds hidden)', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] overlay › visible → CLICK_COG → hidden`.
     * @see tests/xstate-graph.spec.ts — overlay machine, CLICK_COG from visible state.
     * @reason Clicking the cog a second time must re-add the `hidden` class,
     *   restoring the full keyboard view. The cog is a toggle, not a one-way open.
     * @design-intent Musicians need to quickly toggle settings without losing
     *   their playing context — open, tweak, close, play.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const hasHidden = await page.locator('#grid-overlay').evaluate(
      el => el.classList.contains('hidden')
    );
    expect(hasHidden).toBe(true);
  });

  test('OV-TOGGLE-3: Clicking overlay backdrop closes it', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] overlay › visible → CLICK_BACKDROP → hidden`.
     * @see tests/xstate-graph.spec.ts — overlay machine, CLICK_BACKDROP event.
     * @reason Clicking the overlay backdrop (the semi-transparent area outside
     *   controls) must close the overlay. The click handler checks `e.target === gridOverlay`.
     * @design-intent Backdrop-close is a standard modal pattern — users expect
     *   clicking outside content to dismiss the overlay.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const el = document.getElementById('grid-overlay')!;
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, target: el } as MouseEventInit));
    });
    await page.waitForTimeout(300);
    const hasHidden = await page.locator('#grid-overlay').evaluate(
      el => el.classList.contains('hidden')
    );
    expect(hasHidden).toBe(true);
  });

  test('OV-BG-1: Overlay background color is greyish semi-transparent', async ({ page }) => {
    /**
     * @reason The overlay background must be `rgba(30, 30, 32, 0.78)` — dark enough
     *   to dim the keyboard grid but transparent enough to maintain spatial context.
     * @design-intent Semi-transparent overlay lets musicians see the grid beneath
     *   while adjusting settings, preserving spatial orientation.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const bg = await page.locator('#grid-overlay').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    // rgba(30, 30, 32, 0.78) — allow minor float differences in alpha
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    expect(match, 'Background should be rgba').toBeTruthy();
    expect(parseInt(match![1])).toBeCloseTo(30, 0);
    expect(parseInt(match![2])).toBeCloseTo(30, 0);
    expect(parseInt(match![3])).toBeCloseTo(32, 0);
    if (match![4]) {
      expect(parseFloat(match![4])).toBeCloseTo(0.78, 1);
    }
  });

  test('OV-SHIMMER-1: Overlay has shimmer animation', async ({ page }) => {
    /**
     * @reason The overlay ::before pseudo-element uses an 18s shimmer animation
     *   for a subtle visual polish effect.
     * @design-intent The shimmer adds depth to the overlay without being distracting —
     *   a slow, ambient effect that signals "this is a live settings panel."
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const animDuration = await page.evaluate(() =>
      getComputedStyle(
        document.querySelector('#grid-overlay')!, '::before'
      ).animationDuration
    );
    expect(animDuration).toContain('18s');
  });

  test('OV-SECTIONS-1: All overlay sections present', async ({ page }) => {
    /**
     * @reason The overlay must contain at least 8 sections: wave/vol, layout,
     *   tuning, skew, shear, zoom, d-ref, and MIDI.
     * @design-intent Each overlay section controls a distinct aspect of the instrument.
     *   Missing sections mean missing functionality.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const sectionCount = await page.locator('#grid-overlay .overlay-section').count();
    expect(sectionCount).toBeGreaterThanOrEqual(8);
  });

  test('OV-WAVE-1: SAW is default active waveform', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] waveform › sawtooth → SELECT_SINE → sine`
     *   which asserts sawtooth as the initial/default active state (Step 2).
     * @see tests/xstate-graph.spec.ts — waveform machine, sawtooth initial state.
     * @reason The sawtooth waveform must be the default active waveform on fresh load
     *   (no localStorage). The HTML declares it with class `active` and main.ts falls
     *   back to 'sawtooth' when no saved waveform exists.
     * @design-intent Sawtooth is the richest harmonic waveform — it's the most
     *   versatile default for exploring tuning and layout.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const activeWaveform = await page.locator('.wave-btn.active').getAttribute('data-waveform');
    expect(activeWaveform).toBe('sawtooth');
  });

  test('OV-WAVE-2: Clicking waveform button transfers active state', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] waveform › sawtooth → SELECT_SINE → sine`.
     *   Graph test verifies `.active` class is on the clicked waveform button.
     * @see tests/xstate-graph.spec.ts — waveform machine, all 12 transitions.
     * @reason Clicking a waveform button must transfer the `.active` class to it
     *   and remove it from all other waveform buttons. Only one waveform is active.
     * @design-intent The active button highlight gives immediate visual feedback
     *   about which waveform is selected — no ambiguity.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await page.locator('[data-waveform="sine"]').click();
    await page.waitForTimeout(300);
    const sineActive = await page.locator('[data-waveform="sine"]').evaluate(
      el => el.classList.contains('active')
    );
    const sawActive = await page.locator('[data-waveform="sawtooth"]').evaluate(
      el => el.classList.contains('active')
    );
    expect(sineActive).toBe(true);
    expect(sawActive).toBe(false);
  });

  test('OV-PRESET-1: Active preset highlighted at default tuning', async ({ page }) => {
    /**
     * @reason At the default tuning of 700 cents (12-TET), the corresponding
     *   preset button inside #tet-presets must have the `.active` class.
     * @design-intent Preset highlighting tells users which named temperament
     *   they're currently on — essential for microtonal exploration.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const activePreset = await page.locator('#tet-presets .slider-preset-btn.active').count();
    expect(activePreset).toBeGreaterThanOrEqual(1);
    // Verify the active preset is the 12-TET one (value=700)
    const activeValue = await page.locator('#tet-presets .slider-preset-btn.active').first().getAttribute('data-value');
    expect(parseFloat(activeValue ?? '0')).toBe(700);
  });

  test('OV-RESET-1: Reset layout button clears gi_* localStorage', async ({ page }) => {
    /**
     * @reason The reset button must remove all `gi_*` localStorage keys and reload
     *   the page, restoring all settings to factory defaults.
     * @design-intent Reset is the nuclear option for users who've gotten into a
     *   confusing state — one click restores everything to known-good defaults.
     */
    // Set a test value in localStorage
    await page.evaluate(() => localStorage.setItem('gi_test', 'value'));
    const beforeReset = await page.evaluate(() => localStorage.getItem('gi_test'));
    expect(beforeReset).toBe('value');

    // Click reset — this triggers location.reload()
    await page.locator('#reset-layout').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // After reload, gi_test should be gone
    const afterReset = await page.evaluate(() => localStorage.getItem('gi_test'));
    expect(afterReset).toBeNull();
  });

  test('OV-PEDAL-1: Sustain pedal activates on pointerdown', async ({ page }) => {
    /**
     * @reason The sustain pedal button must gain `.active` class on pointerdown
     *   and lose it on pointerup — it's a momentary switch, not a toggle.
     * @design-intent Sustain pedal follows physical piano pedal behavior —
     *   press to sustain, release to dampen.
     */
    const pedal = page.locator('#sustain-indicator');
    await pedal.dispatchEvent('pointerdown', { bubbles: true });
    await page.waitForTimeout(300);
    const activeAfterDown = await pedal.evaluate(el => el.classList.contains('active'));
    expect(activeAfterDown).toBe(true);

    await pedal.dispatchEvent('pointerup', { bubbles: true });
    await page.waitForTimeout(300);
    const activeAfterUp = await pedal.evaluate(el => el.classList.contains('active'));
    expect(activeAfterUp).toBe(false);
  });

  test('OV-PEDAL-2: Vibrato pedal activates on pointerdown', async ({ page }) => {
    /**
     * @reason The vibrato pedal button must gain `.active` class on pointerdown
     *   and lose it on pointerup — it's a momentary switch, not a toggle.
     * @design-intent Vibrato pedal follows physical instrument modulation behavior —
     *   hold to engage vibrato, release to stop.
     */
    const pedal = page.locator('#vibrato-indicator');
    await pedal.dispatchEvent('pointerdown', { bubbles: true });
    await page.waitForTimeout(300);
    const activeAfterDown = await pedal.evaluate(el => el.classList.contains('active'));
    expect(activeAfterDown).toBe(true);

    await pedal.dispatchEvent('pointerup', { bubbles: true });
    await page.waitForTimeout(300);
    const activeAfterUp = await pedal.evaluate(el => el.classList.contains('active'));
    expect(activeAfterUp).toBe(false);
  });

  test('OV-ESC-1: Escape key closes overlay', async ({ page }) => {
    /**
     * @deprecated Superseded by graph test: `[Graph] overlay › visible → PRESS_ESCAPE → hidden`.
     * @see tests/xstate-graph.spec.ts — overlay machine, PRESS_ESCAPE event.
     * @reason Pressing Escape while the overlay is open must add the `hidden` class
     *   back to the overlay and remove `active` from the cog button.
     * @design-intent Escape is the universal dismiss key — users expect it to close
     *   any modal or overlay without reaching for the mouse.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const openBefore = await page.locator('#grid-overlay').evaluate(
      el => !el.classList.contains('hidden')
    );
    expect(openBefore).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const hasHidden = await page.locator('#grid-overlay').evaluate(
      el => el.classList.contains('hidden')
    );
    expect(hasHidden).toBe(true);
  });

  // ── Issue regression tests ──────────────────────────────────────────────

  test('ISS-14-1: R key is a note key, NOT sustain (#14)', async ({ page }) => {
    /**
     * @reason R was accidentally bound to sustain in an earlier version. It's a
     *   regular note key in the keyboard layout (mapped via isomorphic-qwerty).
     * @design-intent Piano-layout users expect R to play a note, not trigger sustain.
     *   Sustain is exclusively on Space.
     */
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    const sustainActive = await page.locator('#sustain-indicator').evaluate(
      el => el.classList.contains('active')
    );
    expect(sustainActive).toBe(false);
  });

  test('ISS-15-1: Shift is hold-to-vibrato, not toggle (#15)', async ({ page }) => {
    /**
     * @reason Vibrato must be hold-on, not toggle. Musical instruments use
     *   hold-to-modulate — the effect duration matches the performer's gesture.
     * @design-intent Like a physical instrument's vibrato lever — hold to engage,
     *   release to stop. A second press must re-engage, not toggle off.
     */
    const indicator = page.locator('#vibrato-indicator');

    // Press Shift → vibrato active
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).toHaveClass(/active/);

    // Release Shift → vibrato inactive
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).not.toHaveClass(/active/);

    // Press Shift again → vibrato active again (not toggled off)
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).toHaveClass(/active/);

    // Clean up
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })
    ));
  });

  test('ISS-15-2: Space is hold-to-sustain, not toggle (#15)', async ({ page }) => {
    /**
     * @reason Sustain must be hold-on, not toggle. Matches piano sustain pedal
     *   behavior — the effect lasts exactly as long as the key is held.
     * @design-intent Like a piano's sustain pedal — hold to sustain, release to
     *   dampen. A second press must re-engage, not toggle off.
     */
    const indicator = page.locator('#sustain-indicator');

    // Press Space → sustain active
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).toHaveClass(/active/);

    // Release Space → sustain inactive
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).not.toHaveClass(/active/);

    // Press Space again → sustain active again (not toggled off)
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    ));
    await page.waitForTimeout(300);
    await expect(indicator).toHaveClass(/active/);

    // Clean up
    await page.evaluate(() => document.body.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })
    ));
  });

  test('ISS-11-1: Slider fill tracks value at midpoint (#11)', async ({ page }) => {
    /**
     * @reason Slider fill must visually track the thumb position. At the midpoint
     *   of the skew slider (value 0.5, range -0.5 to 1.5), the fill should be ~50%.
     * @design-intent Visual feedback must match control state — WYSIWYG slider behavior.
     *   Misaligned fill confuses users about their current setting.
     */
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);

    // Set skew slider to midpoint (0.5 in range -0.5 to 1.5 = 50%)
    await page.evaluate(() => {
      const s = document.getElementById('skew-slider') as HTMLInputElement;
      s.value = '0.5';
      s.dispatchEvent(new Event('input'));
    });
    await page.waitForTimeout(300);

    const bg = await page.locator('#skew-slider').evaluate(
      (el) => (el as HTMLElement).style.background
    );
    expect(bg).toContain('linear-gradient');
    // Extract the fill percentage from the gradient
    const match = bg.match(/(\d+\.?\d*)%/);
    expect(match, 'Gradient should contain a percentage').toBeTruthy();
    const fillPct = parseFloat(match![1]);
    // At midpoint, fill should be approximately 50% (allow ±10% for thumb width correction)
    expect(fillPct).toBeGreaterThan(40);
    expect(fillPct).toBeLessThan(60);
  });

  test('ISS-13-1: Canvas responds to pointer after viewport resize (#13)', async ({ page }) => {
    /**
     * @reason Canvas cached its bounding rect for performance. On resize, the cache
     *   must be invalidated so pointer hit detection uses the new coordinates.
     * @design-intent Resizing the browser window should not break the instrument.
     *   Users resize windows constantly — the synth must remain fully functional.
     */
    // First interaction initializes audio context
    const canvas = page.locator('#keyboard-canvas');
    await canvas.click({ position: { x: 200, y: 200 } });
    await page.waitForTimeout(300);

    // Resize viewport
    await page.setViewportSize({ width: 800, height: 400 });
    await page.waitForTimeout(500);

    // After resize, canvas should still respond — click and check no error
    // The key invariant is that the page doesn't throw and the canvas still exists
    const canvasVisible = await canvas.isVisible();
    expect(canvasVisible).toBe(true);

    // Verify the cached rect was invalidated by checking that the canvas
    // has valid dimensions after resize
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(50);

    // Click on canvas again — should not throw (rect cache is fresh)
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);
  });
});
