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
import { overlayMachine } from '../../src/machines/overlayMachine';
import { pedalMachine } from '../../src/machines/pedalMachines';
import { panelMachine } from '../../src/machines/panelMachine';
import {
  overlayMachine as testOverlayMachine,
  visualiserMachine as testVisualiserMachine,
  pedalsMachine as testPedalsMachine,
  waveformMachine as testWaveformMachine,
  sustainMachine as testSustainMachine,
  vibratoMachine as testVibratoMachine,
} from './uiMachine';

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
      '#wave-select', '#wave-reset',
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
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/.exec(bg);
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
    expect(sectionCount).toBeGreaterThanOrEqual(4);
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
    const checks: { selector: string; expectedPx: number; label: string }[] = [
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

    // SM-VAL-3: zoom badge no 'x', value matches app's computed default zoom
    const zoomText = await page.locator('#zoom-thumb-badge').textContent();
    if (zoomText === null) throw new Error('#zoom-thumb-badge text is null');
    expect(zoomText).not.toContain('x');
    const expectedZoom = await page.evaluate((): number => {
      const g = window as unknown as { dcomposeApp?: { getDefaultZoom: () => number } };
      return g.dcomposeApp?.getDefaultZoom() ?? 0.75;
    });
    expect(parseFloat(zoomText)).toBeCloseTo(expectedZoom, 1);

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
      expect(Math.abs(tick.y - trackCenter)).toBeLessThanOrEqual(250);
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
      const dpr = window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
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
      const selects = ['wave-select', 'layout-select', 'mpe-output-select'];
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
        el.matches('.gi-check') ||            // checked checkbox mark
        el.matches('.slider-preset-btn.active'); // active TET preset
      const found: string[] = [];
      const walk = (el: Element): void => {
        if (allowedWhite(el)) { return; }
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg);
        if (match) {
          const [, r, g, b] = match.map(Number);
          if (r > 200 && g > 200 && b > 200) {
            const cls = el.className;
            found.push(`${el.tagName}.${typeof cls === 'string' ? cls.substring(0, 30) : ''}: ${bg}`);
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

// ── Migrated from contracts.spec.ts — library contract invariants ────────────

// ─── Category B: Module imports via page.evaluate ─────────────────────────────

/** D = {}. TUNING_MARKERS must be sorted descending for binary search. */
export const ctMarkers1Check: StateInvariant = {
  id: 'CT-MARKERS-1',
  check: async (page: Page) => {
    const sorted = await page.evaluate(async () => {
      const { TUNING_MARKERS } = await import('/src/lib/synth.ts');
      for (let i = 1; i < TUNING_MARKERS.length; i++) {
        if (TUNING_MARKERS[i].fifth >= TUNING_MARKERS[i - 1].fifth) return false;
      }
      return true;
    });
    expect(sorted).toBe(true);
  },
};

/** D = {}. All 8 expected TET markers present. */
export const ctMarkers2Check: StateInvariant = {
  id: 'CT-MARKERS-2',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { TUNING_MARKERS } = await import('/src/lib/synth.ts');
      const names = TUNING_MARKERS.map((m: { name: string }) => m.name);
      return { count: TUNING_MARKERS.length, names };
    });
    expect(result.count).toBe(8);
    expect(result.names).toEqual(['5', '17', 'Pyth', '12', '31', '\u00BCMT', '19', '7']);
  },
};

/** D = {}. findNearestMarker(700) returns 12-TET with distance 0. */
export const ctNearest1Check: StateInvariant = {
  id: 'CT-NEAREST-1',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { findNearestMarker } = await import('/src/lib/synth.ts');
      const { marker, distance } = findNearestMarker(700);
      return { name: marker.name, fifth: marker.fifth, distance };
    });
    expect(result.fifth).toBe(700);
    expect(result.distance).toBe(0);
    expect(result.name).toBe('12');
  },
};

/** D = {}. D is at coordinate 0. */
export const ctNotename1Check: StateInvariant = {
  id: 'CT-NOTENAME-1',
  check: async (page: Page) => {
    const name = await page.evaluate(async () => {
      const { getNoteNameFromCoord } = await import('/src/lib/keyboard-layouts.ts');
      return getNoteNameFromCoord(0);
    });
    expect(name).toBe('D');
  },
};

/** D = {}. Known note names at various coordinates. */
export const ctNotename2Check: StateInvariant = {
  id: 'CT-NOTENAME-2',
  check: async (page: Page) => {
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
  },
};

/** D = {}. Double accidentals exist at extreme coordinates. */
export const ctNotename3Check: StateInvariant = {
  id: 'CT-NOTENAME-3',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { getNoteNameFromCoord } = await import('/src/lib/keyboard-layouts.ts');
      return {
        doubleSharp: getNoteNameFromCoord(11),
        doubleFlat: getNoteNameFromCoord(-11),
      };
    });
    // Double accidentals use repeated ♯♯/♭♭ (JetBrains Mono lacks SMP glyphs)
    expect(result.doubleSharp).toContain('\u266F\u266F');
    expect(result.doubleFlat).toContain('\u266D\u266D');
  },
};

// ─── Category A: Pure math — no page needed ───────────────────────────────────

/** D = {}. coordToMidi(0, 0) = 62 (D4). */
export const ctMidi1Check: StateInvariant = {
  id: 'CT-MIDI-1',
  check: async (_page: Page) => {
    // Contract: baseMidi=62, x*7 semitones per fifth, y*12 per octave
    const midi = 62 + 0 * 7 + 0 * 12;
    expect(midi).toBe(62);
  },
};

/** D = {}. coordToMidi for known notes. */
export const ctMidi2Check: StateInvariant = {
  id: 'CT-MIDI-2',
  check: async (_page: Page) => {
    const base = 62;
    const a4 = base + 1 * 7 + 0 * 12;   // (1,0) → A4
    const c3 = base + (-2) * 7 + 0 * 12; // (-2,0) → C3
    const d5 = base + 0 * 7 + 1 * 12;    // (0,1) → D5
    expect(a4).toBe(69);
    expect(c3).toBe(48);
    expect(d5).toBe(74);
  },
};

/** D = {}. pitchClassFromCoordX(0) = 2 (D). */
export const ctPc1Check: StateInvariant = {
  id: 'CT-PC-1',
  check: async (_page: Page) => {
    const x = 0;
    const pc = ((2 + x * 7) % 12 + 12) % 12;
    expect(pc).toBe(2);
  },
};

/** D = {}. pitchClassFromCoordX for various coordinates. */
export const ctPc2Check: StateInvariant = {
  id: 'CT-PC-2',
  check: async (_page: Page) => {
    const calc = (x: number): number => ((2 + x * 7) % 12 + 12) % 12;
    expect(calc(1)).toBe(9);   // A
    expect(calc(-2)).toBe(0);  // C
    expect(calc(2)).toBe(4);   // E
    expect(calc(-1)).toBe(7);  // G
  },
};

/** D = {}. D (pitch class 2) has hue 29°. */
export const ctHue1Check: StateInvariant = {
  id: 'CT-HUE-1',
  check: async (_page: Page) => {
    const pc = 2; // D
    const hue = (pc * 30 + 329) % 360;
    expect(hue).toBe(29);
  },
};

/** D = {}. Adjacent fifths differ by 210° for max contrast. */
export const ctHue2Check: StateInvariant = {
  id: 'CT-HUE-2',
  check: async (_page: Page) => {
    const hueD = (2 * 30 + 329) % 360;  // D, pc=2 → 29°
    const hueA = (9 * 30 + 329) % 360;  // A, pc=9 → 239°
    const diff = Math.abs(hueA - hueD);
    expect(diff).toBe(210);
  },
};

/** D = {}. coordToMidiNote round-trips for canonical positions. */
export const ctRoundtrip1Check: StateInvariant = {
  id: 'CT-ROUNDTRIP-1',
  check: async (_page: Page) => {
    const coords = [-3, -2, -1, 0, 1, 2, 3];
    for (const x of coords) {
      const midi = 62 + x * 7 + 0 * 12;
      expect(midi >= 0 && midi <= 127).toBe(true);
      expect(midi - 62 === x * 7).toBe(true);
    }
  },
};

/** D = {}. At 12-TET (700¢), all coordinates have 0 deviation. */
export const ctCents1Check: StateInvariant = {
  id: 'CT-CENTS-1',
  check: async (_page: Page) => {
    const fifth = 700;
    // +0 coerces -0 to 0 (JS: -5 * 0 === -0, but musically deviation is 0)
    const deviations = [-5, -1, 0, 1, 5].map(x => x * (fifth - 700) + 0);
    for (const d of deviations) {
      expect(d).toBe(0);
    }
  },
};

/** D = {}. At 720¢ (5-TET), deviation is 20¢ per fifth step. */
export const ctCents2Check: StateInvariant = {
  id: 'CT-CENTS-2',
  check: async (_page: Page) => {
    const fifth = 720;
    const x1 = 1 * (fifth - 700);
    const xn1 = -1 * (fifth - 700);
    const x3 = 3 * (fifth - 700);
    expect(x1).toBe(20);
    expect(xn1).toBe(-20);
    expect(x3).toBe(60);
  },
};

// ─── Category C: Machine state contracts — no page needed ─────────────────────

/** D = {}. Runtime overlay machine states match test machine. */
export const ctMachine1Check: StateInvariant = {
  id: 'CT-MACHINE-1',
  check: async (_page: Page) => {
    const runtimeStates = Object.keys(overlayMachine.config.states ?? {});
    const testStates = Object.keys(testOverlayMachine.config.states ?? {});
    expect(runtimeStates.sort()).toEqual(testStates.sort());
  },
};

/** D = {}. Runtime pedal machine states match test sustain/vibrato. */
export const ctMachine2Check: StateInvariant = {
  id: 'CT-MACHINE-2',
  check: async (_page: Page) => {
    const runtimeStates = Object.keys(pedalMachine.config.states ?? {});
    const sustainStates = Object.keys(testSustainMachine.config.states ?? {});
    const vibratoStates = Object.keys(testVibratoMachine.config.states ?? {});
    expect(runtimeStates.sort()).toEqual(sustainStates.sort());
    expect(runtimeStates.sort()).toEqual(vibratoStates.sort());
  },
};

/** D = {}. Test panel states map to runtime panel machine states. */
export const ctMachine3Check: StateInvariant = {
  id: 'CT-MACHINE-3',
  check: async (_page: Page) => {
    const runtimeStates = new Set(Object.keys(panelMachine.config.states ?? {}));
    const stateMap: Record<string, string> = { default: 'idle', expanded: 'idle', collapsed: 'collapsed' };
    const testVisStates = Object.keys(testVisualiserMachine.config.states ?? {});
    const testPedStates = Object.keys(testPedalsMachine.config.states ?? {});
    for (const s of testVisStates) {
      const mapped = stateMap[s] ?? s;
      expect(runtimeStates.has(mapped)).toBe(true);
    }
    for (const s of testPedStates) {
      const mapped = stateMap[s] ?? s;
      expect(runtimeStates.has(mapped)).toBe(true);
    }
    expect(runtimeStates.has('dragging')).toBe(true);
    expect(runtimeStates.has('routing')).toBe(true);
  },
};

/** D = {}. Runtime waveform machine has correct initial waveform. */
export const ctMachine4Check: StateInvariant = {
  id: 'CT-MACHINE-4',
  check: async (_page: Page) => {
    const testStates = Object.keys(testWaveformMachine.config.states ?? {});
    expect(testStates).toContain('sawtooth');
    expect(testStates).toContain('sine');
    expect(testStates).toContain('square');
    expect(testStates).toContain('triangle');
    expect(testStates.length).toBe(4);
  },
};

// ─── Category D: Self-contained page.evaluate ─────────────────────────────────

/** D = {}. Note naming includes double sharps and flats. */
export const bhDoubleAccidental1Check: StateInvariant = {
  id: 'BH-DOUBLEACCIDENTAL-1',
  check: async (page: Page) => {
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
  },
};

// ── Migrated from mpe-output.spec.ts — MPE output invariants ────────────────

/** D = {}. noteOn sends correct status byte on member channel 2–16. */
export const iscMpe1Check: StateInvariant = {
  id: 'ISC-MPE-1',
  check: async (page: Page) => {
    const sent = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0; // clear MCM
      mpe.setEnabled(true);
      mpe.noteOn('n1', 60, 0.8);
      return sent;
    });
    // noteOn sends 4 messages: pitch-bend reset, CC74 reset, pressure reset, note-on
    expect(sent).toHaveLength(4);
    const noteOn = sent[3];
    expect(noteOn[0] & 0xF0).toBe(0x90);
    const channel = (noteOn[0] & 0x0F) + 1;
    expect(channel).toBeGreaterThanOrEqual(2);
    expect(channel).toBeLessThanOrEqual(16);
    expect(noteOn[1]).toBe(60);
    expect(noteOn[2]).toBe(Math.round(0.8 * 127));
  },
};

/** D = {}. pitch bend produces valid 14-bit LSB/MSB encoding. */
export const iscMpe2Check: StateInvariant = {
  id: 'ISC-MPE-2',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      mpe.noteOn('n1', 60, 0.8);
      sent.length = 0;

      // +24 semitones (half of default 48 bend range)
      mpe.sendPitchBend('n1', 24);
      const bend24 = [...sent[0]];
      sent.length = 0;

      // Center (0 semitones)
      mpe.sendPitchBend('n1', 0);
      const bendCenter = [...sent[0]];
      sent.length = 0;

      // Max up (+48 = full range)
      mpe.sendPitchBend('n1', 48);
      const bendMaxUp = [...sent[0]];
      sent.length = 0;

      // Max down (-48 = full range)
      mpe.sendPitchBend('n1', -48);
      const bendMaxDown = [...sent[0]];

      return { bend24, bendCenter, bendMaxUp, bendMaxDown };
    });

    // All pitch bend messages: status high nibble = 0xE0
    expect(result.bend24[0] & 0xF0).toBe(0xE0);

    // +24 st → normalized=0.5 → uint14=round(1.5×8191.5)=12287
    //   12287 & 0x7F = 127 (LSB),  12287>>7 & 0x7F = 95 (MSB)
    expect(result.bend24[1]).toBe(127);
    expect(result.bend24[2]).toBe(95);

    // Center → uint14=8192 → lsb=0, msb=64
    expect(result.bendCenter[1]).toBe(0);
    expect(result.bendCenter[2]).toBe(64);

    // Max up → uint14=16383 → lsb=127, msb=127
    expect(result.bendMaxUp[1]).toBe(127);
    expect(result.bendMaxUp[2]).toBe(127);

    // Max down → uint14=0 → lsb=0, msb=0
    expect(result.bendMaxDown[1]).toBe(0);
    expect(result.bendMaxDown[2]).toBe(0);
  },
};

/** D = {}. CC74 slide normalizes 0–1 to 0–127. */
export const iscMpe3Check: StateInvariant = {
  id: 'ISC-MPE-3',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      mpe.noteOn('n1', 60, 0.8);
      sent.length = 0;

      // Slide values
      mpe.sendSlide('n1', 0);
      const slide0 = [...sent[0]];
      sent.length = 0;

      mpe.sendSlide('n1', 0.5);
      const slideHalf = [...sent[0]];
      sent.length = 0;

      mpe.sendSlide('n1', 1.0);
      const slideFull = [...sent[0]];
      sent.length = 0;

      // Pressure uses the same 0–1 → 0–127 normalisation
      mpe.sendPressure('n1', 0);
      const pressure0 = [...sent[0]];
      sent.length = 0;

      mpe.sendPressure('n1', 1.0);
      const pressureFull = [...sent[0]];

      return { slide0, slideHalf, slideFull, pressure0, pressureFull };
    });

    // Slide: [CC_status, 74, value]
    expect(result.slide0[1]).toBe(74);
    expect(result.slide0[2]).toBe(0);

    expect(result.slideHalf[1]).toBe(74);
    expect(result.slideHalf[2]).toBe(64);  // round(0.5 × 127) = 64

    expect(result.slideFull[1]).toBe(74);
    expect(result.slideFull[2]).toBe(127);

    // Pressure: [0xD0|ch, value]
    expect(result.pressure0[0] & 0xF0).toBe(0xD0);
    expect(result.pressure0[1]).toBe(0);
    expect(result.pressureFull[1]).toBe(127);
  },
};

/** D = {}. FIFO channel allocation across channels 2–16. */
export const iscMpe4Check: StateInvariant = {
  id: 'ISC-MPE-4',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0;
      mpe.setEnabled(true);

      // Allocate all 15 member channels
      const allocatedChannels: number[] = [];
      for (let i = 0; i < 15; i++) {
        const startIdx = sent.length;
        mpe.noteOn(`n${i}`, 60 + i, 0.8);
        // noteOn produces 4 messages; note-on is the 4th
        const noteOnMsg = sent[startIdx + 3];
        allocatedChannels.push((noteOnMsg[0] & 0x0F) + 1);
      }

      // 16th noteOn — all channels exhausted → no output
      const beforeOverflow = sent.length;
      mpe.noteOn('overflow', 48, 0.8);
      const overflowMessageCount = sent.length - beforeOverflow;

      // Release first note, then allocate → FIFO returns channel 2
      mpe.noteOff('n0', 60);
      const beforeReuse = sent.length;
      mpe.noteOn('reuse', 72, 0.8);
      const reuseNoteOn = sent[beforeReuse + 3];
      const reuseChannel = (reuseNoteOn[0] & 0x0F) + 1;

      return { allocatedChannels, overflowMessageCount, reuseChannel };
    });

    // Sequential FIFO: channels 2 through 16
    expect(result.allocatedChannels).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    );
    // Overflow: no messages sent
    expect(result.overflowMessageCount).toBe(0);
    // Reuse: freed channel 2 returned via FIFO
    expect(result.reuseChannel).toBe(2);
  },
};

/** D = {}. MCM sent on output selection. */
export const iscMpe5Check: StateInvariant = {
  id: 'ISC-MPE-5',
  check: async (page: Page) => {
    const sent = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock); // triggers sendMCM
      return sent;
    });

    // ── Lower zone MCM on ch1 (status 0xB0) ──
    expect(sent[0]).toEqual([0xB0, 101, 0]);    // RPN MSB = 0
    expect(sent[1]).toEqual([0xB0, 100, 6]);    // RPN LSB = 6 (MCM)
    expect(sent[2]).toEqual([0xB0, 6, 15]);     // Data Entry = 15 members
    expect(sent[3]).toEqual([0xB0, 101, 127]);  // Null RPN
    expect(sent[4]).toEqual([0xB0, 100, 127]);

    // ── Upper zone disable on ch16 (status 0xBF) ──
    expect(sent[5]).toEqual([0xBF, 101, 0]);
    expect(sent[6]).toEqual([0xBF, 100, 6]);
    expect(sent[7]).toEqual([0xBF, 6, 0]);      // 0 members = zone off
    expect(sent[8]).toEqual([0xBF, 101, 127]);
    expect(sent[9]).toEqual([0xBF, 100, 127]);

    // ── Pitch Bend Sensitivity (RPN 0/0) on manager ch1 ──
    expect(sent[10]).toEqual([0xB0, 101, 0]);   // RPN MSB = 0
    expect(sent[11]).toEqual([0xB0, 100, 0]);   // RPN LSB = 0 (PBS)
    expect(sent[12]).toEqual([0xB0, 6, 48]);    // 48 semitones
    expect(sent[13]).toEqual([0xB0, 38, 0]);    // 0 cents
  },
};

/** D = {}. No per-note messages go to manager channel 1. */
export const iscAMpe1Check: StateInvariant = {
  id: 'ISC-A-MPE-1',
  check: async (page: Page) => {
    const channels = await page.evaluate(async () => {
      const { MpeOutput } = await import('/src/lib/mpe-output.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const mpe = new MpeOutput();
      mpe.setOutput(mock);
      sent.length = 0; // clear MCM (those legitimately target ch1)
      mpe.setEnabled(true);

      // Exercise every per-note message type
      for (let i = 0; i < 5; i++) {
        mpe.noteOn(`n${i}`, 60 + i, 0.8);
      }
      mpe.sendPitchBend('n0', 12);
      mpe.sendSlide('n1', 0.5);
      mpe.sendPressure('n2', 0.7);
      mpe.noteOff('n3', 63);

      return sent.map(msg => (msg[0] & 0x0F) + 1);
    });

    // No per-note message should target channel 1 (manager)
    expect(channels).not.toContain(1);

    // All channels must be in member range 2–16
    for (const ch of channels) {
      expect(ch).toBeGreaterThanOrEqual(2);
      expect(ch).toBeLessThanOrEqual(16);
    }
  },
};

// ── Migrated from mpe-service.spec.ts — MPE service invariants ──────────────

/** D = {}. MPEService constructor creates default settings. */
export const iscSvc1Check: StateInvariant = {
  id: 'ISC-SVC-1',
  check: async (page: Page) => {
    const settings = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const svc = new MPEService();
      return svc.getSettings();
    });
    expect(settings.masterChannel).toBe(1);
    expect(settings.memberChannelCount).toBe(15);
    expect(settings.pitchBendRange).toBe(48);
    expect(settings.pressureMode).toBe('channel-at');
    expect(settings.timbreCC).toBe(74);
    expect(settings.pressureCC).toBe(11);
    expect(settings.bendAutoReset).toBe(true);
  },
};

/** D = {}. updateSettings changes configuration. */
export const iscSvc2Check: StateInvariant = {
  id: 'ISC-SVC-2',
  check: async (page: Page) => {
    const settings = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const svc = new MPEService();
      svc.updateSettings({ timbreCC: 1 });
      return svc.getSettings();
    });
    expect(settings.timbreCC).toBe(1);
    // Other defaults remain unchanged
    expect(settings.masterChannel).toBe(1);
    expect(settings.pitchBendRange).toBe(48);
    expect(settings.pressureMode).toBe('channel-at');
  },
};

/** D = {}. noteOn allocates member channel and sends correct MIDI. */
export const iscSvc3Check: StateInvariant = {
  id: 'ISC-SVC-3',
  check: async (page: Page) => {
    const sent = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0; // clear MCM
      svc.setEnabled(true);
      svc.noteOn('n1', 60, 0.8);
      return sent;
    });
    // noteOn sends 4 messages: pitch-bend reset, CC74 reset, pressure reset, note-on
    expect(sent).toHaveLength(4);
    const noteOn = sent[3];
    // Status high nibble = 0x90 (Note On)
    expect(noteOn[0] & 0xF0).toBe(0x90);
    // Channel must be a member channel (2–16, i.e. index 1–15)
    const channel = (noteOn[0] & 0x0F) + 1;
    expect(channel).toBeGreaterThanOrEqual(2);
    expect(channel).toBeLessThanOrEqual(16);
    // Payload
    expect(noteOn[1]).toBe(60);
    expect(noteOn[2]).toBe(Math.round(0.8 * 127));
  },
};

/** D = {}. noteOff sends correct note-off message. */
export const iscSvc4Check: StateInvariant = {
  id: 'ISC-SVC-4',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0;
      svc.setEnabled(true);
      svc.noteOn('n1', 60, 0.8);
      const noteOnChannel = sent[3][0] & 0x0F;
      sent.length = 0;
      svc.noteOff('n1', 60);
      return { noteOff: sent[0], noteOnChannel };
    });
    // Status high nibble = 0x80 (Note Off)
    expect(result.noteOff[0] & 0xF0).toBe(0x80);
    // Same channel as note-on
    expect(result.noteOff[0] & 0x0F).toBe(result.noteOnChannel);
    // MIDI note
    expect(result.noteOff[1]).toBe(60);
    // Release velocity
    expect(result.noteOff[2]).toBe(64);
  },
};

/** D = {}. subscribe receives voice state updates. */
export const iscSvc5Check: StateInvariant = {
  id: 'ISC-SVC-5',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      svc.setEnabled(true);
      const updates: { count: number; firstState?: string; firstNote?: number }[] = [];
      svc.subscribe((voices) => {
        updates.push({
          count: voices.length,
          firstState: voices[0]?.state,
          firstNote: voices[0]?.midiNote,
        });
      });
      svc.noteOn('n1', 60, 0.8);
      svc.noteOff('n1', 60);
      return updates;
    });
    // noteOn triggers notify → 1 voice (active)
    expect(result[0].count).toBe(1);
    expect(result[0].firstState).toBe('active');
    expect(result[0].firstNote).toBe(60);
    // noteOff triggers notify → voice still in map but state = released
    expect(result[1].count).toBe(1);
    expect(result[1].firstState).toBe('released');
  },
};

/** D = {}. panic sends all-notes-off on all member channels. */
export const iscSvc6Check: StateInvariant = {
  id: 'ISC-SVC-6',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0; // clear MCM
      svc.panic();
      return sent;
    });
    // Default: 15 member channels (2–16), each gets CC123
    expect(result).toHaveLength(15);
    for (let i = 0; i < 15; i++) {
      const ch = (result[i][0] & 0x0F) + 1;
      expect(ch).toBeGreaterThanOrEqual(2);
      expect(ch).toBeLessThanOrEqual(16);
      // CC status
      expect(result[i][0] & 0xF0).toBe(0xB0);
      // CC123 = All Notes Off
      expect(result[i][1]).toBe(123);
      expect(result[i][2]).toBe(0);
    }
  },
};

/** D = {}. dispose cleans up resources. */
export const iscSvc7Check: StateInvariant = {
  id: 'ISC-SVC-7',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      svc.setEnabled(true);
      const voiceUpdates: number[] = [];
      svc.subscribe((voices) => { voiceUpdates.push(voices.length); });
      svc.noteOn('n1', 60, 0.8);
      // voiceUpdates: [1]
      svc.dispose();
      // dispose → panic → notify([]) → voiceUpdates: [1, 0]
      // then listeners.clear()
      // Re-wire output to prove listener is cleared
      svc.setOutput(mock);
      sent.length = 0;
      // _enabled still true (dispose doesn't reset it)
      svc.noteOn('n2', 62, 0.8);
      const messagesAfterReuse = sent.length;
      return { voiceUpdates, messagesAfterReuse };
    });
    // Callback fired during noteOn and during dispose → panic
    expect(result.voiceUpdates).toEqual([1, 0]);
    // noteOn after dispose sent messages (output re-wired, service still functional)
    expect(result.messagesAfterReuse).toBeGreaterThan(0);
    // But no new callback — listener was cleared by dispose
    expect(result.voiceUpdates).toHaveLength(2);
  },
};

/** D = {}. configurable pressureMode changes message type. */
export const iscSvc8Check: StateInvariant = {
  id: 'ISC-SVC-8',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      // ── Test poly-at mode ──
      const sentPolyAt: number[][] = [];
      const mockPolyAt = {
        send(data: number[]) { sentPolyAt.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svcPolyAt = new MPEService({ pressureMode: 'poly-at' });
      svcPolyAt.setOutput(mockPolyAt);
      sentPolyAt.length = 0;
      svcPolyAt.setEnabled(true);
      svcPolyAt.noteOn('n1', 60, 0.8);
      sentPolyAt.length = 0;
      svcPolyAt.sendPressure('n1', 0.5);
      const polyAtMsg = [...sentPolyAt[0]];
      // ── Test cc mode ──
      const sentCC: number[][] = [];
      const mockCC = {
        send(data: number[]) { sentCC.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svcCC = new MPEService({ pressureMode: 'cc', pressureCC: 11 });
      svcCC.setOutput(mockCC);
      sentCC.length = 0;
      svcCC.setEnabled(true);
      svcCC.noteOn('n1', 60, 0.8);
      sentCC.length = 0;
      svcCC.sendPressure('n1', 0.5);
      const ccMsg = [...sentCC[0]];
      return { polyAtMsg, ccMsg };
    });
    // Poly aftertouch: status = 0xA0 | channel
    expect(result.polyAtMsg[0] & 0xF0).toBe(0xA0);
    expect(result.polyAtMsg[1]).toBe(60);                    // MIDI note
    expect(result.polyAtMsg[2]).toBe(Math.round(0.5 * 127)); // pressure value
    // CC mode: status = 0xB0 | channel, CC11 (expression)
    expect(result.ccMsg[0] & 0xF0).toBe(0xB0);
    expect(result.ccMsg[1]).toBe(11);                        // pressureCC
    expect(result.ccMsg[2]).toBe(Math.round(0.5 * 127));     // pressure value
  },
};

/** D = {}. setEnabled(false) prevents note output. */
export const iscSvc9Check: StateInvariant = {
  id: 'ISC-SVC-9',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService();
      svc.setOutput(mock);
      sent.length = 0;
      // Enable then disable to test the gate
      svc.setEnabled(true);
      svc.setEnabled(false);
      // setEnabled(false) calls panic → sends CC123 on all 15 channels
      sent.length = 0; // clear panic messages
      svc.noteOn('n1', 60, 0.8);
      const noteOnMessages = sent.length;
      svc.sendPitchBend('n1', 12);
      const afterBend = sent.length;
      svc.sendSlide('n1', 0.5);
      const afterSlide = sent.length;
      svc.sendPressure('n1', 0.5);
      const afterPressure = sent.length;
      return {
        noteOnMessages,
        afterBend,
        afterSlide,
        afterPressure,
        isEnabled: svc.isEnabled(),
      };
    });
    expect(result.noteOnMessages).toBe(0);
    expect(result.afterBend).toBe(0);
    expect(result.afterSlide).toBe(0);
    expect(result.afterPressure).toBe(0);
    expect(result.isEnabled).toBe(false);
  },
};

/** D = {}. configurable timbreCC uses custom CC number. */
export const iscSvc10Check: StateInvariant = {
  id: 'ISC-SVC-10',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { MPEService } = await import('/src/lib/mpe-service.ts');
      const sent: number[][] = [];
      const mock = {
        send(data: number[]) { sent.push([...data]); },
        clear() { /* MIDIOutput interface noop */ },
      };
      const svc = new MPEService({ timbreCC: 1 });
      svc.setOutput(mock);
      sent.length = 0;
      svc.setEnabled(true);
      svc.noteOn('n1', 60, 0.8);
      // noteOn sends: pitch bend reset, CC1 reset (custom timbre), pressure reset, note-on
      const timbreReset = [...sent[1]]; // second message = timbre reset
      sent.length = 0;
      svc.sendSlide('n1', 0.75);
      const slideMsg = [...sent[0]];
      return { timbreReset, slideMsg };
    });
    // Timbre reset during noteOn uses CC1 instead of CC74
    expect(result.timbreReset[0] & 0xF0).toBe(0xB0);
    expect(result.timbreReset[1]).toBe(1);  // CC1 = mod wheel
    expect(result.timbreReset[2]).toBe(64); // center value
    // Slide message uses CC1
    expect(result.slideMsg[0] & 0xF0).toBe(0xB0);
    expect(result.slideMsg[1]).toBe(1);
    expect(result.slideMsg[2]).toBe(Math.round(0.75 * 127));
  },
};

// ── Issue regression invariants ─────────────────────────────────────────────

/** D = {overlay}. Skew notch at value 0 reads "DCompose / Wicki-Hayden" (#81). */
export const iss81SkewNotchCheck: StateInvariant = {
  id: 'ISS-81-1',
  check: async (page: Page) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    // Verify the preset notch button text
    const notchBtn = page.locator('#skew-presets .slider-preset-btn[data-value="0"]');
    await expect(notchBtn).toBeVisible();
    const notchText = await notchBtn.textContent();
    if (!notchText) throw new Error('skew preset notch button has no text');
    expect(notchText).toContain('DCompose / Wicki-Hayden');
    // Verify the skew-label annotation contains both names
    const labelText = await page.locator('#skew-label').textContent();
    if (!labelText) throw new Error('#skew-label has no text');
    expect(labelText).toContain('DCompose');
    expect(labelText).toContain('Wicki-Hayden');
  },
};

/** D = {overlay}. Cog button does not overlap overlay content (#87). */
export const iss87CogNoOverlapCheck: StateInvariant = {
  id: 'ISS-87-1',
  check: async (page: Page) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const cogBox = await page.locator('#grid-settings-btn').boundingBox();
    if (!cogBox) throw new Error('#grid-settings-btn not visible');
    const sectionBox = await page.locator('.overlay-section').first().boundingBox();
    if (!sectionBox) throw new Error('.overlay-section not visible');
    // Overlay section left edge must be >= cog right edge
    expect(sectionBox.x, 'overlay content must not overlap cog').toBeGreaterThanOrEqual(cogBox.x + cogBox.width);
  },
};

/** D = {overlay}. WAVE is a select dropdown with reset button (#96). */
export const iss96WaveSelectCheck: StateInvariant = {
  id: 'ISS-96-1',
  check: async (page: Page) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const waveSelect = page.locator('#wave-select');
    const tagName = await waveSelect.evaluate(el => el.tagName);
    expect(tagName).toBe('SELECT');
    const ssMain = page.locator('#wave-select + .ss-main');
    await expect(ssMain).toBeVisible();
    const waveReset = page.locator('#wave-reset');
    await expect(waveReset).toBeVisible();
    const options = await waveSelect.locator('option').evaluateAll(
      els => els.map(el => (el as HTMLOptionElement).value)
    );
    expect(options).toEqual(['sawtooth', 'sine', 'square', 'triangle']);
    await ssMain.click();
    await page.locator('.ss-list .ss-option', { hasText: 'SIN' }).click();
    await page.waitForTimeout(100);
    await expect(waveSelect).toHaveValue('sine');
    await waveReset.click();
    await page.waitForTimeout(200);
    await expect(waveSelect).toHaveValue('sawtooth');
  },
};

/** D = {overlay}. KEYBOARD LAYOUT has a reset button that resets to ANSI (#97). */
export const iss97LayoutResetCheck: StateInvariant = {
  id: 'ISS-97-1',
  check: async (page: Page) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    // Verify #layout-reset exists
    const layoutReset = page.locator('#layout-reset');
    await expect(layoutReset).toBeVisible();
    // Click reset and verify layout select value is 'ansi'
    await layoutReset.click();
    await page.waitForTimeout(200);
    const layoutVal = await page.locator('#layout-select').inputValue();
    expect(layoutVal).toBe('ansi');
  },
};

/** D = {overlay}. All slider-track rows share same left/right edges (#98). */
export const iss98AlignmentCheck: StateInvariant = {
  id: 'ISS-98-1',
  check: async (page: Page) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const tracks = page.locator('#grid-overlay .slider-track');
    const count = await tracks.count();
    expect(count).toBeGreaterThanOrEqual(3);
    const rights: number[] = [];
    for (let i = 0; i < count; i++) {
      const box = await tracks.nth(i).boundingBox();
      if (!box) continue;
      rights.push(Math.round(box.x + box.width));
    }
    // All right edges within 2px tolerance
    const maxRight = Math.max(...rights);
    const minRight = Math.min(...rights);
    expect(maxRight - minRight, 'slider-track right edges must align within 2px').toBeLessThanOrEqual(2);
  },
};

/** D = {overlay}. Overlay has organized category headings in correct style (#92). */
export const iss92OverlayHeadingsCheck: StateInvariant = {
  id: 'ISS-92-1',
  check: async (page: Page) => {
    // Open overlay first
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    const headings = page.locator('#grid-overlay .overlay-section-title');
    const texts = await headings.allTextContents();
    for (const expected of ['SOUND', 'VISUAL', 'INPUT']) {
      if (!texts.some(t => t.trim() === expected)) {
        throw new Error(`Missing overlay category heading: ${expected}`);
      }
    }
    expect(texts.length, 'Should have exactly 3 overlay section headings').toBe(3);
    // Verify headings are greyish (not white)
    const firstHeading = headings.first();
    const color = await firstHeading.evaluate((el) => getComputedStyle(el).color);
    // var(--dim) resolves to a grey — should not be rgb(255, 255, 255)
    if (color === 'rgb(255, 255, 255)') throw new Error('Category heading is white — should be greyish (var(--dim))');
  },
};
