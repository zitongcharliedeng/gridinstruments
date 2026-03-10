/**
 * Game Lifecycle State Machine — XState v5
 *
 * Manages the MIDI play-along game lifecycle:
 *   idle -> loading -> playing -> complete
 *                  \-> error (on load failure)
 *
 * NOTE_PRESSED in `playing` checks the current NoteGroup:
 *   - correct note + last group  -> `complete`
 *   - correct note + more groups -> advance index, stay in `playing`
 *   - wrong note                 -> no-op (extra presses don't invalidate)
 */

import { setup, assign, assertEvent } from 'xstate';

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
  /** All cell IDs in this chord group (press ANY one to advance) */
  cellIds: string[];
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
  | { type: 'NOTE_PRESSED'; cellId: string }
  | { type: 'GAME_RESET' }
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
        startTimeMs: Date.now(),
        finishTimeMs: 0,
        error: null,
      };
    }),
    assignLoadFailed: assign(({ event }) => {
      assertEvent(event, 'LOAD_FAILED');
      return { error: event.error };
    }),
    advanceGroup: assign(({ context }) => {
      const nextIndex = context.currentGroupIndex + 1;
      return {
        currentGroupIndex: nextIndex,
        targetCellIds: context.noteGroups[nextIndex]?.cellIds ?? [],
      };
    }),
    setFinishTime: assign(() => ({ finishTimeMs: Date.now() })),
    resetGame: assign(() => ({
      noteGroups: [] as NoteGroup[],
      currentGroupIndex: 0,
      targetCellIds: [] as string[],
      startTimeMs: 0,
      finishTimeMs: 0,
      error: null as string | null,
      tuningWarnAcknowledged: false,
    })),
    ackTuningWarn: assign(() => ({ tuningWarnAcknowledged: true })),
  },
  guards: {
    isCorrectNote: ({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      return context.noteGroups[context.currentGroupIndex]?.cellIds.includes(event.cellId) ?? false;
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
            guard: ({ context, event }) => {
              assertEvent(event, 'NOTE_PRESSED');
              const isCorrect =
                context.noteGroups[context.currentGroupIndex]?.cellIds.includes(event.cellId) ?? false;
              return isCorrect && context.currentGroupIndex + 1 >= context.noteGroups.length;
            },
            target: 'complete',
            actions: ['advanceGroup', 'setFinishTime'],
          },
          {
            guard: 'isCorrectNote',
            actions: 'advanceGroup',
          },
        ],
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
        TUNING_WARN_ACK: { actions: 'ackTuningWarn' },
      },
    },
    complete: {
      on: {
        GAME_RESET: { target: 'idle', actions: 'resetGame' },
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
