import { setup } from 'xstate';

type MpeEvent = { type: 'TOGGLE' };

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
