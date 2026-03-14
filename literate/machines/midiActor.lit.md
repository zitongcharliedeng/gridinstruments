# midiActor

MIDI device actor for GridInstruments state machines. Bridges `MidiInput` callbacks into typed XState events. Owns no note logic — it only translates Web MIDI API callbacks and forwards them to the parent machine via `sendBack`.

Note on / note off are forwarded immediately (latency-critical). High-frequency expression CC (pitchBend, slide, pressure) are throttled to ~30 fps (33 ms minimum interval) before entering the XState event queue.

## Actor-local event types

These events are produced by the actor and sent to its parent. They are not yet part of the root `AppEvent` union — wiring happens when the actor is invoked.

``` {.typescript file=_generated/machines/midiActor.ts}
import { fromCallback } from 'xstate';
import type { MidiNoteOnEvent, MidiNoteOffEvent } from './types';
import type {
  MidiInput,
  MidiDeviceInfo,
  MidiNoteCallback,
  MidiStatusCallback,
  MidiExpressionCallback,
} from '../lib/midi-input';

export interface MidiStatusChangeEvent {
  type: 'MIDI_STATUS_CHANGE';
  devices: MidiDeviceInfo[];
}

export interface MidiPitchBendEvent {
  type: 'MIDI_PITCH_BEND';
  channel: number;
  value: number;
}

export interface MidiSlideEvent {
  type: 'MIDI_SLIDE';
  channel: number;
  value: number;
}

export interface MidiPressureEvent {
  type: 'MIDI_PRESSURE';
  channel: number;
  value: number;
}

export type MidiActorOutput =
  | MidiNoteOnEvent
  | MidiNoteOffEvent
  | MidiStatusChangeEvent
  | MidiPitchBendEvent
  | MidiSlideEvent
  | MidiPressureEvent;

interface MidiActorReceiveEvent {
  type: 'CLEANUP';
}
```

## Throttle constant

Expression CCs can arrive at >100 Hz from hardware controllers. Throttling at ~30 fps prevents saturating the XState event queue while keeping visual feedback smooth.

``` {.typescript file=_generated/machines/midiActor.ts}
const THROTTLE_MS = 33;
```

## Actor implementation

The actor registers six callbacks on the `MidiInput` instance. Note on/off are forwarded unthrottled. The three expression callbacks check both the `disposed` gate (since `MidiInput` has no `removePitchBend`/`removeSlide`/`removePressure`) and the per-type timestamp before emitting.

Dual-cleanup pattern per XState `fromCallback` bug #5433: the `receive` handler covers explicit early teardown from the parent; the return value covers normal actor stop.

``` {.typescript file=_generated/machines/midiActor.ts}
export const midiInputListener = fromCallback<
  MidiActorReceiveEvent,
  { midi: MidiInput }
>(({ sendBack, receive, input }) => {
  const { midi } = input;

  let disposed = false;

  const onNoteOn: MidiNoteCallback = (note, velocity, channel, deviceId) => {
    sendBack({ type: 'MIDI_NOTE_ON', note, velocity, channel, deviceId });
  };

  const onNoteOff: MidiNoteCallback = (note, _velocity, channel, deviceId) => {
    sendBack({ type: 'MIDI_NOTE_OFF', note, channel, deviceId });
  };

  const onStatusChange: MidiStatusCallback = (devices) => {
    sendBack({ type: 'MIDI_STATUS_CHANGE', devices });
  };

  let lastPitchBendTime = 0;
  let lastSlideTime = 0;
  let lastPressureTime = 0;

  const onPitchBend: MidiExpressionCallback = (channel, value) => {
    if (disposed) return;
    const now = performance.now();
    if (now - lastPitchBendTime < THROTTLE_MS) return;
    lastPitchBendTime = now;
    sendBack({ type: 'MIDI_PITCH_BEND', channel, value });
  };

  const onSlide: MidiExpressionCallback = (channel, value) => {
    if (disposed) return;
    const now = performance.now();
    if (now - lastSlideTime < THROTTLE_MS) return;
    lastSlideTime = now;
    sendBack({ type: 'MIDI_SLIDE', channel, value });
  };

  const onPressure: MidiExpressionCallback = (channel, value) => {
    if (disposed) return;
    const now = performance.now();
    if (now - lastPressureTime < THROTTLE_MS) return;
    lastPressureTime = now;
    sendBack({ type: 'MIDI_PRESSURE', channel, value });
  };

  midi.onNoteOn(onNoteOn);
  midi.onNoteOff(onNoteOff);
  midi.onStatusChange(onStatusChange);
  midi.onPitchBend(onPitchBend);
  midi.onSlide(onSlide);
  midi.onPressure(onPressure);

  const cleanup = (): void => {
    disposed = true;
    midi.removeNoteOn(onNoteOn);
    midi.removeNoteOff(onNoteOff);
    midi.removeStatusChange(onStatusChange);
  };

  receive((_event) => {
    cleanup();
  });

  return cleanup;
});
```
