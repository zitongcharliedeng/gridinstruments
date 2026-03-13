# MPE Machine

XState machine for toggling MPE (MIDI Polyphonic Expression) mode on and off.

``` {.typescript file=src/machines/mpeMachine.ts}
import { setup } from 'xstate';

interface MpeEvent { type: 'TOGGLE' }

export const mpeMachine = setup({
  types: {
    events: {} as MpeEvent,
  },
}).createMachine({
  id: 'mpe',
  initial: 'disabled',
  states: {
    disabled: { on: { TOGGLE: 'enabled' } },
    enabled: { on: { TOGGLE: 'disabled' } },
  },
});
```
