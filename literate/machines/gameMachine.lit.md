# gameMachine

Game/tutorial state machine for GridInstruments.

``` {.typescript file=src/machines/gameMachine.ts}
/**
 * Game Lifecycle State Machine — XState v5
 *
 * Manages the MIDI play-along game lifecycle:
 *   idle -> loading -> playing -> complete
 *                  \-> error (on load failure)
 *
 * NOTE_PRESSED in `playing` uses frequency-based (midiNote) matching:
 *   - correct note + chord complete + last group  -> `complete`
 *   - correct note + chord complete + more groups -> advance, stay in `playing`
 *   - correct note + chord incomplete             -> accumulate, stay in `playing`
 *   - wrong note                                  -> no-op
 */

import { setup, assign, assertEvent, and } from 'xstate';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single note in game coordinates, ready for grid display. */
export interface GameNote {
  /** "${coordX}_${coordY}" — for KeyboardVisualizer */
  cellId: string;
  /** Original MIDI note (for reference/transposition) */
  midiNote: number;
  /** Note start time in milliseconds */
  startMs: number;
  /** Note duration in milliseconds */
  durationMs: number;
}

/** A chord group — one or more simultaneous notes that glow together. */
export interface NoteGroup {
  /** All cell IDs in this chord group (for visual highlighting on the grid) */
  cellIds: string[];
  /** MIDI note numbers — press ALL to advance to the next group */
  midiNotes: number[];
  /** Group start time in milliseconds */
  startMs: number;
}

/** Context for the game machine. */
export interface GameContext {
  /** Processed from NoteEvent[] by game engine */
  noteGroups: NoteGroup[];
  /** Index of the currently-glowing group */
  currentGroupIndex: number;
  /** cellIds of current group (what glows white) */
  targetCellIds: string[];
  /** MIDI notes pressed so far in the current chord group */
  pressedMidiNotes: number[];
  /** Game start timestamp (Date.now()) */
  startTimeMs: number;
  /** Game finish timestamp (Date.now()) */
  finishTimeMs: number;
  /** Load error message if any */
  error: string | null;
  /** User dismissed tuning warning */
  tuningWarnAcknowledged: boolean;
}

/** Events the game machine accepts. */
export type GameEvent =
  | { type: 'FILE_DROPPED'; file: File }
  | { type: 'SONG_LOADED'; noteGroups: NoteGroup[] }
  | { type: 'LOAD_FAILED'; error: string }
  | { type: 'NOTE_PRESSED'; cellId: string; midiNote: number }
  | { type: 'GAME_RESET' }
  | { type: 'GAME_RESTART' }
  | { type: 'TUNING_WARN_ACK' };

// ─── Machine ──────────────────────────────────────────────────────────────────

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  actions: {
    assignSongLoaded: assign(({ event }) => {
      assertEvent(event, 'SONG_LOADED');
      return {
        noteGroups: event.noteGroups,
        currentGroupIndex: 0,
        targetCellIds: event.noteGroups[0]?.cellIds ?? [],
        pressedMidiNotes: [] as number[],
        startTimeMs: Date.now(),
        finishTimeMs: 0,
        error: null,
      };
    }),
    assignLoadFailed: assign(({ event }) => {
      assertEvent(event, 'LOAD_FAILED');
      return { error: event.error };
    }),
    accumulateNote: assign(({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      if (context.pressedMidiNotes.includes(event.midiNote)) {
        return { pressedMidiNotes: context.pressedMidiNotes };
      }
      return { pressedMidiNotes: [...context.pressedMidiNotes, event.midiNote] };
    }),
    advanceGroup: assign(({ context }) => {
      const nextIndex = context.currentGroupIndex + 1;
      return {
        currentGroupIndex: nextIndex,
        targetCellIds: context.noteGroups[nextIndex]?.cellIds ?? [],
        pressedMidiNotes: [] as number[],
      };
    }),
    setFinishTime: assign(() => ({ finishTimeMs: Date.now() })),
    resetGame: assign(() => ({
      noteGroups: [] as NoteGroup[],
      currentGroupIndex: 0,
      targetCellIds: [] as string[],
      pressedMidiNotes: [] as number[],
      startTimeMs: 0,
      finishTimeMs: 0,
      error: null as string | null,
      tuningWarnAcknowledged: false,
    })),
    restartGame: assign(({ context }) => ({
      currentGroupIndex: 0,
      targetCellIds: context.noteGroups[0]?.cellIds ?? [],
      pressedMidiNotes: [] as number[],
      startTimeMs: Date.now(),
      finishTimeMs: 0,
    })),
    ackTuningWarn: assign(() => ({ tuningWarnAcknowledged: true })),
  },
  guards: {
    isCorrectNote: ({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      return context.noteGroups[context.currentGroupIndex]?.midiNotes.includes(event.midiNote) ?? false;
    },
    isChordComplete: ({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      const group = context.noteGroups[context.currentGroupIndex];
      if (!group) return false;
      const withNew = new Set([...context.pressedMidiNotes, event.midiNote]);
      return group.midiNotes.every(n => withNew.has(n));
    },
    isLastGroup: ({ context }) =>
      context.currentGroupIndex + 1 >= context.noteGroups.length,
  },
}).createMachine({
  id: 'game',
  context: {
    noteGroups: [],
    currentGroupIndex: 0,
    targetCellIds: [],
    pressedMidiNotes: [],
    startTimeMs: 0,
    finishTimeMs: 0,
    error: null,
    tuningWarnAcknowledged: false,
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        FILE_DROPPED: 'loading',
      },
    },
    loading: {
      on: {
        SONG_LOADED: { target: 'playing', actions: 'assignSongLoaded' },
        LOAD_FAILED: { target: 'error', actions: 'assignLoadFailed' },
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
      },
    },
    playing: {
      on: {
        NOTE_PRESSED: [
          {
            guard: and(['isCorrectNote', 'isChordComplete', 'isLastGroup']),
            target: 'complete',
            actions: ['accumulateNote', 'advanceGroup', 'setFinishTime'],
          },
          {
            guard: and(['isCorrectNote', 'isChordComplete']),
            actions: ['accumulateNote', 'advanceGroup'],
          },
          {
            guard: 'isCorrectNote',
            actions: 'accumulateNote',
          },
        ],
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
        GAME_RESTART: { target: 'playing', actions: 'restartGame' },
        TUNING_WARN_ACK: { actions: 'ackTuningWarn' },
        FILE_DROPPED: { target: 'loading', actions: 'resetGame' },
      },
    },
    complete: {
      on: {
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
        GAME_RESTART: { target: 'playing', actions: 'restartGame' },
        FILE_DROPPED: 'loading',
      },
    },
    error: {
      on: {
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
        FILE_DROPPED: 'loading',
      },
    },
  },
});
```
