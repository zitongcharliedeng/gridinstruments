import { setup } from 'xstate';

interface MidiPanelEvent { type: 'TOGGLE_MIDI' }

export const midiPanelMachine = setup({
  types: {
    events: {} as MidiPanelEvent,
  },
}).createMachine({
  id: 'midiPanel',
  initial: 'closed',
  states: {
    closed: { on: { TOGGLE_MIDI: 'open' } },
    open: { on: { TOGGLE_MIDI: 'closed' } },
  },
});
