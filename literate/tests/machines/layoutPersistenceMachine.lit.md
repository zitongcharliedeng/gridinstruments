# Layout Persistence Machine

XState machine modeling panel layout persistence — pristine, customized, reloaded, insaneRestored, and reset states with localStorage-backed height persistence.

``` {.typescript file=_generated/tests/machines/layoutPersistenceMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

const resetClearsCustomValues: StateInvariant = {
  id: 'PNL-RESET-2',
  check: async (page: Page) => {
    const state = await page.evaluate(() => ({
      zoom: localStorage.getItem('gi_zoom'),
      visH: localStorage.getItem('gi_visualiser_h'),
    }));
    expect(state.zoom).toBeNull();
    if (state.visH !== null) {
      expect(parseFloat(state.visH)).toBeLessThanOrEqual(125);
    }
  },
};

const insaneHeightDiscarded: StateInvariant = {
  id: 'PNL-LS-3',
  check: async (page: Page) => {
    const panelBox = await page.locator('#visualiser-panel').boundingBox();
    if (!panelBox) throw new Error('#visualiser-panel not visible');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('viewport not available');
    expect(panelBox.height).toBeLessThanOrEqual(viewport.height * 0.61);
  },
};

type LayoutEvent =
  | { type: 'DRAG_PANEL' }
  | { type: 'RELOAD' }
  | { type: 'SET_INSANE_LS' }
  | { type: 'CLICK_RESET' };

export const layoutPersistenceMachine = setup({
  types: { events: {} as LayoutEvent },
}).createMachine({
  id: 'layoutPersistence',
  initial: 'pristine',
  states: {
    pristine: {
      meta: {
        reason: 'Page loaded with no custom localStorage — panels at default heights.',
        designIntent: 'Factory-default layout provides consistent starting point',
      },
      on: {
        DRAG_PANEL: 'customized',
        CLICK_RESET: 'reset',
        SET_INSANE_LS: 'insaneRestored',
      },
    },
    customized: {
      meta: {
        reason: 'Panel dragged — custom height written to localStorage.',
        designIntent: 'Drag persistence saves musician layout preferences',
      },
      on: {
        RELOAD: 'reloaded',
        CLICK_RESET: 'reset',
      },
    },
    reloaded: {
      meta: {
        reason: 'Page reloaded — panel height restored from localStorage.',
        designIntent: 'Layout survives page navigation so musicians keep their setup',
      },
      on: {
        CLICK_RESET: 'reset',
      },
    },
    insaneRestored: {
      meta: {
        reason: 'Insane localStorage value (9999) was discarded on load — height capped at 60% viewport.',
        designIntent: 'Sanity guard prevents bad saved value from hiding the grid',
        invariants: [insaneHeightDiscarded] as StateInvariant[],
      },
      on: {
        CLICK_RESET: 'reset',
      },
    },
    reset: {
      meta: {
        reason: 'Reset button clicked — all gi_* keys cleared, panels at defaults.',
        designIntent: 'One-click nuclear reset restores known-good layout',
        invariants: [resetClearsCustomValues] as StateInvariant[],
      },
      on: {
        DRAG_PANEL: 'customized',
      },
    },
  },
});

async function dragVisualiserHandle(page: Page, deltaY: number): Promise<void> {
  const handle = page.locator('#visualiser-panel .panel-resize-handle');
  const box = await handle.boundingBox();
  if (!box) throw new Error('Visualiser handle not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy + deltaY, { steps: 5 });
  await page.mouse.up();
}

export const layoutPersistencePlaywrightActions: Record<LayoutEvent['type'], (page: Page) => Promise<void>> = {
  DRAG_PANEL: async (page) => {
    await dragVisualiserHandle(page, 60);
    await page.waitForTimeout(300);
  },
  RELOAD: async (page) => {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  },
  SET_INSANE_LS: async (page) => {
    await page.evaluate(() => { localStorage.setItem('gi_visualiser_h', '9999'); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  },
  CLICK_RESET: async (page) => {
    await page.locator('#reset-layout').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  },
};

export const layoutPersistenceInvariants: Record<string, string> = {
  pristine: 'Default layout — no custom localStorage, panels at factory heights.',
  customized: 'Panel dragged — custom height in localStorage.',
  reloaded: 'Page reloaded — panel height restored from localStorage.',
  insaneRestored: 'Insane localStorage value discarded — height capped at 60% viewport.',
  reset: 'Reset clicked — all gi_* keys cleared, default layout restored.',
};

export const layoutPersistenceDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  pristine: async (page) => {
    const box = await page.locator('#visualiser-panel').boundingBox();
    if (!box) throw new Error('#visualiser-panel not visible');
    expect(Math.abs(box.height - 120)).toBeLessThanOrEqual(10);
  },
  customized: async (page) => {
    const stored = await page.evaluate(() => localStorage.getItem('gi_visualiser_h'));
    if (stored === null) throw new Error('gi_visualiser_h not in localStorage');
    expect(parseFloat(stored)).toBeGreaterThan(130);
  },
  reloaded: async (page) => {
    const stored = await page.evaluate(() => localStorage.getItem('gi_visualiser_h'));
    if (stored === null) throw new Error('gi_visualiser_h not in localStorage');
    const box = await page.locator('#visualiser-panel').boundingBox();
    if (!box) throw new Error('#visualiser-panel not visible');
    expect(Math.abs(box.height - parseFloat(stored))).toBeLessThanOrEqual(10);
  },
  insaneRestored: async (page) => {
    const box = await page.locator('#visualiser-panel').boundingBox();
    if (!box) throw new Error('#visualiser-panel not visible');
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('viewport not available');
    expect(box.height).toBeLessThanOrEqual(viewport.height * 0.61);
  },
  reset: async (page) => {
    const box = await page.locator('#visualiser-panel').boundingBox();
    if (!box) throw new Error('#visualiser-panel not visible');
    expect(Math.abs(box.height - 120)).toBeLessThanOrEqual(10);
  },
};
```
