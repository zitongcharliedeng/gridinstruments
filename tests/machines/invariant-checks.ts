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
    const handleCenterY = handleBox!.y + handleBox!.height / 2;
    expect(Math.abs(handleCenterY - panelBottom)).toBeLessThan(4);
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
    const handleCenterY = handleBox!.y + handleBox!.height / 2;
    expect(Math.abs(handleCenterY - panelTop)).toBeLessThan(4);
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
