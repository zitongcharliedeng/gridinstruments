# Main Entry Point

DCompose Web entry point — wires together MIDI, synth, keyboard, history visualizer, and XState actors.

``` {.typescript file=_generated/main.ts}
/**
 * DCompose Web — Entry Point
 *
 * Wires together:
 * - Web MIDI input (MidiInput) with per-device management
 * - MPE output (MpeOutput) for external synthesizers
 * - Isomorphic keyboard (KeyboardVisualizer) with skew slider
 * - Note history + waterfall + chord panel (NoteHistoryVisualizer)
 * - Keyboard layout dropdown (isomorphic-qwerty variants)
 * - Web Audio synth (Synth)
 *
 * TODO — Future Features:
 *
 * 1. GHOST OVERLAY / SONG LEARNING MODE
 *    - Link user's videos and covers as ghost overlay on the keyboard grid
 *    - Notes play as semi-transparent falling blocks (like Guitar Hero / Synthesia)
 *    - For non-MIDI conversions: audio-to-note analysis or manual charting
 *    - Each linked song is confirmed human-playable (played by the author)
 *    - Could also accept MIDI files for direct overlay
 *
 * 2. FULLSCREEN GRID MODE
 *    - Option to expand keyboard grid to fill entire viewport (100vh)
 *    - Hide controls strip, history panel, title bar — maximum play surface
 *    - Essential for touchscreen tablet performance use
 *    - Toggle via button or keyboard shortcut (e.g. F11 or double-tap)
 *
 * 3. CHORD VISUALIZER OVERLAY (FULLSCREEN)
 *    - In fullscreen grid mode, optionally overlay the chord visualizer component
 *    - Render with low opacity ("dryly") so it doesn't obscure the keys
 *    - Shows detected chord names / shapes without leaving fullscreen
 */

// CSS side-effect imports
import 'overlayscrollbars/overlayscrollbars.css';
import 'slim-select/styles';
import './ui-overrides.css';

// Content imports
import agentsText from '../AGENTS.md?raw';

// External
import { createActor } from 'xstate';

// Machines
import { dialogMachine } from './machines/dialogMachine';

// App modules
import { renderMarkdown } from './app-helpers';
import { createSelectAtSlot, setupCyclingButton } from './app-dom';
import { setupInfoDialogs } from './app-slider';
import { DComposeApp } from './app-core';
import { setupPanelHandles } from './app-panels';
import { setupAppActor } from './app-actor-wiring';

document.addEventListener('DOMContentLoaded', () => {
  if (parseInt(localStorage.getItem('gi_visualiser_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_visualiser_h');
  if (parseInt(localStorage.getItem('gi_pedals_h') ?? '0', 10) > window.innerHeight * 0.6) localStorage.removeItem('gi_pedals_h');

  document.getElementById('reset-layout')?.addEventListener('click', () => {
    Object.keys(localStorage).filter(k => k.startsWith('gi_')).forEach(k => { localStorage.removeItem(k); });
    location.reload();
  });

  // Panel resize handles
  setupPanelHandles();

  // Prevent pinch zoom
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => { e.preventDefault(); });
  document.addEventListener('gesturechange', (e) => { e.preventDefault(); });

  // Escape closes overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const actor = (window as Window & { overlayActor?: { send: (e: { type: string }) => void; getSnapshot: () => { matches: (s: string) => boolean } } }).overlayActor;
      if (actor?.getSnapshot().matches('visible')) {
        actor.send({ type: 'CLOSE' });
      }
    }
  });

  // About dialog — XState actor
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

  setupInfoDialogs();

  // ─── Create <select> elements in JS (banned in HTML by ast-grep rule) ─────
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

  // ─── Set up quantization cycling button ──────────────────────────────────
  setupCyclingButton('quantization-level', [
    { value: 'none', label: 'None' },
    { value: '1/4', label: '1/4' },
    { value: '1/8', label: '1/8' },
    { value: '1/16', label: '1/16' },
  ], 'none', () => { /* value read on-demand by loadMidiFromBuffer */ });

  // ─── Create app and wire XState actor ─────────────────────────────────────
  const app = new DComposeApp();
  setupAppActor(app);
});
```
