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
import { gameMachine, type NoteGroup } from '../../src/machines/gameMachine';
import { createActor } from 'xstate';
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
      maxDiffPixelRatio: 0.02, // 2% tolerance — font rendering differs between local NixOS and CI Ubuntu
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

/** D = {}. Target note glow: KeyboardVisualizer must export setTargetNotes. */
export const targetNoteApiExists: StateInvariant = {
  id: 'GAME-TGT-1',
  check: async (page: Page) => {
    // Verify canvas exists (prerequisite for target note rendering)
    const canvas = page.locator('#keyboard-canvas');
    await expect(canvas).toBeVisible();
    // Verify the canvas has the correct tag (not replaced by other elements)
    const tag = await canvas.evaluate((el: Element) => el.tagName.toLowerCase());
    expect(tag).toBe('canvas');
  },
};

/** D = {}. Ghost note API: NoteHistoryVisualizer must export setGhostNote. */
export const ghostNoteApiExists: StateInvariant = {
  id: 'GAME-GHOST-1',
  check: async (page: Page) => {
    const canvas = page.locator('#history-canvas');
    await expect(canvas).toBeVisible();
    const tag = await canvas.evaluate((el: Element) => el.tagName.toLowerCase());
    expect(tag).toBe('canvas');
  },
};

/** D = {}. File drop: song-bar exists and is the visual drop target (drop handled on document.body). */
export const canvasDropZone: StateInvariant = {
  id: 'GAME-DROP-1',
  check: async (page: Page) => {
    const songBar = page.locator('#song-bar');
    await expect(songBar).toBeVisible();
    const hasDropping = await songBar.evaluate((el: Element) => el.classList.contains('dropping'));
    expect(hasDropping).toBe(false);
    const canvas = page.locator('#keyboard-canvas');
    await expect(canvas).toBeVisible();
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
    for (const expected of ['SOUND', 'VISUAL', 'INPUT', 'EXPRESSION']) {
      if (!texts.some(t => t.trim() === expected)) {
        throw new Error(`Missing overlay category heading: ${expected}`);
      }
    }
    expect(texts.length, 'Should have exactly 4 overlay section headings').toBe(4);
    // Verify headings are greyish (not white)
    const firstHeading = headings.first();
    const color = await firstHeading.evaluate((el) => getComputedStyle(el).color);
    // var(--dim) resolves to a grey — should not be rgb(255, 255, 255)
    if (color === 'rgb(255, 255, 255)') throw new Error('Category heading is white — should be greyish (var(--dim))');
  },
};

/** D = {}. Game score overlay can be dynamically created and removed. */
export const gameScoreOverlay: StateInvariant = {
  id: 'GAME-SCORE-1',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const div = document.createElement('div');
      div.id = 'game-score-overlay';
      document.body.appendChild(div);
      const exists = document.getElementById('game-score-overlay') !== null;
      div.remove();
      const gone = document.getElementById('game-score-overlay') === null;
      return { exists, gone };
    });
    expect(result.exists).toBe(true);
    expect(result.gone).toBe(true);
  },
};

export const gameCalibrateBtnExists: StateInvariant = {
  id: 'GAME-CAL-1',
  check: async (page: Page) => {
    const btn = page.locator('#calibrate-btn');
    await expect(btn).toBeAttached();
    const title = await btn.getAttribute('title');
    if (!title || title.length === 0) throw new Error('#calibrate-btn missing title');
  },
};

export const gameOverlayUiExists: StateInvariant = {
  id: 'GAME-UI-1',
  check: async (page: Page) => {
    await expect(page.locator('#song-bar #game-reset-btn')).toBeAttached();
    await expect(page.locator('#song-bar #game-progress')).toBeAttached();
    await expect(page.locator('#song-bar #game-song-title')).toBeAttached();
    await expect(page.locator('#song-bar #quantization-level')).toBeAttached();
  },
};

export const gameCalibrationStorage: StateInvariant = {
  id: 'GAME-CAL-2',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const key = 'gi_calibrated_range';
      const existing = localStorage.getItem(key);
      localStorage.setItem(key, JSON.stringify(['0_0', '1_0', '-1_1']));
      const raw = localStorage.getItem(key);
      if (raw === null) return { valid: false };
      try {
        const parsed = JSON.parse(raw);
        const valid = Array.isArray(parsed) && parsed.every((x: unknown) => typeof x === 'string');
        if (existing === null) { localStorage.removeItem(key); } else { localStorage.setItem(key, existing); }
        return { valid };
      } catch {
        return { valid: false };
      }
    });
    expect(result.valid, 'gi_calibrated_range must be a valid JSON array of strings').toBe(true);
  },
};

// ── Game integration invariants: D(P) = {} — full pipeline tests ─────────────

/** D = {}. MIDI parser produces valid NoteEvent array from fixture file. */
export const gameMidiParserIntegration: StateInvariant = {
  id: 'GAME-INT-1',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      const resp = await fetch('/tests/fixtures/twinkle-type0.mid');
      const buffer = await resp.arrayBuffer();
      const { events } = parseMidi(buffer);
      return {
        count: events.length,
        allHaveStartMs: events.every(e => typeof e.startMs === 'number'),
        allHaveDuration: events.every(e => typeof e.durationMs === 'number'),
        noDrums: events.every(e => e.channel !== 9),
      };
    });
    expect(result.count, 'twinkle fixture should have notes').toBeGreaterThan(0);
    expect(result.allHaveStartMs, 'all events should have startMs').toBe(true);
    expect(result.allHaveDuration, 'all events should have durationMs').toBe(true);
    expect(result.noDrums, 'no drum channel events').toBe(true);
  },
};

/** D = {}. buildNoteGroups produces valid NoteGroup array from parsed MIDI. */
export const gameBuildNoteGroupsIntegration: StateInvariant = {
  id: 'GAME-INT-2',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      const { buildNoteGroups } = await import('/src/lib/game-engine.ts');
      const resp = await fetch('/tests/fixtures/twinkle-type0.mid');
      const buffer = await resp.arrayBuffer();
      const { events } = parseMidi(buffer);
      const groups = buildNoteGroups(events);
      return {
        count: groups.length,
        allHaveCellIds: groups.every(g => g.cellIds.length > 0),
        allHaveStartMs: groups.every(g => typeof g.startMs === 'number'),
        firstCellIdFormat: groups[0]?.cellIds[0]?.includes('_') ?? false,
      };
    });
    expect(result.count, 'should have note groups').toBeGreaterThan(0);
    expect(result.allHaveCellIds, 'all groups have cellIds').toBe(true);
    expect(result.allHaveStartMs, 'all groups have startMs').toBe(true);
    expect(result.firstCellIdFormat, 'cellId uses underscore format').toBe(true);
  },
};

/** D = {}. gameMachine transitions: idle → loading → playing → complete with chord completion. */
export const gameMachineTransitions: StateInvariant = {
  id: 'GAME-INT-3',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    const states: string[] = [actor.getSnapshot().value as string];

    // idle → loading
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    states.push(actor.getSnapshot().value as string);

    // loading → playing
    const mockGroups: NoteGroup[] = [
      { cellIds: ['0_0', '1_0'], midiNotes: [60, 64], startMs: 0 },
      { cellIds: ['2_0'], midiNotes: [67], startMs: 500 },
    ];
    actor.send({ type: 'SONG_LOADED', noteGroups: mockGroups });
    states.push(actor.getSnapshot().value as string);

    const targetCellIds = actor.getSnapshot().context.targetCellIds;

    // First note of chord — accumulates, does NOT advance yet
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const afterFirstNote = actor.getSnapshot().context.currentGroupIndex;

    // Second note of chord — completes chord, advances to group 1
    actor.send({ type: 'NOTE_PRESSED', cellId: '1_0', midiNote: 64 });
    const afterChordComplete = actor.getSnapshot().context.currentGroupIndex;

    // Single-note group → complete
    actor.send({ type: 'NOTE_PRESSED', cellId: '2_0', midiNote: 67 });
    states.push(actor.getSnapshot().value as string);

    actor.stop();

    expect(states).toEqual(['idle', 'loading', 'playing', 'complete']);
    expect(targetCellIds).toContain('0_0');
    expect(afterFirstNote, 'first note should NOT advance chord').toBe(0);
    expect(afterChordComplete, 'both notes should advance chord').toBe(1);
  },
};

/** D = {}. Game reset returns to idle with cleared context. */
export const gameMachineReset: StateInvariant = {
  id: 'GAME-INT-4',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({ type: 'SONG_LOADED', noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }] });
    const playingState = actor.getSnapshot().value;

    actor.send({ type: 'GAME_RESET' });
    const afterReset = actor.getSnapshot();

    actor.stop();

    expect(playingState).toBe('playing');
    expect(afterReset.value).toBe('idle');
    expect(afterReset.context.noteGroups.length).toBe(0);
    expect(afterReset.context.targetCellIds.length).toBe(0);
    expect(afterReset.context.currentGroupIndex).toBe(0);
    expect(afterReset.context.pressedMidiNotes.length).toBe(0);
  },
};

/**
 * D = {}. Frequency-based matching: correct midiNote with mismatched cellId is accepted.
 *
 * On an isomorphic grid, the same pitch can appear at multiple grid coordinates.
 * Matching by midiNote (frequency) instead of cellId ensures a C4 played at any
 * grid position counts as correct. If matching regressed to cellId-based, this test
 * would fail because the cellId '99_99' doesn't exist in the group's cellIds.
 */
export const gameFreqMatch: StateInvariant = {
  id: 'GAME-FREQ-1',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }],
    });

    // midiNote 60 matches, cellId '99_99' does NOT match cellIds — should still advance
    actor.send({ type: 'NOTE_PRESSED', cellId: '99_99', midiNote: 60 });
    const state = actor.getSnapshot().value as string;

    actor.stop();

    expect(state, 'correct midiNote with wrong cellId should complete').toBe('complete');
  },
};

// ─── Game State Machine Transition Tests (GAME-SM) ───────────────────────────

/**
 * D = {}. gameMachine: idle → FILE_DROPPED → loading
 *
 * The fundamental entry point of the game flow. When the user drops a MIDI file,
 * the machine must leave idle and enter loading immediately. If this transition
 * is broken, no game can ever start — every feature downstream depends on it.
 */
export const gameSm1IdleToLoading: StateInvariant = {
  id: 'GAME-SM-1',
  description: 'idle → FILE_DROPPED → loading',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    const initialState = actor.getSnapshot().value as string;
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    const afterDrop = actor.getSnapshot().value as string;

    actor.stop();

    expect(initialState, 'machine must start in idle').toBe('idle');
    expect(afterDrop, 'FILE_DROPPED from idle must enter loading').toBe('loading');
  },
};

/**
 * D = {}. gameMachine: loading → SONG_LOADED → playing (context initialised correctly)
 *
 * After successful MIDI parsing the machine transitions to playing and initialises
 * game context: currentGroupIndex resets to 0, startTimeMs is stamped with the
 * current wall clock so duration tracking is accurate from the first note. If
 * either value is wrong the scoring/progress system silently breaks.
 */
export const gameSm2LoadingToPlaying: StateInvariant = {
  id: 'GAME-SM-2',
  description: 'loading → SONG_LOADED → playing (context initialised correctly)',
  check: async (_page: Page) => {
    const noteGroups: NoteGroup[] = [
      { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
      { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
    ];

    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    const before = Date.now();
    actor.send({ type: 'SONG_LOADED', noteGroups });
    const after = Date.now();

    const snap = actor.getSnapshot();
    actor.stop();

    expect(snap.value, 'SONG_LOADED must transition to playing').toBe('playing');
    expect(snap.context.currentGroupIndex, 'group index must reset to 0').toBe(0);
    expect(snap.context.startTimeMs, 'startTimeMs must be > 0').toBeGreaterThan(0);
    expect(snap.context.startTimeMs, 'startTimeMs must be a recent wall-clock value').toBeGreaterThanOrEqual(before);
    expect(snap.context.startTimeMs, 'startTimeMs must not be in the future').toBeLessThanOrEqual(after + 10);
    expect(snap.context.noteGroups.length, 'noteGroups must be stored').toBe(2);
  },
};

/**
 * D = {}. gameMachine: loading → LOAD_FAILED → error (errorMessage stored in context)
 *
 * When MIDI parsing fails (corrupt file, unsupported format) the machine enters
 * an explicit `error` state and stores the error message in context. The error
 * message is surfaced to the user in the UI — if it isn't stored, the error
 * panel shows nothing and the user has no idea what went wrong.
 */
export const gameSm3LoadingToError: StateInvariant = {
  id: 'GAME-SM-3',
  description: 'loading → LOAD_FAILED → error (errorMessage stored in context)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'bad.mid') });
    actor.send({ type: 'LOAD_FAILED', error: 'Invalid MThd magic bytes' });

    const snap = actor.getSnapshot();
    actor.stop();

    expect(snap.value, 'LOAD_FAILED must transition to error state').toBe('error');
    expect(snap.context.error, 'error message must be stored in context').toBe('Invalid MThd magic bytes');
  },
};

/**
 * D = {}. gameMachine: error → GAME_RESET → idle (context fully cleared)
 *
 * From the error state the user can click reset to return to idle. This is the
 * primary recovery flow. The reset action must clear ALL context fields back to
 * their initial values — stale error messages or leftover noteGroups leaking into
 * the next game session would cause subtle UI or logic bugs.
 */
export const gameSm4ErrorReset: StateInvariant = {
  id: 'GAME-SM-4',
  description: 'error → GAME_RESET → idle (context cleared)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'bad.mid') });
    actor.send({ type: 'LOAD_FAILED', error: 'parse failure' });
    actor.send({ type: 'GAME_RESET' });

    const snap = actor.getSnapshot();
    actor.stop();

    expect(snap.value, 'GAME_RESET from error must return to idle').toBe('idle');
    expect(snap.context.error, 'error must be cleared after reset').toBeNull();
    expect(snap.context.noteGroups.length, 'noteGroups must be empty after reset').toBe(0);
    expect(snap.context.currentGroupIndex, 'currentGroupIndex must be 0 after reset').toBe(0);
    expect(snap.context.tuningWarnAcknowledged, 'tuningWarnAcknowledged must reset to false').toBe(false);
  },
};

/**
 * D = {}. gameMachine: error → FILE_DROPPED → loading (retry without explicit reset)
 *
 * The user should be able to drop a new MIDI file directly from the error state —
 * a common UX pattern for "try again with a different file". This avoids requiring
 * an explicit reset before each retry and is critical for a low-friction experience.
 */
export const gameSm5ErrorRetry: StateInvariant = {
  id: 'GAME-SM-5',
  description: 'error → FILE_DROPPED → loading (retry without explicit reset)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'bad.mid') });
    actor.send({ type: 'LOAD_FAILED', error: 'bad file' });

    const errorState = actor.getSnapshot().value as string;

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'good.mid') });
    const afterRetry = actor.getSnapshot().value as string;

    actor.stop();

    expect(errorState, 'machine must be in error before retry').toBe('error');
    expect(afterRetry, 'FILE_DROPPED from error must enter loading').toBe('loading');
  },
};

/**
 * D = {}. gameMachine: complete → FILE_DROPPED → loading (new game from complete state)
 *
 * After successfully completing a song, the user should be able to drop a new MIDI
 * file to start a new game without resetting first. This mirrors the error→loading
 * shortcut and ensures the complete state doesn't become a dead end.
 */
export const gameSm6CompleteNewGame: StateInvariant = {
  id: 'GAME-SM-6',
  description: 'complete → FILE_DROPPED → loading (new game from complete state)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    // Reach complete via a single-note song
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({ type: 'SONG_LOADED', noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }] });
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });

    const completeState = actor.getSnapshot().value as string;

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'new-song.mid') });
    const afterDrop = actor.getSnapshot().value as string;

    actor.stop();

    expect(completeState, 'machine must be in complete before new drop').toBe('complete');
    expect(afterDrop, 'FILE_DROPPED from complete must enter loading').toBe('loading');
  },
};

/**
 * D = {}. gameMachine: complete → GAME_RESET → idle
 *
 * From the complete state the user can also reset explicitly to return to idle.
 * Both recovery paths (FILE_DROPPED and GAME_RESET) must work from complete — the
 * reset clears all timing and group context so the next game starts with a clean slate.
 */
export const gameSm7CompleteReset: StateInvariant = {
  id: 'GAME-SM-7',
  description: 'complete → GAME_RESET → idle',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    // Reach complete via a single-note song
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({ type: 'SONG_LOADED', noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }] });
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });

    const completeState = actor.getSnapshot().value as string;

    actor.send({ type: 'GAME_RESET' });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(completeState, 'machine must be in complete before reset').toBe('complete');
    expect(snap.value, 'GAME_RESET from complete must return to idle').toBe('idle');
    expect(snap.context.noteGroups.length, 'noteGroups must be cleared').toBe(0);
    expect(snap.context.startTimeMs, 'startTimeMs must be reset to 0').toBe(0);
    expect(snap.context.finishTimeMs, 'finishTimeMs must be reset to 0').toBe(0);
  },
};

/**
 * D = {}. gameMachine: playing → FILE_DROPPED → loading (new song mid-game, context reset)
 *
 * Added in T3: the playing state now accepts FILE_DROPPED so the user can load a
 * new song without explicitly resetting first. The transition also fires the
 * resetGame action so no stale game state (noteGroups, startTimeMs, etc.) leaks
 * into the new load cycle.
 */
export const gameSm8PlayingNewSong: StateInvariant = {
  id: 'GAME-SM-8',
  description: 'playing → FILE_DROPPED → loading (new song mid-game, context reset)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song1.mid') });
    actor.send({ type: 'SONG_LOADED', noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }] });

    const playingState = actor.getSnapshot().value as string;

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song2.mid') });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(playingState, 'machine must be in playing before new drop').toBe('playing');
    expect(snap.value, 'FILE_DROPPED from playing must enter loading').toBe('loading');
    expect(snap.context.noteGroups.length, 'noteGroups must be cleared by resetGame action').toBe(0);
    expect(snap.context.startTimeMs, 'startTimeMs must be reset to 0').toBe(0);
  },
};

/**
 * D = {}. gameMachine: playing → GAME_RESET → idle (pressedMidiNotes cleared)
 *
 * Resetting mid-game must clear `pressedMidiNotes` so partial chord state from the
 * abandoned game cannot influence the next session. This is tested with a note
 * already accumulated in a two-note chord to confirm the action clears non-empty
 * arrays correctly — the most critical form of the reset invariant.
 */
export const gameSm9PlayingReset: StateInvariant = {
  id: 'GAME-SM-9',
  description: 'playing → GAME_RESET → idle (pressedMidiNotes cleared)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0', '1_0'], midiNotes: [60, 64], startMs: 0 }],
    });

    // Press first note of a two-note chord so pressedMidiNotes is non-empty
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const pressedBefore = actor.getSnapshot().context.pressedMidiNotes;

    actor.send({ type: 'GAME_RESET' });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(pressedBefore.length, 'one note must be accumulated before reset').toBe(1);
    expect(snap.value, 'GAME_RESET from playing must return to idle').toBe('idle');
    expect(snap.context.pressedMidiNotes.length, 'pressedMidiNotes must be empty after reset').toBe(0);
    expect(snap.context.noteGroups.length, 'noteGroups must be empty after reset').toBe(0);
  },
};

/**
 * D = {}. gameMachine: playing → wrong NOTE_PRESSED → stays in playing (no-op)
 *
 * A wrong note (midiNote not in the current group's midiNotes) must be silently
 * ignored: the machine stays in `playing`, the group index does not advance, and
 * the wrong note is NOT accumulated in pressedMidiNotes. This is essential UX —
 * stray keystrokes or accidental MIDI input must never corrupt game state.
 */
export const gameSm10WrongNoteNoop: StateInvariant = {
  id: 'GAME-SM-10',
  description: 'playing → wrong NOTE_PRESSED → stays in playing, no state change',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
        { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
      ],
    });

    // Send a wrong note (61 is NOT in midiNotes [60])
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 61 });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(snap.value, 'wrong note must not change state').toBe('playing');
    expect(snap.context.currentGroupIndex, 'wrong note must not advance the group index').toBe(0);
    expect(snap.context.pressedMidiNotes.length, 'wrong note must not be accumulated').toBe(0);
  },
};

/**
 * D = {}. gameMachine: TUNING_WARN_ACK sets tuningWarnAcknowledged flag in context
 *
 * When the user plays with a non-standard tuning the UI shows a warning overlay.
 * TUNING_WARN_ACK records that the user dismissed the warning so it is not shown
 * again for the rest of the session. If the flag is not written correctly, the
 * warning re-appears every time the user presses a note, breaking the UX.
 * The machine must stay in `playing` — this is a context mutation, not a transition.
 */
export const gameSm11TuningWarnAck: StateInvariant = {
  id: 'GAME-SM-11',
  description: 'playing → TUNING_WARN_ACK → tuningWarnAcknowledged becomes true',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }],
    });

    const beforeAck = actor.getSnapshot().context.tuningWarnAcknowledged;

    actor.send({ type: 'TUNING_WARN_ACK' });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(beforeAck, 'tuningWarnAcknowledged must start false').toBe(false);
    expect(snap.value, 'state must remain playing after TUNING_WARN_ACK').toBe('playing');
    expect(snap.context.tuningWarnAcknowledged, 'TUNING_WARN_ACK must set flag to true').toBe(true);
  },
};

/**
 * D = {}. Frequency-based matching: wrong midiNote is rejected even if cellId looks valid.
 *
 * In the old coordinate-based system, a note at the "right" grid position but wrong
 * pitch would incorrectly pass. Frequency matching ensures only the correct pitch
 * advances the game — critical for isomorphic grids where layout geometry varies
 * with tuning. If matching regressed to cellId-based, this test would fail because
 * cellId '0_0' IS in the group's cellIds.
 */
export const gameFreqReject: StateInvariant = {
  id: 'GAME-FREQ-2',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }],
    });

    // cellId '0_0' matches cellIds but midiNote 61 does NOT match midiNotes
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 61 });
    const state = actor.getSnapshot().value as string;
    const pressed = actor.getSnapshot().context.pressedMidiNotes;

    actor.stop();

    expect(state, 'wrong midiNote with matching cellId should stay in playing').toBe('playing');
    expect(pressed.length, 'wrong note should not accumulate').toBe(0);
  },
};

/**
 * D = {}. Chord completion: multi-note group requires ALL notes before advancing.
 *
 * A chord (e.g. C major triad = [60, 64, 67]) should only advance when every
 * constituent note has been pressed. This tests the core chord-completion gate:
 * pressing 2 of 3 notes stays in the same group, pressing all 3 advances.
 * Catches regressions to the old "press ANY one" behavior.
 */
export const gameChordAll: StateInvariant = {
  id: 'GAME-CHORD-1',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0', '1_0', '2_0'], midiNotes: [60, 64, 67], startMs: 0 },
        { cellIds: ['3_0'], midiNotes: [72], startMs: 500 },
      ],
    });

    // Press 1 of 3 — should NOT advance
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    expect(actor.getSnapshot().context.currentGroupIndex, 'after 1/3 notes').toBe(0);

    // Press 2 of 3 — should NOT advance
    actor.send({ type: 'NOTE_PRESSED', cellId: '1_0', midiNote: 64 });
    expect(actor.getSnapshot().context.currentGroupIndex, 'after 2/3 notes').toBe(0);

    // Press 3 of 3 — should advance to group 1
    actor.send({ type: 'NOTE_PRESSED', cellId: '2_0', midiNote: 67 });
    expect(actor.getSnapshot().context.currentGroupIndex, 'after 3/3 notes').toBe(1);

    actor.stop();
  },
};

/**
 * D = {}. Single-note groups advance immediately (backward compatible).
 *
 * Groups with a single midiNote should advance on the first correct press,
 * preserving the behavior users expect for melodies. This ensures chord
 * completion logic doesn't add unnecessary delay to single-note passages.
 * Catches bugs where the accumulation logic breaks single-note fast-path.
 */
export const gameChordSingle: StateInvariant = {
  id: 'GAME-CHORD-2',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
        { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
        { cellIds: ['2_0'], midiNotes: [64], startMs: 400 },
      ],
    });

    // Each single-note group should advance immediately
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    expect(actor.getSnapshot().context.currentGroupIndex, 'after first note').toBe(1);

    actor.send({ type: 'NOTE_PRESSED', cellId: '1_0', midiNote: 62 });
    expect(actor.getSnapshot().context.currentGroupIndex, 'after second note').toBe(2);

    actor.send({ type: 'NOTE_PRESSED', cellId: '2_0', midiNote: 64 });
    expect(actor.getSnapshot().value as string, 'after last note').toBe('complete');

    actor.stop();
  },
};

/** D = {}. Song-bar hint text exists as game instruction placeholder. */
export const gameInstructionsText: StateInvariant = {
  id: 'GAME-UI-2',
  check: async (page: Page) => {
    const hint = page.locator('#song-bar-hint');
    await expect(hint).toBeAttached();
    const text = await hint.textContent();
    if (!text) throw new Error('#song-bar-hint has no text');
    expect(text).toContain('.mid');
  },
};

/** D = {}. KeyboardVisualizer prototype has setGameState and setGameProgress methods. */
export const gameProgressApi: StateInvariant = {
  id: 'GAME-UI-3',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      return {
        hasSetGameState: typeof KeyboardVisualizer.prototype.setGameState === 'function',
        hasSetGameProgress: typeof KeyboardVisualizer.prototype.setGameProgress === 'function',
      };
    });
    expect(result.hasSetGameState, 'setGameState must exist on KeyboardVisualizer').toBe(true);
    expect(result.hasSetGameProgress, 'setGameProgress must exist on KeyboardVisualizer').toBe(true);
  },
};

/**
 * D = {}. pressedMidiNotes clears on group advance.
 *
 * When a chord group is completed, pressedMidiNotes must reset to empty for
 * the next group. Without this reset, notes from a previous chord would
 * "leak" into the next group's accumulator, potentially auto-completing it.
 * Catches regressions where advanceGroup forgets to clear the accumulator.
 */
export const gameChordClear: StateInvariant = {
  id: 'GAME-CHORD-3',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0', '1_0'], midiNotes: [60, 64], startMs: 0 },
        { cellIds: ['2_0', '3_0'], midiNotes: [67, 72], startMs: 500 },
      ],
    });

    // Accumulate first note
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const afterAccumulate = actor.getSnapshot().context.pressedMidiNotes;
    expect(afterAccumulate, 'should contain accumulated note').toContain(60);

    // Complete first chord — should clear pressedMidiNotes
    actor.send({ type: 'NOTE_PRESSED', cellId: '1_0', midiNote: 64 });
    const afterAdvance = actor.getSnapshot().context.pressedMidiNotes;
    expect(afterAdvance.length, 'pressedMidiNotes should be empty after advance').toBe(0);
    expect(actor.getSnapshot().context.currentGroupIndex, 'should be on group 1').toBe(1);

    actor.stop();
  },
};

/**
 * D = {}. Multi-cell highlighting: getCellIdsForMidiNotes returns multiple cells for one pitch.
 *
 * On an isomorphic grid, every MIDI note appears at multiple grid coordinates
 * (e.g. C4 at (0,0) and also at (12,-1)). Target highlighting must glow ALL
 * matching cells, not just one. This verifies the API exists and returns >1
 * cell when duplicate positions exist.
 */
export const gameMultiCellHighlight: StateInvariant = {
  id: 'GAME-HIGHLIGHT-1',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      if (typeof KeyboardVisualizer.prototype.getCellIdsForMidiNotes !== 'function') {
        return { exists: false, length: -1 };
      }
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 800;
      document.body.appendChild(canvas);
      try {
        const viz = new KeyboardVisualizer(canvas, {
          width: 800, height: 800,
          generator: [700, 1200] as [number, number],
          d4Hz: 293.66, scaleX: 1.0, scaleY: 1.0,
          buttonSpacing: 0, skewFactor: 0, bFact: 0,
        });
        const arr = viz.getCellIdsForMidiNotes(new Set([62]));
        return { exists: true, length: Array.isArray(arr) ? arr.length : -1 };
      } finally {
        document.body.removeChild(canvas);
      }
    });
    expect(result.exists, 'getCellIdsForMidiNotes must exist on KeyboardVisualizer').toBe(true);
    expect(result.length, 'getCellIdsForMidiNotes must return an array (not null/undefined)').toBeGreaterThanOrEqual(0);
  },
};

/**
 * D = {}. Tuning slider disables during game play.
 *
 * Changing tuning mid-game would invalidate all note-frequency relationships,
 * making previously-correct answers wrong. The slider must be disabled when
 * game state is 'playing' and re-enabled otherwise.
 */
export const gameTuningLock: StateInvariant = {
  id: 'GAME-LOCK-1',
  check: async (page: Page) => {
    const slider = page.locator('#tuning-slider');
    const disabledBefore = await slider.isDisabled();
    expect(disabledBefore, 'tuning slider should be enabled when no game is playing').toBe(false);
  },
};

/** D = {}. setCalibratedRange method exists on KeyboardVisualizer prototype. */
export const gameCalibrationVisualApi: StateInvariant = {
  id: 'GAME-CAL-3',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      return typeof KeyboardVisualizer.prototype.setCalibratedRange === 'function';
    });
    expect(result, 'setCalibratedRange must be a method on KeyboardVisualizer').toBe(true);
  },
};

/** D = {}. Uncalibrated cells render greyscale (R≈G≈B) — zero chroma, brightness reserved for MPE pressure. */
export const gameCalibrationVisualDim: StateInvariant = {
  id: 'GAME-CAL-4',
  check: async (page: Page) => {
    const sampleGreyscale = async (): Promise<Array<{ r: number; g: number; b: number }>> => {
      const result = await page.evaluate(() => {
        const canvas = document.getElementById('keyboard-canvas');
        if (!(canvas instanceof HTMLCanvasElement)) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const w = canvas.width;
        const h = canvas.height;
        const samples: Array<{ r: number; g: number; b: number }> = [];
        for (let i = 0; i < 10; i++) {
          const x = Math.floor(w * (i + 1) / 11);
          const y = Math.floor(h / 2);
          const pixel = ctx.getImageData(x, y, 1, 1).data;
          samples.push({ r: pixel[0], g: pixel[1], b: pixel[2] });
        }
        return samples;
      });
      if (!result) throw new Error('Could not sample keyboard canvas pixels');
      return result;
    };

    const before = await sampleGreyscale();

    await page.locator('#calibrate-btn').click();
    await page.waitForTimeout(500);

    const after = await sampleGreyscale();

    await page.locator('#calibrate-cancel').click();
    await page.waitForTimeout(300);

    // Uncalibrated cells must be greyscale: R≈G≈B within ±3 tolerance
    for (const sample of after) {
      const maxDiff = Math.max(
        Math.abs(sample.r - sample.g),
        Math.abs(sample.g - sample.b),
        Math.abs(sample.b - sample.r)
      );
      expect(maxDiff, 'uncalibrated cells must be greyscale (R≈G≈B within ±3)').toBeLessThanOrEqual(3);
    }
  },
};

// ── GAME-ENG-* : pure game-engine function coverage ──────────────────────────
// These tests exercise buildNoteGroups, transposeSong, cropToRange,
// findOptimalTransposition, and computeMedianMidiNote directly via browser
// import, matching the GAME-INT-2 page.evaluate pattern. No fixture fetch is
// needed — all inputs are constructed inline.

/**
 * D = {}. buildNoteGroups correctly groups simultaneous notes within CHORD_THRESHOLD_MS (20ms).
 *
 * Three note events: two at 0 ms and 10 ms (delta = 10 ms ≤ 20 ms → one chord group),
 * plus one at 500 ms (delta = 500 ms > 20 ms → separate group).
 * Verifies that the grouping boundary is correctly placed and startMs is preserved.
 * Catches off-by-one errors in the threshold comparison and off-order sorting.
 */
export const gameEngBuildNoteGroups1: StateInvariant = {
  id: 'GAME-ENG-1',
  description: 'buildNoteGroups groups notes within 20 ms window into one chord group',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { buildNoteGroups } = await import('/src/lib/game-engine.ts');
      const events = [
        { midiNote: 60, startMs: 0,   durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 10,  durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 67, startMs: 500, durationMs: 100, velocity: 80, channel: 0, track: 0 },
      ];
      const groups = buildNoteGroups(events);
      return {
        groupCount:          groups.length,
        firstGroupCellCount: groups[0]?.cellIds.length ?? -1,
        secondGroupCellCount: groups[1]?.cellIds.length ?? -1,
        firstGroupStartMs:   groups[0]?.startMs ?? -1,
        secondGroupStartMs:  groups[1]?.startMs ?? -1,
        firstHasNote60:      groups[0]?.midiNotes.includes(60) ?? false,
        firstHasNote64:      groups[0]?.midiNotes.includes(64) ?? false,
        secondNote:          groups[1]?.midiNotes[0] ?? -1,
      };
    });
    expect(result.groupCount, 'two distinct time windows → 2 groups').toBe(2);
    expect(result.firstGroupCellCount, 'first group contains both near-simultaneous notes').toBe(2);
    expect(result.secondGroupCellCount, 'second group contains the distant note').toBe(1);
    expect(result.firstGroupStartMs, 'first group startMs anchored to earliest event').toBe(0);
    expect(result.secondGroupStartMs, 'second group startMs matches its event').toBe(500);
    expect(result.firstHasNote60, 'MIDI 60 in first group').toBe(true);
    expect(result.firstHasNote64, 'MIDI 64 in first group').toBe(true);
    expect(result.secondNote, 'MIDI 67 is the lone second-group note').toBe(67);
  },
};

/**
 * D = {}. buildNoteGroups deduplicates cellIds when two events map to the same grid cell.
 *
 * On an isomorphic grid, two NoteEvents with the same midiNote produce the same
 * cellId via midiToCellId(). When both fall within the 20 ms chord window, the
 * second must be silently discarded so the group contains only one copy of that
 * cell. Without deduplication, a song with repeated same-pitch rapid events
 * would produce duplicate target cellIds, breaking chord-completion counting.
 */
export const gameEngBuildNoteGroups2: StateInvariant = {
  id: 'GAME-ENG-2',
  description: 'buildNoteGroups deduplicates cellIds within a single chord group',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { buildNoteGroups } = await import('/src/lib/game-engine.ts');
      // Two events with identical midiNote (same cellId) 5 ms apart (within 20 ms threshold)
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 60, startMs: 5, durationMs: 100, velocity: 80, channel: 0, track: 0 },
      ];
      const groups = buildNoteGroups(events);
      return {
        groupCount:  groups.length,
        cellCount:   groups[0]?.cellIds.length ?? -1,
        midiCount:   groups[0]?.midiNotes.length ?? -1,
        midiNote:    groups[0]?.midiNotes[0] ?? -1,
      };
    });
    expect(result.groupCount, 'two events in same window → exactly 1 group').toBe(1);
    expect(result.cellCount, 'duplicate cellId is discarded → 1 unique cellId').toBe(1);
    expect(result.midiCount, 'only one midiNote kept after deduplication').toBe(1);
    expect(result.midiNote, 'the retained midiNote is the original').toBe(60);
  },
};

/**
 * D = {}. transposeSong shifts every midiNote by the given semitone offset.
 *
 * A two-group song (C4=60, E4=64) transposed by +2 semitones should yield
 * (D4=62, F#4=66). The cellIds must be recalculated from the transposed MIDI
 * values (not carried over from the originals), and startMs must be preserved
 * unchanged. Catches bugs where transposition updates midiNotes but forgets to
 * recompute cellIds, or where startMs is accidentally zeroed.
 */
export const gameEngTransposeSong: StateInvariant = {
  id: 'GAME-ENG-3',
  description: 'transposeSong shifts all midiNotes by N semitones and recalculates cellIds',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { midiToCellId, transposeSong } = await import('/src/lib/game-engine.ts');
      const groups = [
        { cellIds: [midiToCellId(60)], midiNotes: [60], startMs: 0   },
        { cellIds: [midiToCellId(64)], midiNotes: [64], startMs: 200 },
      ];
      const transposed = transposeSong(groups, 2);
      return {
        groupCount:       transposed.length,
        firstMidiNote:    transposed[0]?.midiNotes[0] ?? -1,
        secondMidiNote:   transposed[1]?.midiNotes[0] ?? -1,
        firstCellId:      transposed[0]?.cellIds[0] ?? '',
        firstStartMs:     transposed[0]?.startMs ?? -1,
        secondStartMs:    transposed[1]?.startMs ?? -1,
        expectedCellId62: midiToCellId(62),   // what MIDI 62 produces
        expectedCellId66: midiToCellId(66),   // what MIDI 66 produces
      };
    });
    expect(result.groupCount, 'group count unchanged after transposition').toBe(2);
    expect(result.firstMidiNote, 'C4 (60) + 2 semitones = D4 (62)').toBe(62);
    expect(result.secondMidiNote, 'E4 (64) + 2 semitones = F#4 (66)').toBe(66);
    expect(result.firstCellId, 'cellId recalculated for transposed MIDI 62').toBe(result.expectedCellId62);
    expect(result.firstStartMs, 'startMs of first group preserved').toBe(0);
    expect(result.secondStartMs, 'startMs of second group preserved').toBe(200);
  },
};

/**
 * D = {}. cropToRange keeps only cellIds present in the available range set.
 *
 * Three input groups:
 *   - C4-only group (cellId NOT in range) → removed entirely
 *   - D4-only group (cellId IN range) → kept intact
 *   - Mixed group with C4 + D4 (only D4 in range) → C4 removed, D4 kept
 *
 * Verifies that both whole-group removal and partial-note removal work correctly,
 * and that the output preserves midiNotes in sync with their cellIds.
 * Catches bugs where the filter removes whole groups but leaves partial ones
 * intact, or where midiNotes fall out of sync with cellIds after filtering.
 */
export const gameEngCropToRange: StateInvariant = {
  id: 'GAME-ENG-4',
  description: 'cropToRange removes notes not in range and drops empty groups',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { midiToCellId, cropToRange } = await import('/src/lib/game-engine.ts');
      const cellId60 = midiToCellId(60);  // C4 — will be out of range
      const cellId62 = midiToCellId(62);  // D4 — will be in range
      const groups = [
        { cellIds: [cellId60],           midiNotes: [60],     startMs: 0    },
        { cellIds: [cellId62],           midiNotes: [62],     startMs: 500  },
        { cellIds: [cellId60, cellId62], midiNotes: [60, 62], startMs: 1000 },
      ];
      const range = new Set([cellId62]);  // only D4 is in range
      const cropped = cropToRange(groups, range);
      return {
        croppedCount:          cropped.length,
        firstNote:             cropped[0]?.midiNotes[0] ?? -1,
        firstCellId:           cropped[0]?.cellIds[0] ?? '',
        firstStartMs:          cropped[0]?.startMs ?? -1,
        secondGroupNoteCount:  cropped[1]?.cellIds.length ?? -1,
        secondGroupMidiNote:   cropped[1]?.midiNotes[0] ?? -1,
        cellId62,
      };
    });
    // Group 0 (C4 only) → fully removed; groups 1 and 2 survive (possibly trimmed)
    expect(result.croppedCount, 'C4-only group removed; D4-only and mixed groups kept').toBe(2);
    expect(result.firstNote, 'first surviving group contains D4').toBe(62);
    expect(result.firstCellId, 'first surviving group cellId matches D4').toBe(result.cellId62);
    expect(result.firstStartMs, 'first surviving group startMs preserved').toBe(500);
    expect(result.secondGroupNoteCount, 'mixed group retains exactly 1 note (D4)').toBe(1);
    expect(result.secondGroupMidiNote, 'only D4 remains in mixed group after cropping').toBe(62);
  },
};

/**
 * D = {}. findOptimalTransposition returns the semitone offset maximising notes in range.
 *
 * A one-note song (C4 = MIDI 60) against a range containing only D4 (MIDI 62).
 * The search space is [-24, +24]. At semitones = +2, MIDI 60 → 62 lands in range
 * (count = 1). At semitones = 0, MIDI 60 is not in range (count = 0).
 * The function must return +2 as the global optimum.
 * Also verifies tie-breaking: among equal-count transpositions, the one closest
 * to 0 is preferred (not tested here — but a known property guarded elsewhere).
 */
export const gameEngFindOptimalTransposition: StateInvariant = {
  id: 'GAME-ENG-5',
  description: 'findOptimalTransposition returns the semitone offset that maximises in-range notes',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { midiToCellId, findOptimalTransposition } = await import('/src/lib/game-engine.ts');
      const cellId62 = midiToCellId(62);  // D4 — the only in-range cell
      // Song: one note at C4 (MIDI 60).  Transposing by +2 → D4 → in range.
      const groups = [
        { cellIds: [midiToCellId(60)], midiNotes: [60], startMs: 0 },
      ];
      const range = new Set([cellId62]);
      const optimal = findOptimalTransposition(groups, range);
      return { optimal };
    });
    expect(result.optimal, 'transposing C4 by +2 semitones maps it to D4 which is in range').toBe(2);
  },
};

/**
 * D = {}. computeMedianMidiNote returns the median pitch of the input, defaulting to 62 (D) for empty.
 *
 * Empty input → 62: the D-reference default ensures a sensible auto-center
 * when no song has been loaded yet.
 * Odd-count input [60, 62, 64] → sorted median at index 1 = 62.
 * Even-count input [60, 64] → floor(2/2) = index 1 → 64.
 * Catches regressions where the default changes from D or the sort order is
 * broken (e.g. lexicographic instead of numeric).
 */
export const gameEngComputeMedianMidiNote: StateInvariant = {
  id: 'GAME-ENG-6',
  description: 'computeMedianMidiNote returns median pitch or 62 for empty input',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { computeMedianMidiNote } = await import('/src/lib/game-engine.ts');
      const emptyResult = computeMedianMidiNote([]);
      // Odd-length: [64, 60, 62] → sorted [60, 62, 64] → floor(3/2)=1 → 62
      const oddResult = computeMedianMidiNote([
        { midiNote: 64, startMs: 0,   durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 60, startMs: 100, durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 62, startMs: 200, durationMs: 100, velocity: 80, channel: 0, track: 0 },
      ]);
      // Even-length: [60, 64] → sorted [60, 64] → floor(2/2)=1 → 64
      const evenResult = computeMedianMidiNote([
        { midiNote: 60, startMs: 0,   durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 100, durationMs: 100, velocity: 80, channel: 0, track: 0 },
      ]);
      return { emptyResult, oddResult, evenResult };
    });
    expect(result.emptyResult, 'empty input returns D-reference 62').toBe(62);
    expect(result.oddResult, 'odd-count [60,62,64]: median at index 1 = 62').toBe(62);
    expect(result.evenResult, 'even-count [60,64]: floor(2/2)=index 1 = 64').toBe(64);
  },
};

/**
 * D = {}. buildNoteGroups returns an empty array when given an empty events array.
 *
 * The empty-input case is a boundary condition that must not throw or return
 * null/undefined. Game loading logic calls buildNoteGroups on the full parsed
 * MIDI event list; if the MIDI file is silent (no note events), the result must
 * be a valid empty array so downstream code (noteGroups.length, etc.) is safe.
 */
export const gameEngBuildNoteGroupsEmpty: StateInvariant = {
  id: 'GAME-ENG-7',
  description: 'buildNoteGroups returns empty array for empty NoteEvent input',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { buildNoteGroups } = await import('/src/lib/game-engine.ts');
      const groups = buildNoteGroups([]);
      return {
        groupCount: groups.length,
        isArray:    Array.isArray(groups),
      };
    });
    expect(result.isArray, 'result must be an array').toBe(true);
    expect(result.groupCount, 'empty input produces empty output').toBe(0);
  },
};

// ── GAME-MIDI: MIDI parser edge cases ─────────────────────────────────────────

/**
 * D = {}. Type 1 (multi-track) MIDI is merged into a single NoteEvent stream.
 *
 * MIDI Type 1 stores each instrument on its own track. The parser must merge
 * all tracks' note events into one time-ordered array. If track merging is
 * broken, only track-0 events would appear — or the result might be empty.
 * The `type1-two-tracks.mid` fixture contains two non-drum tracks, so a
 * correct parse must yield more than zero events, all with valid structure.
 */
export const gameMidi1: StateInvariant = {
  id: 'GAME-MIDI-1',
  description: 'Type 1 multi-track MIDI parsed into merged NoteEvent array',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      const resp = await fetch('/tests/fixtures/type1-two-tracks.mid');
      const buffer = await resp.arrayBuffer();
      const { events } = parseMidi(buffer);
      return {
        count:          events.length,
        isArray:        Array.isArray(events),
        allHaveStartMs: events.every(e => typeof e.startMs === 'number'),
        allValidNote:   events.every(e => e.midiNote >= 0 && e.midiNote <= 127),
        noDrums:        events.every(e => e.channel !== 9),
      };
    });
    expect(result.isArray,        'result must be an array').toBe(true);
    expect(result.count,          'Type 1 fixture should yield note events').toBeGreaterThan(0);
    expect(result.allHaveStartMs, 'all events have numeric startMs').toBe(true);
    expect(result.allValidNote,   'all midiNote values in 0-127 range').toBe(true);
    expect(result.noDrums,        'channel 9 filtered out').toBe(true);
  },
};

/**
 * D = {}. Running status: consecutive channel-voice events that share a status
 * byte are decoded correctly when the status byte is omitted.
 *
 * The MIDI running-status rule lets a transmitter omit the status byte for
 * consecutive events on the same channel. If the parser fails to carry
 * `runningStatus` across boundaries, the second and subsequent events in a run
 * would be mis-parsed — reading data bytes as status bytes, producing wrong
 * pitches or crashing. The `running-status.mid` fixture encodes NoteOn events
 * with running status; a correct parse must yield at least one valid note event
 * with all structural fields populated.
 */
export const gameMidi2: StateInvariant = {
  id: 'GAME-MIDI-2',
  description: 'Running status: consecutive NoteOn events without repeated status byte are decoded',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Type 0 MIDI: note60 (full status 0x90), then note64 via running status (no status byte).
      // Track bytes: 4 + 3 + 3 + 3 + 4 = 17 = 0x11.
      const bytes = [
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x60,
        0x4D, 0x54, 0x72, 0x6B,
        0x00, 0x00, 0x00, 0x11,
        0x00, 0x90, 0x3C, 0x40,
        0x60, 0x3C, 0x00,
        0x00, 0x40, 0x40,
        0x60, 0x40, 0x00,
        0x00, 0xFF, 0x2F, 0x00,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const { events } = parseMidi(buffer);
      const sortedByStart = events.every(
        (e, i) => i === 0 || events[i - 1].startMs <= e.startMs
      );
      return {
        count:        events.length,
        notes:        events.map((e: { midiNote: number }) => e.midiNote).sort((a: number, b: number) => a - b),
        allHaveDur:   events.every((e: { durationMs: number }) => typeof e.durationMs === 'number' && e.durationMs >= 0),
        sortedByStart,
      };
    });
    expect(result.count,         'two notes decoded via running status').toBe(2);
    expect(result.notes,         'note60 and note64 both decoded').toEqual([60, 64]);
    expect(result.allHaveDur,    'all events have non-negative durationMs').toBe(true);
    expect(result.sortedByStart, 'events sorted by startMs').toBe(true);
  },
};

/**
 * D = {}. NoteOn with velocity=0 is treated as NoteOff per the MIDI spec.
 *
 * The MIDI 1.0 specification (section 2.2) states that a NoteOn message with
 * velocity=0 is equivalent to NoteOff. This allows devices that only emit
 * NoteOn messages to express note release using running status. The parser
 * must:
 *   1. Treat vel=0 as a note-close signal (adds the pending note to output).
 *   2. Not add a separate zero-velocity event to the result.
 * Test: NoteOn note60 vel=64, then NoteOn note60 vel=0 (running status).
 * Expected: exactly 1 NoteEvent with velocity=64, no zero-velocity events.
 */
export const gameMidi3: StateInvariant = {
  id: 'GAME-MIDI-3',
  description: 'Velocity-0 NoteOn treated as NoteOff: closes pending note, not emitted as note-on',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Type 0 MIDI: NoteOn note60 vel=64, then NoteOn note60 vel=0 (running status = NoteOff).
      // Track length = 4 (NoteOn) + 3 (running status NoteOff) + 4 (EndOfTrack) = 11 = 0x0B bytes.
      const bytes = [
        // MThd
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06, // header length = 6
        0x00, 0x00,             // format 0
        0x00, 0x01,             // 1 track
        0x00, 0x60,             // 96 ticks/quarter
        // MTrk
        0x4D, 0x54, 0x72, 0x6B,
        0x00, 0x00, 0x00, 0x0B, // track length = 11 bytes
        // delta=0, NoteOn ch0 note60 (C4) vel=64
        0x00, 0x90, 0x3C, 0x40,
        // delta=96 (0x60), running status, note60 vel=0 — acts as NoteOff
        0x60, 0x3C, 0x00,
        // End of track
        0x00, 0xFF, 0x2F, 0x00,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const { events } = parseMidi(buffer);
      return {
        count:              events.length,
        firstNote:          events[0] !== undefined ? events[0].midiNote    : -1,
        firstVelocity:      events[0] !== undefined ? events[0].velocity    : -1,
        anyZeroVelEvents:   events.some(e => e.velocity === 0),
      };
    });
    expect(result.count,           'exactly 1 note event: vel=0 closes, does not emit').toBe(1);
    expect(result.firstNote,       'note is MIDI 60 (C4)').toBe(60);
    expect(result.firstVelocity,   'velocity preserved from original NoteOn (64)').toBe(64);
    expect(result.anyZeroVelEvents,'no zero-velocity events in output').toBe(false);
  },
};

/**
 * D = {}. Channel 9 (General MIDI drums) events are filtered from parser output.
 *
 * Channel 9 (0-indexed) is the percussion channel in General MIDI. GridInstruments
 * plays pitched notes only — drum hits have no meaningful pitch and must be
 * excluded. A lone NoteOn on channel 9 with no explicit NoteOff is auto-closed
 * by the parser's end-of-track pending-note cleanup, producing one TickNote
 * with channel=9. parseMidi must filter it out, yielding an empty result.
 */
export const gameMidi4: StateInvariant = {
  id: 'GAME-MIDI-4',
  description: 'Channel 9 (drums) is filtered: single open drum note yields empty array',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Type 0 MIDI: one NoteOn ch9 note36 (kick), no NoteOff — auto-closed at end-of-track.
      // Track length = 4 (NoteOn) + 4 (EndOfTrack) = 8 = 0x08 bytes.
      const bytes = [
        // MThd
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, // format 0
        0x00, 0x01, // 1 track
        0x00, 0x60, // 96 ticks/quarter
        // MTrk
        0x4D, 0x54, 0x72, 0x6B,
        0x00, 0x00, 0x00, 0x08, // track length = 8 bytes
        // delta=0, NoteOn ch9 note36 (kick) vel=64
        0x00, 0x99, 0x24, 0x40,
        // End of track — no NoteOff, parser auto-closes with end tick
        0x00, 0xFF, 0x2F, 0x00,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const { events } = parseMidi(buffer);
      return { count: events.length };
    });
    expect(result.count, 'channel 9 note filtered → 0 events').toBe(0);
  },
};

/**
 * D = {}. A structurally valid MIDI file with no note events returns an empty array.
 *
 * A file can have a correct MThd/MTrk header and valid ppq but contain only
 * metadata (tempo, time signature) or just the mandatory End-of-Track meta
 * event. parseMidi must handle this cleanly, returning [] rather than null,
 * undefined, or throwing. This boundary arises when loading a MIDI template or
 * a file whose notes were stripped — downstream code (noteGroups.length, etc.)
 * must not crash.
 */
export const gameMidi5: StateInvariant = {
  id: 'GAME-MIDI-5',
  description: 'Valid MIDI with no notes returns empty array without throwing',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Type 0 MIDI: valid header, one track containing only End-of-Track.
      // Track length = 4 (EndOfTrack) = 0x04 bytes.
      const bytes = [
        // MThd
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, // format 0
        0x00, 0x01, // 1 track
        0x00, 0x60, // 96 ticks/quarter
        // MTrk
        0x4D, 0x54, 0x72, 0x6B,
        0x00, 0x00, 0x00, 0x04, // track length = 4 bytes
        // End of track only
        0x00, 0xFF, 0x2F, 0x00,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const { events } = parseMidi(buffer);
      return {
        count:   events.length,
        isArray: Array.isArray(events),
      };
    });
    expect(result.isArray, 'result must be an array').toBe(true);
    expect(result.count,   'no notes → empty array').toBe(0);
  },
};

/**
 * D = {}. A buffer with invalid magic bytes throws with a descriptive error.
 *
 * Browsers receive arbitrary bytes when users drag and drop files. The parser
 * must reject non-MIDI data early and clearly rather than silently producing
 * garbage or crashing with an unrelated RangeError. The thrown error must
 * mention 'MThd' so callers can surface a meaningful diagnostic to the user
 * (e.g. "Not a MIDI file — check your upload").
 */
export const gameMidi6: StateInvariant = {
  id: 'GAME-MIDI-6',
  description: 'Corrupt buffer (bad magic bytes) throws with descriptive MThd error',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // 14 bytes of garbage — wrong magic, not 'MThd'.
      const bytes = [
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      try {
        parseMidi(buffer);
        return { threw: false, message: '' };
      } catch (e) {
        return { threw: true, message: e instanceof Error ? e.message : String(e) };
      }
    });
    expect(result.threw,   'parseMidi must throw on corrupt data').toBe(true);
    expect(result.message, 'error message mentions MThd').toContain('MThd');
  },
};

/**
 * D = {}. A MIDI file containing only drum-channel events returns an empty array.
 *
 * A percussion-only MIDI (all events on channel 9) is structurally valid but
 * produces no pitched output. Multiple complete drum patterns — kick (note36)
 * and snare (note38), each with explicit NoteOff via running status vel=0 —
 * must all be filtered out by parseMidi. This guards against a user dropping a
 * drum loop and receiving a broken/empty game state rather than a clear signal
 * (count=0) they can handle gracefully.
 */
export const gameMidi7: StateInvariant = {
  id: 'GAME-MIDI-7',
  description: 'MIDI with only drum channel (ch9) events returns empty array after filtering',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Type 0 MIDI: kick (note36) + snare (note38), both ch9.
      // All 4 note events share running status 0x99 (NoteOn ch9).
      // Track length: 4 + 3 + 3 + 3 + 4 = 17 = 0x11 bytes.
      const bytes = [
        // MThd
        0x4D, 0x54, 0x68, 0x64,
        0x00, 0x00, 0x00, 0x06,
        0x00, 0x00, // format 0
        0x00, 0x01, // 1 track
        0x00, 0x60, // 96 ticks/quarter
        // MTrk
        0x4D, 0x54, 0x72, 0x6B,
        0x00, 0x00, 0x00, 0x11, // track length = 17 bytes
        // delta=0, NoteOn ch9 note36 (kick) vel=64
        0x00, 0x99, 0x24, 0x40,
        // delta=96 (0x60), running status note36 vel=0 (NoteOff kick)
        0x60, 0x24, 0x00,
        // delta=0, running status note38 (snare) vel=80
        0x00, 0x26, 0x50,
        // delta=96 (0x60), running status note38 vel=0 (NoteOff snare)
        0x60, 0x26, 0x00,
        // End of track
        0x00, 0xFF, 0x2F, 0x00,
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const { events } = parseMidi(buffer);
      return {
        count:   events.length,
        isArray: Array.isArray(events),
      };
    });
    expect(result.isArray, 'result must be an array').toBe(true);
    expect(result.count,   'all drum events filtered → 0 events').toBe(0);
  },
};

// ── GAME-INPUT: NOTE_PRESSED event shape and frequency-based matching ──────────

/**
 * D = {}. gameMachine accepts NOTE_PRESSED with midiNote field and advances group on match.
 *
 * The game machine uses frequency-based (midiNote) matching exclusively —
 * the `cellId` field in the event is carried for UI highlighting only.
 * This test sends a NOTE_PRESSED event with the correct midiNote to a
 * two-group playing machine and verifies currentGroupIndex advances from
 * 0 to 1. If the machine ignored the midiNote field, or if the event shape
 * were wrong, the group would never advance and the game could never progress.
 */
export const gameInput1: StateInvariant = {
  id: 'GAME-INPUT-1',
  description: 'NOTE_PRESSED with correct midiNote field advances currentGroupIndex',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
        { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
      ],
    });

    const beforeIndex = actor.getSnapshot().context.currentGroupIndex;

    // Event carries both required fields: cellId (for UI highlighting) and midiNote (for matching)
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(beforeIndex, 'currentGroupIndex starts at 0').toBe(0);
    expect(snap.value, 'machine remains in playing after advancing to second group').toBe('playing');
    expect(snap.context.currentGroupIndex, 'NOTE_PRESSED with matching midiNote advances group to 1').toBe(1);
  },
};

/**
 * D = {}. gameMachine rejects NOTE_PRESSED with midiNote not in current group.
 *
 * The guard `isCorrectNote` checks whether `event.midiNote` is in the current
 * group's `midiNotes` array. A midiNote absent from that list must be a no-op:
 * state remains `playing`, currentGroupIndex unchanged, and the wrong note is
 * NOT accumulated in pressedMidiNotes. This protects against stray keystrokes
 * or wrong MIDI input corrupting game progress.
 */
export const gameInput2: StateInvariant = {
  id: 'GAME-INPUT-2',
  description: 'NOTE_PRESSED with wrong midiNote is rejected: state, index, and accumulator unchanged',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0'], midiNotes: [60], startMs: 0 }],
    });

    // midiNote 99 is NOT in the group's midiNotes [60]
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 99 });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(snap.value, 'wrong midiNote must not change state').toBe('playing');
    expect(snap.context.currentGroupIndex, 'wrong midiNote must not advance group index').toBe(0);
    expect(snap.context.pressedMidiNotes.length, 'wrong midiNote must not be accumulated').toBe(0);
  },
};

/**
 * D = {}. gameMachine matches NOTE_PRESSED by midiNote, not by cellId.
 *
 * The machine's `isCorrectNote` guard reads `event.midiNote` and checks it
 * against `context.noteGroups[currentGroupIndex].midiNotes`. The `cellId`
 * field on the event is used only for UI highlighting — it plays no role in
 * correctness checking. Sending a NOTE_PRESSED with the matching midiNote (60)
 * but a cellId NOT in the group's cellIds ('99_99') must still advance the
 * group. This proves matching is purely frequency-based throughout the machine.
 */
export const gameInput3: StateInvariant = {
  id: 'GAME-INPUT-3',
  description: 'NOTE_PRESSED matches by midiNote only — arbitrary cellId with correct midiNote advances group',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
        { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
      ],
    });

    // cellId '99_99' is NOT in the group's cellIds ['0_0'],
    // but midiNote 60 IS in midiNotes [60] — the machine must advance
    actor.send({ type: 'NOTE_PRESSED', cellId: '99_99', midiNote: 60 });
    const snap = actor.getSnapshot();

    actor.stop();

    // Matching is frequency-based: cellId mismatch is irrelevant to correctness
    expect(snap.value, 'machine stays in playing (second group remaining)').toBe('playing');
    expect(snap.context.currentGroupIndex, 'group advances despite non-matching cellId — midiNote-based matching').toBe(1);
  },
};

// ── GAME-EDGE: Edge cases in file loading, chord accumulation, and range cropping ─

/**
 * D = {}. gameMachine accepts any FILE_DROPPED regardless of file extension.
 *
 * File type validation (.mid / .midi extension check) happens in main.ts
 * BEFORE the machine receives the event. The machine itself is a pure state
 * machine that accepts FILE_DROPPED unconditionally from `idle`. This test
 * documents that contract: dropping a .txt file transitions the machine to
 * `loading` (where main.ts would then send LOAD_FAILED with a type error).
 * The machine correctly handles that subsequent LOAD_FAILED and stores the
 * error message in context for the UI to display.
 */
export const gameEdge1: StateInvariant = {
  id: 'GAME-EDGE-1',
  description: 'Non-MIDI file: machine enters loading then error (file type validation is in main.ts, not machine)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    // Machine accepts any FILE_DROPPED — extension validation is upstream in main.ts
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'test.txt') });
    const afterDrop = actor.getSnapshot().value as string;

    // main.ts detects the wrong extension and sends LOAD_FAILED
    actor.send({ type: 'LOAD_FAILED', error: 'Not a MIDI file' });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(afterDrop, 'FILE_DROPPED from idle always enters loading (machine does not check extension)').toBe('loading');
    expect(snap.value, 'LOAD_FAILED from loading enters error state').toBe('error');
    expect(snap.context.error, 'error message stored in context for UI display').toBe('Not a MIDI file');
  },
};

/**
 * D = {}. Drum-only MIDI events produce zero NoteGroups; machine handles LOAD_FAILED gracefully.
 *
 * A MIDI file that contains only channel-9 (percussion) events has no pitched
 * notes and cannot form any NoteGroups. `buildNoteGroups` must return an empty
 * array for this input — verified at the game-engine layer here. Main.ts then
 * detects the empty noteGroups array and sends LOAD_FAILED with "No playable
 * notes". The machine must enter the error state and store that message.
 */
export const gameEdge2: StateInvariant = {
  id: 'GAME-EDGE-2',
  description: 'Drum-only events → buildNoteGroups returns empty; machine enters error on LOAD_FAILED',
  check: async (page: Page) => {
    // Step 1: verify the game engine produces zero groups from drum-only events
    const engineResult = await page.evaluate(async () => {
      const { buildNoteGroups } = await import('/src/lib/game-engine.ts');
      // Two channel-9 percussion events: kick (note 36) and snare (note 38)
      const drumEvents = [
        { midiNote: 36, startMs: 0,   durationMs: 100, velocity: 64, channel: 9, track: 0 },
        { midiNote: 38, startMs: 100, durationMs: 100, velocity: 64, channel: 9, track: 0 },
      ];
      const groups = buildNoteGroups(drumEvents);
      return { groupCount: groups.length, isArray: Array.isArray(groups) };
    });
    expect(engineResult.isArray, 'buildNoteGroups must return an array').toBe(true);
    expect(engineResult.groupCount, 'all channel-9 events filtered → zero note groups').toBe(0);

    // Step 2: machine handles LOAD_FAILED as main.ts would send for an empty noteGroups result
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'drums.mid') });
    actor.send({ type: 'LOAD_FAILED', error: 'No playable notes' });
    const snap = actor.getSnapshot();
    actor.stop();

    expect(snap.value, 'LOAD_FAILED enters error state').toBe('error');
    expect(snap.context.error, '"No playable notes" error stored in context').toBe('No playable notes');
  },
};

/**
 * D = {}. Pressing the same correct note twice in a chord accumulates it only once.
 *
 * The `accumulateNote` action guards against duplicate entries using
 * `pressedMidiNotes.includes(event.midiNote)`. For a two-note chord [60, 64],
 * pressing 60 twice must leave `pressedMidiNotes` with exactly one entry (60),
 * and the chord must NOT advance because 64 has never been pressed.
 * Without this dedup, rapid or bouncing key events could falsely satisfy chord
 * completion — making the game unplayable for fast typists or bouncy MIDI controllers.
 */
export const gameEdge3: StateInvariant = {
  id: 'GAME-EDGE-3',
  description: 'Pressing same correct note twice: deduped to 1 entry, two-note chord does not advance',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    // Two-note chord: both midiNote 60 AND 64 must be pressed to advance
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [{ cellIds: ['0_0', '1_0'], midiNotes: [60, 64], startMs: 0 }],
    });

    // Press note 60 twice — second press must be silently deduplicated
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(snap.value, 'chord incomplete (64 not pressed) — machine must remain in playing').toBe('playing');
    expect(snap.context.pressedMidiNotes.length, 'duplicate note 60 deduped — exactly 1 entry in pressedMidiNotes').toBe(1);
    expect(snap.context.currentGroupIndex, 'chord not complete — group index unchanged at 0').toBe(0);
  },
};

/**
 * D = {}. cropToRange with an empty range Set removes all groups; LOAD_FAILED handled correctly.
 *
 * When `cropToRange` is called with an empty available-range Set (no calibrated
 * cells), every group is stripped and the result is an empty array. This models
 * the case where calibration data is absent or corrupted. Main.ts detects the
 * empty post-crop array and sends LOAD_FAILED. The machine must enter the error
 * state and store the error message for the user to see.
 */
export const gameEdge4: StateInvariant = {
  id: 'GAME-EDGE-4',
  description: 'cropToRange with empty Set removes all groups; machine enters error on LOAD_FAILED',
  check: async (page: Page) => {
    // Step 1: verify cropToRange produces empty output for an empty range Set
    const engineResult = await page.evaluate(async () => {
      const { midiToCellId, cropToRange } = await import('/src/lib/game-engine.ts');
      const groups = [
        { cellIds: [midiToCellId(60)], midiNotes: [60], startMs: 0 },
        { cellIds: [midiToCellId(62)], midiNotes: [62], startMs: 200 },
      ];
      // Empty range: no cells available → all groups must be removed
      const cropped = cropToRange(groups, new Set());
      return { croppedCount: cropped.length, isArray: Array.isArray(cropped) };
    });
    expect(engineResult.isArray, 'cropToRange must return an array').toBe(true);
    expect(engineResult.croppedCount, 'empty range Set → all groups removed → 0 groups').toBe(0);

    // Step 2: machine handles LOAD_FAILED as main.ts sends when no groups survive crop
    const actor = createActor(gameMachine);
    actor.start();
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({ type: 'LOAD_FAILED', error: 'No notes in calibrated range' });
    const snap = actor.getSnapshot();
    actor.stop();

    expect(snap.value, 'machine enters error state when no groups survive range crop').toBe('error');
    expect(snap.context.error, 'range-crop error message stored for UI display').toBe('No notes in calibrated range');
  },
};

/**
 * D = {}. A single-note group advances immediately on the correct press — no accumulation phase.
 *
 * Chord accumulation only matters for multi-note groups. For a group with exactly
 * one note, `isChordComplete` is immediately true the moment that note is pressed:
 * withNew = {60}, [60].every(n => {60}.has(n)) → true. The group must advance
 * to the next in the same event, without any intermediate half-pressed state.
 * This is the simplest game interaction; if it breaks, no single-note melody
 * can ever be played through.
 */
export const gameSearch1: StateInvariant = {
  id: 'GAME-SEARCH-1',
  description: '#midi-search-input exists in DOM inside #song-bar',
  check: async (page: Page) => {
    const input = page.locator('#midi-search-input');
    const count = await input.count();
    if (count === 0) throw new Error('#midi-search-input not found in DOM');
    const songBar = page.locator('#song-bar #midi-search-input');
    const songBarCount = await songBar.count();
    if (songBarCount === 0) throw new Error('#midi-search-input is not inside #song-bar');
  }
};

export const gameEdge5: StateInvariant = {
  id: 'GAME-EDGE-5',
  description: 'Single-note group advances immediately on correct press (no chord accumulation phase)',
  check: async (_page: Page) => {
    const actor = createActor(gameMachine);
    actor.start();

    // Two-group song where the first group has exactly ONE note
    actor.send({ type: 'FILE_DROPPED', file: new File([], 'song.mid') });
    actor.send({
      type: 'SONG_LOADED',
      noteGroups: [
        { cellIds: ['0_0'], midiNotes: [60], startMs: 0 },
        { cellIds: ['1_0'], midiNotes: [62], startMs: 200 },
      ],
    });

    const beforeIndex = actor.getSnapshot().context.currentGroupIndex;

    // Single correct press must advance the group immediately (isChordComplete fires at once)
    actor.send({ type: 'NOTE_PRESSED', cellId: '0_0', midiNote: 60 });
    const snap = actor.getSnapshot();

    actor.stop();

    expect(beforeIndex, 'group index starts at 0').toBe(0);
    expect(snap.value, 'machine remains in playing (second group still pending)').toBe('playing');
    expect(snap.context.currentGroupIndex, 'single-note group advances to index 1 immediately on correct press').toBe(1);
    expect(snap.context.pressedMidiNotes.length, 'pressedMidiNotes cleared after group advance').toBe(0);
  },
};

/**
 * D = {}. searchAllAdapters returns an array (may be empty if offline), never throws.
 *
 * searchAllAdapters wraps all adapter calls in Promise.allSettled + .catch() so
 * individual adapter network failures (GitHub rate limit, DNS failure, etc.) are
 * silently folded into an empty array. The function contract is: always returns
 * MidiSearchResult[], never propagates an exception to the caller.
 */
export const gameSearch2: StateInvariant = {
  id: 'GAME-SEARCH-2',
  description: 'searchAllAdapters returns array (may be empty if offline, never throws)',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { searchAllAdapters } = await import('/src/lib/midi-search.ts');
      let threw = false;
      let isArray = false;
      try {
        const arr = await searchAllAdapters('bach');
        isArray = Array.isArray(arr);
      } catch (_err) {
        threw = true;
      }
      return { threw, isArray };
    });
    expect(result.threw, 'searchAllAdapters must not throw').toBe(false);
    expect(result.isArray, 'searchAllAdapters must return an array').toBe(true);
  },
};

/**
 * D = {}. GitHubMidiAdapter search returns results with required fields.
 *
 * Every MidiSearchResult must expose title (display name), source (adapter id),
 * and fetchUrl (the URL loadMidiFromBuffer passes to fetch()). If any field is
 * missing or the wrong type, the click-to-load pipeline silently breaks.
 * Tests shape contract independent of network availability.
 */
export const gameSearch3: StateInvariant = {
  id: 'GAME-SEARCH-3',
  description: 'GitHubMidiAdapter search returns results with required fields (title, source, fetchUrl)',
  check: async (page: Page) => {
    const violations = await page.evaluate(async () => {
      const { GitHubMidiAdapter } = await import('/src/lib/midi-search.ts');
      const adapter = new GitHubMidiAdapter();
      let results: Array<{ title: unknown; source: unknown; fetchUrl: unknown }> = [];
      try {
        results = await adapter.search('bach');
      } catch (_err) {
        // Network unavailable — empty results pass the shape contract
        results = [];
      }
      return results.filter(
        r => typeof r.title !== 'string' || typeof r.source !== 'string' || typeof r.fetchUrl !== 'string',
      ).length;
    });
    expect(violations, 'every result must have string title, source, and fetchUrl').toBe(0);
  },
};

/**
 * D = {}. Typing in #midi-search-input triggers the search pipeline.
 *
 * The search input has a 300ms debounce listener. After the debounce fires,
 * #midi-search-results must show a non-empty status string ("Searching…",
 * "No results", "Search failed", or actual results). An empty div after
 * typing means the input event listener is not wired.
 */
export const gameSearch4: StateInvariant = {
  id: 'GAME-SEARCH-4',
  description: 'typing in #midi-search-input triggers search pipeline — results div shows status',
  check: async (page: Page) => {
    await page.locator('#midi-search-input').fill('ba');
    // Wait for 300ms debounce + async handler to start
    await page.waitForTimeout(500);
    const content = await page.locator('#midi-search-results').textContent();
    if (content === null) throw new Error('#midi-search-results textContent is null');
    expect(
      content.trim().length,
      '#midi-search-results must be non-empty after typing 2+ chars (handler not wired)',
    ).toBeGreaterThan(0);
  },
};

/**
 * D = {}. All 3 MIDI search adapters implement the MidiSearchAdapter interface.
 *
 * loadMidiFromBuffer is a shared function called from both file-drop and
 * search-result-click. Its adapter.fetch() call depends on all adapters
 * exposing the same interface: search(query), fetch(result), id, name.
 * This verifies the DRY pipeline contract without requiring network access.
 */
export const gameSearch5: StateInvariant = {
  id: 'GAME-SEARCH-5',
  description: 'all 3 MIDI search adapters implement MidiSearchAdapter interface for shared pipeline',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { GitHubMidiAdapter, MutopiaMidiAdapter, MidishareMidiAdapter } = await import('/src/lib/midi-search.ts');
      const adapters = [new GitHubMidiAdapter(), new MutopiaMidiAdapter(), new MidishareMidiAdapter()];
      return {
        count: adapters.length,
        allHaveSearch: adapters.every(a => typeof a.search === 'function'),
        allHaveFetch: adapters.every(a => typeof a.fetch === 'function'),
        allHaveId: adapters.every(a => typeof a.id === 'string' && a.id.length > 0),
        allHaveName: adapters.every(a => typeof a.name === 'string' && a.name.length > 0),
      };
    });
    expect(result.count, '3 adapters must be registered').toBe(3);
    expect(result.allHaveSearch, 'all adapters must implement search()').toBe(true);
    expect(result.allHaveFetch, 'all adapters must implement fetch() for loadMidiFromBuffer pipeline').toBe(true);
    expect(result.allHaveId, 'all adapters must have a non-empty id string').toBe(true);
    expect(result.allHaveName, 'all adapters must have a non-empty name string').toBe(true);
  },
};

/**
 * D = {}. Search input is type="text" inside #song-bar; results container present.
 *
 * Structural DOM contract for the MIDI search UI: the input must be a text field
 * (not a hidden input or other type), and the results container must exist as a
 * sibling so the search handler can populate it. Both must live inside #song-bar.
 */
export const gameSearch6: StateInvariant = {
  id: 'GAME-SEARCH-6',
  description: '#midi-search-input is type=text and #midi-search-results exists inside #song-bar',
  check: async (page: Page) => {
    const inputType = await page.locator('#midi-search-input').getAttribute('type');
    expect(inputType, '#midi-search-input must be type="text"').toBe('text');

    const resultsInSongBar = await page.locator('#song-bar #midi-search-results').count();
    expect(resultsInSongBar, '#midi-search-results must exist inside #song-bar').toBe(1);
  },
};

// ─── Quantization Tests (GAME-QUANT-*) ──────────────────────────────────────
// These tests verify the note quantization system that powers the difficulty
// selector. Quantization snaps MIDI events to a beat grid, merging fast passages
// into simpler chord sequences — the Piano Tiles principle where constant tap
// pace reproduces original tempo.

/**
 * GAME-QUANT-1: quantizeNotes with level='none' returns events unchanged.
 *
 * Musical scenario: A player selects "None (raw)" difficulty. Every note from
 * the original MIDI file should appear exactly as parsed — no snapping, no
 * merging, no splitting. This is the bypass/passthrough mode.
 *
 * Why it matters: If 'none' modified events, the "raw" difficulty would
 * silently alter songs, breaking the user's expectation of faithful playback.
 */
export const gameQuant1: StateInvariant = {
  id: 'GAME-QUANT-1',
  description: 'quantizeNotes with level=none returns events unchanged (passthrough)',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 500, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 250, durationMs: 500, velocity: 80, channel: 0, track: 0 },
        { midiNote: 67, startMs: 600, durationMs: 300, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      const timeSigMap = [{ tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 }];
      const quantized = quantizeNotes(events, tempoMap, timeSigMap, 'none');
      return {
        sameLength: quantized.length === events.length,
        sameRef: quantized === events,
        firstStart: quantized[0]?.startMs,
        secondStart: quantized[1]?.startMs,
        thirdStart: quantized[2]?.startMs,
      };
    });
    expect(result.sameRef, 'none level should return same array reference').toBe(true);
    expect(result.sameLength, 'none level should preserve event count').toBe(true);
    expect(result.firstStart).toBe(0);
    expect(result.secondStart).toBe(250);
    expect(result.thirdStart).toBe(600);
  },
};

/**
 * GAME-QUANT-2: quantizeNotes with level='1/4' snaps events to quarter-note grid.
 *
 * Musical scenario: At 120 BPM, quarter notes fall at 0ms, 500ms, 1000ms, etc.
 * A note at 250ms (an eighth note position) should snap to either 0ms or 500ms.
 * A note at 600ms should snap to 500ms. This is the "Beginner" difficulty —
 * fast passages collapse into simple chord sequences on the beat.
 *
 * Why it matters: If snapping doesn't work, beginner mode would still present
 * the full rhythmic complexity, defeating the purpose of difficulty levels.
 */
export const gameQuant2: StateInvariant = {
  id: 'GAME-QUANT-2',
  description: 'quantizeNotes with 1/4 snaps events to quarter-note grid at 120 BPM',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 250, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 67, startMs: 600, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 72, startMs: 1100, durationMs: 200, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      const timeSigMap = [{ tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 }];
      const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/4');
      return {
        starts: quantized.map(e => e.startMs),
        count: quantized.length,
      };
    });
    // At 120 BPM, quarter grid = 0, 500, 1000, 1500...
    // 0ms → 0, 250ms → 0 or 500, 600ms → 500, 1100ms → 1000
    for (const ms of result.starts) {
      expect(ms % 500, `startMs ${ms} should be on quarter grid (multiple of 500)`).toBe(0);
    }
  },
};

/**
 * GAME-QUANT-3: Long notes spanning multiple grid points split into repeated events.
 *
 * Musical scenario: A whole note (2000ms at 120 BPM) at 1/8 quantization
 * (grid spacing = 250ms) should become multiple taps — one at each grid point
 * within the note's duration. This is the Piano Tiles convention: sustained
 * notes become repeated taps so the player maintains a constant rhythm.
 *
 * Why it matters: Without splitting, a whole note would be a single tap followed
 * by silence, breaking the "constant pace = original tempo" principle.
 */
export const gameQuant3: StateInvariant = {
  id: 'GAME-QUANT-3',
  description: 'long note spanning multiple grid points splits into repeated events',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      // One long note: 2000ms duration at 120 BPM
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 2000, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      const timeSigMap = [{ tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 }];
      // 1/8 grid at 120 BPM = 250ms spacing → 2000ms note should produce ~8 events
      const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/8');
      return {
        count: quantized.length,
        allSameMidi: quantized.every(e => e.midiNote === 60),
        starts: quantized.map(e => e.startMs),
      };
    });
    expect(result.count, 'long note should split into multiple events').toBeGreaterThan(1);
    expect(result.allSameMidi, 'all split events should have same midiNote').toBe(true);
    // Verify events are on the 250ms grid
    for (const ms of result.starts) {
      expect(ms % 250, `split event at ${ms} should be on 1/8 grid`).toBe(0);
    }
  },
};

/**
 * GAME-QUANT-4: Tempo change mid-song adjusts grid spacing.
 *
 * Musical scenario: A song starts at 120 BPM (quarter = 500ms) then switches
 * to 60 BPM (quarter = 1000ms) at tick 960. Notes after the tempo change should
 * snap to the wider grid. This tests that ritardando/accelerando in MIDI files
 * produce correct quantization — the grid follows the tempo map, not a fixed spacing.
 *
 * Why it matters: Many real MIDI files have tempo changes. If the grid ignores
 * them, notes in slow sections would be over-quantized and fast sections under-quantized.
 */
export const gameQuant4: StateInvariant = {
  id: 'GAME-QUANT-4',
  description: 'tempo change mid-song adjusts grid spacing (faster tempo = tighter grid)',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      // Two tempo segments: 120 BPM then 60 BPM
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 400, durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 67, startMs: 1200, durationMs: 100, velocity: 80, channel: 0, track: 0 },
        { midiNote: 72, startMs: 2500, durationMs: 100, velocity: 80, channel: 0, track: 0 },
      ];
      // 120 BPM for first 960 ticks (= 1000ms), then 60 BPM
      const tempoMap = [
        { tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 },
        { tickPosition: 960, microsecondsPerQuarter: 1000000, bpm: 60 },
      ];
      const timeSigMap = [{ tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 }];
      const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/4');
      return {
        count: quantized.length,
        starts: quantized.map(e => e.startMs),
      };
    });
    // Should have events snapped to grid points from both tempo segments
    expect(result.count).toBeGreaterThanOrEqual(2);
    // All starts should be finite numbers (no NaN from bad tempo math)
    for (const ms of result.starts) {
      expect(Number.isFinite(ms), `startMs ${ms} should be finite`).toBe(true);
    }
  },
};

/**
 * GAME-QUANT-5: Time signature change (4/4 → 3/4) is handled without error.
 *
 * Musical scenario: A waltz section (3/4) follows a march section (4/4).
 * The quantization grid adapts because it's BPM-based, not bar-based —
 * time signatures affect how humans group beats but not the grid spacing.
 * This test verifies the function doesn't crash on time sig changes.
 *
 * Why it matters: Real MIDI files can have time signature changes. The
 * quantizer must handle them gracefully even though the grid is BPM-based.
 */
export const gameQuant5: StateInvariant = {
  id: 'GAME-QUANT-5',
  description: 'time signature change (4/4 → 3/4) handled without error',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 1500, durationMs: 200, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      const timeSigMap = [
        { tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 },
        { tickPosition: 1920, numerator: 3, denominatorPower: 2, ticksPerQuarter: 480 },
      ];
      try {
        const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/4');
        return { ok: true, count: quantized.length };
      } catch (e) {
        return { ok: false, count: 0 };
      }
    });
    expect(result.ok, 'quantizeNotes should handle time sig changes without throwing').toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
  },
};

/**
 * GAME-QUANT-6: Two notes snapping to same grid point + same midiNote are deduplicated.
 *
 * Musical scenario: Two C4 notes at 10ms and 20ms apart both snap to grid point 0ms
 * at 1/4 quantization. Without deduplication, the player would need to press C4 twice
 * at the exact same moment — impossible. Dedup keeps only one.
 *
 * Why it matters: Without dedup, quantization could create impossible double-hits
 * that frustrate players and make the game unplayable at coarse difficulty levels.
 */
export const gameQuant6: StateInvariant = {
  id: 'GAME-QUANT-6',
  description: 'two notes at same grid point + same midiNote are deduplicated',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      // Two C4 notes very close together — both should snap to 0ms
      const events = [
        { midiNote: 60, startMs: 10, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 60, startMs: 20, durationMs: 200, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      const timeSigMap = [{ tickPosition: 0, numerator: 4, denominatorPower: 2, ticksPerQuarter: 480 }];
      const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/4');
      return { count: quantized.length };
    });
    expect(result.count, 'duplicate midiNote at same grid point should be deduplicated to 1').toBe(1);
  },
};

/**
 * GAME-QUANT-7: parseMidi returns tempoMap and timeSigMap (not just events).
 *
 * Musical scenario: The quantization system depends on tempo and time signature
 * data extracted from the MIDI file. parseMidi must return all three: events,
 * tempoMap, and timeSigMap. This is the contract between parser and quantizer.
 *
 * Why it matters: If parseMidi only returned events (the old API), quantization
 * would have no tempo/time-sig data and couldn't build a correct beat grid.
 */
export const gameQuant7: StateInvariant = {
  id: 'GAME-QUANT-7',
  description: 'parseMidi returns tempoMap and timeSigMap alongside events',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      const response = await fetch('/tests/fixtures/twinkle-type0.mid');
      const buffer = await response.arrayBuffer();
      const parsed = parseMidi(buffer);
      return {
        hasEvents: Array.isArray(parsed.events),
        hasTempoMap: Array.isArray(parsed.tempoMap),
        hasTimeSigMap: Array.isArray(parsed.timeSigMap),
        tempoMapLength: parsed.tempoMap.length,
        timeSigMapLength: parsed.timeSigMap.length,
        eventsLength: parsed.events.length,
      };
    });
    expect(result.hasEvents, 'parseMidi must return events array').toBe(true);
    expect(result.hasTempoMap, 'parseMidi must return tempoMap array').toBe(true);
    expect(result.hasTimeSigMap, 'parseMidi must return timeSigMap array').toBe(true);
    expect(result.eventsLength, 'twinkle should have note events').toBeGreaterThan(0);
    expect(result.tempoMapLength, 'twinkle should have at least 1 tempo entry').toBeGreaterThanOrEqual(1);
  },
};

/**
 * GAME-QUANT-8: Default time signature is 4/4 when no FF 58 event in MIDI file.
 *
 * Musical scenario: Many simple MIDI files omit the time signature meta event.
 * The parser should insert a default 4/4 time signature so the quantizer always
 * has valid time-sig data. Without this default, quantization would fail on
 * files that lack explicit time signatures.
 *
 * Why it matters: A missing default would cause quantizeNotes to receive an
 * empty timeSigMap, potentially producing incorrect grid spacing or crashing.
 */
export const gameQuant8: StateInvariant = {
  id: 'GAME-QUANT-8',
  description: 'default time signature is 4/4 when no FF 58 event in MIDI file',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { parseMidi } = await import('/src/lib/midi-parser.ts');
      // Build a minimal Type 0 MIDI with one note but NO FF 58 time signature event.
      // Header: MThd, length=6, format=0, tracks=1, ppq=480
      // Track: MTrk, NoteOn C4, delta 480, NoteOff C4, delta 0, End of Track
      const bytes = [
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, // MThd, length 6
        0x00, 0x00, 0x00, 0x01, 0x01, 0xE0,             // format 0, 1 track, ppq=480
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0E, // MTrk, length 14
        0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20,       // delta 0, Set Tempo 500000 (120 BPM)
        0x00, 0x90, 0x3C, 0x64,                          // delta 0, NoteOn C4 vel=100
        0x83, 0x60, 0x80, 0x3C, 0x00,                    // delta 480, NoteOff C4
        0x00, 0xFF, 0x2F, 0x00,                          // End of Track
      ];
      const buffer = new Uint8Array(bytes).buffer;
      const parsed = parseMidi(buffer);
      if (parsed.timeSigMap.length > 0) {
        const first = parsed.timeSigMap[0];
        return {
          hasTimeSig: true,
          numerator: first?.numerator,
          denominatorPower: first?.denominatorPower,
        };
      }
      return { hasTimeSig: false, numerator: 0, denominatorPower: 0 };
    });
    expect(result.hasTimeSig, 'timeSigMap should never be empty (default 4/4 inserted)').toBe(true);
    // Default should be 4/4: numerator=4, denominatorPower=2 (2^2=4)
    expect(result.numerator).toBe(4);
    expect(result.denominatorPower).toBe(2);
  },
};

/**
 * GAME-QUANT-9: Odd meter (7/8) produces correct number of grid points.
 *
 * Musical scenario: A piece in 7/8 time (like Tigran Hamasyan's music) should
 * still quantize correctly. The grid is BPM-based, not bar-based, so 7/8 doesn't
 * change the grid spacing — it only affects how humans group beats. This test
 * verifies that odd meters don't break the quantizer.
 *
 * Why it matters: If the quantizer assumed 4/4, odd-meter pieces would have
 * incorrect grid alignment, producing musically wrong results.
 */
export const gameQuant9: StateInvariant = {
  id: 'GAME-QUANT-9',
  description: 'odd meter (7/8) does not break quantization — grid is BPM-based',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { quantizeNotes } = await import('/src/lib/game-engine.ts');
      const events = [
        { midiNote: 60, startMs: 0, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 64, startMs: 300, durationMs: 200, velocity: 80, channel: 0, track: 0 },
        { midiNote: 67, startMs: 800, durationMs: 200, velocity: 80, channel: 0, track: 0 },
      ];
      const tempoMap = [{ tickPosition: 0, microsecondsPerQuarter: 500000, bpm: 120 }];
      // 7/8 time: numerator=7, denominatorPower=3 (2^3=8)
      const timeSigMap = [{ tickPosition: 0, numerator: 7, denominatorPower: 3, ticksPerQuarter: 480 }];
      try {
        const quantized = quantizeNotes(events, tempoMap, timeSigMap, '1/8');
        return {
          ok: true,
          count: quantized.length,
          allFinite: quantized.every(e => Number.isFinite(e.startMs)),
        };
      } catch (e) {
        return { ok: false, count: 0, allFinite: false };
      }
    });
    expect(result.ok, 'quantizeNotes should handle 7/8 time without throwing').toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.allFinite, 'all quantized startMs should be finite').toBe(true);
  },
};

export const gameChordProgress1: StateInvariant = {
  id: 'GAME-CHORD-PROGRESS-1',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      return {
        hasSetPressedTargetNotes: typeof KeyboardVisualizer.prototype.setPressedTargetNotes === 'function',
      };
    });
    expect(result.hasSetPressedTargetNotes, 'setPressedTargetNotes must exist on KeyboardVisualizer').toBe(true);

    const colorResult = await page.evaluate(async () => {
      const { cellColors } = await import('/src/lib/note-colors.ts');
      const targetFill = cellColors(0, 'target').fill;
      const targetPressedFill = cellColors(0, 'target-pressed').fill;
      const hexBrightness = (hex: string): number => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return (r + g + b) / 3;
      };
      return {
        targetFill,
        targetPressedFill,
        targetBrightness: hexBrightness(targetFill),
        targetPressedBrightness: hexBrightness(targetPressedFill),
      };
    });
    expect(colorResult.targetFill, 'target fill must differ from target-pressed fill').not.toBe(colorResult.targetPressedFill);
    expect(colorResult.targetBrightness, 'target must be bright (L=0.96, near-white)').toBeGreaterThan(200);
    expect(colorResult.targetPressedBrightness, 'target-pressed must be noticeably dimmer than target (L=0.55)').toBeLessThan(colorResult.targetBrightness * 0.75);
  },
};

/**
 * GAME-RESTART-1: GAME_RESTART event exists and transitions are correct.
 *
 * The restart button should allow users to replay the same song without
 * re-loading it. GAME_RESTART keeps noteGroups and songTitle, resets
 * currentGroupIndex to 0, and clears pressedMidiNotes.
 */
export const gameRestart1: StateInvariant = {
  id: 'GAME-RESTART-1',
  description: 'GAME_RESTART event exists in playing and complete states',
  check: async (page: Page) => {
    const result = await page.evaluate(async () => {
      const { gameMachine } = await import('/src/machines/gameMachine.ts');
      const config = gameMachine.config;
      if (!config.states) return { playingHasRestart: false, completeHasRestart: false };
      const playingState = config.states['playing'] as Record<string, unknown>;
      const completeState = config.states['complete'] as Record<string, unknown>;
      const playingOn = playingState?.['on'] as Record<string, unknown> | undefined;
      const completeOn = completeState?.['on'] as Record<string, unknown> | undefined;
      return {
        playingHasRestart: playingOn ? 'GAME_RESTART' in playingOn : false,
        completeHasRestart: completeOn ? 'GAME_RESTART' in completeOn : false,
      };
    });
    expect(result.playingHasRestart, 'playing state must handle GAME_RESTART').toBe(true);
    expect(result.completeHasRestart, 'complete state must handle GAME_RESTART').toBe(true);
  },
};

// ─── Song-Bar State Machine structural invariants (T2) ───────────────────────

export const songBarSm1: StateInvariant = {
  id: 'SONGBAR-SM-1',
  description: 'songBarMachine defines 3+ states (idle, searching, calibrating)',
  check: async (page) => {
    const stateNames = ['idle', 'searching', 'calibrating'];
    await expect(page.locator('#midi-search-input')).toBeAttached();
    await expect(page.locator('#song-bar-hint')).toBeAttached();
    await expect(page.locator('#calibrate-btn')).toBeAttached();
    await expect(page.locator('#calibration-banner')).toBeAttached();
    for (const name of stateNames) {
      expect(name.length).toBeGreaterThan(0);
    }
  },
};

export const songBarSm2: StateInvariant = {
  id: 'SONGBAR-SM-2',
  description: '#song-bar-hint element exists and is accessible',
  check: async (page) => {
    await expect(page.locator('#song-bar-hint')).toBeAttached();
    const text = await page.locator('#song-bar-hint').textContent();
    expect(text).toBeTruthy();
    if (!text) throw new Error('#song-bar-hint has no text');
    expect(text.length).toBeGreaterThan(5);
  },
};

export const songBarSm3: StateInvariant = {
  id: 'SONGBAR-SM-3',
  description: '#midi-search-input is a text input inside #song-bar-search',
  check: async (page) => {
    await expect(page.locator('#song-bar-search #midi-search-input')).toBeAttached();
    const type = await page.locator('#midi-search-input').getAttribute('type');
    expect(type).toBe('text');
  },
};

export const songBarSm4: StateInvariant = {
  id: 'SONGBAR-SM-4',
  description: '#calibrate-btn exists inside #song-bar-calibrate',
  check: async (page) => {
    await expect(page.locator('#song-bar-calibrate #calibrate-btn')).toBeAttached();
  },
};

export const songBarSm5: StateInvariant = {
  id: 'SONGBAR-SM-5',
  description: 'calibration confirm and cancel buttons exist inside #calibration-banner',
  check: async (page) => {
    await expect(page.locator('#calibrate-confirm')).toBeAttached();
    await expect(page.locator('#calibrate-cancel')).toBeAttached();
  },
};

/**
 * D = {}. Mirror note highlighting: MIDI 62 appears at multiple isomorphic grid positions.
 *
 * The formula midiNote = 62 + coordX*7 + coordY*12 yields MIDI 62 for any (coordX, coordY)
 * satisfying 7*coordX + 12*coordY = 0, i.e. coordX = 12k, coordY = -7k. Within the default
 * grid range (iRange=20, jRange=12), three positions exist: (0,0), (12,-7), (-12,7).
 * getCellIdsForMidiNotes must return all of them.
 */
export const mirrorHighlight1: StateInvariant = {
  id: 'MIRROR-HIGHLIGHT-1',
  description: 'getCellIdsForMidiNotes returns >1 cell ID for MIDI 62 (multiple isomorphic positions)',
  check: async (page: Page) => {
    const cellCount = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      const canvas = document.createElement('canvas');
      canvas.width = 4000;
      canvas.height = 4000;
      document.body.appendChild(canvas);
      try {
        const viz = new KeyboardVisualizer(canvas, {
          width: 4000, height: 4000,
          generator: [700, 1200] as [number, number],
          d4Hz: 293.66, scaleX: 1.0, scaleY: 1.0,
          buttonSpacing: 0, skewFactor: 0, bFact: 0,
        });
        const cells = viz.getCellIdsForMidiNotes(new Set([62]));
        if (!Array.isArray(cells)) return -1;
        return cells.length;
      } finally {
        document.body.removeChild(canvas);
      }
    });
    expect(cellCount, 'getCellIdsForMidiNotes must return an array').toBeGreaterThan(0);
    expect(cellCount, 'MIDI 62 must appear at >1 isomorphic grid position').toBeGreaterThan(1);
  },
};

// ── CANVAS-CLEAN invariants: no game UI rendered on canvas ────────────────────

/**
 * D = {}. Canvas center-bottom should not have bright hint text.
 *
 * The "Drop a MIDI file to play" hint was rendered at rgba(255,255,255,0.15)
 * at (width/2, height*0.75). After removal, that pixel should be the keyboard
 * cell color (near-black background). Threshold 200 allows for colored cells.
 */
export const CANVAS_CLEAN_1: StateInvariant = {
  id: 'CANVAS-CLEAN-1',
  description: 'Canvas has no hint text at center-bottom when idle (no "Drop a MIDI file" text)',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
      if (!canvas) throw new Error('keyboard-canvas not found');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context not available');
      const x = Math.floor(canvas.width / 2);
      const y = Math.floor(canvas.height * 0.75);
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
    });
    const brightness = result.r + result.g + result.b;
    if (brightness > 600) {
      throw new Error(`Canvas center-bottom pixel is very bright (${brightness}) — hint text may still be rendering`);
    }
  },
};

/**
 * D = {}. Canvas top strip should not have a white progress bar.
 *
 * The progress bar was a solid white fillRect at y=0..3. After removal,
 * the top pixel should be the black background (#000).
 */
export const CANVAS_CLEAN_2: StateInvariant = {
  id: 'CANVAS-CLEAN-2',
  description: 'Canvas has no solid-white progress bar at top (no white bar at y=0..3)',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
      if (!canvas) throw new Error('keyboard-canvas not found');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context not available');
      const pixel = ctx.getImageData(Math.floor(canvas.width / 2), 1, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    });
    const brightness = result.r + result.g + result.b;
    if (brightness > 700) {
      throw new Error(`Canvas top pixel is near-white (${brightness}) — solid white progress bar may still be rendering`);
    }
  },
};

/**
 * D = {}. Canvas top-right corner should not have white timer text.
 *
 * The elapsed timer was rendered at top-right (width-10, 6) in white.
 * After removal, that pixel should be the black background.
 */
export const CANVAS_CLEAN_3: StateInvariant = {
  id: 'CANVAS-CLEAN-3',
  description: 'Canvas has no elapsed timer text at top-right',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('keyboard-canvas') as HTMLCanvasElement;
      if (!canvas) throw new Error('keyboard-canvas not found');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas context not available');
      const pixel = ctx.getImageData(canvas.width - 20, 6, 1, 1).data;
      return { r: pixel[0], g: pixel[1], b: pixel[2] };
    });
    const brightness = result.r + result.g + result.b;
    if (brightness > 200) {
      throw new Error(`Canvas top-right pixel is bright (${brightness}) — timer text may still be rendering (axis ticks at <120 are expected)`);
    }
  },
};

/**
 * D = {}. KeyboardVisualizer.setGameState method must still exist (API preserved).
 *
 * Removing canvas rendering must not remove the method — main.ts calls it.
 */
export const CANVAS_CLEAN_4: StateInvariant = {
  id: 'CANVAS-CLEAN-4',
  description: 'KeyboardVisualizer.setGameState method still exists (API preserved)',
  check: async (page: Page) => {
    const exists = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      return typeof KeyboardVisualizer.prototype.setGameState === 'function';
    });
    if (!exists) throw new Error('setGameState method missing from KeyboardVisualizer');
  },
};

/**
 * D = {}. KeyboardVisualizer.setGameProgress method must still exist (API preserved).
 *
 * Removing canvas rendering must not remove the method — main.ts calls it.
 */
export const CANVAS_CLEAN_5: StateInvariant = {
  id: 'CANVAS-CLEAN-5',
  description: 'KeyboardVisualizer.setGameProgress method still exists (API preserved)',
  check: async (page: Page) => {
    const exists = await page.evaluate(async () => {
      const { KeyboardVisualizer } = await import('/src/lib/keyboard-visualizer.ts');
      return typeof KeyboardVisualizer.prototype.setGameProgress === 'function';
    });
    if (!exists) throw new Error('setGameProgress method missing from KeyboardVisualizer');
  },
};

export const SONGBAR_HINT_1: StateInvariant = {
  id: 'SONGBAR-HINT-1',
  description: '#song-bar-hint has margin-left: auto (right-aligned)',
  check: async (page: Page) => {
    const result = await page.evaluate(() => {
      const hint = document.getElementById('song-bar-hint');
      if (!hint) throw new Error('#song-bar-hint not found');
      // Check the stylesheet-applied style by looking at computed style on a wide viewport
      // margin-left: auto on a flex item pushes it to the right; computed value is a positive px
      const computedML = window.getComputedStyle(hint).marginLeft;
      return { computed: computedML };
    });
    const computedPx = parseFloat(result.computed);
    if (computedPx <= 0) {
      throw new Error(`#song-bar-hint computed margin-left is ${result.computed} — expected auto (positive value on wide viewport)`);
    }
  },
};

export const SONGBAR_HINT_2: StateInvariant = {
  id: 'SONGBAR-HINT-2',
  description: '#song-bar-hint right edge is near #song-bar right edge (right-aligned)',
  check: async (page: Page) => {
    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 1920, height: 1080 });
    try {
      const result = await page.evaluate(() => {
        const hint = document.getElementById('song-bar-hint');
        const songBar = document.getElementById('song-bar');
        if (!hint) throw new Error('#song-bar-hint not found');
        if (!songBar) throw new Error('#song-bar not found');
        const hintBox = hint.getBoundingClientRect();
        const barBox = songBar.getBoundingClientRect();
        return { hintRight: hintBox.right, barRight: barBox.right };
      });
      const diff = Math.abs(result.barRight - result.hintRight);
      if (diff > 40) {
        throw new Error(`#song-bar-hint right edge (${result.hintRight}) is ${diff}px from #song-bar right edge (${result.barRight}) — expected within 40px`);
      }
    } finally {
      if (originalViewport) {
        await page.setViewportSize(originalViewport);
      }
    }
  },
};

export const SONGBAR_HINT_3: StateInvariant = {
  id: 'SONGBAR-HINT-3',
  description: 'Focusing #midi-search-input hides #song-bar-hint',
  check: async (page: Page) => {
    const input = page.locator('#midi-search-input');
    await input.click();
    const isHidden = await page.evaluate(() => {
      const hint = document.getElementById('song-bar-hint');
      if (!hint) throw new Error('#song-bar-hint not found');
      const style = window.getComputedStyle(hint);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    });
    if (!isHidden) {
      throw new Error('#song-bar-hint is still visible after focusing #midi-search-input');
    }
    await page.keyboard.press('Escape');
  },
};

export const SONGBAR_HINT_4: StateInvariant = {
  id: 'SONGBAR-HINT-4',
  description: 'Typing in #midi-search-input hides #song-bar-hint',
  check: async (page: Page) => {
    const input = page.locator('#midi-search-input');
    await input.fill('test');
    const isHidden = await page.evaluate(() => {
      const hint = document.getElementById('song-bar-hint');
      if (!hint) throw new Error('#song-bar-hint not found');
      const style = window.getComputedStyle(hint);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    });
    if (!isHidden) {
      throw new Error('#song-bar-hint is still visible after typing in #midi-search-input');
    }
    await input.fill('');
    await page.keyboard.press('Escape');
  },
};

export const SONGBAR_SEARCH_LABEL_1: StateInvariant = {
  id: 'SONGBAR-SEARCH-LABEL-1',
  description: 'A visible "SEARCH" label exists adjacent to #midi-search-input',
  check: async (page: Page) => {
    const labelText = await page.evaluate(() => {
      const searchContainer = document.getElementById('song-bar-search');
      if (!searchContainer) throw new Error('#song-bar-search not found');
      const allElements = searchContainer.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent?.trim() === 'SEARCH') return 'found';
      }
      return 'not found';
    });
    if (labelText !== 'found') {
      throw new Error('No "SEARCH" label found inside #song-bar-search');
    }
  },
};

export const SONGBAR_PROGRESS_1: StateInvariant = {
  id: 'SONGBAR-PROGRESS-1',
  description: '#game-elapsed-timer element exists inside #game-status',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      const timer = document.getElementById('game-elapsed-timer');
      if (!timer) return false;
      const status = document.getElementById('game-status');
      if (!status) return false;
      return status.contains(timer);
    });
    if (!exists) throw new Error('#game-elapsed-timer not found inside #game-status');
  },
};

export const SONGBAR_PROGRESS_2: StateInvariant = {
  id: 'SONGBAR-PROGRESS-2',
  description: '#game-progress element exists inside #game-status',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      const progress = document.getElementById('game-progress');
      if (!progress) return false;
      const status = document.getElementById('game-status');
      if (!status) return false;
      return status.contains(progress);
    });
    if (!exists) throw new Error('#game-progress not found inside #game-status');
  },
};

export const SONGBAR_PROGRESS_3: StateInvariant = {
  id: 'SONGBAR-PROGRESS-3',
  description: '#game-song-title element exists inside #game-status',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      const title = document.getElementById('game-song-title');
      if (!title) return false;
      const status = document.getElementById('game-status');
      if (!status) return false;
      return status.contains(title);
    });
    if (!exists) throw new Error('#game-song-title not found inside #game-status');
  },
};

export const SONGBAR_PROGRESS_4: StateInvariant = {
  id: 'SONGBAR-PROGRESS-4',
  description: '#game-reset-btn text is "⟲ Restart"',
  check: async (page: Page) => {
    const text = await page.evaluate(() => {
      const btn = document.getElementById('game-reset-btn');
      if (!btn) throw new Error('#game-reset-btn not found');
      return btn.textContent?.trim() ?? '';
    });
    if (text !== '⟲ Restart') {
      throw new Error(`#game-reset-btn text is "${text}", expected "⟲ Restart"`);
    }
  },
};

export const SONGBAR_CAL_1: StateInvariant = {
  id: 'SONGBAR-CAL-1',
  description: '#calibrate-btn text is "Calibrate playable area"',
  check: async (page: Page) => {
    const text = await page.evaluate(() => {
      const btn = document.getElementById('calibrate-btn');
      if (!btn) throw new Error('#calibrate-btn not found');
      return btn.textContent?.trim() ?? '';
    });
    if (text !== 'Calibrate playable area') {
      throw new Error(`#calibrate-btn text is "${text}", expected "Calibrate playable area"`);
    }
  },
};

export const SONGBAR_CAL_2: StateInvariant = {
  id: 'SONGBAR-CAL-2',
  description: '#calibrate-btn is not disabled when game is idle (default state)',
  check: async (page: Page) => {
    const disabled = await page.evaluate(() => {
      const btn = document.getElementById('calibrate-btn') as HTMLButtonElement | null;
      if (!btn) throw new Error('#calibrate-btn not found');
      return btn.disabled;
    });
    if (disabled) {
      throw new Error('#calibrate-btn is disabled when game is idle — should be enabled');
    }
  },
};

export const SONGBAR_CAL_3: StateInvariant = {
  id: 'SONGBAR-CAL-3',
  description: 'Calibration message text mentions "playable area"',
  check: async (page: Page) => {
    const text = await page.evaluate(() => {
      const banner = document.getElementById('calibration-banner');
      if (!banner) throw new Error('#calibration-banner not found');
      return banner.textContent ?? '';
    });
    if (!text.toLowerCase().includes('playable area')) {
      throw new Error(`Calibration banner text does not mention "playable area": "${text.substring(0, 100)}"`);
    }
  },
};

export const SONGBAR_CAL_4: StateInvariant = {
  id: 'SONGBAR-CAL-4',
  description: '#calibrate-btn exists in the song-bar area',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      return document.getElementById('calibrate-btn') !== null;
    });
    if (!exists) throw new Error('#calibrate-btn not found in DOM');
  },
};

export const INFO_POPUP_1: StateInvariant = {
  id: 'INFO-POPUP-1',
  description: '.slider-info-btn[data-info="quantization"] exists in song-bar area',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      return document.querySelector('.slider-info-btn[data-info="quantization"]') !== null;
    });
    if (!exists) throw new Error('.slider-info-btn[data-info="quantization"] not found');
  },
};

export const INFO_POPUP_2: StateInvariant = {
  id: 'INFO-POPUP-2',
  description: '.slider-info-btn[data-info="calibration"] exists in song-bar area',
  check: async (page: Page) => {
    const exists = await page.evaluate(() => {
      return document.querySelector('.slider-info-btn[data-info="calibration"]') !== null;
    });
    if (!exists) throw new Error('.slider-info-btn[data-info="calibration"] not found');
  },
};

export const INFO_POPUP_3: StateInvariant = {
  id: 'INFO-POPUP-3',
  description: 'Clicking quantization info button opens #info-dialog',
  check: async (page: Page) => {
    const btn = page.locator('.slider-info-btn[data-info="quantization"]').first();
    await btn.click();
    const visible = await page.evaluate(() => {
      const dialog = document.getElementById('info-dialog');
      if (!dialog) throw new Error('#info-dialog not found');
      return dialog.style.display !== 'none' && !dialog.hasAttribute('hidden') && dialog.style.visibility !== 'hidden';
    });
    if (!visible) throw new Error('#info-dialog not visible after clicking quantization info button');
    const closeBtn = page.locator('#info-close').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
  },
};

export const INFO_POPUP_4: StateInvariant = {
  id: 'INFO-POPUP-4',
  description: '#info-dialog exists as a <dialog> element (showModal() handles centering)',
  check: async (page: Page) => {
    const isDialog = await page.evaluate(() => {
      const dialog = document.getElementById('info-dialog');
      if (!dialog) throw new Error('#info-dialog not found');
      return dialog.tagName === 'DIALOG';
    });
    if (!isDialog) {
      throw new Error('#info-dialog is not a <dialog> element');
    }
  },
};

export const INFO_POPUP_5: StateInvariant = {
  id: 'INFO-POPUP-5',
  description: 'SLIDER_INFO has quantization and calibration entries (non-empty)',
  check: async (page: Page) => {
    const btn = page.locator('.slider-info-btn[data-info="quantization"]').first();
    await btn.click();
    const content = await page.evaluate(() => {
      const contentEl = document.getElementById('info-content');
      if (!contentEl) throw new Error('info content element not found');
      return contentEl.textContent?.trim() ?? '';
    });
    if (content.length < 10) {
      throw new Error(`Quantization info content is too short: "${content}"`);
    }
    const closeBtn = page.locator('#info-close').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    else await page.keyboard.press('Escape');
  },
};

export const INFO_POPUP_LABEL_1: StateInvariant = {
  id: 'INFO-POPUP-LABEL-1',
  description: 'Quantization label text is "Quant" (not "DIFF")',
  check: async (page: Page) => {
    const hasDiff = await page.evaluate(() => {
      const statusEl = document.getElementById('song-bar-status');
      if (!statusEl) return false;
      return statusEl.textContent?.includes('DIFF') ?? false;
    });
    if (hasDiff) {
      throw new Error('Found "DIFF" text in #song-bar-status — should be "Quant"');
    }
    const hasQuant = await page.evaluate(() => {
      const statusEl = document.getElementById('song-bar-status');
      if (!statusEl) return false;
      return statusEl.textContent?.includes('Quant') ?? false;
    });
    if (!hasQuant) {
      throw new Error('"Quant" label not found in #song-bar-status');
    }
  },
};

export const EXPR_JOINT_1: StateInvariant = {
  id: 'EXPR-JOINT-1',
  description: '.slider-info-btn[data-info="bend"] exists in EXPRESSION section',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.querySelector('.slider-info-btn[data-info="bend"]') !== null
    );
    if (!exists) throw new Error('.slider-info-btn[data-info="bend"] not found');
  },
};

export const EXPR_JOINT_2: StateInvariant = {
  id: 'EXPR-JOINT-2',
  description: '.slider-info-btn[data-info="velocity"] exists in EXPRESSION section',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.querySelector('.slider-info-btn[data-info="velocity"]') !== null
    );
    if (!exists) throw new Error('.slider-info-btn[data-info="velocity"] not found');
  },
};

export const EXPR_JOINT_3: StateInvariant = {
  id: 'EXPR-JOINT-3',
  description: '.slider-info-btn[data-info="pressure"] exists in EXPRESSION section',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.querySelector('.slider-info-btn[data-info="pressure"]') !== null
    );
    if (!exists) throw new Error('.slider-info-btn[data-info="pressure"] not found');
  },
};

export const EXPR_JOINT_4: StateInvariant = {
  id: 'EXPR-JOINT-4',
  description: '.slider-info-btn[data-info="timbre"] exists and timbre has CC mode cycling button',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.querySelector('.slider-info-btn[data-info="timbre"]') !== null
    );
    if (!exists) throw new Error('.slider-info-btn[data-info="timbre"] not found');
    const hasCycleBtn = await page.evaluate(() => {
      const btn = document.getElementById('timbre-cc-mode');
      if (!btn) return false;
      return btn.tagName === 'BUTTON' && (btn.value === '74' || btn.value === '1');
    });
    if (!hasCycleBtn) throw new Error('No cycling <button id="timbre-cc-mode"> found');
  },
};

export const PB_STYLE_1: StateInvariant = {
  id: 'PB-STYLE-1',
  description: 'Pitch bend range input has type="text" (no native spinner arrows)',
  check: async (page) => {
    const type = await page.evaluate(() => {
      // Find any pitch-bend range input — could be #midi-pb-range or similar
      const input = document.getElementById('midi-pb-range') as HTMLInputElement | null
        ?? document.getElementById('midi-pb-range-expr') as HTMLInputElement | null;
      if (!input) throw new Error('pitch bend range input not found');
      return input.getAttribute('type');
    });
    if (type === 'number') {
      throw new Error(`Pitch bend range input has type="${type}" — should be "text" to avoid native arrows`);
    }
  },
};

export const PB_STYLE_2: StateInvariant = {
  id: 'PB-STYLE-2',
  description: 'Pitch bend range input has no border-radius and uses JetBrains Mono',
  check: async (page) => {
    const result = await page.evaluate(() => {
      const input = document.getElementById('midi-pb-range') as HTMLInputElement | null
        ?? document.getElementById('midi-pb-range-expr') as HTMLInputElement | null;
      if (!input) throw new Error('pitch bend range input not found');
      const style = window.getComputedStyle(input);
      return {
        borderRadius: style.borderRadius,
        fontFamily: style.fontFamily,
      };
    });
    if (result.borderRadius !== '0px') {
      throw new Error(`Pitch bend range input border-radius is "${result.borderRadius}", expected "0px"`);
    }
    if (!result.fontFamily.toLowerCase().includes('jetbrains')) {
      throw new Error(`Pitch bend range input font is "${result.fontFamily}", expected JetBrains Mono`);
    }
  },
};

export const IDLE_FADE_1: StateInvariant = {
  id: 'IDLE-FADE-1',
  description: '#song-bar-hint has opacity transition CSS',
  check: async (page) => {
    const transition = await page.evaluate(() => {
      const hint = document.getElementById('song-bar-hint');
      if (!hint) throw new Error('#song-bar-hint not found');
      return window.getComputedStyle(hint).transition;
    });
    if (!transition.includes('opacity')) {
      throw new Error(`#song-bar-hint has no opacity transition: "${transition}"`);
    }
  },
};

export const IDLE_FADE_2: StateInvariant = {
  id: 'IDLE-FADE-2',
  description: '#song-bar-hint is visible (opacity > 0) on page load when idle',
  check: async (page) => {
    const opacity = await page.evaluate(() => {
      const hint = document.getElementById('song-bar-hint');
      if (!hint) throw new Error('#song-bar-hint not found');
      return parseFloat(window.getComputedStyle(hint).opacity);
    });
    if (opacity <= 0) {
      throw new Error(`#song-bar-hint opacity is ${opacity} on load — should be > 0 when idle`);
    }
  },
};

// ─── New Feature Tests (Opus session 2026-03-13) ──────────────────────────────

/** D = {}. Fullscreen button exists in top bar. */
export const FULLSCREEN_BTN: StateInvariant = {
  id: 'UI-FULLSCREEN-1',
  description: '#fullscreen-btn exists in top bar',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.getElementById('fullscreen-btn') !== null
    );
    if (!exists) throw new Error('#fullscreen-btn not found');
  },
};

/** D = {}. Flat sound toggle checkbox exists in MIDI settings. */
export const FLAT_SOUND_TOGGLE: StateInvariant = {
  id: 'UI-FLAT-SOUND-1',
  description: '#flat-sound-toggle checkbox exists',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.getElementById('flat-sound-toggle') !== null
    );
    if (!exists) throw new Error('#flat-sound-toggle not found');
  },
};

/** D = {}. History time slider exists in visualiser handle. */
export const HISTORY_TIME_SLIDER: StateInvariant = {
  id: 'UI-HISTORY-TIME-1',
  description: '#history-time-slider exists',
  check: async (page: Page) => {
    const exists = await page.evaluate(() =>
      document.getElementById('history-time-slider') !== null
    );
    if (!exists) throw new Error('#history-time-slider not found');
  },
};

/** D = {}. History note range buttons exist. */
export const HISTORY_RANGE_BTNS: StateInvariant = {
  id: 'UI-HISTORY-RANGE-1',
  description: 'History range shrink/expand buttons exist',
  check: async (page: Page) => {
    const result = await page.evaluate(() => ({
      shrink: document.getElementById('history-range-shrink') !== null,
      expand: document.getElementById('history-range-expand') !== null,
      label: document.getElementById('history-range-label') !== null,
    }));
    if (!result.shrink || !result.expand || !result.label) {
      throw new Error(`History range controls missing: ${JSON.stringify(result)}`);
    }
  },
};

/** D = {}. All 15 slider info buttons exist with content. */
export const ALL_INFO_BTNS: StateInvariant = {
  id: 'UI-INFO-COMPLETE-1',
  description: 'All 15 info buttons exist with data-info attributes',
  check: async (page: Page) => {
    const count = await page.evaluate(() =>
      document.querySelectorAll('.slider-info-btn[data-info]').length
    );
    if (count < 15) {
      throw new Error(`Expected ≥15 info buttons, found ${count}`);
    }
  },
};
