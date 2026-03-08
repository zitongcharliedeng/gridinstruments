import { test, expect } from '@playwright/test';

test('slider fill/badge/notch evidence at 25/50/75%', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3099');
  await page.waitForSelector('#grid-settings-btn', { state: 'visible' });
  await page.click('#grid-settings-btn');

  await page.waitForFunction(() => {
    const s = document.getElementById('tuning-slider') as HTMLInputElement | null;
    return s !== null && s.offsetWidth > 0;
  }, { timeout: 10000 });
  await page.waitForTimeout(200);

  const slider = page.locator('#tuning-slider');
  const min = parseFloat(await slider.getAttribute('min') ?? '683');
  const max = parseFloat(await slider.getAttribute('max') ?? '722');

  const allResults: Record<string, unknown>[] = [];

  for (const pct of [0.25, 0.50, 0.75]) {
    const targetValue = (min + (max - min) * pct).toFixed(2);
    await slider.evaluate((el: HTMLInputElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, targetValue);
    await page.waitForTimeout(200);

    const m = await page.evaluate(() => {
      const sl = document.getElementById('tuning-slider') as HTMLInputElement | null;
      const bg = document.getElementById('tuning-thumb-badge') as HTMLInputElement | null;
      if (!sl || !bg) return null;
      const tw = sl.offsetWidth;
      const mn = parseFloat(sl.min), mx = parseFloat(sl.max), v = parseFloat(sl.value);
      const r = (v - mn) / (mx - mn);
      const tcp = r * (tw - 3) + 1.5;
      const bgl = parseFloat(bg.style.left) || 0;
      const fillMatch = sl.style.background.match(/var\(--fg\)\s+([\d.]+)%/);
      const fillPx = fillMatch ? parseFloat(fillMatch[1]) / 100 * tw : -1;
      return {
        sliderWidth: tw,
        ratio: r.toFixed(4),
        thumbCenterPx: tcp.toFixed(2),
        badgeLeft: bgl.toFixed(2),
        fillEndPx: fillPx.toFixed(2),
        diff_badge_vs_thumb: Math.abs(bgl - tcp).toFixed(2),
        diff_fill_vs_thumb: Math.abs(fillPx - tcp).toFixed(2),
      };
    });

    console.log(`\n${Math.round(pct * 100)}%:`, JSON.stringify(m, null, 2));
    allResults.push({ pct, ...m });

    const areaBox = await page.locator('.tuning-slider-area').first().boundingBox();
    if (areaBox) {
      await page.screenshot({
        path: `tests/slider-desync-evidence-${Math.round(pct * 100)}pct.png`,
        clip: { x: areaBox.x - 5, y: areaBox.y - 5, width: areaBox.width + 10, height: areaBox.height + 60 },
      });
    }

    if (m) {
      expect(parseFloat(m.diff_badge_vs_thumb as string),
        `Badge vs thumb at ${Math.round(pct * 100)}% (badge=${m.badgeLeft}, thumb=${m.thumbCenterPx})`
      ).toBeLessThanOrEqual(2);

      expect(parseFloat(m.diff_fill_vs_thumb as string),
        `Fill vs thumb at ${Math.round(pct * 100)}% (fill=${m.fillEndPx}, thumb=${m.thumbCenterPx})`
      ).toBeLessThanOrEqual(2);
    }
  }

  console.log('\nAll measurements:', JSON.stringify(allResults, null, 2));
});
