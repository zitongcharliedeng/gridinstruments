/**
 * DCompose AppMachine — Root XState v5 Machine Skeleton
 *
 * Observes but does not control — DComposeApp class continues to handle
 * all event logic. This machine coexists alongside it as a foundation
 * for the incremental XState migration.
 */

import { setup, fromPromise } from 'xstate';
import type { AppContext, AppEvent } from './types';
import type { Synth } from '../lib/synth';

export const appMachine = setup({
  types: {
    context: {} as AppContext,
    events: {} as AppEvent,
    input: {} as { initialVolume: number; defaultZoom: number; touchDevice: boolean },
  },
  actors: {
    /**
     * Resolves the Web Audio context — will be invoked in a future task.
     * Defined here so the type system knows about it.
     */
    initAudio: fromPromise(async ({ input }: { input: { synth: Synth } }) => {
      if (!input.synth.isInitialized()) await input.synth.init();
    }),
  },
}).createMachine({
  id: 'dcompose',
  context: ({ input }) => ({
    sliders: {
      tuning: { value: 700, badgeText: '700¢', labelText: '700 cents', editing: false },
      skew: { value: 0, badgeText: '0¢', labelText: '0 cents', editing: false },
      volume: { value: input.initialVolume, badgeText: `${input.initialVolume}dB`, labelText: `${input.initialVolume} dB`, editing: false },
      zoom: { value: input.defaultZoom, badgeText: `${input.defaultZoom}×`, labelText: `${input.defaultZoom}×`, editing: false },
      dref: { value: 293.66, badgeText: '293.66Hz', labelText: 'D4 293.66 Hz', editing: false },
    },
    activeNotes: new Map(),
    heldKeys: new Set(),
    activePointers: new Set(),
    vibratoActive: false,
    sustainActive: false,
    draggingGoldenLine: false,
    goldenLineDragStartY: 0,
    goldenLineDragStartHz: 293.66,
    octaveOffset: 0,
    transposeOffset: 0,
    layoutId: 'ansi',
    midiPanelOpen: false,
    mpeEnabled: false,
    mpeOutputId: null,
    audioReady: false,
  }),
  initial: 'uninitialized',
  states: {
    uninitialized: {
      on: {
        AUDIO_READY: 'audioReady',
      },
    },
    audioReady: {
      // Placeholder state — will be expanded in later tasks
      on: {},
    },
  },
});
