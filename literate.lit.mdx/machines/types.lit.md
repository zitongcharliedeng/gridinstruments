# Machine Types

Pure TypeScript types for all XState machine events and context. Zero runtime code. Zero
XState imports.

Re-exports `WaveformType` and `KeyboardLayout` from their canonical locations to avoid
duplication.

## Re-exports

``` {.typescript file=_generated/machines/types.ts}
export type { WaveformType } from '../lib/synth';
export type { KeyboardLayout } from '../lib/keyboard-layouts';
```

## Slider Types

`SliderName` identifies each controllable slider by a short string key that also maps to DOM
element IDs via the convention `<name>-slider`.

``` {.typescript file=_generated/machines/types.ts}
export type SliderName = 'tuning' | 'skew' | 'volume' | 'zoom' | 'dref';
```

`SliderConfig` is the static configuration for a slider: range, step, default, unit label, and
the two format functions. It is used by the slider component and the constants module.

``` {.typescript file=_generated/machines/types.ts}
export interface SliderConfig {
  name: SliderName;
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
  formatBadge: (value: number) => string;
  formatLabel: (value: number) => string;
}
```

`SliderState` is the mutable runtime state stored in the XState context for each slider
instance.

``` {.typescript file=_generated/machines/types.ts}
export interface SliderState {
  value: number;
  badgeText: string;
  labelText: string;
  editing: boolean;
}
```

## Note Info

`NoteInfo` describes a single active note with its isomorphic grid position and input source.

``` {.typescript file=_generated/machines/types.ts}
export interface NoteInfo {
  coordX: number;
  coordY: number;
  midiNote: number;
  source: 'keyboard' | 'pointer' | 'midi';
}
```

## Application Context

`AppContext` is the full mutable runtime state shared across the UI and audio engine. It is
the `TContext` of the top-level XState machine.

``` {.typescript file=_generated/machines/types.ts}
export interface AppContext {
  sliders: Record<SliderName, SliderState>;
  activeNotes: Map<string, NoteInfo>;
  heldKeys: Set<string>;
  activePointers: Set<number>;
  vibratoActive: boolean;
  sustainActive: boolean;
  draggingGoldenLine: boolean;
  goldenLineDragStartY: number;
  goldenLineDragStartHz: number;
  octaveOffset: number;
  transposeOffset: number;
  layoutId: string;
  waveform: import('../lib/synth').WaveformType;
  midiPanelOpen: boolean;
  mpeEnabled: boolean;
  mpeOutputId: string | null;
  audioReady: boolean;
  defaultZoom: number;
}
```

## Events

### Slider events

``` {.typescript file=_generated/machines/types.ts}
export interface SliderInputEvent {
  type: 'SLIDER_INPUT';
  slider: SliderName;
  value: number;
}

export interface SliderResetEvent {
  type: 'SLIDER_RESET';
  slider: SliderName;
}

export interface SliderBadgeEditEvent {
  type: 'SLIDER_BADGE_EDIT';
  slider: SliderName;
  rawValue: string;
}
```

### Keyboard events

``` {.typescript file=_generated/machines/types.ts}
export interface KeyDownEvent {
  type: 'KEY_DOWN';
  code: string;
  key: string;
}

export interface KeyUpEvent {
  type: 'KEY_UP';
  code: string;
  key: string;
}
```

### Pointer events

``` {.typescript file=_generated/machines/types.ts}
export interface PointerDownEvent {
  type: 'POINTER_DOWN';
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
  pointerType: string;
}

export interface PointerMoveEvent {
  type: 'POINTER_MOVE';
  pointerId: number;
  x: number;
  y: number;
  pressure: number;
}

export interface PointerUpEvent {
  type: 'POINTER_UP';
  pointerId: number;
}
```

### MIDI events

``` {.typescript file=_generated/machines/types.ts}
export interface MidiNoteOnEvent {
  type: 'MIDI_NOTE_ON';
  note: number;
  velocity: number;
  channel: number;
  deviceId: string;
}

export interface MidiNoteOffEvent {
  type: 'MIDI_NOTE_OFF';
  note: number;
  channel: number;
  deviceId: string;
}
```

### Window events

``` {.typescript file=_generated/machines/types.ts}
export interface WindowResizeEvent {
  type: 'WINDOW_RESIZE';
  width: number;
  height: number;
}

export interface WindowBlurEvent {
  type: 'WINDOW_BLUR';
}
```

### Audio and UI events

``` {.typescript file=_generated/machines/types.ts}
export interface AudioReadyEvent {
  type: 'AUDIO_READY';
}

export interface PanicEvent {
  type: 'PANIC';
}

export interface SetWaveformEvent {
  type: 'SET_WAVEFORM';
  waveform: import('../lib/synth').WaveformType;
}

export interface SetLayoutEvent {
  type: 'SET_LAYOUT';
  layoutId: string;
}

export interface MidiPanelToggleEvent {
  type: 'MIDI_PANEL_TOGGLE';
}

export interface MpeEnableEvent {
  type: 'MPE_ENABLE';
  enabled: boolean;
}

export interface MpeSelectOutputEvent {
  type: 'MPE_SELECT_OUTPUT';
  outputId: string;
}
```

### Golden line drag events

``` {.typescript file=_generated/machines/types.ts}
export interface GoldenLineDragStartEvent {
  type: 'GOLDEN_LINE_DRAG_START';
  startY: number;
  startHz: number;
}

export interface GoldenLineDragMoveEvent {
  type: 'GOLDEN_LINE_DRAG_MOVE';
  currentY: number;
}

export interface GoldenLineDragEndEvent {
  type: 'GOLDEN_LINE_DRAG_END';
}
```

## AppEvent Union

Discriminated union of every event the application machine can receive.

``` {.typescript file=_generated/machines/types.ts}
export type AppEvent =
  | SliderInputEvent
  | SliderResetEvent
  | SliderBadgeEditEvent
  | KeyDownEvent
  | KeyUpEvent
  | PointerDownEvent
  | PointerMoveEvent
  | PointerUpEvent
  | MidiNoteOnEvent
  | MidiNoteOffEvent
  | WindowResizeEvent
  | WindowBlurEvent
  | AudioReadyEvent
  | PanicEvent
  | SetWaveformEvent
  | SetLayoutEvent
  | MidiPanelToggleEvent
  | MpeEnableEvent
  | MpeSelectOutputEvent
  | GoldenLineDragStartEvent
  | GoldenLineDragMoveEvent
  | GoldenLineDragEndEvent;
```
