# Dialog Machine

A modal dialog machine with two states: `closed` and `open`. When opened, the dialog stores the content string it was given so the view can render it without needing to re-query the event.

## Types

The context holds a single `content` string. The event union covers `OPEN` (which carries the content payload) and `CLOSE`.

``` {.typescript file=_generated/machines/dialogMachine.ts}
import { setup, assign } from 'xstate';

type DialogEvent =
  | { type: 'OPEN'; content: string }
  | { type: 'CLOSE' };

interface DialogContext {
  content: string;
}
```

## Machine

From `closed`, an `OPEN` event transitions to `open` and assigns the incoming `content` into context. From `open`, `CLOSE` returns to `closed`. The content string is preserved in context while open so the view does not need to re-read the triggering event.

``` {.typescript file=_generated/machines/dialogMachine.ts}
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
