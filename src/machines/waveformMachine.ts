import { setup, assign, assertEvent } from 'xstate';
import type { WaveformType } from '../lib/synth';

type WaveformEvent = { type: 'SELECT'; waveform: WaveformType };

export const waveformMachine = setup({
  types: {
    context: {} as { active: WaveformType },
    events: {} as WaveformEvent,
    input: {} as { initial: WaveformType },
  },
  actions: {
    setActive: assign(({ event }) => {
      assertEvent(event, 'SELECT');
      return { active: event.waveform };
    }),
  },
}).createMachine({
  id: 'waveform',
  context: ({ input }) => ({ active: input.initial }),
  on: {
    SELECT: { actions: 'setActive' },
  },
});
