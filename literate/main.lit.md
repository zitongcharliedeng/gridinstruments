# Main Entry Point

DCompose Web entry point — wires together MIDI, synth, keyboard, history visualizer, and
XState actors.

## Imports

CSS side-effect imports come first so Vite can tree-shake them correctly.

``` {.typescript file=_generated/main.ts}
import 'overlayscrollbars/overlayscrollbars.css';
import 'slim-select/styles';
import './ui-overrides.css';
```

Content and external imports.

``` {.typescript file=_generated/main.ts}
import agentsText from '../AGENTS.md?raw';

import { createActor } from 'xstate';
```

Internal machine and app module imports.

``` {.typescript file=_generated/main.ts}
import { dialogMachine } from './machines/dialogMachine';

import { renderMarkdown } from './app-helpers';
import { createSelectAtSlot, setupCyclingButton } from './app-dom';
import { setupInfoDialogs } from './app-slider';
import { DComposeApp } from './app-core';
import { setupPanelHandles } from './app-panels';
import { setupAppActor } from './app-actor-wiring';
```

## DOMContentLoaded

Everything runs inside a `DOMContentLoaded` listener so the DOM is guaranteed to be ready
before any element lookups occur.

### Layout persistence guards

Purge saved panel heights that exceed 60 % of the current viewport — prevents a restored
layout from making panels unresizably tall on a smaller screen.

``` {.typescript file=_generated/main.ts}
document.addEventListener('DOMContentLoaded', () => {
  if (parseInt(localStorage.getItem('gi_visualiser_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_visualiser_h');
  if (parseInt(localStorage.getItem('gi_pedals_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_pedals_h');
```

### Reset layout button

Clears all `gi_*` localStorage keys and reloads the page.

``` {.typescript file=_generated/main.ts}
  document.getElementById('reset-layout')?.addEventListener('click', () => {
    Object.keys(localStorage).filter(k => k.startsWith('gi_')).forEach(k => { localStorage.removeItem(k); });
    location.reload();
  });
```

### Panel resize handles and zoom prevention

``` {.typescript file=_generated/main.ts}
  setupPanelHandles();

  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => { e.preventDefault(); });
  document.addEventListener('gesturechange', (e) => { e.preventDefault(); });
```

### Escape closes overlay

Delegates to the overlay actor if it is in the `visible` state.

``` {.typescript file=_generated/main.ts}
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const actor = (window as Window & { overlayActor?: { send: (e: { type: string }) => void; getSnapshot: () => { matches: (s: string) => boolean } } }).overlayActor;
      if (actor?.getSnapshot().matches('visible')) {
        actor.send({ type: 'CLOSE' });
      }
    }
  });
```

### About dialog

Uses the `dialogMachine` XState actor. The `AGENTS.md` file is imported as raw text and
rendered to HTML once at startup.

``` {.typescript file=_generated/main.ts}
  const aboutBtn = document.getElementById('about-btn');
  const aboutDialog = document.getElementById('about-dialog');
  const aboutClose = document.getElementById('about-close');
  const aboutContentEl = document.getElementById('about-content');
  if (aboutDialog instanceof HTMLDialogElement) {
    const aboutRendered = renderMarkdown(agentsText);
    const aboutDialogActor = createActor(dialogMachine);
    aboutDialogActor.subscribe((snapshot) => {
      if (snapshot.matches('open')) {
        if (aboutContentEl) aboutContentEl.innerHTML = snapshot.context.content;
        aboutDialog.showModal();
      } else {
        aboutDialog.close();
      }
    });
    aboutDialogActor.start();

    aboutBtn?.addEventListener('click', () => {
      aboutDialogActor.send({ type: 'OPEN', content: aboutRendered });
    });
    aboutClose?.addEventListener('click', () => { aboutDialogActor.send({ type: 'CLOSE' }); });
    aboutDialog.addEventListener('click', (e) => {
      if (e.target === aboutDialog) aboutDialogActor.send({ type: 'CLOSE' });
    });
  }
```

### Info dialogs

``` {.typescript file=_generated/main.ts}
  setupInfoDialogs();
```

### Dynamic `<select>` elements

`<select>` elements are created in JS rather than HTML to satisfy the ast-grep
`no-raw-select-in-html` rule.

``` {.typescript file=_generated/main.ts}
  createSelectAtSlot('wave-select-slot', 'wave-select', [
    { value: 'sawtooth', text: 'SAW' },
    { value: 'sine', text: 'SIN' },
    { value: 'square', text: 'SQR' },
    { value: 'triangle', text: 'TRI' },
  ], { title: 'Select waveform (sawtooth/sine/square/triangle)' });

  createSelectAtSlot('layout-select-slot', 'layout-select', [], {
    title: 'Select keyboard physical layout',
  });

  createSelectAtSlot('mpe-output-select-slot', 'mpe-output-select', [
    { value: '', text: 'No MIDI outputs' },
  ], { style: 'min-width:120px;', disabled: '' });
```

### Quantization cycling button

``` {.typescript file=_generated/main.ts}
  setupCyclingButton('quantization-level', [
    { value: 'none', label: 'None' },
    { value: '1/4', label: '1/4' },
    { value: '1/8', label: '1/8' },
    { value: '1/16', label: '1/16' },
  ], 'none', () => { /* value read on-demand by loadMidiFromBuffer */ });
```

### App creation and actor wiring

``` {.typescript file=_generated/main.ts}
  const app = new DComposeApp();
  setupAppActor(app);
});
```
