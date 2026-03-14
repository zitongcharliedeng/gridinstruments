# Pedal Machines

XState machine for a sustain/vibrato pedal with active and inactive states.

``` {.typescript file=_generated/machines/pedalMachines.ts}
import { setup } from 'xstate';

type PedalEvent = { type: 'ACTIVATE' } | { type: 'DEACTIVATE' };

export const pedalMachine = setup({
  types: { events: {} as PedalEvent },
}).createMachine({
  id: 'pedal',
  initial: 'inactive',
  states: {
    inactive: {
      on: { ACTIVATE: 'active' },
    },
    active: {
      on: { DEACTIVATE: 'inactive' },
    },
  },
});
```
