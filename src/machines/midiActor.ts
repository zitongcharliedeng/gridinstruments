/**
 * MIDI input actor — bridges MidiInput callbacks into XState events.
 *
 * This actor uses the fromCallback pattern so it can be spawned by appMachine.
 * It owns no note logic: it only translates Web MIDI API callbacks into typed
 * XState events and forwards them to the parent machine via sendBack.
 *
 * Note on / note off are forwarded immediately (latency-critical).
 * High-frequency expression CC (pitchBend, slide, pressure) are throttled to
 * ~30fps (33 ms minimum interval) before entering the XState event queue.
 *
 * Dual-cleanup pattern implemented per fromCallback bug #5433:
 *   1. receive({ type: 'CLEANUP' }) — explicit early teardown from parent.
 *   2. return cleanup               — normal actor stop / machine exit.
 */
import { fromCallback } from 'xstate';
import type { MidiNoteOnEvent, MidiNoteOffEvent } from './types';
import type {
  MidiInput,
  MidiDeviceInfo,
  MidiNoteCallback,
  MidiStatusCallback,
  MidiExpressionCallback,
} from '../lib/midi-input';

// ─── Actor-local event types ──────────────────────────────────────────────────
// These are not yet part of the AppEvent union — they will be wired to the
// root machine when the actor is invoked in Task 10.

/** Emitted when the connected MIDI device list changes. */
export interface MidiStatusChangeEvent {
  type: 'MIDI_STATUS_CHANGE';
  devices: MidiDeviceInfo[];
}

/** Emitted on pitch-bend messages (CC 0xE0). Value is normalised to -1..+1. */
export interface MidiPitchBendEvent {
  type: 'MIDI_PITCH_BEND';
  channel: number;
  value: number;
}

/** Emitted on CC74 (slide / timbre) messages. Value is normalised to 0..1. */
export interface MidiSlideEvent {
  type: 'MIDI_SLIDE';
  channel: number;
  value: number;
}

/** Emitted on channel-pressure (aftertouch) messages. Value is normalised to 0..1. */
export interface MidiPressureEvent {
  type: 'MIDI_PRESSURE';
  channel: number;
  value: number;
}

/** Union of all events emitted by this actor to its parent machine. */
export type MidiActorOutput =
  | MidiNoteOnEvent
  | MidiNoteOffEvent
  | MidiStatusChangeEvent
  | MidiPitchBendEvent
  | MidiSlideEvent
  | MidiPressureEvent;

/** Events this actor can receive from its parent machine. */
interface MidiActorReceiveEvent {
  type: 'CLEANUP';
}

// ─── Throttle constant (~30fps) ───────────────────────────────────────────────

const THROTTLE_MS = 33;

// ─── Actor ────────────────────────────────────────────────────────────────────

export const midiInputListener = fromCallback<
  MidiActorReceiveEvent,
  { midi: MidiInput }
>(({ sendBack, receive, input }) => {
  const { midi } = input;

  // Guard for expression callbacks: MidiInput has no removePitchBend /
  // removeSlide / removePressure, so we gate further emission at the call site.
  let disposed = false;

  // ── Note on / off (latency-critical) ──────────────────────────────────────

  const onNoteOn: MidiNoteCallback = (note, velocity, channel) => {
    sendBack({ type: 'MIDI_NOTE_ON', note, velocity, channel });
  };

  const onNoteOff: MidiNoteCallback = (note, _velocity, channel) => {
    sendBack({ type: 'MIDI_NOTE_OFF', note, channel });
  };

  // ── Status change (device connect / disconnect) ────────────────────────────

  const onStatusChange: MidiStatusCallback = (devices) => {
    sendBack({ type: 'MIDI_STATUS_CHANGE', devices });
  };

  // ── High-frequency expression CC — throttled to ~30fps ────────────────────

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

  // ── Register all callbacks ────────────────────────────────────────────────

  midi.onNoteOn(onNoteOn);
  midi.onNoteOff(onNoteOff);
  midi.onStatusChange(onStatusChange);
  midi.onPitchBend(onPitchBend);
  midi.onSlide(onSlide);
  midi.onPressure(onPressure);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanup = (): void => {
    disposed = true;
    midi.removeNoteOn(onNoteOn);
    midi.removeNoteOff(onNoteOff);
    midi.removeStatusChange(onStatusChange);
    // No removePitchBend / removeSlide / removePressure on MidiInput —
    // the `disposed` flag prevents those callbacks from emitting after teardown.
  };

  // 1. Explicit CLEANUP message from parent (early teardown).
  receive((event) => {
    if (event.type === 'CLEANUP') {
      cleanup();
    }
  });

  // 2. Return value: called automatically when the actor is stopped.
  return cleanup;
});
