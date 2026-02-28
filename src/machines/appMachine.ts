/**
 * DCompose AppMachine — Root XState v5 Machine
 *
 * Manages slider state (value, badgeText, labelText, editing) and handles
 * SLIDER_INPUT / SLIDER_RESET / SLIDER_BADGE_EDIT events from NumericSlider
 * component instances wired in main.ts.
 */

import { setup, fromPromise, assign, assertEvent } from 'xstate';
import type { AppContext, AppEvent, SliderName, SliderState } from './types';
import type { Synth } from '../lib/synth';

// ─── Per-slider format helpers ────────────────────────────────────────────────

function formatBadge(slider: SliderName, v: number): string {
  switch (slider) {
    case 'tuning': return v.toFixed(1);
    case 'skew':   return v.toFixed(2);
    case 'volume': return v <= 0 ? '-\u221E' : (20 * Math.log10(v)).toFixed(1);
    case 'zoom':   return v.toFixed(2);
    case 'dref':   return v.toFixed(2);
  }
}

function formatLabel(slider: SliderName, v: number): string {
  switch (slider) {
    case 'tuning': return `${v.toFixed(1)} cents`;
    case 'skew':   return v <= 0.15 ? 'SKEW [MidiMech]' : v >= 0.85 ? 'SKEW [DCompose]' : 'SKEW';
    case 'volume': return v <= 0 ? '-\u221E dB' : `${(20 * Math.log10(v)).toFixed(1)} dB`;
    case 'zoom':   return `${v.toFixed(2)}\u00d7`;
    case 'dref':   return `D REF ${v.toFixed(2)} Hz`;
  }
}

const SLIDER_DEFAULTS: Record<SliderName, number> = {
  tuning: 700,
  skew:   0,
  volume: 0.3,
  zoom:   1.0,
  dref:   293.66,
};

// ─── Machine ──────────────────────────────────────────────────────────────────

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
  actions: {
    handleSliderInput: assign(({ context, event }) => {
      assertEvent(event, 'SLIDER_INPUT');
      const newSliders = { ...context.sliders };
      newSliders[event.slider] = {
        ...newSliders[event.slider],
        value:     event.value,
        badgeText: formatBadge(event.slider, event.value),
        labelText: formatLabel(event.slider, event.value),
        editing:   false,
      } satisfies SliderState;
      return { sliders: newSliders };
    }),

    handleSliderReset: assign(({ context, event }) => {
      assertEvent(event, 'SLIDER_RESET');
      const defaultVal = SLIDER_DEFAULTS[event.slider];
      const newSliders = { ...context.sliders };
      newSliders[event.slider] = {
        ...newSliders[event.slider],
        value:     defaultVal,
        badgeText: formatBadge(event.slider, defaultVal),
        labelText: formatLabel(event.slider, defaultVal),
        editing:   false,
      } satisfies SliderState;
      return { sliders: newSliders };
    }),

    handleSliderBadgeEdit: assign(({ context, event }) => {
      assertEvent(event, 'SLIDER_BADGE_EDIT');
      // rawValue is always a numeric string at this point (note names were
      // converted to Hz before sending, see main.ts onBadgeEdit callbacks).
      const parsed = parseFloat(event.rawValue);
      if (!isFinite(parsed)) return {};
      const newSliders = { ...context.sliders };
      newSliders[event.slider] = {
        ...newSliders[event.slider],
        value:     parsed,
        badgeText: formatBadge(event.slider, parsed),
        labelText: formatLabel(event.slider, parsed),
        editing:   true,
      } satisfies SliderState;
      return { sliders: newSliders };
    }),

    handleMidiPanelToggle: assign(({ context }) => ({
      midiPanelOpen: !context.midiPanelOpen,
    })),

    handleMpeEnable: assign(({ event }) => {
      assertEvent(event, 'MPE_ENABLE');
      return { mpeEnabled: event.enabled };
    }),

    handleMpeSelectOutput: assign(({ event }) => {
      assertEvent(event, 'MPE_SELECT_OUTPUT');
      return { mpeOutputId: event.outputId };
    }),

    handleSetWaveform: assign(({ event }) => {
      assertEvent(event, 'SET_WAVEFORM');
      return { waveform: event.waveform };
    }),

    handleSetLayout: assign(({ event }) => {
      assertEvent(event, 'SET_LAYOUT');
      return { layoutId: event.layoutId };
    }),
  },
}).createMachine({
  id: 'dcompose',
  context: ({ input }) => ({
    sliders: {
      tuning: { value: 700,              badgeText: formatBadge('tuning', 700),              labelText: formatLabel('tuning', 700),              editing: false },
      skew:   { value: 0,                badgeText: formatBadge('skew',   0),                labelText: formatLabel('skew',   0),                editing: false },
      volume: { value: input.initialVolume, badgeText: formatBadge('volume', input.initialVolume), labelText: formatLabel('volume', input.initialVolume), editing: false },
      zoom:   { value: input.defaultZoom,   badgeText: formatBadge('zoom',   input.defaultZoom),   labelText: formatLabel('zoom',   input.defaultZoom),   editing: false },
      dref:   { value: 293.66,           badgeText: formatBadge('dref',   293.66),           labelText: formatLabel('dref',   293.66),           editing: false },
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
    waveform: 'sawtooth' as import('./types').WaveformType,
    midiPanelOpen: false,
    mpeEnabled: false,
    mpeOutputId: null,
    audioReady: false,
  }),
  initial: 'uninitialized',
  states: {
    uninitialized: {
      on: {
        AUDIO_READY:        'audioReady',
        SLIDER_INPUT:       { actions: 'handleSliderInput' },
        SLIDER_RESET:       { actions: 'handleSliderReset' },
        SLIDER_BADGE_EDIT:  { actions: 'handleSliderBadgeEdit' },
        MIDI_PANEL_TOGGLE: { actions: 'handleMidiPanelToggle' },
        MPE_ENABLE:        { actions: 'handleMpeEnable' },
        MPE_SELECT_OUTPUT: { actions: 'handleMpeSelectOutput' },
        SET_WAVEFORM:      { actions: 'handleSetWaveform' },
        SET_LAYOUT:        { actions: 'handleSetLayout' },
      },
    },
    audioReady: {
      on: {
        SLIDER_INPUT:       { actions: 'handleSliderInput' },
        SLIDER_RESET:       { actions: 'handleSliderReset' },
        SLIDER_BADGE_EDIT:  { actions: 'handleSliderBadgeEdit' },
        MIDI_PANEL_TOGGLE: { actions: 'handleMidiPanelToggle' },
        MPE_ENABLE:        { actions: 'handleMpeEnable' },
        MPE_SELECT_OUTPUT: { actions: 'handleMpeSelectOutput' },
        SET_WAVEFORM:      { actions: 'handleSetWaveform' },
        SET_LAYOUT:        { actions: 'handleSetLayout' },
      },
    },
  },
});
