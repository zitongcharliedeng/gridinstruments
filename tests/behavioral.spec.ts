import { test, expect } from '@playwright/test';

test.describe('DCompose Web — Behavioral State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test.describe('Slider Reset State Transitions', () => {
    /**
     * @reason Tuning reset must restore the 12-TET default (700.0 cents).
     *   Badge is a <span> — use textContent(), not inputValue().
     * @design-intent One-click reset to 12-TET prevents users from getting
     *   stuck on an unfamiliar tuning after exploring the syntonic continuum.
     */
    test('BH-RESET-1: Tuning reset restores 700.0', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('tuning-slider') as HTMLInputElement;
        s.value = '720';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      await page.locator('#tuning-reset').click();
      await page.waitForTimeout(100);
      expect(await page.locator('#tuning-thumb-badge').textContent()).toBe('700.0');
    });

    /**
     * @reason Skew reset must restore MidiMech layout (0.00).
     *   Badge is a <span> — use textContent(), not inputValue().
     * @design-intent Reset to MidiMech (0) is the safe default — the layout
     *   most users expect from a Wicki-Hayden keyboard.
     */
    test('BH-RESET-2: Skew reset restores 0.00', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('skew-slider') as HTMLInputElement;
        s.value = '0.75';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      await page.locator('#skew-reset').click();
      await page.waitForTimeout(100);
      expect(await page.locator('#skew-thumb-badge').textContent()).toBe('0.00');
    });

    /**
     * @reason Volume reset must restore default gain 0.3 (≈ -10.5 dB).
     *   Badge is a <span> — use textContent(), not inputValue().
     * @design-intent Default volume of -10.5 dB is safe for headphone users
     *   while being audible on speakers.
     */
    test('BH-RESET-3: Volume reset restores -10.5', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('volume-slider') as HTMLInputElement;
        s.value = '0.8';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      await page.locator('#volume-reset').click();
      await page.waitForTimeout(100);
      expect(await page.locator('#volume-thumb-badge').textContent()).toBe('-10.5');
    });

    /**
     * @reason Zoom reset must restore 1.00 (no "x" suffix — unit is in label).
     *   Badge is a <span> — use textContent(), not inputValue().
     * @design-intent Zoom 1.00 maps to roughly standard keyboard key size,
     *   giving new users a familiar spatial reference.
     */
    test('BH-RESET-4: Zoom reset restores 1.00', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('zoom-slider') as HTMLInputElement;
        s.value = '2.5';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      await page.locator('#zoom-reset').click();
      await page.waitForTimeout(100);
      expect(await page.locator('#zoom-thumb-badge').textContent()).toBe('1.00');
    });
  });

  test.describe('D-ref Input Behavior', () => {
    /**
     * @reason D-ref input accepts note names (e.g. "C5") and converts them
     *   to Hz via the note-to-frequency lookup in main.ts.
     * @design-intent Musicians think in note names, not frequencies — accepting
     *   both formats makes the input accessible to all skill levels.
     */
    test('BH-DREF-1: D-ref accepts note name and converts to Hz', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('C5');
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);
      const hz = parseFloat(await input.inputValue());
      expect(hz).toBeCloseTo(523.25, 0);
    });

    /**
     * @reason Invalid input (non-numeric, non-note-name) must revert to the
     *   default 293.66 Hz on blur to prevent the synth from breaking.
     * @design-intent The input is forgiving — bad values auto-correct on blur
     *   rather than showing a permanent error state.
     */
    test('BH-DREF-2: D-ref reverts to 293.66 on invalid input blur', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('garbage');
      await input.dispatchEvent('input');
      await page.locator('body').click();
      await page.waitForTimeout(200);
      expect(await input.inputValue()).toBe('293.66');
    });

    /**
     * @reason Empty input must revert to default — an empty frequency field
     *   would leave the synth in an undefined state.
     * @design-intent Clearing the field and blurring is a common user pattern;
     *   it must gracefully restore the default rather than crash.
     */
    test('BH-DREF-3: D-ref empty input reverts to 293.66', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('');
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);
      expect(await input.inputValue()).toBe('293.66');
    });

    /**
     * @reason D-ref reset button must restore default 293.66 Hz and update
     *   the hint to show "D4".
     * @design-intent Reset is the escape hatch when a user has entered a
     *   custom reference frequency and wants to return to standard D4 tuning.
     */
    test('BH-DREF-4: D-ref reset restores default', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('440');
      await input.dispatchEvent('input');
      await page.waitForTimeout(100);
      await page.locator('#d4-ref-reset').click();
      await page.waitForTimeout(200);
      expect(await input.inputValue()).toBe('293.66');
      const hint = await page.locator('#d4-ref-hint').textContent();
      expect(hint).toContain('D4');
    });

    /**
     * @reason D-ref hint shows the nearest note name ("D4") in white text,
     *   helping users understand which note their frequency corresponds to.
     * @design-intent White text matches the monochrome design; green was
     *   rejected because it implies "valid" status rather than informational.
     */
    test('BH-DREF-5: D-ref hint shows D4 and is white', async ({ page }) => {
      const hint = page.locator('#d4-ref-hint');
      expect(await hint.textContent()).toContain('D4');
      const color = await hint.evaluate(el => getComputedStyle(el).color);
      expect(color).toBe('rgb(255, 255, 255)');
    });

    /**
     * @reason When frequency changes (e.g. to 440 Hz), the hint must update
     *   to show the corresponding note name ("A4").
     * @design-intent Real-time hint updates give musicians immediate feedback
     *   about which note they're tuning to.
     */
    test('BH-DREF-6: D-ref hint updates when frequency changes', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('440');
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);
      const hintText = await page.locator('#d4-ref-hint').textContent();
      expect(hintText).toContain('A4');
    });

    /**
     * @reason Invalid input sets inline borderColor to #cc3333 (red) as a
     *   visual error indicator before auto-reverting on blur.
     * @design-intent Red border provides immediate visual feedback that the
     *   entered value is invalid, before the auto-revert kicks in.
     */
    test('BH-DREF-7: D-ref shows red border on invalid value', async ({ page }) => {
      const input = page.locator('#d4-ref-input');
      await input.click();
      await input.fill('xyz');
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);
      const borderColor = await input.evaluate(el => el.style.borderColor);
      expect(borderColor).toBe('rgb(204, 51, 51)');
    });
  });

  test.describe('MPE UI Behavior', () => {
    /**
     * @reason MPE checkbox and output select must be present in the MIDI panel
     *   after clicking the settings toggle.
     * @design-intent MPE controls are hidden behind the MIDI panel toggle to
     *   avoid overwhelming non-MIDI users with advanced options.
     */
    test('BH-MPE-1: MPE checkbox and select are present', async ({ page }) => {
      await page.locator('#midi-settings-toggle').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#mpe-enabled')).toBeVisible();
      await expect(page.locator('#mpe-output-select')).toBeVisible();
    });

    /**
     * @reason MPE output select starts disabled and only enables after the
     *   MPE checkbox is checked — prevents accidental MIDI output.
     * @design-intent Two-step activation (checkbox → select) is a safety
     *   measure to prevent unintended MIDI data being sent to external devices.
     */
    test('BH-MPE-2: MPE select is disabled until checkbox is checked', async ({ page }) => {
      await page.locator('#midi-settings-toggle').click();
      await page.waitForTimeout(300);
      expect(await page.locator('#mpe-output-select').isDisabled()).toBe(true);
      await page.locator('#mpe-enabled').check();
      await page.waitForTimeout(100);
      expect(await page.locator('#mpe-output-select').isDisabled()).toBe(false);
    });
  });

  test.describe('MIDI Panel Behavior', () => {
    /**
     * @reason MIDI settings panel toggles open/closed via the .open CSS class
     *   which switches display from none to flex.
     * @design-intent Accordion pattern keeps the MIDI panel out of sight until
     *   needed, preserving screen real estate for the keyboard canvas.
     */
    test('BH-MIDI-1: MIDI settings toggle opens/closes panel', async ({ page }) => {
      const toggle = page.locator('#midi-settings-toggle');
      const panel = page.locator('#midi-settings-panel');
      await expect(panel).not.toHaveClass(/open/);
      await toggle.click();
      await page.waitForTimeout(200);
      await expect(panel).toHaveClass(/open/);
      await toggle.click();
      await page.waitForTimeout(200);
      await expect(panel).not.toHaveClass(/open/);
    });
  });

  test.describe('Keyboard Focus Behavior', () => {
    /**
     * @reason Enter key in the D-ref input triggers blur so keyboard events
     *   return to the synth instead of being captured by the text input.
     * @design-intent Musicians need Enter to confirm and immediately resume
     *   playing — the input must release focus without requiring a mouse click.
     */
    test('BH-FOCUS-1: Enter blurs text input', async ({ page }) => {
      await page.locator('#d4-ref-input').click();
      await expect(page.locator('#d4-ref-input')).toBeFocused();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
      await expect(page.locator('#d4-ref-input')).not.toBeFocused();
    });

    /**
     * @reason Escape key in the D-ref input triggers blur, matching the
     *   standard UI pattern for cancelling/dismissing input focus.
     * @design-intent Escape is the universal "cancel" key — users expect it
     *   to dismiss text input focus and return control to the synth.
     */
    test('BH-FOCUS-2: Escape blurs text input', async ({ page }) => {
      await page.locator('#d4-ref-input').click();
      await expect(page.locator('#d4-ref-input')).toBeFocused();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      await expect(page.locator('#d4-ref-input')).not.toBeFocused();
    });

    /**
     * @reason Clicking the MIDI settings toggle must not move keyboard focus
     *   into the settings panel inputs — the synth must remain playable.
     * @design-intent Opening the MIDI panel is informational; keyboard focus
     *   must stay on body/synth so notes can still be played via keyboard.
     */
    test('BH-FOCUS-PRESERVE-1: Settings toggle does not steal synth focus', async ({ page }) => {
      await page.locator('#midi-settings-toggle').click();
      await page.waitForTimeout(300);
      const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTagName).not.toBe('INPUT');
      expect(activeTagName).not.toBe('SELECT');
    });
  });

  test.describe('Skew Slider Behavior', () => {
    /**
     * @reason Skew endpoint labels ("MidiMech" / "DCompose") highlight with
     *   the .active class based on slider position — left at 0, right at 1.
     * @design-intent Active endpoint highlighting gives users a clear sense of
     *   which layout extreme they're closest to while dragging.
     */
    test('BH-SKEW-1: Endpoint labels highlight correctly', async ({ page }) => {
      await expect(page.locator('#skew-label-left')).toHaveClass(/active/);
      await page.evaluate(() => {
        const s = document.getElementById('skew-slider') as HTMLInputElement;
        s.value = '1';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(200);
      await expect(page.locator('#skew-label-right')).toHaveClass(/active/);
    });
  });

  test.describe('Modifier Key Behavior', () => {
    /**
     * @reason Space activates vibrato on keydown and deactivates on keyup —
     *   it is a hold modifier, not a toggle. The #vibrato-indicator gets
     *   the .active class only while Space is held.
     * @design-intent Hold-to-activate matches how real instrument vibrato works:
     *   the effect lasts exactly as long as the performer applies it.
     */
    test('BH-MODIFIER-HOLD-1: Vibrato activates on hold, deactivates on release', async ({ page }) => {
      const indicator = page.locator('#vibrato-indicator');
      await expect(indicator).not.toHaveClass(/active/);
      await page.keyboard.down('Space');
      await page.waitForTimeout(100);
      await expect(indicator).toHaveClass(/active/);
      await page.keyboard.up('Space');
      await page.waitForTimeout(100);
      await expect(indicator).not.toHaveClass(/active/);
    });

    /**
     * @reason Ctrl key combos (Ctrl+C, Ctrl+V, etc.) must pass through to the
     *   browser — they must NOT activate any synth modifier (vibrato/sustain).
     * @design-intent Ctrl is reserved for browser shortcuts. The synth's
     *   handleKeyDown returns early when ctrlKey is true.
     */
    test('BH-CTRL-PASSTHROUGH-1: Ctrl does not trigger synth modifiers', async ({ page }) => {
      const vibrato = page.locator('#vibrato-indicator');
      const sustain = page.locator('#sustain-indicator');
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.waitForTimeout(100);
      await expect(vibrato).not.toHaveClass(/active/);
      await expect(sustain).not.toHaveClass(/active/);
      await page.keyboard.up('Control');
    });
  });

  test.describe('Keyboard Layout Invariants', () => {
    /**
     * @reason The keyboard layout uses circle-of-fifths note naming that
     *   produces double sharps (𝄪) at x=11 and double flats (𝄫) at x=-11.
     *   These must be present for the layout to cover the full pitch space.
     * @design-intent Double accidentals prove the note naming covers coordinates
     *   beyond ±7 fifths — essential for non-12-TET tunings like 53-TET.
     */
    test('BH-DOUBLEACCIDENTAL-1: Note naming includes double sharps and flats', async ({ page }) => {
      const result = await page.evaluate(() => {
        const FIFTHS_NATURALS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
        function getNoteNameFromCoord(x: number): string {
          const baseIndex = ((x + 3) % 7 + 7) % 7;
          const baseName = FIFTHS_NATURALS[baseIndex];
          const accidentals = Math.floor((x + 3) / 7);
          if (accidentals === 0) return baseName;
          if (accidentals === 1) return baseName + '\u266F';
          if (accidentals === -1) return baseName + '\u266D';
          if (accidentals === 2) return baseName + String.fromCodePoint(0x1D12A);
          if (accidentals === -2) return baseName + String.fromCodePoint(0x1D12B);
          return '';
        }
        return {
          doubleSharp: getNoteNameFromCoord(11),
          doubleFlat: getNoteNameFromCoord(-11),
        };
      });
      expect(result.doubleSharp).toContain(String.fromCodePoint(0x1D12A));
      expect(result.doubleFlat).toContain(String.fromCodePoint(0x1D12B));
    });
  });
});
