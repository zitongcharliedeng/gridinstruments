# Song Bar Machine

XState machine modeling song-bar behavior — idle, searching, and calibrating states with hint visibility and calibration banner invariants.

``` {.typescript file=_generated/tests/machines/songBarMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';

// State machine modeling song-bar behavior
type SongBarEvent =
  | { type: 'SEARCH_FOCUS' }
  | { type: 'SEARCH_BLUR' }       // blur with empty input
  | { type: 'CALIBRATE_START' }
  | { type: 'CALIBRATE_CANCEL' }
  | { type: 'CALIBRATE_DONE' };

export const songBarMachine = setup({
  types: { events: {} as SongBarEvent },
}).createMachine({
  id: 'songBar',
  initial: 'idle',
  states: {
    idle: {
      meta: {
        reason: 'No song loaded, no interaction active. Hint is visible.',
        designIntent: 'Show drop/search hint when there is nothing to display',
        // DO NOT add invariants here — they will fail until T5 is implemented
      },
      on: {
        SEARCH_FOCUS: 'searching',
        CALIBRATE_START: 'calibrating',
      },
    },
    searching: {
      meta: {
        reason: 'User has focused the search input. Hint is hidden.',
        designIntent: 'Hint disappears when user is actively searching to reduce visual noise',
      },
      on: {
        SEARCH_BLUR: 'idle',
      },
    },
    calibrating: {
      meta: {
        reason: 'Calibration mode active — banner visible, confirming or cancelling.',
        designIntent: 'Calibration is a focused modal-like flow within the song bar',
      },
      on: {
        CALIBRATE_CANCEL: 'idle',
        CALIBRATE_DONE: 'idle',
      },
    },
  },
});

export const songBarPlaywrightActions: Record<SongBarEvent['type'], (page: Page) => Promise<void>> = {
  SEARCH_FOCUS: async (page) => {
    await page.locator('#midi-search-input').click();
  },
  SEARCH_BLUR: async (page) => {
    // Blur by clicking neutral area, input must be empty
    await page.locator('#midi-search-input').fill('');
    await page.locator('body').click({ position: { x: 500, y: 400 } });
  },
  CALIBRATE_START: async (page) => {
    await page.locator('#calibrate-btn').click();
  },
  CALIBRATE_CANCEL: async (page) => {
    await page.locator('#calibrate-cancel').click();
  },
  CALIBRATE_DONE: async (page) => {
    await page.locator('#calibrate-confirm').click();
  },
};

export const songBarDomAssertions: Record<string, (page: Page) => Promise<void>> = {
  idle: async (page) => {
    // hint is visible when idle and not searching
    await expect(page.locator('#song-bar-hint')).not.toHaveCSS('display', 'none');
    await expect(page.locator('#game-status')).toHaveCSS('display', 'none');
    await expect(page.locator('#calibration-banner')).toHaveCSS('display', 'none');
  },
  searching: async (page) => {
    // hint hidden when search is active
    await expect(page.locator('#song-bar-hint')).toHaveCSS('display', 'none');
    await expect(page.locator('#midi-search-input')).toBeFocused();
  },
  calibrating: async (page) => {
    // calibration banner visible
    await expect(page.locator('#calibration-banner')).not.toHaveCSS('display', 'none');
  },
};

export const songBarInvariants: Record<string, string> = {
  idle: 'No song loaded. Hint visible. Game status hidden.',
  searching: 'Search input focused. Hint hidden.',
  calibrating: 'Calibration banner visible.',
};
```
