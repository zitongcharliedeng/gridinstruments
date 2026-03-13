# Services

Effect-TS service layer for browser API dependency injection.

These are **interface definitions only** — typed tags for AudioContext, Web MIDI, and Canvas 2D. Implementations live in separate modules; this file defines the contracts.

Effect-TS is confined to `src/services/` — banned from the synth hot path, render loop, pure math, and state machines.

``` {.typescript file=src/services/index.ts}
/**
 * Service layer — Effect-TS Context.Tag interfaces for browser APIs.
 *
 * Defines typed service contracts for dependency injection:
 *   - AudioService: Web Audio API (AudioContext lifecycle)
 *   - MidiService: Web MIDI API (device access)
 *   - CanvasService: Canvas 2D API (rendering context)
 *
 * Implementations are provided separately; consumers depend only on these tags.
 * Effect-TS is ONLY used in src/services/ — never in synth, render, or math code.
 */

import { Context, Effect } from 'effect';

// ── AudioService ─────────────────────────────────────────────────────────

/** Typed wrapper for Web Audio API lifecycle operations. */
export interface AudioService {
  /** Create a new AudioContext. */
  readonly createContext: () => Effect.Effect<AudioContext, Error>;
  /** Resume a suspended AudioContext (required by autoplay policy). */
  readonly resumeContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
  /** Suspend an AudioContext (power saving). */
  readonly suspendContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
  /** Close an AudioContext and release resources. */
  readonly closeContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
}

/** Tag for AudioService dependency injection. */
export const AudioService = Context.GenericTag<AudioService>('AudioService');

// ── MidiService ──────────────────────────────────────────────────────────

/** Typed wrapper for Web MIDI API access. */
export interface MidiService {
  /** Request MIDI access from the browser (may prompt user). */
  readonly requestAccess: () => Effect.Effect<MIDIAccess, Error>;
  /** List currently connected MIDI input devices. */
  readonly listInputs: (access: MIDIAccess) => Effect.Effect<ReadonlyArray<MIDIInput>, Error>;
  /** List currently connected MIDI output devices. */
  readonly listOutputs: (access: MIDIAccess) => Effect.Effect<ReadonlyArray<MIDIOutput>, Error>;
}

/** Tag for MidiService dependency injection. */
export const MidiService = Context.GenericTag<MidiService>('MidiService');

// ── CanvasService ────────────────────────────────────────────────────────

/** Typed wrapper for Canvas 2D rendering context acquisition. */
export interface CanvasService {
  /** Get a 2D rendering context from a canvas element. */
  readonly getContext: (canvas: HTMLCanvasElement) => Effect.Effect<CanvasRenderingContext2D, Error>;
  /** Resize a canvas to match its display size (DPR-aware). */
  readonly resizeToDisplaySize: (canvas: HTMLCanvasElement) => Effect.Effect<boolean, Error>;
}

/** Tag for CanvasService dependency injection. */
export const CanvasService = Context.GenericTag<CanvasService>('CanvasService');
```
