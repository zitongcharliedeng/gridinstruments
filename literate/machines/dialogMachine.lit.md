# Dialog Machine

XState machine for managing a modal dialog with open/close states and content context.

``` {.typescript file=src/machines/dialogMachine.ts}
import { setup, assign } from 'xstate';

type DialogEvent =
  | { type: 'OPEN'; content: string }
  | { type: 'CLOSE' };

interface DialogContext {
  content: string;
}

export const dialogMachine = setup({
  types: {
    context: {} as DialogContext,
    events: {} as DialogEvent,
  },
}).createMachine({
  id: 'dialog',
  initial: 'closed',
  context: { content: '' },
  states: {
    closed: {
      on: {
        OPEN: {
          target: 'open',
          actions: assign({ content: ({ event }) => event.content }),
        },
      },
    },
    open: {
      on: { CLOSE: 'closed' },
    },
  },
});
```
