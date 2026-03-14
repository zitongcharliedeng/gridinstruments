# Modifier Compound Machine

XState machine modeling compound modifier key states — idle, vibratoOnly, sustainOnly, and bothActive — with focus return and Ctrl passthrough invariants.

``` {.typescript file=_generated/tests/machines/modifierCompoundMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

const ctrlPassthroughCheck: StateInvariant = {
  id: 'BH-CTRL-PASSTHROUGH-1',
  check: async (page: Page) => {
    await page.keyboard.down('Control');
    await page.keyboard.press('q');
    await page.waitForTimeout(100);
    await expect(page.locator('#vibrato-indicator')).not.toHaveClass(/active/);
    await expect(page.locator('#sustain-indicator')).not.toHaveClass(/active/);
    await page.keyboard.up('Control');
  },
};

export const focusReturnCheck: StateInvariant = {
  id: 'BH-FOCUS-RETURN-1',
  check: async (page: Page) => {
    await page.locator('#keyboard-container').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
    await expect(page.locator('#vibrato-indicator')).toHaveClass(/active/);
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
    await expect(page.locator('#vibrato-indicator')).not.toHaveClass(/active/);
  },
};

type ModifierEvent =
  | { type: 'PRESS_SHIFT' }
  | { type: 'RELEASE_SHIFT' }
  | { type: 'PRESS_SPACE' }
  | { type: 'RELEASE_SPACE' }
  | { type: 'PLAY_NOTE' }
  | { type: 'WINDOW_BLUR' };

export const modifierCompoundMachine = setup({
  types: { events: {} as ModifierEvent },
}).createMachine({
  id: 'modifierCompound',
  initial: 'idle',
  states: {
    idle: {
      meta: {
        reason: 'No modifier keys active — vibrato and sustain both off.',
        designIntent: 'Default playing state with no modifiers engaged',
        invariants: [ctrlPassthroughCheck] as StateInvariant[],
      },
      on: {
        PRESS_SHIFT: 'vibratoOnly',
        PRESS_SPACE: 'sustainOnly',
        PLAY_NOTE: 'idle',
        WINDOW_BLUR: 'idle',
      },
    },
    vibratoOnly: {
      meta: {
        reason: 'Vibrato active, sustain inactive — pitch modulation applied.',
        designIntent: 'Hold-on vibrato modifier for expressive playing',
      },
      on: {
        RELEASE_SHIFT: 'idle',
        PRESS_SPACE: 'bothActive',
        PLAY_NOTE: 'vibratoOnly',
        WINDOW_BLUR: 'idle',
      },
    },
    sustainOnly: {
      meta: {
        reason: 'Sustain active, vibrato inactive — notes held after release.',
        designIntent: 'Hold-on sustain modifier for legato playing',
      },
      on: {
        RELEASE_SPACE: 'idle',
        PRESS_SHIFT: 'bothActive',
        PLAY_NOTE: 'sustainOnly',
        WINDOW_BLUR: 'idle',
      },
    },
    bothActive: {
      meta: {
        reason: 'Both vibrato and sustain active simultaneously.',
        designIntent: 'Full expressive mode — sustained notes with vibrato',
      },
      on: {
        RELEASE_SHIFT: 'sustainOnly',
        RELEASE_SPACE: 'vibratoOnly',
        WINDOW_BLUR: 'idle',
      },
    },
  },
});

export const modifierCompoundPlaywrightActions: Record<ModifierEvent['type'], (page: Page) => Promise<void>> = {
  PRESS_SHIFT: async (page) => {
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
  },
  RELEASE_SHIFT: async (page) => {
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
  },
  PRESS_SPACE: async (page) => {
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
  },
  RELEASE_SPACE: async (page) => {
    await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })));
    await page.waitForTimeout(100);
  },
  PLAY_NOTE: async (page) => {
    await page.keyboard.press('c');
    await page.waitForTimeout(50);
  },
  WINDOW_BLUR: async (page) => {
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(200);
  },
};

export const modifierCompoundInvariants: Record<string, string> = {
  idle: 'No modifier keys active — vibrato and sustain both off.',
  vibratoOnly: 'Vibrato active, sustain inactive.',
  sustainOnly: 'Sustain active, vibrato inactive.',
  bothActive: 'Both vibrato and sustain active simultaneously.',
};

export const modifierCompoundDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  idle: async (page) => {
    await expect(page.locator('#vibrato-indicator')).not.toHaveClass(/active/);
    await expect(page.locator('#sustain-indicator')).not.toHaveClass(/active/);
  },
  vibratoOnly: async (page) => {
    await expect(page.locator('#vibrato-indicator')).toHaveClass(/active/);
    await expect(page.locator('#sustain-indicator')).not.toHaveClass(/active/);
  },
  sustainOnly: async (page) => {
    await expect(page.locator('#vibrato-indicator')).not.toHaveClass(/active/);
    await expect(page.locator('#sustain-indicator')).toHaveClass(/active/);
  },
  bothActive: async (page) => {
    await expect(page.locator('#vibrato-indicator')).toHaveClass(/active/);
    await expect(page.locator('#sustain-indicator')).toHaveClass(/active/);
  },
};
```
