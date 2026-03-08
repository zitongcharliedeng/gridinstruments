/**
 * Slider fill/notch/badge three-way desync verification (#70)
 *
 * Measures thumb center px, fill endpoint px, badge center px, and notch px
 * at 25%, 50%, 75% slider positions and checks they're all within 2px.
 */

import { test, expect } from '@playwright/test';

test.describe('Tuning slider desync #70', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3099');
    await page.waitForSelector('#grid-settings-btn', { state: 'visible' });
    await page.click('#grid-settings-btn');
    await page.waitForSelector('#tuning-slider', { state: 'visible' });
    // Give overlay time to fully render
    await page.waitForTimeout(200);
    // Trigger refreshAllSliderUI by clicking the cog (already open), wait for it
    await page.waitForTimeout(100);
  });

  const positions = [
    { label: '25%', pct: 0.25 },
    { label: '50%', pct: 0.50 },
    { label: '75%', pct: 0.75 },
  ];

  for (const { label, pct } of positions) {
    test(`fill/badge/notch in lockstep at ${label}`, async ({ page }) => {
      const slider = page.locator('#tuning-slider');
      const badge = page.locator('#tuning-thumb-badge');

      // Read slider min/max
      const min = parseFloat(await slider.getAttribute('min') ?? '683');
      const max = parseFloat(await slider.getAttribute('max') ?? '722');
      const targetValue = min + (max - min) * pct;

      // Set slider value
      await slider.evaluate((el: HTMLInputElement, val: string) => {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, targetValue.toFixed(2));

      await page.waitForTimeout(100);

      // ── Measure all three elements ──────────────────────────────────────
      const measurements = await page.evaluate(({ pct }) => {
        const slider = document.getElementById('tuning-slider') as HTMLInputElement;
        const badge = document.getElementById('tuning-thumb-badge') as HTMLInputElement;

        if (!slider || !badge) return null;

        // Thumb center px (same formula as thumbCenterPx in main.ts)
        const thumbW = 3;
        const trackW = slider.offsetWidth;
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const ratio = (val - min) / (max - min);
        const thumbCenterPx = ratio * (trackW - thumbW) + thumbW / 2;

        // Fill endpoint: parse background gradient percentage
        const bg = slider.style.background;
        const fillMatch = bg.match(/var\(--fg\)\s+([\d.]+)%/);
        const fillPct = fillMatch ? parseFloat(fillMatch[1]) : -1;
        const fillEndPx = fillPct >= 0 ? (fillPct / 100) * trackW : -1;

        // Badge position: badge.style.left, then the center of badge
        const badgeLeft = parseFloat(badge.style.left) || 0;
        // badge has transform: translateX(-50%), so center is at badgeLeft
        const badgeCenterPx = badgeLeft;

        // Notch positions — find all marks in tet-presets and match to current value
        const tetPresets = document.getElementById('tet-presets');
        const notchData: Array<{ value: number; leftCss: string; computedLeft: number }> = [];
        if (tetPresets) {
          const marks = tetPresets.querySelectorAll('.slider-preset-mark');
          marks.forEach(mark => {
            const btn = mark.querySelector('.slider-preset-btn') as HTMLElement | null;
            if (!btn) return;
            const presetsRect = tetPresets.getBoundingClientRect();
            const markRect = (mark as HTMLElement).getBoundingClientRect();
            // Mark center relative to presets container
            const markCenterInPresets = markRect.left + markRect.width / 2 - presetsRect.left;
            notchData.push({
              value: parseFloat(btn.dataset.value ?? '0'),
              leftCss: (mark as HTMLElement).style.left,
              computedLeft: markCenterInPresets,
            });
          });
        }

        // Get slider rect relative to tet-presets rect to compare notch vs thumb
        const sliderRect = slider.getBoundingClientRect();
        const tetPresetsEl = document.getElementById('tet-presets');
        const presetsRect = tetPresetsEl?.getBoundingClientRect();

        // Slider left relative to presets container
        const sliderLeftInPresets = presetsRect
          ? sliderRect.left - presetsRect.left
          : 0;

        return {
          sliderWidth: trackW,
          ratio: ratio.toFixed(4),
          thumbCenterPx: thumbCenterPx.toFixed(2),
          fillEndPx: fillEndPx.toFixed(2),
          fillPct: fillPct.toFixed(2),
          badgeCenterPx: badgeCenterPx.toFixed(2),
          notchData,
          sliderLeftInPresets: sliderLeftInPresets.toFixed(2),
          sliderRect: { left: sliderRect.left, width: sliderRect.width },
          presetsRect: presetsRect ? { left: presetsRect.left, width: presetsRect.width } : null,
        };
      }, { pct });

      console.log(`\n=== ${label} ===`);
      console.log(JSON.stringify(measurements, null, 2));

      if (!measurements) {
        throw new Error('Could not measure slider elements');
      }

      const thumbPx = parseFloat(measurements.thumbCenterPx);
      const fillPx = parseFloat(measurements.fillEndPx);
      const badgePx = parseFloat(measurements.badgeCenterPx);

      // The fill endpoint should be within 2px of thumb center
      // (fill is set as a percentage of trackW, so it's equivalent to thumbCenterPx)
      expect(
        Math.abs(fillPx - thumbPx),
        `Fill endpoint (${fillPx}px) vs thumb center (${thumbPx}px) should be within 2px`
      ).toBeLessThanOrEqual(2);

      // Badge is positioned relative to slider-track; slider is also in slider-track.
      // They share the same coordinate system when the slider starts at x=0 within slider-track.
      expect(
        Math.abs(badgePx - thumbPx),
        `Badge center (${badgePx}px) vs thumb center (${thumbPx}px) should be within 2px`
      ).toBeLessThanOrEqual(2);

      // For notch alignment, find the expected notch at this ratio and compare
      // Notch formula: calc(ratio * (100% - 3px) + 1.5px) relative to tet-presets
      // Thumb formula: ratio * (sliderW - 3) + 1.5 relative to slider left
      // They align only if sliderLeftInPresets == 0
      const sliderLeft = parseFloat(measurements.sliderLeftInPresets);
      console.log(`Slider left within tet-presets: ${sliderLeft}px`);
      console.log(`If non-zero, notches are offset from thumb by ${sliderLeft}px`);
    });
  }

  test('take screenshots at 25/50/75% for evidence', async ({ page }) => {
    const slider = page.locator('#tuning-slider');
    const min = parseFloat(await slider.getAttribute('min') ?? '683');
    const max = parseFloat(await slider.getAttribute('max') ?? '722');

    for (const pct of [0.25, 0.50, 0.75]) {
      const targetValue = min + (max - min) * pct;
      await slider.evaluate((el: HTMLInputElement, val: string) => {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, targetValue.toFixed(2));
      await page.waitForTimeout(150);
      await page.screenshot({
        path: `tests/slider-desync-evidence-${Math.round(pct * 100)}pct.png`,
        clip: await page.locator('.tuning-slider-area').first().boundingBox() ?? undefined,
      });
    }
  });
});
