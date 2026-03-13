# Services

Effect-TS service layer for browser API dependency injection.

Typed tags for AudioContext, Web MIDI, and Canvas 2D, plus their concrete `*Live` implementations. Effect-TS is confined to `src/services/` — banned from the synth hot path, render loop, pure math, and state machines.

## Interfaces

Service contracts — consumers depend only on these tags.

``` {.typescript file=src/services/index.ts}
/**
 * Service layer — Effect-TS service interfaces and Live implementations
 * for browser APIs.
 *
 * Contracts:
 *   - AudioService: Web Audio API (AudioContext lifecycle)
 *   - MidiService: Web MIDI API (device access)
 *   - CanvasService: Canvas 2D API (rendering context)
 *
 * Live layers:
 *   - AudioServiceLive: creates/manages real AudioContext
 *   - MidiServiceLive: wraps navigator.requestMIDIAccess
 *   - CanvasServiceLive: wraps canvas.getContext('2d') with DPR-aware resize
 *
 * Effect-TS is ONLY used in src/services/ — never in synth, render, or math code.
 */

import { Context, Effect, Layer } from 'effect';

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

## Live implementations

Each `*Live` layer provides a concrete browser-API-backed implementation.
`Layer.succeed` is used because the service values themselves are plain objects
of Effect-returning functions — no effectful setup is needed at layer construction time.

### AudioServiceLive

Wraps the Web Audio API. `createContext` instantiates a fresh `AudioContext`;
the other methods delegate to its promise-based lifecycle methods.

``` {.typescript file=src/services/index.ts}

// ── Live implementations ─────────────────────────────────────────────────

/** Concrete AudioService backed by the Web Audio API. */
export const AudioServiceLive = Layer.succeed(
  AudioService,
  AudioService.of({
    createContext: () =>
      Effect.try({
        try: () => new AudioContext(),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to create AudioContext: ${String(e)}`),
      }),
    resumeContext: (ctx) =>
      Effect.tryPromise({
        try: () => ctx.resume(),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to resume AudioContext: ${String(e)}`),
      }),
    suspendContext: (ctx) =>
      Effect.tryPromise({
        try: () => ctx.suspend(),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to suspend AudioContext: ${String(e)}`),
      }),
    closeContext: (ctx) =>
      Effect.tryPromise({
        try: () => ctx.close(),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to close AudioContext: ${String(e)}`),
      }),
  })
);
```

### MidiServiceLive

Wraps `navigator.requestMIDIAccess` and iterates the `inputs`/`outputs` maps.
Sysex is disabled by default — callers needing SysEx can provide a custom layer.

``` {.typescript file=src/services/index.ts}

/** Concrete MidiService backed by the Web MIDI API. */
export const MidiServiceLive = Layer.succeed(
  MidiService,
  MidiService.of({
    requestAccess: () =>
      Effect.tryPromise({
        try: () => navigator.requestMIDIAccess({ sysex: false }),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to request MIDI access: ${String(e)}`),
      }),
    listInputs: (access) =>
      Effect.try({
        try: () => Array.from(access.inputs.values()),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to list MIDI inputs: ${String(e)}`),
      }),
    listOutputs: (access) =>
      Effect.try({
        try: () => Array.from(access.outputs.values()),
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to list MIDI outputs: ${String(e)}`),
      }),
  })
);
```

### CanvasServiceLive

`getContext` acquires a 2D rendering context (fails if unavailable).
`resizeToDisplaySize` matches the canvas backing store to its CSS display size,
accounting for `devicePixelRatio`. Returns `true` if dimensions changed.

``` {.typescript file=src/services/index.ts}

/** Concrete CanvasService backed by the Canvas 2D API. */
export const CanvasServiceLive = Layer.succeed(
  CanvasService,
  CanvasService.of({
    getContext: (canvas) =>
      Effect.try({
        try: () => {
          const ctx = canvas.getContext('2d');
          if (ctx === null) {
            throw new Error('Canvas 2D context unavailable');
          }
          return ctx;
        },
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to get canvas context: ${String(e)}`),
      }),
    resizeToDisplaySize: (canvas) =>
      Effect.try({
        try: () => {
          const dpr = globalThis.devicePixelRatio || 1;
          const displayWidth = Math.round(canvas.clientWidth * dpr);
          const displayHeight = Math.round(canvas.clientHeight * dpr);
          if (canvas.width === displayWidth && canvas.height === displayHeight) {
            return false;
          }
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          return true;
        },
        catch: (e) =>
          e instanceof Error ? e : new Error(`Failed to resize canvas: ${String(e)}`),
      }),
  })
);
```
