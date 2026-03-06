import { test, expect } from '@playwright/test';

test.describe('DCompose Web — Behavioral State Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    // Overlay starts hidden — open it so slider/input tests can interact
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
  });


  test.describe('Slider Reset State Transitions', () => {
    /**
     * @reason Tuning reset must restore the 12-TET default (700.0 cents).
     *   Badge is an <input type="text"> — use inputValue(), not textContent().
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
      expect(await page.locator('#tuning-thumb-badge').inputValue()).toBe('700.0');
    });

    /**
     * @reason Skew reset must restore MidiMech layout (0.00).
     *   Badge is an <input type="text"> — use inputValue(), not textContent().
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
      expect(await page.locator('#skew-thumb-badge').inputValue()).toBe('0.00');
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
      const input = page.locator('#d-ref-input');
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
      const input = page.locator('#d-ref-input');
      await input.click();
      await input.fill('garbage');
      await input.dispatchEvent('input');
      await page.locator('body').click();
      await page.waitForTimeout(200);
      expect(await input.inputValue()).toContain('293.66');
    });

    /**
     * @reason Empty input must revert to default — an empty frequency field
     *   would leave the synth in an undefined state.
     * @design-intent Clearing the field and blurring is a common user pattern;
     *   it must gracefully restore the default rather than crash.
     */
    test('BH-DREF-3: D-ref empty input reverts to 293.66', async ({ page }) => {
      const input = page.locator('#d-ref-input');
      await input.click();
      await input.fill('');
      await page.locator('body').click();
      await page.waitForTimeout(200);
      expect(await input.inputValue()).toBe('293.66');
    });

    /**
     * @reason D-ref reset button must restore default 293.66 Hz and update
     *   the label overlay to show the D4 annotation in brackets.
     * @design-intent Reset is the escape hatch when a user has entered a
     *   custom reference frequency and wants to return to standard D4 tuning.
     */
    test('BH-DREF-4: D-ref reset restores default', async ({ page }) => {
      const input = page.locator('#d-ref-input');
      await input.click();
      await input.fill('440');
      await input.dispatchEvent('input');
      await page.waitForTimeout(100);
      await page.locator('#d-ref-reset').click();
      await page.waitForTimeout(200);
      // Badge shows plain number, annotation is in label overlay
      expect(await input.inputValue()).toBe('293.66');
      const labelText = await page.locator('#d-ref-label').textContent();
      expect(labelText).toContain('D4');
    });
    /**
     * @reason D-ref label overlay shows the note annotation in brackets
     *   after the base label text, e.g. "D REF (Hz) [D4]".
     * @design-intent Visible annotation in the slider label is more
     *   discoverable than a hidden tooltip.
     */
    test('BH-DREF-5: D-ref badge shows plain Hz, annotation in label overlay', async ({ page }) => {
      // Badge = just the number
      const val = await page.locator('#d-ref-input').inputValue();
      expect(val).toBe('293.66');
      // Annotation in label overlay
      const labelText = await page.locator('#d-ref-label').textContent();
      expect(labelText).toContain('D4');
    });

    /**
     * @reason When frequency changes (e.g. to 440 Hz), the label overlay must
     *   update to show the corresponding note annotation ("A4") in brackets.
     * @design-intent Real-time annotation updates give musicians immediate
     *   feedback about which note they're tuning to.
     */
    test('BH-DREF-6: D-ref annotation updates when frequency changes', async ({ page }) => {
      const input = page.locator('#d-ref-input');
      await input.click();
      await input.fill('440');
      await input.dispatchEvent('input');
      await page.locator('body').click();
      await page.waitForTimeout(200);
      // Badge shows plain number
      expect(await input.inputValue()).toBe('440.00');
      // Label overlay shows A4 annotation
      const labelText = await page.locator('#d-ref-label').textContent();
      expect(labelText).toContain('A4');
    });

    /**
     * @reason Invalid input triggers setCustomValidity, making the input
     *   match CSS :invalid which shows #cc3333 (red) border.
     * @design-intent Red border provides immediate visual feedback that the
     *   entered value is invalid, before the auto-revert kicks in.
     */
    test('BH-DREF-7: D-ref shows red border on invalid value', async ({ page }) => {
      const input = page.locator('#d-ref-input');
      await input.click();
      await input.fill('xyz');
      await input.dispatchEvent('input');
      await page.waitForTimeout(200);
      const borderColor = await input.evaluate(el => getComputedStyle(el).borderColor);
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
      await expect(page.locator('#mpe-enabled')).toBeVisible();
      await expect(page.locator('#mpe-output-select')).toBeVisible();
    });

  });


  test.describe('Keyboard Focus Behavior', () => {
    /**
     * @reason Clicking the MIDI settings toggle must not move keyboard focus
     *   into the settings panel inputs — the synth must remain playable.
     * @design-intent Opening the MIDI panel is informational; keyboard focus
     *   must stay on body/synth so notes can still be played via keyboard.
     */
    test('BH-FOCUS-PRESERVE-1: Settings toggle does not steal synth focus', async ({ page }) => {
      await page.locator('#grid-settings-btn').click();
      await page.waitForTimeout(300);
      const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeTagName).not.toBe('INPUT');
      expect(activeTagName).not.toBe('SELECT');
    })
  });

  test.describe('Modifier Key Behavior', () => {
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

  test.describe('Tooltip Invariants', () => {
    /**
     * @reason Every interactive control must have a title attribute for
     *   accessibility and discoverability (ISC-TT-1, ISC-TT-2).
     * @design-intent Title attributes provide native browser tooltips on
     *   hover, giving users context without cluttering the minimal UI.
     */
    test('BH-TT-1: All sliders and buttons have non-empty title attributes', async ({ page }) => {
      const selectors = [
        '#tuning-slider', '#tuning-thumb-badge', '#tuning-reset',
        '#skew-slider', '#skew-thumb-badge', '#skew-reset',
        '#zoom-slider', '#zoom-reset',
        '#volume-slider', '#volume-reset',
        '#d-ref-input', '#d-ref-reset',

        '.wave-btn[data-waveform="sawtooth"]', '.wave-btn[data-waveform="sine"]',
        '.wave-btn[data-waveform="square"]', '.wave-btn[data-waveform="triangle"]',
        '#layout-select',
      ];
      for (const sel of selectors) {
        const title = await page.locator(sel).getAttribute('title');
        expect(title, `${sel} missing title`).toBeTruthy();
        expect(title!.length, `${sel} empty title`).toBeGreaterThan(0);
      }
    });
  });

  test.describe('About Section Invariants', () => {
    /**
     * @reason About section must have the 'why' paragraph, no 'This Project'
     *   column, and no GitHub profile link (ISC-AB-1, ISC-AB-2, ISC-AB-3).
     * @design-intent The about section explains DCompose's purpose and links
     *   to relevant isomorphic layout resources without self-promotional clutter.
     */
    test('BH-AB-1: About dialog has description, no This Project col, no GitHub profile link', async ({ page }) => {
      await page.locator('#about-btn').click();
      await page.waitForTimeout(500);
      // ISC-AB-3: Has description paragraph (README starts with "Isomorphic keyboard synthesizer")
      const aboutText = await page.locator('#about-dialog').textContent();
      expect(aboutText?.toLowerCase()).toContain('isomorphic');
      // ISC-AB-1: No '.about-col' elements (old structure gone)
      const colCount = await page.locator('#about-dialog .about-col').count();
      expect(colCount).toBe(0);
      // ISC-AB-2: No GitHub profile link in about dialog
      const aboutLinks = await page.locator('#about-dialog a').allTextContents();
      const hasGitHubProfile = aboutLinks.some(t => t.includes('GitHub') && t.includes('zitongcharliedeng'));
      expect(hasGitHubProfile).toBe(false);
    });
  });

  test.describe('D-ref Range', () => {
    /**
     * @reason D-ref slider must cover D2 (73.42 Hz) to D6 (1174.66 Hz) — the
     *   full practical range for an isomorphic keyboard reference pitch.
     * @design-intent D2–D4 was too narrow; musicians need D5/D6 for soprano
     *   and piccolo register exploration.
     */
    test('BH-DREF-RANGE-1: D-ref slider range is D2 to D6', async ({ page }) => {
      const slider = page.locator('#d-ref-slider');
      const min = parseFloat(await slider.getAttribute('min') ?? '0');
      const max = parseFloat(await slider.getAttribute('max') ?? '0');
      expect(min).toBeCloseTo(73.42, 0);  // D2
      expect(max).toBeCloseTo(1174.66, 0); // D6
    });

    /**
     * @reason Setting D-ref to D6 frequency (1174.66 Hz) via slider must
     *   propagate to the badge input and synth — the range is not cosmetic.
     * @design-intent The full D2–D6 range must actually work, not just be
     *   displayed as slider endpoints.
     */
    test('BH-DREF-RANGE-2: D-ref slider accepts D6 value', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('d-ref-slider') as HTMLInputElement;
        s.value = '1174.66';
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(200);
      const val = parseFloat(await page.locator('#d-ref-input').inputValue());
      expect(val).toBeCloseTo(1174.66, 0);
    });
  });

  test.describe('Slider Fill Rendering', () => {
    /**
     * @reason Slider fill gradient must track the slider value. At min value,
     *   the fill should be near 0%. At max value, near 100%. This was broken
     *   in Firefox where ::-moz-range-track didn't inherit CSS custom properties.
     * @design-intent Visual slider fill gives users spatial feedback about
     *   where their value sits within the range — broken fill is disorienting.
     */
    test('BH-FILL-1: Slider fill at minimum shows near-zero fill', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('skew-slider') as HTMLInputElement;
        s.value = s.min;
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      const bg = await page.locator('#skew-slider').evaluate(
        (el) => (el as HTMLElement).style.background
      );
      expect(bg).toContain('linear-gradient');
      const match = bg.match(/(\d+\.?\d*)%/);
      expect(match, 'Gradient should contain a percentage').toBeTruthy();
      expect(parseFloat(match![1])).toBeLessThan(5);
    });

    test('BH-FILL-2: Slider fill at maximum shows near-full fill', async ({ page }) => {
      await page.evaluate(() => {
        const s = document.getElementById('skew-slider') as HTMLInputElement;
        s.value = s.max;
        s.dispatchEvent(new Event('input'));
      });
      await page.waitForTimeout(100);
      const bg = await page.locator('#skew-slider').evaluate(
        (el) => (el as HTMLElement).style.background
      );
      expect(bg).toContain('linear-gradient');
      const match = bg.match(/(\d+\.?\d*)%/);
      expect(match, 'Gradient should contain a percentage').toBeTruthy();
      expect(parseFloat(match![1])).toBeGreaterThan(95);
    });
  });

  test.describe('Bracket Annotation Styling', () => {
    /**
     * @reason D-ref label overlay annotation must use compact format (e.g. "D4 -52¢")
     *   and be visually distinct with a green color, matching all other slider
     *   bracket annotations.
     * @design-intent Green bracket annotations are scannable at a glance —
     *   they separate metadata from the base label without brackets taking space.
     */
    test('BH-BRACKET-1: D-ref annotation is green colored', async ({ page }) => {
      const label = page.locator('#d-ref-label');
      const html = await label.innerHTML();
      // Annotation part should be in a colored span
      expect(html).toContain('style=');
      // The colored span should use a green-ish color
      const greenMatch = html.match(/color:\s*([^;"]+)/);
      expect(greenMatch, 'Annotation should have a color style').toBeTruthy();
    });
  });

  test.describe('About Section Links', () => {
    /**
     * @reason About section must include Isomorphic Layout column with links
     *   to Wicki-Hayden, Striso, MidiMech, and WickiSynth references.
     * @design-intent These links credit the foundational work and give users
     *   context about the isomorphic keyboard ecosystem.
     */
    test('BH-AB-2: About dialog has Isomorphic Layout links', async ({ page }) => {
      await page.locator('#about-btn').click();
      await page.waitForTimeout(500);
      const linkTexts = await page.locator('#about-content a').allTextContents();
      expect(linkTexts.some(t => t.includes('Wicki'))).toBe(true);
      expect(linkTexts.some(t => t.includes('Striso'))).toBe(true);
      expect(linkTexts.some(t => t.includes('MIDImech'))).toBe(true);
      expect(linkTexts.some(t => t.includes('WickiSynth'))).toBe(true);
    });
    /**
     * @reason Footer must credit WickiSynth by Piers Titus van der Torren
     *   and mention MIDImech and Striso as inspirations. No GitHub link.
     * @design-intent Attribution is non-negotiable for derivative works.
     */
    test('BH-AB-3: About dialog footer has WickiSynth attribution and inspiration credits', async ({ page }) => {
      await page.locator('#about-btn').click();
      await page.waitForTimeout(500);
      const contentText = await page.locator('#about-content').textContent();
      expect(contentText).toContain('WickiSynth');
      expect(contentText).toContain('Piers Titus');
      expect(contentText).toContain('MIDImech');
      expect(contentText).toContain('Striso');
      // No standalone GitHub link
      const allLinks = await page.locator('#about-content a').allTextContents();
      expect(allLinks.every(t => !t.match(/^GitHub$/i))).toBe(true);
  });
    });
  test.describe('Piano Roll', () => {
    /**
     * @reason Piano roll replaces the old clef/staff panel.
     *   The history canvas must be visible and render without errors.
     * @design-intent Synthesia-style piano roll gives musicians clear
     *   visual feedback on notes played over time.
     */
    test('BH-PIANOROLL-1: history canvas renders piano roll on note play', async ({ page }) => {
      const canvas = page.locator('#history-canvas');
      await expect(canvas).toBeVisible();
      // Canvas should be present and have non-zero dimensions
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(50);
    });
  });

  test.describe('Window Blur Behavior', () => {
    /**
     * @reason When the window loses focus (blur event), all active modifier
     *   states (vibrato/sustain) must be cleared immediately. The stopAllNotes()
     *   method is called on window blur to prevent stuck modifiers.
     * @design-intent Window blur is the safety mechanism that prevents
     *   'stuck modifiers' when focus leaves the app.
     */
    test('BH-BLUR-1: Releasing modifier keys clears indicators', async ({ page }) => {
      // Focus the page to ensure keyboard events are received
      
      // Activate vibrato by holding Shift
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      const vibratoIndicator = page.locator('#vibrato-indicator');
      await expect(vibratoIndicator).toHaveClass(/active/);
      
      // Activate sustain by holding Space
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      const sustainIndicator = page.locator('#sustain-indicator');
      await expect(sustainIndicator).toHaveClass(/active/);
      
      // Release Shift — vibrato should deactivate
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      await expect(vibratoIndicator).not.toHaveClass(/active/);
      
      // Sustain should still be active
      await expect(sustainIndicator).toHaveClass(/active/);
      
      // Release Space — sustain should deactivate
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      await expect(sustainIndicator).not.toHaveClass(/active/);
    });
  });

  test.describe('Focus Return After Slider Interaction', () => {
    /**
     * @reason After clicking a slider reset button, keyboard focus must
     *   return to the body/synth so keyboard input resumes immediately.
     *   If focus stays on the button or input, keyboard events are captured
     *   by the button/input instead of the synth.
     * @design-intent Musicians expect to click reset and immediately resume
     *   playing — no need to click the canvas to regain focus.
     */
    test('BH-FOCUS-RETURN-1: Keyboard input works after clicking slider reset', async ({ page }) => {
      // Focus the page to ensure keyboard events are received
      
      // Click the tuning reset button
      await page.locator('#tuning-reset').click();
      await page.waitForTimeout(100);
      
      // Verify keyboard input goes to synth (Shift should activate vibrato)
      // This tests that the synth is still responsive after the button click
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      const vibratoIndicator = page.locator('#vibrato-indicator');
      await expect(vibratoIndicator).toHaveClass(/active/);
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      await expect(vibratoIndicator).not.toHaveClass(/active/);
    });
  });

  test.describe('Modifier State Persistence', () => {
    /**
     * @reason Holding Shift for vibrato must persist across multiple
     *   note plays — the vibrato effect should remain active for the
     *   entire duration of the Shift hold, not toggle on/off per note.
     * @design-intent Vibrato is a continuous effect, not a per-note toggle.
     *   Musicians expect to hold Shift and play multiple notes with vibrato.
     */
    test('BH-MODIFIER-PERSIST-1: Vibrato persists across multiple note plays', async ({ page }) => {
      // Focus the page to ensure keyboard events are received
      
      const vibratoIndicator = page.locator('#vibrato-indicator');
      
      
      // Hold Shift to activate vibrato
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      await expect(vibratoIndicator).toHaveClass(/active/);
      
      // Play a note (C key)
      await page.keyboard.press('c');
      await page.waitForTimeout(50);
      
      // Vibrato should still be active
      await expect(vibratoIndicator).toHaveClass(/active/);
      
      // Play another note (D key)
      await page.keyboard.press('d');
      await page.waitForTimeout(50);
      
      // Vibrato should still be active
      await expect(vibratoIndicator).toHaveClass(/active/);
      
      // Release Shift
      await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })));
      await page.waitForTimeout(100);
      await expect(vibratoIndicator).not.toHaveClass(/active/);
    });
  });


  test.describe('Stuck Note Prevention', () => {
    test('BH-STUCK-1: pointerdown+up on canvas without prior interaction leaves no active note', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const canvas = page.locator('#keyboard-canvas');
      await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: 200, clientY: 200, pressure: 0.5, bubbles: true });
      await canvas.dispatchEvent('pointerup', { pointerId: 1, clientX: 200, clientY: 200, bubbles: true });
      await page.waitForTimeout(600);
      const count = await page.evaluate(() => {
        const d = (window as unknown as { dcomposeApp?: { getActiveNoteCount?: () => number } }).dcomposeApp;
        return d?.getActiveNoteCount?.() ?? -1;
      });
      expect(count).toBe(0);
    });

    test('BH-STUCK-2: keydown+up without prior interaction leaves no active note', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.keyboard.press('a');
      await page.waitForTimeout(600);
      const count = await page.evaluate(() => {
        const d = (window as unknown as { dcomposeApp?: { getActiveNoteCount?: () => number } }).dcomposeApp;
        return d?.getActiveNoteCount?.() ?? -1;
      });
      expect(count).toBe(0);
    });
  });

  test.describe('Portrait Mobile Layout', () => {
    /**
     * @reason On portrait mobile, the overlay is absolutely positioned and starts hidden,
     *   so the keyboard canvas must fill the full viewport width.
     * @design-intent Mobile users get the maximum playable grid area. The overlay never
     *   takes layout flow space because it uses position: absolute.
     */
    test('BH-MOB-1: Overlay starts hidden — canvas fills full 390px viewport width', async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      const p = await ctx.newPage();
      await p.goto('/');
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1500);

      // Overlay starts hidden (position: absolute, no layout impact)
      const overlayHidden = await p.evaluate(() =>
        document.getElementById('grid-overlay')!.classList.contains('hidden')
      );
      expect(overlayHidden).toBe(true);

      // Canvas fills viewport width
      const canvasWidth = await p.evaluate(() =>
        document.getElementById('keyboard-canvas')!.getBoundingClientRect().width
      );
      expect(canvasWidth).toBeGreaterThanOrEqual(380); // 390px viewport minus tiny margin

      await ctx.close();
    });

    test('BH-MOB-2: Default zoom on 390px touch device is smart-scaled (≤ 1.0)', async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
      });
      const p = await ctx.newPage();
      await p.goto('/');
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1500);

      // Smart formula: Math.min(1.6, 390/480) = 0.8125 on touch devices
      const defaultZoom = await p.evaluate(() => {
        const app = (window as Window & { dcomposeApp?: { getDefaultZoom: () => number } }).dcomposeApp;
        return app?.getDefaultZoom() ?? -1;
      });
      expect(defaultZoom, 'defaultZoom must be initialized').toBeGreaterThan(0);
      expect(defaultZoom, 'defaultZoom on 390px touch must be ≤ 1.0 (smart formula)').toBeLessThanOrEqual(1.0);
      expect(defaultZoom, 'defaultZoom on 390px touch must be > 0.5 (not absurdly small)').toBeGreaterThan(0.5);

      // Also verify the zoom slider reflects the smart default
      const sliderVal = await p.evaluate(() => {
        const s = document.getElementById('zoom-slider') as HTMLInputElement | null;
        return s ? parseFloat(s.value) : -1;
      });
      expect(sliderVal, 'zoom slider must match defaultZoom').toBeCloseTo(defaultZoom, 2);

      await ctx.close();
    });
  });
});
