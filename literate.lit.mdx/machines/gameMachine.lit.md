# Game Machine

Game/tutorial state machine for GridInstruments. Manages the MIDI play-along game lifecycle:
`idle → loading → playing → complete`, with an `error` branch on load failure.

`NOTE_PRESSED` in `playing` uses cellId-based matching: a correct note that
completes the current chord group advances to the next group, or transitions to `complete` if
it was the last group. Wrong notes are silently ignored.

## Imports

``` {.typescript file=_generated/machines/gameMachine.ts}
import { setup, assign, assertEvent, and } from 'xstate';
```

## Types

A single note in game coordinates, ready for grid display.

``` {.typescript file=_generated/machines/gameMachine.ts}
export interface GameNote {
  cellId: string;
  midiNote: number;
  startMs: number;
  durationMs: number;
}
```

A chord group — one or more simultaneous notes that glow together on the grid.

``` {.typescript file=_generated/machines/gameMachine.ts}
export interface NoteGroup {
  cellIds: string[];
  midiNotes: number[];
  startMs: number;
}
```

The full context for the game machine.

``` {.typescript file=_generated/machines/gameMachine.ts}
export interface GameContext {
  noteGroups: NoteGroup[];
  currentGroupIndex: number;
  targetCellIds: string[];
  pressedCellIds: string[];
  startTimeMs: number;
  finishTimeMs: number;
  error: string | null;
  tuningWarnAcknowledged: boolean;
}
```

The discriminated union of all events the game machine accepts.

``` {.typescript file=_generated/machines/gameMachine.ts}
export type GameEvent =
  | { type: 'FILE_DROPPED'; file: File }
  | { type: 'SONG_LOADED'; noteGroups: NoteGroup[] }
  | { type: 'LOAD_FAILED'; error: string }
  | { type: 'NOTE_PRESSED'; cellId: string; midiNote: number }
  | { type: 'GAME_RESET' }
  | { type: 'GAME_RESTART' }
  | { type: 'TUNING_WARN_ACK' };
```

## Machine

The machine is created with `setup()` to keep actions and guards typed separately from the
state configuration.

### Actions

``` {.typescript file=_generated/machines/gameMachine.ts}
export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
  },
  actions: {
    assignSongLoaded: assign(({ event }) => {
      assertEvent(event, 'SONG_LOADED');
      const pressedCellIds: string[] = [];
      return {
        noteGroups: event.noteGroups,
        currentGroupIndex: 0,
        targetCellIds: event.noteGroups[0]?.cellIds ?? [],
        pressedCellIds,
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
      if (context.pressedCellIds.includes(event.cellId)) {
        return { pressedCellIds: context.pressedCellIds };
      }
      return { pressedCellIds: [...context.pressedCellIds, event.cellId] };
    }),
```

The remaining actions advance to the next chord group, record the finish timestamp, and provide reset and restart variants that zero or preserve the loaded song data respectively.

``` {.typescript file=_generated/machines/gameMachine.ts}
    advanceGroup: assign(({ context }) => {
      const nextIndex = context.currentGroupIndex + 1;
      const pressedCellIds: string[] = [];
      return {
        currentGroupIndex: nextIndex,
        targetCellIds: context.noteGroups[nextIndex]?.cellIds ?? [],
        pressedCellIds,
      };
    }),
    setFinishTime: assign(() => ({ finishTimeMs: Date.now() })),
    resetGame: assign((): Partial<GameContext> => ({
      noteGroups: [],
      currentGroupIndex: 0,
      targetCellIds: [],
      pressedCellIds: [],
      startTimeMs: 0,
      finishTimeMs: 0,
      error: null,
      tuningWarnAcknowledged: false,
    })),
    restartGame: assign(({ context }) => {
      const pressedCellIds: string[] = [];
      return {
        currentGroupIndex: 0,
        targetCellIds: context.noteGroups[0]?.cellIds ?? [],
        pressedCellIds,
        startTimeMs: Date.now(),
        finishTimeMs: 0,
      };
    }),
    ackTuningWarn: assign(() => ({ tuningWarnAcknowledged: true })),
  },
```

### Guards

`isCorrectNote` checks the current group's `midiNotes` array. `isChordComplete` checks whether
adding the new note would satisfy all notes in the group. `isLastGroup` checks if advancing
would exhaust the groups array.

``` {.typescript file=_generated/machines/gameMachine.ts}
  guards: {
    isCorrectNote: ({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      return context.noteGroups[context.currentGroupIndex]?.cellIds.includes(event.cellId) ?? false;
    },
    isChordComplete: ({ context, event }) => {
      assertEvent(event, 'NOTE_PRESSED');
      const group = context.noteGroups[context.currentGroupIndex];
      if (!group) return false;
      const withNew = new Set([...context.pressedCellIds, event.cellId]);
      return group.cellIds.every(id => withNew.has(id));
    },
    isLastGroup: ({ context }) =>
      context.currentGroupIndex + 1 >= context.noteGroups.length,
  },
```

### States

The initial context zeroes all runtime fields. `idle` and `loading` are waiting states before any song data is available.

``` {.typescript file=_generated/machines/gameMachine.ts}
}).createMachine({
  id: 'game',
  context: {
    noteGroups: [],
    currentGroupIndex: 0,
    targetCellIds: [],
    pressedCellIds: [],
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
```

`playing` handles `NOTE_PRESSED` with a priority-ordered guard chain: completing the last chord group wins over completing a non-last group, which wins over simply accumulating the note. Wrong notes fall through all guards and are silently ignored.

``` {.typescript file=_generated/machines/gameMachine.ts}
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
