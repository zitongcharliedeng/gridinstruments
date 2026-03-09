/**
 * Invariant predicates for XState model-based tests.
 *
 * Classification by dependency set D(P) over the product state space:
 *   D(P) = {}    → Structural: state-independent, tested once per page load
 *   D(P) = {M}   → State predicate of M, wired to M's meta.invariants
 *   D(P) = {M,N} → Cross-machine: would violate independence (model error)
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { StateInvariant } from './types';

// ── State predicates: D(P) = {M} — wired to meta.invariants in uiMachine.ts ─

/** D = {overlay}. Truth changes with overlay state. Wire: overlay.visible */
export const tooltipCheck: StateInvariant = {
  id: 'BH-TT-1',
  check: async (page: Page) => {
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
      if (!title) throw new Error(`${sel} missing title`);
      expect(title.length, `${sel} empty title`).toBeGreaterThan(0);
    }
  },
};

/** D = {visualiser}. Truth changes at default height. Wire: visualiser.default */
export const visHandlePosition: StateInvariant = {
  id: 'PNL-VIS-4',
  check: async (page: Page) => {
    const panelBox = await page.locator('#visualiser-panel').boundingBox();
    const handleBox = await page.locator('#visualiser-panel .panel-resize-handle').boundingBox();
    if (!panelBox) throw new Error('#visualiser-panel not visible');
    if (!handleBox) throw new Error('.panel-resize-handle not visible');
    const panelBottom = panelBox.y + panelBox.height;
    const handleTop = handleBox.y;
    expect(Math.abs(handleTop - panelBottom)).toBeLessThan(4);
  },
};

/** D = {visualiser}. Canvas visible iff not collapsed. Wire: visualiser.{default, expanded} */
export const pianoRollVisible: StateInvariant = {
  id: 'BH-PIANOROLL-1',
  check: async (page: Page) => {
    const canvas = page.locator('#history-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('#history-canvas not visible');
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(50);
  },
};

/** D = {pedals}. Truth changes at default height. Wire: pedals.default */
export const pedHandlePosition: StateInvariant = {
  id: 'PNL-VIS-5',
  check: async (page: Page) => {
    const panelBox = await page.locator('#pedals-panel').boundingBox();
    const handleBox = await page.locator('#pedals-panel .panel-resize-handle').boundingBox();
    if (!panelBox) throw new Error('#pedals-panel not visible');
    if (!handleBox) throw new Error('.panel-resize-handle not visible');
    const panelTop = panelBox.y;
    const handleBottom = handleBox.y + handleBox.height;
    expect(Math.abs(handleBottom - panelTop)).toBeLessThan(4);
  },
};

/** D = {overlay}. Background color check. Wire: overlay.visible */
export const overlayBgCheck: StateInvariant = {
  id: 'OV-BG-1',
  check: async (page: Page) => {
    const bg = await page.locator('#grid-overlay').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (!match) throw new Error('Background should be rgba');
    expect(parseInt(match[1])).toBeCloseTo(30, 0);
    expect(parseInt(match[2])).toBeCloseTo(30, 0);
    expect(parseInt(match[3])).toBeCloseTo(32, 0);
    if (match[4]) {
      expect(parseFloat(match[4])).toBeCloseTo(0.78, 1);
    }
  },
};

/** D = {overlay}. Shimmer animation check. Wire: overlay.visible */
export const overlayShimmerCheck: StateInvariant = {
  id: 'OV-SHIMMER-1',
  check: async (page: Page) => {
    const animDuration = await page.evaluate(() => {
      const el = document.querySelector('#grid-overlay');
      if (!el) throw new Error('#grid-overlay not found');
      return getComputedStyle(el, '::before').animationDuration;
    });
    expect(animDuration).toContain('60s');
  },
};

/** D = {overlay}. Section count check. Wire: overlay.visible */
export const overlaySectionsCheck: StateInvariant = {
  id: 'OV-SECTIONS-1',
  check: async (page: Page) => {
    const sectionCount = await page.locator('#grid-overlay .overlay-section').count();
    expect(sectionCount).toBeGreaterThanOrEqual(8);
  },
};

/** D = {overlay}. Active preset check at default tuning. Wire: overlay.visible */
export const overlayPresetCheck: StateInvariant = {
  id: 'OV-PRESET-1',
  check: async (page: Page) => {
    const activePreset = await page.locator('#tet-presets .slider-preset-btn.active').count();
    expect(activePreset).toBeGreaterThanOrEqual(1);
    const activeValue = await page.locator('#tet-presets .slider-preset-btn.active').first().getAttribute('data-value');
    expect(parseFloat(activeValue ?? '0')).toBe(700);
  },
};

/** D = {overlay}. MPE controls visible when overlay open. Wire: overlay.visible */
export const mpeUiCheck: StateInvariant = {
  id: 'BH-MPE-1',
  check: async (page: Page) => {
    await expect(page.locator('#mpe-enabled')).toBeVisible();
    await expect(page.locator('#mpe-output-select')).toBeVisible();
  },
};

/** D = {overlay}. Settings toggle doesn't steal focus. Wire: overlay.visible */
export const focusPreserveCheck: StateInvariant = {
  id: 'BH-FOCUS-PRESERVE-1',
  check: async (page: Page) => {
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeTagName).not.toBe('INPUT');
    expect(activeTagName).not.toBe('SELECT');
  },
};

/** D = {overlay}. Lucide icon SVGs render at text-matching pixel dimensions. Wire: overlay.visible */
export const iconSizeCheck: StateInvariant = {
  id: 'BH-ICON-1',
  check: async (page: Page) => {
    const checks: Array<{ selector: string; expectedPx: number; label: string }> = [
      { selector: '#about-btn svg', expectedPx: 11, label: 'about-btn icon' },
      { selector: '.star-icon svg', expectedPx: 10, label: 'star icon' },
      { selector: '#reset-layout .icon svg', expectedPx: 9, label: 'reset-layout icon' },
      { selector: '.slider-info-btn svg', expectedPx: 18, label: 'slider-info icon (icon-lg)' },
      { selector: '.slider-reset svg', expectedPx: 16, label: 'slider-reset icon (icon-md)' },
      { selector: '#grid-settings-btn svg', expectedPx: 16, label: 'grid-cog icon (icon-md)' },
    ];
    for (const { selector, expectedPx, label } of checks) {
      const el = page.locator(selector).first();
      await expect(el).toBeVisible();
      const box = await el.boundingBox();
      if (!box) throw new Error(`${label} must be visible`);
      expect(Math.round(box.width), `${label} width`).toBeCloseTo(expectedPx, -1);
      expect(Math.round(box.height), `${label} height`).toBeCloseTo(expectedPx, -1);
    }
  },
};

/** D = {visualiser}. 60% viewport cap on expanded. Wire: visualiser.expanded */
export const visCap60Check: StateInvariant = {
  id: 'PNL-DRAG-4',
  check: async (page: Page) => {
    const panelBox = await page.locator('#visualiser-panel').boundingBox();
    if (!panelBox) throw new Error('#visualiser-panel not visible');
    const panelH = panelBox.height;
    const vp = page.viewportSize();
    if (!vp) throw new Error('viewport size unavailable');
    const viewportH = vp.height;
    expect(panelH).toBeLessThanOrEqual(viewportH * 0.61);
  },
};

// ── Slider fill predicates: D(P) = {slider} — wired to slider machine states ─

/** D = {slider}. Fill gradient check for slider in default (min) position. */
export function createSliderFillDefaultInvariant(sliderId: string): StateInvariant {
  return {
    id: `FILL-DEFAULT-${sliderId}`,
    check: async (page: Page) => {
      const bg = await page.locator('#' + sliderId).evaluate(
        (el) => {
          if (!(el instanceof HTMLElement)) throw new Error('not HTMLElement');
          return el.style.background;
        }
      );
      expect(bg).toContain('linear-gradient');
    },
  };
}

/** D = {slider}. Fill gradient check for slider in modified position. */
export function createSliderFillModifiedInvariant(sliderId: string): StateInvariant {
  return {
    id: `FILL-MODIFIED-${sliderId}`,
    check: async (page: Page) => {
      const bg = await page.locator('#' + sliderId).evaluate(
        (el) => {
          if (!(el instanceof HTMLElement)) throw new Error('not HTMLElement');
          return el.style.background;
        }
      );
      expect(bg).toContain('linear-gradient');
    },
  };
}

// ── Visual regression migration: D(P) = {overlay} — wired to overlay.visible ─

/** D = {overlay}. All slider badges sit above their tracks. Wire: overlay.visible */
export const sliderBadgePositionCheck: StateInvariant = {
  id: 'SM-BADGE-ALL',
  check: async (page: Page) => {
    const pairs = [
      { slider: '#tuning-slider', badge: '#tuning-thumb-badge', label: 'tuning' },
      { slider: '#skew-slider', badge: '#skew-thumb-badge', label: 'skew' },
      { slider: '#zoom-slider', badge: '#zoom-thumb-badge', label: 'zoom' },
      { slider: '#volume-slider', badge: '#volume-thumb-badge', label: 'volume' },
    ];
    for (const { slider, badge, label } of pairs) {
      const track = await page.locator(slider).locator('..').boundingBox();
      if (!track) throw new Error(`${slider} parent not visible`);
      const badgeBox = await page.locator(badge).boundingBox();
      if (!badgeBox) throw new Error(`${badge} not visible`);
      expect(badgeBox.y + badgeBox.height, `${label} badge bottom ≤ track top`).toBeLessThanOrEqual(track.y + 2);
    }
  },
};

/** D = {overlay}. Non-editable badges pass-through clicks; editable badges accept them. Wire: overlay.visible */
export const badgePointerEventsCheck: StateInvariant = {
  id: 'SM-BADGE-PE',
  check: async (page: Page) => {
    const nonEditable = ['#zoom-thumb-badge', '#volume-thumb-badge'];
    for (const sel of nonEditable) {
      const pe = await page.locator(sel).evaluate(el => getComputedStyle(el).pointerEvents);
      expect(pe, `${sel} pointer-events`).toBe('none');
    }
    const editable = ['#tuning-thumb-badge', '#skew-thumb-badge'];
    for (const sel of editable) {
      const pe = await page.locator(sel).evaluate(el => getComputedStyle(el).pointerEvents);
      expect(pe, `${sel} pointer-events`).toBe('auto');
    }
  },
};

/** D = {overlay}. Slider labels sit inside their tracks. Wire: overlay.visible */
export const sliderLabelPositionCheck: StateInvariant = {
  id: 'SM-LABEL-POS',
  check: async (page: Page) => {
    const pairs = [
      { slider: '#tuning-slider', label: '#tuning-label', name: 'tuning' },
      { slider: '#skew-slider', label: '#skew-label', name: 'skew' },
    ];
    for (const { slider, label, name } of pairs) {
      const track = await page.locator(slider).locator('..').boundingBox();
      if (!track) throw new Error(`${slider} parent not visible`);
      const labelBox = await page.locator(label).boundingBox();
      if (!labelBox) throw new Error(`${label} not visible`);
      expect(labelBox.y, `${name} label top`).toBeGreaterThanOrEqual(track.y - 1);
      expect(labelBox.y + labelBox.height, `${name} label bottom`).toBeLessThanOrEqual(track.y + track.height + 1);
    }
  },
};

/** D = {overlay}. Slider badge/label values match design spec after init. Wire: overlay.visible */
export const sliderValuesCheck: StateInvariant = {
  id: 'SM-VAL-ALL',
  check: async (page: Page) => {
    // SM-VAL-1: tuning badge no ¢, value ≈ 700
    const tuningVal = await page.locator('#tuning-thumb-badge').inputValue();
    expect(tuningVal).not.toContain('¢');
    expect(parseFloat(tuningVal)).toBeCloseTo(700, 0);

    // SM-VAL-2: volume badge ≈ -10.5 dB
    const volText = await page.locator('#volume-thumb-badge').textContent();
    if (volText === null) throw new Error('#volume-thumb-badge text is null');
    expect(parseFloat(volText)).toBeCloseTo(-10.5, 0);

    // SM-VAL-3: zoom badge no 'x', value ≈ 1.0
    const zoomText = await page.locator('#zoom-thumb-badge').textContent();
    if (zoomText === null) throw new Error('#zoom-thumb-badge text is null');
    expect(zoomText).not.toContain('x');
    expect(parseFloat(zoomText)).toBeCloseTo(1.0, 1);

    // SM-VAL-4: skew badge = '0.00'
    const skewVal = await page.locator('#skew-thumb-badge').inputValue();
    expect(skewVal).toBe('0.00');

    // SM-VAL-5: tuning label contains 'FIFTHS TUNING' and 'CENTS'
    const tuningText = await page.locator('#tuning-label').textContent();
    if (tuningText === null) throw new Error('#tuning-label text is null');
    expect(tuningText.toUpperCase()).toContain('FIFTHS TUNING');
    expect(tuningText.toUpperCase()).toContain('CENTS');

    // SM-VAL-6: d-ref input = '293.66', label contains 'D4'
    const drefVal = await page.locator('#d-ref-input').inputValue();
    expect(drefVal).toBe('293.66');
    const drefLabelText = await page.locator('#d-ref-label').textContent();
    if (drefLabelText === null) throw new Error('#d-ref-label text is null');
    expect(drefLabelText).toContain('D4');

    // SM-VAL-7: d-ref label contains 'D REF' and 'HZ'
    const drefGroupText = await page.locator('.d-ref-group .slider-label-overlay').textContent();
    if (drefGroupText === null) throw new Error('.d-ref-group .slider-label-overlay text is null');
    expect(drefGroupText.toUpperCase()).toContain('D REF');
    expect(drefGroupText.toUpperCase()).toContain('HZ');
  },
};

/** D = {overlay}. TET buttons sit below the tuning track. Wire: overlay.visible */
export const tetBelowTrackCheck: StateInvariant = {
  id: 'SM-TET-BELOW',
  check: async (page: Page) => {
    const track = await page.locator('#tuning-slider').locator('..').boundingBox();
    if (!track) throw new Error('#tuning-slider parent not visible');
    const marks = page.locator('.slider-preset-mark');
    const count = await marks.count();
    expect(count).toBeGreaterThan(0);
    const trackCenter = track.y + track.height / 2;
    for (let i = 0; i < count; i++) {
      const tick = await marks.nth(i).locator('.slider-tick').boundingBox();
      if (!tick) throw new Error(`.slider-tick[${i}] not visible`);
      expect(Math.abs(tick.y - trackCenter)).toBeLessThanOrEqual(200);
      const btn = await marks.nth(i).locator('.slider-preset-btn').boundingBox();
      if (!btn) throw new Error(`.slider-preset-btn[${i}] not visible`);
      expect(btn.y).toBeGreaterThanOrEqual(track.y + track.height - 2);
    }
  },
};

/** D = {overlay}. Overlay control labels and slider labels are white. Wire: overlay.visible */
export const overlayColorsCheck: StateInvariant = {
  id: 'SM-COLOR-OVERLAY',
  check: async (page: Page) => {
    // SM-COLOR-1: .overlay-section .ctrl-label all white
    const colors = await page.locator('.overlay-section .ctrl-label').evaluateAll(
      els => els.map(el => getComputedStyle(el).color)
    );
    for (const c of colors) {
      expect(c).toBe('rgb(255, 255, 255)');
    }

    // SM-COLOR-3: #tuning-label color is white
    const tuningColor = await page.locator('#tuning-label').evaluate(
      el => getComputedStyle(el).color
    );
    expect(tuningColor).toBe('rgb(255, 255, 255)');

    // SM-DREF-WHITE-1: d-ref label is white
    const drefColor = await page.locator('.d-ref-group .slider-label-overlay').evaluate(
      el => getComputedStyle(el).color
    );
    expect(drefColor).toBe('rgb(255, 255, 255)');
  },
};

/** D = {overlay}. D-ref annotation is in label, not in the input value. Wire: overlay.visible */
export const drefAnnotationCheck: StateInvariant = {
  id: 'SM-COLOR-2',
  check: async (page: Page) => {
    const val = await page.locator('#d-ref-input').inputValue();
    expect(val).not.toContain('(');
    expect(val).not.toContain('[');
    const labelText = await page.locator('#d-ref-label').textContent();
    if (labelText === null) throw new Error('#d-ref-label text is null');
    expect(labelText).toContain('D4');
  },
};

/** D = {overlay}. Overlay structural controls: reset buttons, border-radius, d-ref width, tuning padding. Wire: overlay.visible */
export const overlayControlsCheck: StateInvariant = {
  id: 'SM-STRUCT-OVERLAY',
  check: async (page: Page) => {
    // SM-STRUCT-2: 5 reset buttons with visible SVG
    const resetIds = ['tuning-reset', 'skew-reset', 'zoom-reset', 'volume-reset', 'd-ref-reset'];
    for (const id of resetIds) {
      const btn = page.locator(`#${id}`);
      await expect(btn).toBeVisible();
      const svg = btn.locator('svg');
      await expect(svg).toBeVisible();
    }

    // SM-STRUCT-3 (overlay part): #grid-overlay, select, input[type=text] borderRadius = 0px
    const selectors = ['#grid-overlay', 'select', 'input[type="text"]'];
    for (const sel of selectors) {
      const els = page.locator(sel);
      const count = await els.count();
      for (let i = 0; i < count; i++) {
        const br = await els.nth(i).evaluate(el => getComputedStyle(el).borderRadius);
        expect(br, `${sel}[${i}] borderRadius`).toBe('0px');
      }
    }

    // SM-STRUCT-4: #d-ref-input width ≈ 80px
    const drefWidth = await page.locator('#d-ref-input').evaluate(
      el => getComputedStyle(el).width
    );
    expect(parseFloat(drefWidth)).toBeCloseTo(80, -1);

    // SM-TUNING-ALIGN-1: .tuning-slider-area paddingTop = '0px'
    const paddingTop = await page.locator('.tuning-slider-area').first().evaluate(
      el => getComputedStyle(el).paddingTop
    );
    expect(paddingTop).toBe('0px');
  },
};

// ── Visual regression migration: D(P) = {} — structural invariants ───────────

/** D = {}. App-level colors, font, and DPR scaling. Structural test, not per-state. */
export const appLoadedCheck: StateInvariant = {
  id: 'SM-APP-LOADED',
  check: async (page: Page) => {
    // SM-COLOR-4: title, gh-mark, gh-btn colors
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
    const allowedColors = ['rgb(255, 255, 255)', 'rgb(76, 175, 80)'];
    for (const c of btnColors) {
      expect(allowedColors).toContain(c);
    }

    // SM-COLOR-5: body backgroundColor = black
    const bodyBg = await page.locator('body').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    expect(bodyBg).toBe('rgb(0, 0, 0)');

    // SM-FONT-1: body fontFamily contains JetBrains Mono
    const fontFamily = await page.locator('body').evaluate(
      el => getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('JetBrains Mono');

    // SM-KS-1: canvas DPR scaling
    const result = await page.evaluate(() => {
      const el = document.getElementById('keyboard-canvas');
      if (!(el instanceof HTMLCanvasElement)) return { canvasWidth: 0, cssWidth: 0, dpr: 1, ratio: 0 };
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = el.getBoundingClientRect().width;
      return {
        canvasWidth: el.width,
        cssWidth,
        dpr,
        ratio: cssWidth > 0 ? el.width / cssWidth : 0,
      };
    });
    expect(result.cssWidth).toBeGreaterThan(0);
    expect(Math.abs(result.ratio - result.dpr)).toBeLessThan(0.1);

    // SM-STRUCT-3 (structural part): #keyboard-container borderRadius = 0px
    const kbBr = await page.locator('#keyboard-container').evaluate(
      el => getComputedStyle(el).borderRadius
    );
    expect(kbBr).toBe('0px');
  },
};

// ── Visual regression migration: Golden screenshot invariants ─────────────────

/** D = {overlay}. Grid overlay pixel-level golden. Caller must open overlay first. */
export const overlayGoldenCheck: StateInvariant = {
  id: 'GOLDEN-OVERLAY',
  check: async (page: Page) => {
    await expect(page.locator('#grid-overlay')).toHaveScreenshot('grid-overlay.png', {
      maxDiffPixelRatio: 0.01,
    });
  },
};

/** D = {}. Full page pixel-level golden. Structural test. */
export const fullPageGoldenCheck: StateInvariant = {
  id: 'GOLDEN-FULL-PAGE',
  check: async (page: Page) => {
    await expect(page).toHaveScreenshot('full-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.003,
    });
  },
};

/** D = {}. Keyboard canvas pixel-level golden. Structural test. */
export const keyboardCanvasGoldenCheck: StateInvariant = {
  id: 'GOLDEN-KEYBOARD',
  check: async (page: Page) => {
    await expect(page.locator('#keyboard-canvas')).toHaveScreenshot('keyboard-canvas.png', {
      maxDiffPixelRatio: 0.05,
    });
  },
};

/** D = {}. TET notch labels pixel-level golden. Caller must open overlay first. */
export const tetNotchGoldenCheck: StateInvariant = {
  id: 'GOLDEN-TET-NOTCH',
  check: async (page: Page) => {
    const tetPresets = page.locator('#tet-presets');
    await expect(tetPresets).toBeVisible();
    await expect(tetPresets).toHaveScreenshot('tuning-notch-labels.png', {
      maxDiffPixelRatio: 0.01,
    });
  },
};

// ── Structural predicates: D(P) = {} — tested once in xstate-graph.spec.ts ──

/** D = {}. DOM hierarchy never changes. Structural test, not per-state. */
export const handleDomParent: StateInvariant = {
  id: 'PNL-VIS-6',
  check: async (page: Page) => {
    const inVisualiser = await page.locator('#visualiser-panel .panel-resize-handle').count();
    const inGrid = await page.locator('#grid-area .panel-resize-handle').count();
    expect(inVisualiser).toBe(1);
    expect(inGrid).toBe(0);
  },
};

/** D = {}. ARIA attributes are static HTML. Structural test, not per-state. */
export const panelAriaCheck: StateInvariant = {
  id: 'PNL-VIS-3',
  check: async (page: Page) => {
    const visHandle = page.locator('#visualiser-panel .panel-resize-handle');
    const pedHandle = page.locator('#pedals-panel .panel-resize-handle');
    await expect(visHandle).toHaveAttribute('role', 'separator');
    await expect(visHandle).toHaveAttribute('aria-label', 'Resize visualiser');
    await expect(pedHandle).toHaveAttribute('role', 'separator');
    await expect(pedHandle).toHaveAttribute('aria-label', 'Resize pedals');
  },
};

// ── Migrated from contracts.spec.ts — UI behavioral invariants ───────────────

/** D = {}. Scrollbar 12px width at small viewport (#62). Structural test. */
export const scrollbarWidthCheck: StateInvariant = {
  id: 'ISS-62-1',
  check: async (page: Page) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.waitForTimeout(500);
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => {
      const scrollbar = document.querySelector('#grid-overlay .os-scrollbar-vertical');
      const handle = scrollbar?.querySelector('.os-scrollbar-handle');
      if (!scrollbar || !handle) return null;
      const cs = getComputedStyle(scrollbar);
      return {
        width: parseFloat(cs.width),
        opacity: parseFloat(cs.opacity),
        visibility: cs.visibility,
        handleWidth: handle.getBoundingClientRect().width,
        handleHeight: handle.getBoundingClientRect().height,
      };
    });
    if (!result) throw new Error('scrollbar elements must exist');
    expect(result.width, 'scrollbar width must be 12px, not 0').toBe(12);
    expect(result.handleWidth, 'handle must have 12px width').toBe(12);
    expect(result.handleHeight, 'handle must have non-zero height').toBeGreaterThan(0);
    expect(result.opacity, 'scrollbar opacity must be 1').toBe(1);
    expect(result.visibility, 'scrollbar must be visible').toBe('visible');
  },
};

/** D = {}. Scrollbar overflow at small viewport (#62). Structural test. */
export const scrollbarOverflowCheck: StateInvariant = {
  id: 'ISS-62-2',
  check: async (page: Page) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.waitForTimeout(500);
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(800);
    const result = await page.evaluate(() => {
      const viewport = document.querySelector('#grid-overlay [data-overlayscrollbars-viewport]');
      const scrollbar = document.querySelector('#grid-overlay .os-scrollbar-vertical');
      if (!viewport || !scrollbar) return null;
      return {
        clientH: viewport.clientHeight,
        scrollH: viewport.scrollHeight,
        hasUnusable: scrollbar.classList.contains('os-scrollbar-unusable'),
      };
    });
    if (!result) throw new Error('OverlayScrollbars viewport must exist');
    expect(result.scrollH, 'scroll content must exceed viewport').toBeGreaterThan(result.clientH);
    expect(result.hasUnusable, 'scrollbar must not be marked unusable').toBe(false);
  },
};

/** D = {overlay}. slim-select dark theme check (#85). Wire: overlay.visible */
export const slimSelectThemeCheck: StateInvariant = {
  id: 'ISS-85-1',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const ssMain = document.querySelector('#grid-overlay .ss-main');
      if (!ssMain) return null;
      const cs = getComputedStyle(ssMain);
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        font: cs.fontFamily,
        borderRadius: cs.borderRadius,
        height: parseFloat(cs.height),
      };
    });
    if (!result) throw new Error('.ss-main must exist (slim-select initialized)');
    expect(result.bg, 'dropdown bg must be black').toBe('rgb(0, 0, 0)');
    expect(result.color, 'dropdown text must be white').toBe('rgb(255, 255, 255)');
    expect(result.font, 'dropdown font must be JetBrains Mono').toContain('JetBrains Mono');
    expect(result.borderRadius, 'dropdown must have no rounded corners').toBe('0px');
    expect(result.height, 'dropdown must be compact (≤30px)').toBeLessThanOrEqual(30);
  },
};

/** D = {overlay}. Native selects hidden by slim-select, .ss-main visible (#85). Wire: overlay.visible */
export const nativeSelectHiddenCheck: StateInvariant = {
  id: 'ISS-85-2',
  check: async (page: Page) => {
    // slim-select v3 hides native selects with accessible hiding:
    // opacity:0, position:absolute, width/height:1px, clip:rect(0,0,0,0), aria-hidden:true
    // It does NOT use display:none — check aria-hidden + opacity + .ss-main sibling instead.
    const result = await page.evaluate(() => {
      const selects = ['layout-select', 'mpe-output-select'];
      return selects.map(id => {
        const native = document.getElementById(id);
        if (!native) return { id, ariaHidden: 'missing', opacity: 'missing', hasSsMain: false };
        const cs = getComputedStyle(native);
        const sibling = native.nextElementSibling;
        return {
          id,
          ariaHidden: native.getAttribute('aria-hidden'),
          opacity: cs.opacity,
          position: cs.position,
          width: cs.width,
          hasSsMain: sibling?.classList.contains('ss-main') ?? false,
        };
      });
    });
    for (const sel of result) {
      expect(sel.ariaHidden, `${sel.id} native select must be aria-hidden by slim-select`).toBe('true');
      expect(sel.opacity, `${sel.id} native select must be visually hidden`).toBe('0');
      expect(sel.hasSsMain, `${sel.id} must have .ss-main sibling from slim-select`).toBe(true);
    }
  },
};

/** D = {overlay}. MPE checkbox uses custom .gi-checkbox component (#85). Wire: overlay.visible */
export const customCheckboxCheck: StateInvariant = {
  id: 'ISS-85-3',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const cb = document.getElementById('mpe-enabled');
      if (!cb) return null;
      const wrapper = cb.closest('.gi-checkbox');
      const check = wrapper?.querySelector('.gi-check');
      if (!wrapper || !check) return { hasWrapper: false, hasCheck: false, checkBg: '' };
      const cs = getComputedStyle(check);
      return {
        hasWrapper: true,
        hasCheck: true,
        checkBg: cs.backgroundColor,
      };
    });
    if (!result) throw new Error('#mpe-enabled must exist');
    expect(result.hasWrapper, 'checkbox must be in .gi-checkbox wrapper').toBe(true);
    expect(result.hasCheck, '.gi-check visual element must exist').toBe(true);
    expect(result.checkBg, 'unchecked checkbox bg must be black').toBe('rgb(0, 0, 0)');
  },
};

/** D = {overlay}. No unexpected white backgrounds in overlay (#85). Wire: overlay.visible */
export const noWhiteBackgroundCheck: StateInvariant = {
  id: 'ISS-85-4',
  check: async (page: Page) => {
    const whites = await page.evaluate(() => {
      const overlay = document.getElementById('grid-overlay');
      if (!overlay) return ['overlay missing'];
      // Elements that are intentionally white by design
      const allowedWhite = (el: Element): boolean =>
        el.matches('.wave-btn.active') ||     // active waveform = white indicator
        el.matches('.gi-check') ||            // checked checkbox mark
        el.matches('.slider-preset-btn.active'); // active TET preset
      const found: string[] = [];
      const walk = (el: Element) => {
        if (allowedWhite(el)) { return; }
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          if (r > 200 && g > 200 && b > 200) {
            found.push(`${el.tagName}.${el.className?.toString().substring(0, 30)}: ${bg}`);
          }
        }
        for (const child of el.children) walk(child);
      };
      walk(overlay);
      return found;
    });
    expect(whites, 'no element in overlay may have white/light background').toEqual([]);
  },
};

/** D = {}. D-ref must not drift from keyboard canvas interaction (#84). Structural test. */
export const drefDriftCheck: StateInvariant = {
  id: 'ISS-84-1',
  check: async (page: Page) => {
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(500);
    const drefBefore = await page.locator('#d-ref-input').inputValue();
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(300);
    const canvas = page.locator('#keyboard-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('keyboard-canvas not visible');
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    for (let i = 0; i < 20; i++) {
      await page.mouse.move(centerX, centerY - 20 + i * 2);
      await page.mouse.down();
      await page.mouse.move(centerX, centerY - 40 + i * 2);
      await page.mouse.up();
    }
    await page.waitForTimeout(500);
    await page.click('#grid-settings-btn');
    await page.waitForTimeout(500);
    const drefAfter = await page.locator('#d-ref-input').inputValue();
    expect(drefAfter, 'D-ref must not drift from keyboard interaction').toBe(drefBefore);
  },
};

/** D = {sustain}. R key must not activate sustain (#14). Wire: sustain.inactive */
export const rKeyNotSustainCheck: StateInvariant = {
  id: 'ISS-14-1',
  check: async (page: Page) => {
    await page.keyboard.press('r');
    await page.waitForTimeout(300);
    const sustainActive = await page.locator('#sustain-indicator').evaluate(
      el => el.classList.contains('active')
    );
    expect(sustainActive, 'R key must not activate sustain').toBe(false);
  },
};

/** D = {overlay}. D-ref slider range covers D2 to D6. Wire: overlay.visible */
export const drefRangeCheck: StateInvariant = {
  id: 'BH-DREF-RANGE-1',
  check: async (page: Page) => {
    const slider = page.locator('#d-ref-slider');
    const min = parseFloat(await slider.getAttribute('min') ?? '0');
    const max = parseFloat(await slider.getAttribute('max') ?? '0');
    expect(min).toBeCloseTo(73.42, 0);  // D2
    expect(max).toBeCloseTo(1174.66, 0); // D6
  },
};
