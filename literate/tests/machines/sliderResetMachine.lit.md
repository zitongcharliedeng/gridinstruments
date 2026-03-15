# Slider Reset Machine

Parameterized slider reset machine factory — produces tuning, skew, volume, and zoom instances that each model the 2-state (default/modified) lifecycle with SET_VALUE and RESET events.

The module imports XState and Playwright utilities, then defines the `SliderResetConfig` interface that parameterizes the factory and the two-variant `SliderEvent` union type.

``` {.typescript file=_generated/tests/machines/sliderResetMachine.ts}
import { setup } from 'xstate';
import { type Page, expect } from '@playwright/test';
import type { StateInvariant } from './types';
import {
  createSliderFillDefaultInvariant,
  createSliderFillModifiedInvariant,
} from './invariant-checks';

interface SliderResetConfig {
  name: string;
  sliderId: string;
  badgeId: string;
  resetBtnId: string;
  defaultDisplay: string;
  modifiedValue: string;
  badgeReadMode: 'inputValue' | 'textContent';
}

type SliderEvent = { type: 'SET_VALUE' } | { type: 'RESET' };
```

`createSliderResetMachine` is the factory that takes a config and returns a fully wired machine, Playwright action map, invariant strings, and DOM assertions — all four named by the config so callers can destructure cleanly.

``` {.typescript file=_generated/tests/machines/sliderResetMachine.ts}
function createSliderResetMachine(config: SliderResetConfig) {
  const fillDefault = createSliderFillDefaultInvariant(config.sliderId);
  const fillModified = createSliderFillModifiedInvariant(config.sliderId);

  const machine = setup({
    types: { events: {} as SliderEvent },
  }).createMachine({
    id: config.name,
    initial: 'default',
    states: {
      default: {
        meta: {
          reason: `The ${config.sliderId} slider is at its default value (${config.defaultDisplay}).`,
          designIntent: `Default slider position for ${config.name}`,
          invariants: [fillDefault] satisfies StateInvariant[],
        },
        on: {
          SET_VALUE: 'modified',
          RESET: 'default',
        },
      },
      modified: {
        meta: {
          reason: `The ${config.sliderId} slider has been moved from its default value.`,
          designIntent: `User has adjusted ${config.name} away from default`,
          invariants: [fillModified] satisfies StateInvariant[],
        },
        on: {
          SET_VALUE: 'modified',
          RESET: 'default',
        },
      },
    },
  });
```

The Playwright actions drive the browser: `SET_VALUE` writes directly to the slider DOM element and forwards a `SLIDER_INPUT` event to the app actor, while `RESET` clicks the reset button and dispatches `SLIDER_RESET`. The invariant strings and badge-reading DOM assertions complete the kit.

``` {.typescript file=_generated/tests/machines/sliderResetMachine.ts}
  const playwrightActions: Record<SliderEvent['type'], (page: Page) => Promise<void>> = {
    SET_VALUE: async (page: Page) => {
      const sliderKey = config.sliderId.replace('-slider', '');
      await page.evaluate((cfg) => {
        const s = document.querySelector<HTMLInputElement>(`#${cfg.sliderId}`);
        if (!s) return;
        s.value = cfg.modifiedValue;
        s.dispatchEvent(new Event('input'));
        const w = window as unknown as { dcomposeApp?: { actor: { send: (e: { type: string; slider: string; value: number }) => void } } };
        w.dcomposeApp?.actor.send({ type: 'SLIDER_INPUT', slider: cfg.sliderKey, value: parseFloat(cfg.modifiedValue) });
      }, { sliderId: config.sliderId, modifiedValue: config.modifiedValue, sliderKey });
      await page.waitForTimeout(150);
    },
    RESET: async (page: Page) => {
      const sliderKey = config.sliderId.replace('-slider', '');
      await page.locator('#' + config.resetBtnId).click();
      await page.evaluate((key) => {
        const w = window as unknown as { dcomposeApp?: { actor: { send: (e: { type: string; slider: string }) => void } } };
        w.dcomposeApp?.actor.send({ type: 'SLIDER_RESET', slider: key });
      }, sliderKey);
      await page.waitForTimeout(150);
    },
  };

  const invariants: Record<string, string> = {
    default: `The ${config.sliderId} slider is at its default value (${config.defaultDisplay}).`,
    modified: `The ${config.sliderId} slider has been moved from its default value.`,
  };

  const readBadge = (page: Page): Promise<string | null> => {
    if (config.badgeReadMode === 'inputValue') {
      return page.locator('#' + config.badgeId).inputValue();
    }
    return page.locator('#' + config.badgeId).textContent();
  };

  const domAssertions: Record<string, (page: Page) => Promise<void>> = {
    default: async (page: Page) => {
      const val = await readBadge(page);
      expect(val).toBe(config.defaultDisplay);
    },
    modified: async (page: Page) => {
      const val = await readBadge(page);
      expect(val).not.toBe(config.defaultDisplay);
    },
  };

  return { machine, playwrightActions, domAssertions, invariants };
}
```

The tuning, skew, and volume slider instances are straightforward factory calls — each with its own slider ID, badge ID, reset button ID, default display string, and badge read mode.

``` {.typescript file=_generated/tests/machines/sliderResetMachine.ts}
export const {
  machine: tuningSliderMachine,
  playwrightActions: tuningSliderPlaywrightActions,
  domAssertions: tuningSliderDomAssertions,
  invariants: tuningSliderInvariants,
} = createSliderResetMachine({
  name: 'tuningSlider',
  sliderId: 'tuning-slider',
  badgeId: 'tuning-thumb-badge',
  resetBtnId: 'tuning-reset',
  defaultDisplay: '700.0',
  modifiedValue: '720',
  badgeReadMode: 'inputValue',
});

export const {
  machine: skewSliderMachine,
  playwrightActions: skewSliderPlaywrightActions,
  domAssertions: skewSliderDomAssertions,
  invariants: skewSliderInvariants,
} = createSliderResetMachine({
  name: 'skewSlider',
  sliderId: 'skew-slider',
  badgeId: 'skew-thumb-badge',
  resetBtnId: 'skew-reset',
  defaultDisplay: '0.00',
  modifiedValue: '0.75',
  badgeReadMode: 'inputValue',
});

export const {
  machine: volumeSliderMachine,
  playwrightActions: volumeSliderPlaywrightActions,
  domAssertions: volumeSliderDomAssertions,
  invariants: volumeSliderInvariants,
} = createSliderResetMachine({
  name: 'volumeSlider',
  sliderId: 'volume-slider',
  badgeId: 'volume-thumb-badge',
  resetBtnId: 'volume-reset',
  defaultDisplay: '-10.5',
  modifiedValue: '0.8',
  badgeReadMode: 'textContent',
});
```

The zoom slider requires a patched default assertion because its default position is viewport-dependent — the factory assertion is replaced with a range check before the final exports are destructured.

``` {.typescript file=_generated/tests/machines/sliderResetMachine.ts}
const zoomSliderBase = createSliderResetMachine({
  name: 'zoomSlider',
  sliderId: 'zoom-slider',
  badgeId: 'zoom-thumb-badge',
  resetBtnId: 'zoom-reset',
  defaultDisplay: '0.75',
  modifiedValue: '2.5',
  badgeReadMode: 'textContent',
});

const _origDefaultAssert = zoomSliderBase.domAssertions.default;
zoomSliderBase.domAssertions.default = async (page: Page) => {
  const val = await page.locator('#zoom-thumb-badge').textContent();
  expect(val).not.toBe('2.50');
  const num = parseFloat(val ?? '');
  expect(num, 'zoom badge should be a valid number').toBeGreaterThan(0);
  expect(num, 'zoom badge should be within slider range').toBeLessThanOrEqual(3);
};

export const {
  machine: zoomSliderMachine,
  playwrightActions: zoomSliderPlaywrightActions,
  domAssertions: zoomSliderDomAssertions,
  invariants: zoomSliderInvariants,
} = zoomSliderBase;
```
