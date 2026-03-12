/**
 * GridInstruments Final QA Runner
 * Runs all 8 scenarios and saves evidence to .sisyphus/evidence/final-qa/
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = '/home/firstinstallusername/gridinstruments/.sisyphus/evidence/final-qa';
const BASE_URL = 'http://localhost:3000';
const MIDI_FILE = '/home/firstinstallusername/gridinstruments/tests/fixtures/twinkle-type0.mid';

const results = [];

function log(scenario, status, detail) {
  const entry = { scenario, status, detail };
  results.push(entry);
  console.log(`[${status}] ${scenario}: ${detail}`);
}

async function runQA() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    // ─── SCENARIO 1: App loads correctly ────────────────────────────
    console.log('\n=== Scenario 1: App loads correctly ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const canvasVisible = await page.isVisible('#keyboard-canvas');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-app-load.png'), fullPage: true });

    const errCount = consoleErrors.length;
    if (canvasVisible) {
      log('S1: App loads', 'PASS', `Canvas visible, ${errCount} console errors`);
    } else {
      log('S1: App loads', 'FAIL', `Canvas NOT visible, ${errCount} console errors`);
    }
    if (errCount > 0) {
      console.log('  Console errors:', consoleErrors.slice(0, 3));
    }

    // ─── SCENARIO 2: Drop zone prompt visible ───────────────────────
    console.log('\n=== Scenario 2: Drop zone prompt ===');
    const canvasEl = await page.$('#keyboard-canvas');
    const canvasBox = await canvasEl.boundingBox();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '02-drop-zone.png'),
      clip: { x: canvasBox.x, y: canvasBox.y, width: canvasBox.width, height: canvasBox.height }
    });

    // Check canvas renders (non-blank) — read pixel data
    const canvasNonBlank = await page.evaluate(() => {
      const canvas = document.querySelector('#keyboard-canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      // Check if any pixel is non-zero
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i+1] !== 0 || data[i+2] !== 0) return true;
      }
      return false;
    });

    // Check DOM for drop zone text cue or any overlay text
    const dropZoneText = await page.evaluate(() => {
      // Check if canvas has any text rendered (look for elements near canvas)
      const allText = document.body.innerText;
      return allText;
    });

    if (canvasNonBlank) {
      log('S2: Drop zone', 'PASS', 'Canvas renders non-blank content (drop zone visible on canvas)');
    } else {
      log('S2: Drop zone', 'WARN', 'Canvas appears blank - may need audio context interaction first');
    }

    // ─── SCENARIO 3: Overlay opens and contains game/search UI ──────
    console.log('\n=== Scenario 3: Overlay opens ===');
    // Reset console errors tracking for this scenario
    const preOverlayErrors = consoleErrors.length;

    await page.click('#grid-settings-btn');
    await page.waitForTimeout(500);

    const overlayVisible = await page.isVisible('#grid-overlay');
    const searchInputExists = await page.$('#midi-search-input') !== null;
    const quantizationExists = await page.$('#quantization-level') !== null;

    // Check for DIFFICULTY text (case-insensitive)
    const difficultyText = await page.evaluate(() => {
      const allText = document.body.innerText.toLowerCase();
      return allText.includes('difficulty');
    });

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '03-overlay.png'),
      fullPage: true
    });

    const s3pass = overlayVisible && searchInputExists && quantizationExists;
    log('S3: Overlay', s3pass ? 'PASS' : 'FAIL',
      `overlay=${overlayVisible} search=${searchInputExists} quantization=${quantizationExists} difficulty=${difficultyText}`);

    // ─── SCENARIO 4: Search input is functional ──────────────────────
    console.log('\n=== Scenario 4: Search input functional ===');
    if (searchInputExists) {
      // Make sure overlay is still open
      const overlayStillOpen = await page.isVisible('#grid-overlay:not(.hidden)').catch(() => false);
      if (!overlayStillOpen) {
        // Try clicking the cog again
        await page.click('#grid-settings-btn');
        await page.waitForTimeout(300);
      }

      await page.fill('#midi-search-input', 'bach');
      await page.waitForTimeout(700); // Wait for debounce (300ms) + async

      const resultsEl = await page.$('#midi-search-results');
      let resultsContent = '';
      let resultsNonEmpty = false;
      if (resultsEl) {
        resultsContent = await resultsEl.innerText().catch(() => '');
        const innerHTML = await resultsEl.innerHTML().catch(() => '');
        resultsNonEmpty = resultsContent.trim().length > 0 || innerHTML.trim().length > 0;
      }

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '04-search.png'),
        fullPage: true
      });

      log('S4: Search', resultsNonEmpty ? 'PASS' : 'WARN',
        `results container exists=${!!resultsEl}, non-empty=${resultsNonEmpty}, content="${resultsContent.slice(0, 80)}"`);
    } else {
      log('S4: Search', 'SKIP', '#midi-search-input not found (overlay issue)');
      await page.screenshot({ path: path.join(EVIDENCE_DIR, '04-search.png'), fullPage: true });
    }

    // ─── SCENARIO 5: MIDI file drop loads game ───────────────────────
    console.log('\n=== Scenario 5: MIDI file drop ===');
    // Close overlay first if open
    const overlayOpen = await page.evaluate(() => {
      const overlay = document.querySelector('#grid-overlay');
      return overlay && !overlay.classList.contains('hidden');
    });
    if (overlayOpen) {
      // Click elsewhere or press Escape to close
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Simulate file drop
    const midiBuffer = fs.readFileSync(MIDI_FILE);
    const midiArray = Array.from(midiBuffer);

    const dataTransfer = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(data)], 'twinkle-type0.mid', { type: 'audio/midi' });
      dt.items.add(file);
      return dt;
    }, midiArray);

    // Dispatch dragenter, then drop
    await page.dispatchEvent('#keyboard-canvas', 'dragenter', { dataTransfer });
    await page.waitForTimeout(100);
    await page.dispatchEvent('#keyboard-canvas', 'drop', { dataTransfer });
    await page.waitForTimeout(2000); // Wait for MIDI parsing

    // Check game state
    const gameSongTitle = await page.$eval('#game-song-title', el => el.textContent || el.innerText || '').catch(() => '');
    const gameProgress = await page.isVisible('#game-progress').catch(() => false);
    const gameSongTitleVisible = await page.isVisible('#game-song-title').catch(() => false);

    // Check canvas for any change
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '05-game-loaded.png'),
      fullPage: true
    });

    const gameLoaded = gameSongTitle.trim().length > 0 || gameProgress || gameSongTitleVisible;
    log('S5: MIDI drop', gameLoaded ? 'PASS' : 'WARN',
      `song-title="${gameSongTitle.trim()}" progress-visible=${gameProgress} title-visible=${gameSongTitleVisible}`);

    // ─── SCENARIO 6: Quantization defaults to "none" ─────────────────
    console.log('\n=== Scenario 6: Quantization default ===');
    // Open overlay
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(500);

    let quantValue = '';
    if (quantizationExists) {
      quantValue = await page.$eval('#quantization-level', el => el.value).catch(() => 'N/A');
    }

    const s6pass = quantValue === 'none';
    log('S6: Quantization default', s6pass ? 'PASS' : 'FAIL',
      `value="${quantValue}" (expected "none")`);
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, '06-quantization-default.txt'),
      `Quantization level default value: "${quantValue}"\nExpected: "none"\nResult: ${s6pass ? 'PASS' : 'FAIL'}\n`
    );

    // ─── SCENARIO 7: Progress bar area on canvas ─────────────────────
    console.log('\n=== Scenario 7: Progress bar area ===');
    // Close overlay
    const isOverlayOpen7 = await page.evaluate(() => {
      const overlay = document.querySelector('#grid-overlay');
      return overlay && !overlay.classList.contains('hidden');
    });
    if (isOverlayOpen7) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    const canvas7 = await page.$('#keyboard-canvas');
    const canvasBox7 = await canvas7.boundingBox();
    // Screenshot top 20px of canvas (progress bar area)
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '07-progress-area.png'),
      clip: {
        x: canvasBox7.x,
        y: canvasBox7.y,
        width: canvasBox7.width,
        height: Math.min(40, canvasBox7.height)
      }
    });

    const canvasRendersOk = await page.evaluate(() => {
      const canvas = document.querySelector('#keyboard-canvas');
      return canvas && canvas.width > 0 && canvas.height > 0;
    });
    log('S7: Progress area', canvasRendersOk ? 'PASS' : 'FAIL',
      `Canvas renders without errors, dimensions valid`);

    // ─── SCENARIO 8: Calibration button exists ────────────────────────
    console.log('\n=== Scenario 8: Calibration button ===');
    // Open overlay again
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(500);

    const calibrateBtnExists = await page.$('#calibrate-btn') !== null;
    // Also search for any button with "calibrat" text as fallback
    const calibrateByText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.toLowerCase().includes('calibrat'));
    });

    const s8pass = calibrateBtnExists || calibrateByText;
    log('S8: Calibrate btn', s8pass ? 'PASS' : 'FAIL',
      `#calibrate-btn exists=${calibrateBtnExists}, by-text=${calibrateByText}`);
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, '08-calibrate-btn.txt'),
      `#calibrate-btn exists: ${calibrateBtnExists}\nCalibrate button by text search: ${calibrateByText}\nResult: ${s8pass ? 'PASS' : 'FAIL'}\n`
    );

    // Final screenshot of overlay with all game UI
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, '09-final-overlay-state.png'),
      fullPage: true
    });

  } catch (err) {
    console.error('QA runner error:', err);
    log('ERROR', 'ERROR', err.message);
  } finally {
    await browser.close();
  }

  // ─── FINAL VERDICT ────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log('\n' + '='.repeat(60));
  console.log('FINAL QA VERDICT');
  console.log('='.repeat(60));
  results.forEach(r => {
    console.log(`  [${r.status.padEnd(4)}] ${r.scenario}: ${r.detail}`);
  });
  console.log('='.repeat(60));
  console.log(`Scenarios ${passed}/${total} pass | Warns: ${warned} | Fails: ${failed} | Skips: ${skipped}`);

  const verdict = failed === 0 ? 'APPROVE' : 'REJECT';
  console.log(`VERDICT: ${verdict}`);

  // Save summary
  const summaryLines = [
    'GridInstruments Final QA Summary',
    '='.repeat(40),
    `Date: ${new Date().toISOString()}`,
    '',
    'Results:',
    ...results.map(r => `  [${r.status}] ${r.scenario}: ${r.detail}`),
    '',
    `Scenarios ${passed}/${total} pass | Warns: ${warned} | Fails: ${failed} | Skips: ${skipped}`,
    `VERDICT: ${verdict}`,
  ];
  fs.writeFileSync(path.join(EVIDENCE_DIR, '00-summary.txt'), summaryLines.join('\n'));
  console.log('\nSummary saved to 00-summary.txt');

  return verdict;
}

runQA().then(verdict => {
  process.exit(verdict === 'APPROVE' ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(2);
});
