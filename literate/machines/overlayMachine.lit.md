# Overlay Machine

XState machine for toggling a settings overlay panel between hidden and visible states.

``` {.typescript file=src/machines/overlayMachine.ts}
import { setup } from 'xstate';

type OverlayEvent =
  | { type: 'TOGGLE' }
  | { type: 'CLOSE' };

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
