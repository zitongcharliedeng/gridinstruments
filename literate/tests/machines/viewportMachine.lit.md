# Viewport Machine

XState machine modeling responsive viewport states — desktop 1280, tablet 768, mobile 390, and mobile 375 — with canvas resize and overflow invariants.

``` {.typescript file=_generated/tests/machines/viewportMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

const canvasValidAfterResize: StateInvariant = {
  id: 'ISS-13-1',
  check: async (page: Page) => {
    const canvas = page.locator('#keyboard-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('#keyboard-canvas not visible');
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(50);
  },
};

const noHorizontalOverflow: StateInvariant = {
  id: 'BH-MOB-3',
  check: async (page: Page) => {
    const noOverflow = await page.evaluate(() =>
      document.body.scrollWidth <= window.innerWidth
    );
    expect(noOverflow).toBe(true);
  },
};

const tabletAllVisible: StateInvariant = {
  id: 'BH-MOB-4',
  check: async (page: Page) => {
    await expect(page.locator('.site-title')).toBeVisible();
    await expect(page.locator('#about-btn')).toBeVisible();
    await expect(page.locator('.gh-actions')).toBeVisible();
    await expect(page.locator('#grid-settings-btn')).toBeVisible();
  },
};

const mobileCanvasFillsWidth: StateInvariant = {
  id: 'BH-MOB-1',
  check: async (page: Page) => {
    const overlayHidden = await page.evaluate(() => {
      const el = document.getElementById('grid-overlay');
      if (!el) throw new Error('#grid-overlay not found');
      return el.classList.contains('hidden');
    });
    expect(overlayHidden).toBe(true);
    const canvasWidth = await page.evaluate(() => {
      const el = document.getElementById('keyboard-canvas');
      if (!el) throw new Error('#keyboard-canvas not found');
      return el.getBoundingClientRect().width;
    });
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('viewport not available');
    const vpWidth = viewport.width;
    expect(canvasWidth).toBeGreaterThanOrEqual(vpWidth - 10);
  },
};

type ViewportEvent =
  | { type: 'SET_VIEWPORT_375' }
  | { type: 'SET_VIEWPORT_390' }
  | { type: 'SET_VIEWPORT_768' }
  | { type: 'SET_VIEWPORT_1280' };

export const viewportMachine = setup({
  types: { events: {} as ViewportEvent },
}).createMachine({
  id: 'viewport',
  initial: 'desktop_1280',
  states: {
    desktop_1280: {
      meta: {
        reason: 'Standard desktop viewport — all UI elements visible.',
        designIntent: 'Full desktop experience with all navigation and controls',
        invariants: [canvasValidAfterResize] as StateInvariant[],
      },
      on: {
        SET_VIEWPORT_375: 'mobile_375',
        SET_VIEWPORT_390: 'mobile_390',
        SET_VIEWPORT_768: 'tablet_768',
      },
    },
    tablet_768: {
      meta: {
        reason: 'Tablet viewport — all UI elements including GitHub actions visible.',
        designIntent: 'Tablet users get full desktop-like experience',
        invariants: [canvasValidAfterResize, tabletAllVisible] as StateInvariant[],
      },
      on: {
        SET_VIEWPORT_375: 'mobile_375',
        SET_VIEWPORT_390: 'mobile_390',
        SET_VIEWPORT_1280: 'desktop_1280',
      },
    },
    mobile_390: {
      meta: {
        reason: 'Mobile 390px viewport — overlay hidden, canvas fills width.',
        designIntent: 'Mobile users get maximum playable grid area',
        invariants: [canvasValidAfterResize, mobileCanvasFillsWidth] as StateInvariant[],
      },
      on: {
        SET_VIEWPORT_375: 'mobile_375',
        SET_VIEWPORT_768: 'tablet_768',
        SET_VIEWPORT_1280: 'desktop_1280',
      },
    },
    mobile_375: {
      meta: {
        reason: 'Smallest common phone viewport — essential UI visible, no overflow.',
        designIntent: 'Small phone users can access info button, title, and settings',
        invariants: [canvasValidAfterResize, noHorizontalOverflow] as StateInvariant[],
      },
      on: {
        SET_VIEWPORT_390: 'mobile_390',
        SET_VIEWPORT_768: 'tablet_768',
        SET_VIEWPORT_1280: 'desktop_1280',
      },
    },
  },
});

export const viewportPlaywrightActions: Record<ViewportEvent['type'], (page: Page) => Promise<void>> = {
  SET_VIEWPORT_375: async (page) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
  },
  SET_VIEWPORT_390: async (page) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
  },
  SET_VIEWPORT_768: async (page) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
  },
  SET_VIEWPORT_1280: async (page) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
  },
};

export const viewportInvariants: Record<string, string> = {
  desktop_1280: 'Standard desktop viewport — all UI elements visible.',
  tablet_768: 'Tablet viewport — all UI elements including GitHub actions visible.',
  mobile_390: 'Mobile 390px viewport — overlay hidden, canvas fills width.',
  mobile_375: 'Smallest phone viewport — essential UI visible, no horizontal overflow.',
};

export const viewportDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  desktop_1280: async (page) => {
    await expect(page.locator('.site-title')).toBeVisible();
    await expect(page.locator('#grid-settings-btn')).toBeVisible();
    const canvas = page.locator('#keyboard-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('#keyboard-canvas not visible');
    expect(box.width).toBeGreaterThan(500);
  },
  tablet_768: async (page) => {
    await expect(page.locator('.site-title')).toBeVisible();
    await expect(page.locator('#grid-settings-btn')).toBeVisible();
  },
  mobile_390: async (page) => {
    await expect(page.locator('#grid-settings-btn')).toBeVisible();
    const canvas = page.locator('#keyboard-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('#keyboard-canvas not visible');
    expect(box.width).toBeGreaterThanOrEqual(380);
  },
  mobile_375: async (page) => {
    await expect(page.locator('.site-title')).toBeVisible();
    await expect(page.locator('#about-btn')).toBeVisible();
    await expect(page.locator('#grid-settings-btn')).toBeVisible();
  },
};
```
