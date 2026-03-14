# D-ref Input Machine

XState machine modeling the D-reference frequency input — idle, focused, validValue, invalidValue, and emptyValue states with bracket annotation and red border invariants.

``` {.typescript file=_generated/tests/machines/drefInputMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

const bracketAnnotationCheck: StateInvariant = {
  id: 'BH-BRACKET-1',
  check: async (page: Page) => {
    const text = await page.locator('#d-ref-label').textContent();
    expect(text).toContain('D REF');
    expect(text).toContain('Hz');
  },
};

const idleValueCheck: StateInvariant = {
  id: 'BH-DREF-5',
  check: async (page: Page) => {
    const val = await page.locator('#d-ref-input').inputValue();
    expect(parseFloat(val)).not.toBeNaN();
    expect(parseFloat(val)).toBeGreaterThan(0);
    const labelText = await page.locator('#d-ref-label').textContent();
    expect(labelText).toBeTruthy();
  },
};

const redBorderCheck: StateInvariant = {
  id: 'BH-DREF-7',
  check: async (page: Page) => {
    const borderColor = await page.locator('#d-ref-input').evaluate(
      el => getComputedStyle(el).borderColor
    );
    expect(borderColor).toBe('rgb(204, 51, 51)');
  },
};

type DrefEvent =
  | { type: 'CLICK_INPUT' }
  | { type: 'TYPE_NOTE_NAME' }
  | { type: 'TYPE_FREQUENCY' }
  | { type: 'TYPE_INVALID' }
  | { type: 'TYPE_EMPTY' }
  | { type: 'BLUR' }
  | { type: 'PRESS_ENTER' }
  | { type: 'RESET' };

export const drefInputMachine = setup({
  types: { events: {} as DrefEvent },
}).createMachine({
  id: 'drefInput',
  initial: 'idle',
  states: {
    idle: {
      meta: {
        reason: 'D-ref input is unfocused, showing default or last valid frequency.',
        designIntent: 'Default state with annotation visible in label overlay',
        invariants: [bracketAnnotationCheck, idleValueCheck] as StateInvariant[],
      },
      on: {
        CLICK_INPUT: 'focused',
        RESET: 'idle',
      },
    },
    focused: {
      meta: {
        reason: 'D-ref input has keyboard focus, ready for user input.',
        designIntent: 'User can type note names or frequencies',
      },
      on: {
        TYPE_NOTE_NAME: 'validValue',
        TYPE_FREQUENCY: 'validValue',
        TYPE_INVALID: 'invalidValue',
        TYPE_EMPTY: 'emptyValue',
        BLUR: 'idle',
        PRESS_ENTER: 'idle',
        RESET: 'idle',
      },
    },
    validValue: {
      meta: {
        reason: 'D-ref input contains a valid frequency or note name, converted to Hz.',
        designIntent: 'Real-time annotation updates give musicians immediate feedback',
      },
      on: {
        TYPE_NOTE_NAME: 'validValue',
        TYPE_FREQUENCY: 'validValue',
        TYPE_INVALID: 'invalidValue',
        BLUR: 'idle',
        PRESS_ENTER: 'idle',
        RESET: 'idle',
      },
    },
    invalidValue: {
      meta: {
        reason: 'D-ref input contains invalid text, showing red border.',
        designIntent: 'Red border provides immediate visual feedback before auto-revert',
        invariants: [redBorderCheck] as StateInvariant[],
      },
      on: {
        TYPE_NOTE_NAME: 'validValue',
        TYPE_FREQUENCY: 'validValue',
        BLUR: 'idle',
        RESET: 'idle',
      },
    },
    emptyValue: {
      meta: {
        reason: 'D-ref input is empty, will revert on blur.',
        designIntent: 'Clearing and blurring gracefully restores the default',
      },
      on: {
        TYPE_NOTE_NAME: 'validValue',
        TYPE_FREQUENCY: 'validValue',
        BLUR: 'idle',
        RESET: 'idle',
      },
    },
  },
});

export const drefInputPlaywrightActions: Record<DrefEvent['type'], (page: Page) => Promise<void>> = {
  CLICK_INPUT: async (page) => {
    await page.locator('#d-ref-input').click();
    await page.waitForTimeout(100);
  },
  TYPE_NOTE_NAME: async (page) => {
    const input = page.locator('#d-ref-input');
    await input.fill('C5');
    await input.dispatchEvent('input');
    await page.waitForTimeout(200);
  },
  TYPE_FREQUENCY: async (page) => {
    const input = page.locator('#d-ref-input');
    await input.fill('440');
    await input.dispatchEvent('input');
    await page.waitForTimeout(200);
  },
  TYPE_INVALID: async (page) => {
    const input = page.locator('#d-ref-input');
    await input.fill('garbage');
    await input.dispatchEvent('input');
    await page.waitForTimeout(200);
  },
  TYPE_EMPTY: async (page) => {
    const input = page.locator('#d-ref-input');
    await input.fill('');
    await input.dispatchEvent('input');
    await page.waitForTimeout(100);
  },
  BLUR: async (page) => {
    await page.evaluate(() => { (document.activeElement as HTMLElement).blur(); });
    await page.waitForTimeout(200);
  },
  PRESS_ENTER: async (page) => {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
  },
  RESET: async (page) => {
    await page.locator('#d-ref-reset').click();
    await page.waitForTimeout(200);
  },
};

export const drefInputInvariants: Record<string, string> = {
  idle: 'D-ref input is unfocused, showing default or last valid frequency with D4 annotation.',
  focused: 'D-ref input has keyboard focus, ready for user input.',
  validValue: 'D-ref input contains a valid frequency converted to Hz.',
  invalidValue: 'D-ref input contains invalid text with red border.',
  emptyValue: 'D-ref input is empty.',
};

export const drefInputDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  idle: async (page) => {
    await expect(page.locator('#d-ref-input')).not.toBeFocused();
    const val = await page.locator('#d-ref-input').inputValue();
    expect(parseFloat(val)).not.toBeNaN();
  },
  focused: async (page) => {
    await expect(page.locator('#d-ref-input')).toBeFocused();
  },
  validValue: async (page) => {
    const val = await page.locator('#d-ref-input').inputValue();
    expect(parseFloat(val)).not.toBeNaN();
    expect(parseFloat(val)).toBeGreaterThan(0);
  },
  invalidValue: async (page) => {
    const borderColor = await page.locator('#d-ref-input').evaluate(
      el => getComputedStyle(el).borderColor
    );
    expect(borderColor).toBe('rgb(204, 51, 51)');
  },
  emptyValue: async (page) => {
    const val = await page.locator('#d-ref-input').inputValue();
    expect(val).toBe('');
  },
};
```
