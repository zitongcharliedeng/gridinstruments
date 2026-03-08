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
      expect(title, `${sel} missing title`).toBeTruthy();
      expect(title!.length, `${sel} empty title`).toBeGreaterThan(0);
    }
  },
};

/** D = {visualiser}. Truth changes at default height. Wire: visualiser.default */
export const visHandlePosition: StateInvariant = {
  id: 'PNL-VIS-4',
  check: async (page: Page) => {
    const panelBox = await page.locator('#visualiser-panel').boundingBox();
    const handleBox = await page.locator('#visualiser-panel .panel-resize-handle').boundingBox();
    expect(panelBox).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const panelBottom = panelBox!.y + panelBox!.height;
    const handleTop = handleBox!.y;
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
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(50);
  },
};

/** D = {pedals}. Truth changes at default height. Wire: pedals.default */
export const pedHandlePosition: StateInvariant = {
  id: 'PNL-VIS-5',
  check: async (page: Page) => {
    const panelBox = await page.locator('#pedals-panel').boundingBox();
    const handleBox = await page.locator('#pedals-panel .panel-resize-handle').boundingBox();
    expect(panelBox).not.toBeNull();
    expect(handleBox).not.toBeNull();
    const panelTop = panelBox!.y;
    const handleBottom = handleBox!.y + handleBox!.height;
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
    expect(match, 'Background should be rgba').toBeTruthy();
    expect(parseInt(match![1])).toBeCloseTo(30, 0);
    expect(parseInt(match![2])).toBeCloseTo(30, 0);
    expect(parseInt(match![3])).toBeCloseTo(32, 0);
    if (match![4]) {
      expect(parseFloat(match![4])).toBeCloseTo(0.78, 1);
    }
  },
};

/** D = {overlay}. Shimmer animation check. Wire: overlay.visible */
export const overlayShimmerCheck: StateInvariant = {
  id: 'OV-SHIMMER-1',
  check: async (page: Page) => {
    const animDuration = await page.evaluate(() =>
      getComputedStyle(
        document.querySelector('#grid-overlay')!, '::before'
      ).animationDuration
    );
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

/** D = {visualiser}. 60% viewport cap on expanded. Wire: visualiser.expanded */
export const visCap60Check: StateInvariant = {
  id: 'PNL-DRAG-4',
  check: async (page: Page) => {
    const panelH = (await page.locator('#visualiser-panel').boundingBox())!.height;
    const viewportH = page.viewportSize()!.height;
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
        (el) => (el as HTMLElement).style.background
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
        (el) => (el as HTMLElement).style.background
      );
      expect(bg).toContain('linear-gradient');
    },
  };
}

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
