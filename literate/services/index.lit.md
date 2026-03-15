# Services

Effect-TS service layer for browser API dependency injection.

Typed tags for AudioContext, Web MIDI, and Canvas 2D, plus their concrete `*Live` implementations. Effect-TS is confined to `_generated/services/` — banned from the synth hot path, render loop, pure math, and state machines.

## Interfaces

Service contracts — consumers depend only on these tags.

``` {.typescript file=_generated/services/index.ts}
import { Context, Effect, Layer } from 'effect';


export interface AudioService {
  readonly createContext: () => Effect.Effect<AudioContext, Error>;
  readonly resumeContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
  readonly suspendContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
  readonly closeContext: (ctx: AudioContext) => Effect.Effect<void, Error>;
}

export const AudioService = Context.GenericTag<AudioService>('AudioService');

export interface MidiService {
  readonly requestAccess: () => Effect.Effect<MIDIAccess, Error>;
  readonly listInputs: (access: MIDIAccess) => Effect.Effect<readonly MIDIInput[], Error>;
  readonly listOutputs: (access: MIDIAccess) => Effect.Effect<readonly MIDIOutput[], Error>;
}

export const MidiService = Context.GenericTag<MidiService>('MidiService');


export interface CanvasService {
  readonly getContext: (canvas: HTMLCanvasElement) => Effect.Effect<CanvasRenderingContext2D, Error>;
  readonly resizeToDisplaySize: (canvas: HTMLCanvasElement) => Effect.Effect<boolean, Error>;
}

export const CanvasService = Context.GenericTag<CanvasService>('CanvasService');
```

## Live implementations

Each `*Live` layer provides a concrete browser-API-backed implementation.
`Layer.succeed` is used because the service values themselves are plain objects
of Effect-returning functions — no effectful setup is needed at layer construction time.

### AudioServiceLive

Wraps the Web Audio API. `createContext` instantiates a fresh `AudioContext`;
the other methods delegate to its promise-based lifecycle methods.

``` {.typescript file=_generated/services/index.ts}


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

``` {.typescript file=_generated/services/index.ts}

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

``` {.typescript file=_generated/services/index.ts}

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
