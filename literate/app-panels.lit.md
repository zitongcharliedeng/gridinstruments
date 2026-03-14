# App Panels

Panel resize handle setup — drag-to-resize for visualiser and pedals panels using XState panel machine actors.

``` {.typescript file=_generated/app-panels.ts}
/**
 * Panel resize handle setup — drag-to-resize for visualiser and pedals panels.
 */

import { createActor } from 'xstate';
import { panelMachine, clampPanelHeight } from './machines/panelMachine';

export function setupPanelHandles(): void {
  document.querySelectorAll<HTMLElement>('.panel-resize-handle').forEach(handle => {
    const targetId = handle.dataset.target;
    const minH = parseInt(handle.dataset.min ?? '40', 10);
    const dataMax = parseInt(handle.dataset.max ?? '600', 10);
    const defaultH = parseInt(handle.dataset.default ?? '120', 10);
    const storageKey = handle.dataset.key;
    const hiddenKey = handle.dataset.hiddenKey;
    const dirUp = handle.dataset.direction === 'up';
    const panel = targetId ? document.getElementById(targetId) : null;
    if (!panel) return;

    const savedHeight = storageKey ? parseInt(localStorage.getItem(storageKey) ?? '0', 10) : 0;
    const startCollapsed = hiddenKey ? localStorage.getItem(hiddenKey) === 'true' : false;

    const actor = createActor(panelMachine, {
      input: {
        defaultHeight: defaultH,
        minHeight: minH,
        maxHeight: dataMax,
        dirUp,
        initialHeight: savedHeight > 0 ? savedHeight : defaultH,
        startCollapsed,
      },
    });

    let prevState = '';
    actor.subscribe((snapshot) => {
      const state = snapshot.value as string;
      if (state === 'routing') return;
      const { height } = snapshot.context;
      const isCollapsed = state === 'collapsed';
      const isDragging = state === 'dragging';

      panel.classList.toggle('collapsed', isCollapsed);
      handle.classList.toggle('dragging', isDragging);
      panel.style.transition = isDragging ? 'none' : '';

      if (isCollapsed) {
        panel.style.height = '';
      } else {
        panel.style.height = `${clampPanelHeight(height, minH, dataMax)}px`;
      }

      if (state !== prevState && !isDragging) {
        if (storageKey) {
          try { localStorage.setItem(storageKey, isCollapsed ? '0' : Math.round(height).toString()); } catch { /* */ }
        }
        if (hiddenKey) {
          try { localStorage.setItem(hiddenKey, isCollapsed ? 'true' : 'false'); } catch { /* */ }
        }
        if (isCollapsed && document.activeElement === handle) handle.focus();
      }
      if (state === 'idle' && prevState === 'dragging' && storageKey) {
        try { localStorage.setItem(storageKey, Math.round(height).toString()); } catch { /* */ }
      }
      prevState = state;
    });
    actor.start();

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch { /* synthetic events in tests may lack active pointer registration */ }
      actor.send({ type: 'DRAG_START', clientY: e.clientY });
    });
    handle.addEventListener('pointermove', (e: PointerEvent) => {
      if (!actor.getSnapshot().matches('dragging')) return;
      actor.send({ type: 'DRAG_MOVE', clientY: e.clientY });
    });
    const stopDrag = (): void => {
      if (!actor.getSnapshot().matches('dragging')) return;
      actor.send({ type: 'DRAG_END' });
    };
    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);

    handle.addEventListener('dblclick', () => {
      actor.send({ type: 'DBLCLICK' });
    });

    handle.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const grow = dirUp ? e.key === 'ArrowUp' : e.key === 'ArrowDown';
        actor.send({ type: 'RESIZE_STEP', grow });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        actor.send({ type: 'TOGGLE' });
      }
    });
  });
}
```
