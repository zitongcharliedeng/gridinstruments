import { setup, assign } from 'xstate';

type PanelEvent =
  | { type: 'DRAG_START'; clientY: number }
  | { type: 'DRAG_MOVE'; clientY: number }
  | { type: 'DRAG_END' }
  | { type: 'DBLCLICK' }
  | { type: 'TOGGLE' }
  | { type: 'RESIZE_STEP'; grow: boolean };

interface PanelContext {
  height: number;
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  dirUp: boolean;
  dragStartY: number;
  dragStartH: number;
}

interface PanelInput {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  dirUp: boolean;
  initialHeight: number;
  startCollapsed: boolean;
}

export function clampPanelHeight(h: number, min: number, max: number): number {
  const dynamicMax = Math.min(max, Math.floor(window.innerHeight * 0.6));
  return Math.max(min, Math.min(dynamicMax, h));
}

export const panelMachine = setup({
  types: {
    context: {} as PanelContext,
    events: {} as PanelEvent,
    input: {} as PanelInput,
  },
  guards: {
    isInitCollapsed: ({ context }) => context.height <= 0,
    belowThreshold: ({ context }) => context.height <= context.minHeight + 10,
  },
}).createMachine({
  id: 'panel',
  context: ({ input }) => ({
    height: input.startCollapsed ? 0 : clampPanelHeight(input.initialHeight, input.minHeight, input.maxHeight),
    defaultHeight: input.defaultHeight,
    minHeight: input.minHeight,
    maxHeight: input.maxHeight,
    dirUp: input.dirUp,
    dragStartY: 0,
    dragStartH: 0,
  }),
  initial: 'routing',
  states: {
    routing: {
      always: [
        { guard: 'isInitCollapsed', target: 'collapsed' },
        { target: 'idle' },
      ],
    },
    idle: {
      on: {
        DRAG_START: {
          target: 'dragging',
          actions: assign(({ context, event }) => ({
            dragStartY: event.clientY,
            dragStartH: context.height,
          })),
        },
        TOGGLE: { target: 'collapsed' },
        DBLCLICK: {
          actions: assign(({ context }) => ({
            height: clampPanelHeight(context.defaultHeight, context.minHeight, context.maxHeight),
          })),
        },
        RESIZE_STEP: {
          actions: assign(({ context, event }) => ({
            height: clampPanelHeight(
              context.height + (event.grow ? 10 : -10),
              context.minHeight,
              context.maxHeight,
            ),
          })),
        },
      },
    },
    collapsed: {
      on: {
        DRAG_START: {
          target: 'dragging',
          actions: assign(({ context, event }) => ({
            dragStartY: event.clientY,
            dragStartH: context.minHeight,
            height: context.minHeight,
          })),
        },
        TOGGLE: {
          target: 'idle',
          actions: assign(({ context }) => ({
            height: clampPanelHeight(context.defaultHeight, context.minHeight, context.maxHeight),
          })),
        },
        DBLCLICK: {
          target: 'idle',
          actions: assign(({ context }) => ({
            height: clampPanelHeight(context.defaultHeight, context.minHeight, context.maxHeight),
          })),
        },
      },
    },
    dragging: {
      on: {
        DRAG_MOVE: {
          actions: assign(({ context, event }) => {
            const delta = context.dirUp
              ? context.dragStartY - event.clientY
              : event.clientY - context.dragStartY;
            return {
              height: clampPanelHeight(
                context.dragStartH + delta,
                context.minHeight,
                context.maxHeight,
              ),
            };
          }),
        },
        DRAG_END: [
          { guard: 'belowThreshold', target: 'collapsed' },
          { target: 'idle' },
        ],
      },
    },
  },
});
