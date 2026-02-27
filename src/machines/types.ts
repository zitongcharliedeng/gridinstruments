/**
 * DCompose XState Machine Types
 *
 * Pure TypeScript types for all XState machine events and context.
 * Zero runtime code. Zero XState imports.
 *
 * Re-exports WaveformType and KeyboardLayout from their canonical locations
 * to avoid duplication.
 */

// ─── Re-exports ──────────────────────────────────────────────────────────────

export type { WaveformType } from '../lib/synth';
export type { KeyboardLayout } from '../lib/keyboard-layouts';

// ─── Slider Types ─────────────────────────────────────────────────────────────

/**
 * Names of all controllable sliders in the application.
 * Maps to DOM element IDs via convention: `<name>-slider`.
 */
export type SliderName = 'tuning' | 'skew' | 'volume' | 'zoom' | 'dref';

/**
 * Static configuration for a single slider control.
 * Defines the full range, formatting functions, and display metadata.
 */
export interface SliderConfig {
  /** Unique slider name, matches `SliderName` union */
  name: SliderName;
  /** Minimum allowed value */
  min: number;
  /** Maximum allowed value */
  max: number;
  /** Step size for discrete increments */
  step: number;
  /** Initial/default value */
  default: number;
  /** Physical unit label (e.g. 'cents', 'dB', 'Hz') */
  unit: string;
  /**
   * Format a raw numeric value into a badge display string.
   * The badge floats above the slider thumb.
   */
  formatBadge: (value: number) => string;
  /**
   * Format a raw numeric value into the slider track label.
   * May include note annotations in brackets.
   */
  formatLabel: (value: number) => string;
}

/**
 * Runtime state for a single slider instance.
 */
export interface SliderState {
  /** Current numeric value */
  value: number;
  /** Formatted string shown in the thumb badge */
  badgeText: string;
  /** Formatted string shown in the slider label overlay */
  labelText: string;
  /** True while the user is directly editing the badge text input */
  editing: boolean;
}

// ─── Note Info ────────────────────────────────────────────────────────────────

/**
 * Describes a single active note with its isomorphic grid position and source.
 */
export interface NoteInfo {
  /** Isomorphic grid X coordinate (fifths from D) */
  coordX: number;
  /** Isomorphic grid Y coordinate (octave offset) */
  coordY: number;
  /** MIDI note number (0–127) */
  midiNote: number;
  /** How the note was triggered */
  source: 'keyboard' | 'pointer' | 'midi';
}

// ─── Application Context ─────────────────────────────────────────────────────

/**
 * Full context object for the DCompose XState application machine.
 * Holds all mutable runtime state shared across the UI and audio engine.
 */
export interface AppContext {
  /** Per-slider runtime state, keyed by SliderName */
  sliders: Record<SliderName, SliderState>;
  /** All currently sounding notes, keyed by their unique note ID string */
  activeNotes: Map<string, NoteInfo>;
  /** Keyboard codes currently held down (for repeat prevention) */
  heldKeys: Set<string>;
  /** Pointer IDs currently in contact with the canvas */
  activePointers: Set<number>;
  /** True while Shift is held (vibrato mode) */
  vibratoActive: boolean;
  /** True while Space is held (sustain pedal mode) */
  sustainActive: boolean;
  /** True while the golden line is being dragged */
  draggingGoldenLine: boolean;
  /** Y coordinate where the golden line drag started (canvas-local px) */
  goldenLineDragStartY: number;
  /** D4 reference frequency in Hz at the start of the golden line drag */
  goldenLineDragStartHz: number;
  /** Current octave shift offset applied to all keyboard notes */
  octaveOffset: number;
  /** Current transpose shift offset applied to all keyboard notes */
  transposeOffset: number;
  /** Active keyboard layout ID (e.g. 'ansi', 'iso') */
  layoutId: string;
  /** True if the MIDI settings panel is visible */
  midiPanelOpen: boolean;
  /** True if MPE output is enabled */
  mpeEnabled: boolean;
  /** Currently selected MPE output device ID, or null */
  mpeOutputId: string | null;
  /** True once the Web Audio context has been resumed by a user gesture */
  audioReady: boolean;
}

// ─── Events ───────────────────────────────────────────────────────────────────

/**
 * Emitted when a slider value changes via user interaction.
 */
export interface SliderInputEvent {
  type: 'SLIDER_INPUT';
  /** Which slider was moved */
  slider: SliderName;
  /** New numeric value */
  value: number;
}

/**
 * Emitted when a slider reset button is clicked.
 */
export interface SliderResetEvent {
  type: 'SLIDER_RESET';
  /** Which slider to reset to its default */
  slider: SliderName;
}

/**
 * Emitted when the user commits a direct value in a slider badge text input.
 */
export interface SliderBadgeEditEvent {
  type: 'SLIDER_BADGE_EDIT';
  /** Which slider's badge was edited */
  slider: SliderName;
  /** Raw string entered by the user (may be a note name like "A4" or a number) */
  rawValue: string;
}

/**
 * Emitted when a physical keyboard key is pressed.
 */
export interface KeyDownEvent {
  type: 'KEY_DOWN';
  /** `KeyboardEvent.code` — physical key identifier (e.g. 'KeyA', 'ShiftLeft') */
  code: string;
  /** `KeyboardEvent.key` — character produced (e.g. 'a', 'Shift') */
  key: string;
}

/**
 * Emitted when a physical keyboard key is released.
 */
export interface KeyUpEvent {
  type: 'KEY_UP';
  /** `KeyboardEvent.code` — physical key identifier */
  code: string;
  /** `KeyboardEvent.key` — character produced */
  key: string;
}

/**
 * Emitted when a pointer contact begins on the keyboard canvas.
 */
export interface PointerDownEvent {
  type: 'POINTER_DOWN';
  /** `PointerEvent.pointerId` */
  pointerId: number;
  /** Canvas-local X coordinate in CSS pixels */
  x: number;
  /** Canvas-local Y coordinate in CSS pixels */
  y: number;
  /** Normalized pressure (0.0–1.0); mouse default is 0.5 */
  pressure: number;
  /** Device type: 'mouse' | 'pen' | 'touch' */
  pointerType: string;
}

/**
 * Emitted when a pointer moves while in contact with the canvas.
 */
export interface PointerMoveEvent {
  type: 'POINTER_MOVE';
  /** `PointerEvent.pointerId` */
  pointerId: number;
  /** Canvas-local X coordinate in CSS pixels */
  x: number;
  /** Canvas-local Y coordinate in CSS pixels */
  y: number;
  /** Normalized pressure (0.0–1.0) */
  pressure: number;
}

/**
 * Emitted when a pointer is lifted or leaves the canvas.
 */
export interface PointerUpEvent {
  type: 'POINTER_UP';
  /** `PointerEvent.pointerId` */
  pointerId: number;
}

/**
 * Emitted when a MIDI note-on message is received from any enabled device.
 */
export interface MidiNoteOnEvent {
  type: 'MIDI_NOTE_ON';
  /** MIDI note number (0–127) */
  note: number;
  /** MIDI velocity (0–127) */
  velocity: number;
  /** MIDI channel (1–16) */
  channel: number;
}

/**
 * Emitted when a MIDI note-off message is received.
 */
export interface MidiNoteOffEvent {
  type: 'MIDI_NOTE_OFF';
  /** MIDI note number (0–127) */
  note: number;
  /** MIDI channel (1–16) */
  channel: number;
}

/**
 * Emitted when the browser window is resized.
 */
export interface WindowResizeEvent {
  type: 'WINDOW_RESIZE';
  /** New window inner width in CSS pixels */
  width: number;
  /** New window inner height in CSS pixels */
  height: number;
}

/**
 * Emitted when the browser window loses focus (all notes should stop).
 */
export interface WindowBlurEvent {
  type: 'WINDOW_BLUR';
}

/**
 * Emitted once the Web Audio context has been successfully resumed
 * after a user gesture unlocks autoplay policy.
 */
export interface AudioReadyEvent {
  type: 'AUDIO_READY';
}

/**
 * Emitted when the panic button is triggered — stops all active notes
 * and resets MPE voices.
 */
export interface PanicEvent {
  type: 'PANIC';
}

/**
 * Emitted when the user selects a new oscillator waveform.
 */
export interface SetWaveformEvent {
  type: 'SET_WAVEFORM';
  /** The waveform to activate */
  waveform: import('../lib/synth').WaveformType;
}

/**
 * Emitted when the user selects a different keyboard layout variant.
 */
export interface SetLayoutEvent {
  type: 'SET_LAYOUT';
  /** Layout variant ID (e.g. 'ansi', 'iso', 'ansi-extended') */
  layoutId: string;
}

/**
 * Emitted when the MIDI settings panel toggle button is clicked.
 */
export interface MidiPanelToggleEvent {
  type: 'MIDI_PANEL_TOGGLE';
}

/**
 * Emitted when the MPE output enabled checkbox changes state.
 */
export interface MpeEnableEvent {
  type: 'MPE_ENABLE';
  /** Whether MPE output should be active */
  enabled: boolean;
}

/**
 * Emitted when the user selects a different MPE MIDI output device.
 */
export interface MpeSelectOutputEvent {
  type: 'MPE_SELECT_OUTPUT';
  /** Web MIDI output port ID */
  outputId: string;
}

/**
 * Emitted when the user begins dragging the golden (D4 reference) line.
 */
export interface GoldenLineDragStartEvent {
  type: 'GOLDEN_LINE_DRAG_START';
  /** Canvas-local Y coordinate where the drag began */
  startY: number;
  /** D4 reference frequency in Hz at the start of the drag */
  startHz: number;
}

/**
 * Emitted each frame while the golden line drag is in progress.
 */
export interface GoldenLineDragMoveEvent {
  type: 'GOLDEN_LINE_DRAG_MOVE';
  /** Current canvas-local Y coordinate of the pointer */
  currentY: number;
}

/**
 * Emitted when the golden line drag ends (pointer up or leave).
 */
export interface GoldenLineDragEndEvent {
  type: 'GOLDEN_LINE_DRAG_END';
}

// ─── AppEvent Union ───────────────────────────────────────────────────────────

/**
 * Discriminated union of every event the DCompose application machine can receive.
 * Use this as the `TEvent` parameter for the top-level machine definition.
 */
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
