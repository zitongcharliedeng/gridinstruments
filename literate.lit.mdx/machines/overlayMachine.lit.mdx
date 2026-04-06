# Overlay Machine

A two-state machine controlling the settings overlay panel. The overlay can be hidden or visible, and supports both a toggle (for keyboard shortcut / button press) and an explicit close (for clicking outside the panel).

## Types

Two events are defined: `TOGGLE` flips state, `CLOSE` always moves to `hidden`. Having a dedicated `CLOSE` event prevents the caller from needing to inspect current state before issuing a close.

``` {.typescript file=_generated/machines/overlayMachine.ts}
import { setup } from 'xstate';

type OverlayEvent =
  | { type: 'TOGGLE' }
  | { type: 'CLOSE' };
```

## Machine

The machine starts in `hidden`. From `visible`, both `TOGGLE` and `CLOSE` transition to `hidden`. From `hidden`, only `TOGGLE` opens the overlay — `CLOSE` is a no-op (not listed, so it is ignored).

``` {.typescript file=_generated/machines/overlayMachine.ts}
export const overlayMachine = setup({
  types: { events: {} as OverlayEvent },
}).createMachine({
  id: 'overlay',
  initial: 'hidden',
  states: {
    hidden: {
      on: { TOGGLE: 'visible' },
    },
    visible: {
      on: {
        TOGGLE: 'hidden',
        CLOSE: 'hidden',
      },
    },
  },
});
```
