/**
 * DCompose Input Actors
 *
 * XState v5 fromCallback actors that translate raw DOM events into typed
 * AppMachine events. These actors do NOT handle note logic — they purely
 * bridge the DOM to the state machine event bus.
 *
 * Dual-cleanup pattern per XState fromCallback bug #5433:
 *   receive((e) => { if (e.type === 'CLEANUP') removeListeners(); })
 *   return () => removeListeners();
 *
 * These actors are exported but NOT yet invoked by appMachine.ts.
 * Invocation happens in Task 10.
 */

import { fromCallback } from 'xstate';
import type {
  KeyDownEvent,
  KeyUpEvent,
  PointerDownEvent,
  PointerMoveEvent,
  PointerUpEvent,
  WindowResizeEvent,
  WindowBlurEvent,
} from './types';

// ─── Internal cleanup event ──────────────────────────────────────────────────

/** Sent to an actor to request manual listener teardown (dual-cleanup pattern). */
type CleanupEvent = { type: 'CLEANUP' };

// ─── keyboardListener ────────────────────────────────────────────────────────

/**
 * Listens for keydown/keyup on `document` and sends KEY_DOWN/KEY_UP events
 * to the parent machine.
 *
 * Filters:
 *   - Repeated keys (`e.repeat === true`)
 *   - Events originating in HTMLInputElement or HTMLSelectElement
 */
export const keyboardListener = fromCallback<CleanupEvent>(
  ({ sendBack, receive }) => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      ) return;
      const event: KeyDownEvent = { type: 'KEY_DOWN', code: e.code, key: e.key };
      sendBack(event);
    };

    const onKeyUp = (e: KeyboardEvent): void => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      ) return;
      const event: KeyUpEvent = { type: 'KEY_UP', code: e.code, key: e.key };
      sendBack(event);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Dual cleanup: receive() for manual CLEANUP + return function as backup
    receive((event) => {
      if (event.type === 'CLEANUP') {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup', onKeyUp);
      }
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  },
);

// ─── pointerListener ─────────────────────────────────────────────────────────

/** Input required by pointerListener. */
export interface PointerListenerInput {
  /** The keyboard canvas to attach pointer listeners to. */
  canvas: HTMLCanvasElement;
}

/** Pixel displacement threshold — approximate cell-boundary detection. */
const POSITION_THRESHOLD = 3;
/** Pressure delta threshold for re-sending POINTER_MOVE. */
const PRESSURE_THRESHOLD = 0.05;

/**
 * Attaches pointer event listeners to the provided canvas and sends
 * POINTER_DOWN, POINTER_MOVE (throttled), and POINTER_UP events to the
 * parent machine.
 *
 * Raw pointermove events are NOT forwarded verbatim. POINTER_MOVE is only
 * sent when the pointer crosses an approximate cell boundary (>3 px
 * displacement) OR pressure changes by more than 0.05 — preventing the
 * >30 Hz XState event flood anti-pattern.
 *
 * pointerleave and pointercancel are mapped to POINTER_UP so the machine
 * always receives a clean terminal event for every active pointer.
 */
export const pointerListener = fromCallback<CleanupEvent, PointerListenerInput>(
  ({ sendBack, receive, input }) => {
    const { canvas } = input;

    /** Per-pointer last-sent state for move throttling. */
    const lastSent = new Map<number, { x: number; y: number; pressure: number }>();

    const getCanvasCoords = (e: PointerEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onPointerDown = (e: PointerEvent): void => {
      const { x, y } = getCanvasCoords(e);
      lastSent.set(e.pointerId, { x, y, pressure: e.pressure });
      const event: PointerDownEvent = {
        type: 'POINTER_DOWN',
        pointerId: e.pointerId,
        x,
        y,
        pressure: e.pressure,
        pointerType: e.pointerType,
      };
      sendBack(event);
    };

    const onPointerMove = (e: PointerEvent): void => {
      const last = lastSent.get(e.pointerId);
      if (!last) return; // no active pointer down — ignore hover

      const { x, y } = getCanvasCoords(e);
      const dx = Math.abs(x - last.x);
      const dy = Math.abs(y - last.y);
      const dp = Math.abs(e.pressure - last.pressure);

      if (
        dx > POSITION_THRESHOLD ||
        dy > POSITION_THRESHOLD ||
        dp > PRESSURE_THRESHOLD
      ) {
        lastSent.set(e.pointerId, { x, y, pressure: e.pressure });
        const event: PointerMoveEvent = {
          type: 'POINTER_MOVE',
          pointerId: e.pointerId,
          x,
          y,
          pressure: e.pressure,
        };
        sendBack(event);
      }
    };

    const onPointerUp = (e: PointerEvent): void => {
      lastSent.delete(e.pointerId);
      const event: PointerUpEvent = { type: 'POINTER_UP', pointerId: e.pointerId };
      sendBack(event);
    };

    const onPointerLeave = (e: PointerEvent): void => {
      lastSent.delete(e.pointerId);
      const event: PointerUpEvent = { type: 'POINTER_UP', pointerId: e.pointerId };
      sendBack(event);
    };

    const onPointerCancel = (e: PointerEvent): void => {
      lastSent.delete(e.pointerId);
      const event: PointerUpEvent = { type: 'POINTER_UP', pointerId: e.pointerId };
      sendBack(event);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointercancel', onPointerCancel);

    const removeListeners = (): void => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    };

    // Dual cleanup: receive() for manual CLEANUP + return function as backup
    receive((event) => {
      if (event.type === 'CLEANUP') {
        removeListeners();
        lastSent.clear();
      }
    });

    return () => {
      removeListeners();
      lastSent.clear();
    };
  },
);

// ─── windowListener ───────────────────────────────────────────────────────────

/**
 * Listens for window resize and blur events and sends WINDOW_RESIZE and
 * WINDOW_BLUR events to the parent machine.
 *
 * WINDOW_BLUR is used to stop all active notes when the application loses
 * focus (e.g., Alt+Tab).
 */
export const windowListener = fromCallback<CleanupEvent>(
  ({ sendBack, receive }) => {
    const onResize = (): void => {
      const event: WindowResizeEvent = {
        type: 'WINDOW_RESIZE',
        width: window.innerWidth,
        height: window.innerHeight,
      };
      sendBack(event);
    };

    const onBlur = (): void => {
      const event: WindowBlurEvent = { type: 'WINDOW_BLUR' };
      sendBack(event);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('blur', onBlur);

    // Dual cleanup: receive() for manual CLEANUP + return function as backup
    receive((event) => {
      if (event.type === 'CLEANUP') {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('blur', onBlur);
      }
    });

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onBlur);
    };
  },
);
