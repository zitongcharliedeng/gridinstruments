# App Slider

Slider UI helpers — thumb positioning, fill gradients, badge clamping, and info dialog wiring.

## Imports

``` {.typescript file=_generated/app-slider.ts}
const SLIDER_INFO: Record<string, string> = {};
import { createActor } from 'xstate';
import { dialogMachine } from './machines/dialogMachine';
```

## Tuning Slider Area Layout

The `.tuning-slider-area` wrapper provides `position: relative` for preset
marks. The `.ctrl-group` inside it arranges the info button and slider track.

``` {.css file=_generated/app-slider.css}
.tuning-slider-area { position: relative; }
.tuning-slider-area .ctrl-group { display: flex; align-items: center; gap: 5px; }
.tuning-slider-area .ctrl-group .slider-row { flex: 1; min-width: 0; }
.tuning-slider-area .slider-row { width: 100%; }
```

## Dialog Styling

Info and about dialogs use the same dark theme. Centered via fixed
positioning with transform. The backdrop dims the page.

``` {.css file=_generated/app-slider.css}
dialog {
  background: var(--bg); color: var(--fg); border: 1px solid var(--border);
  padding: 24px; max-width: 560px; width: 90%; max-height: 80vh;
  overflow-y: auto; font-family: var(--font);
}
dialog::backdrop { background: rgba(0,0,0,0.7); }
#info-dialog, #about-dialog {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  max-width: min(90vw, 600px); max-height: 80vh; overflow: hidden;
  border: 1px solid var(--border); display: flex; flex-direction: column;
}
#about-close, #info-close { position: absolute; top: 8px; right: 12px; color: var(--dim); z-index: 2; }
#about-close:hover, #info-close:hover { color: var(--fg); }
.about-content { overflow-y: auto; flex: 1; padding-right: 8px; }
```

## About Dialog Content

Typography for the about dialog's markdown-rendered content.

``` {.css file=_generated/app-slider.css}
.about-content h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent, #4af); margin: 24px 0 8px; border-bottom: 1px solid #222; padding-bottom: 4px; }
.about-content h3 { font-size: 12px; color: #aaa; margin: 16px 0 4px; }
.about-content p { font-size: 12px; line-height: 1.6; color: #ccc; margin: 8px 0; }
.about-content ul { margin: 8px 0; padding-left: 16px; }
.about-content li { font-size: 12px; line-height: 1.6; color: #ccc; margin: 2px 0; }
.about-content a { color: var(--accent, #4af); text-decoration: none; }
.about-content a:hover { text-decoration: underline; }
.about-content code { font-size: 11px; color: #f9a; background: #1a1a1a; padding: 1px 4px; }
.about-content table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.about-content td { padding: 4px 8px; border-bottom: 1px solid #222; font-size: 11px; color: #ccc; }
.about-content td:first-child { white-space: nowrap; }
```

## Game Overlays

Score overlay and tuning warning banner for game mode. These used to be
inline styles on dynamically created DOM elements — now they're CSS
classes so the JS just sets `className` instead of `style.cssText`.

``` {.css file=_generated/app-slider.css}
#game-score-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: var(--font); color: #fff;
}
#game-score-overlay .score-heading { font-size: 48px; font-weight: 700; margin-bottom: 16px; }
#game-score-overlay .score-time { font-size: 24px; color: #888; margin-bottom: 32px; }
#game-score-overlay .score-btn {
  font-family: var(--font); font-size: 14px; color: #fff; background: #000;
  border: 1px solid #333; padding: 12px 24px; cursor: pointer;
}
#game-score-overlay .score-btn:hover { border-color: var(--fg); }
#game-tuning-warning {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  background: #000; color: #fff; font-family: var(--font); font-size: 12px;
  padding: 8px 16px; text-align: center; border-bottom: 1px solid #333; cursor: pointer;
}
```

## Imports

``` {.typescript file=_generated/app-slider.ts}
import './app-slider.css';
```

## Legacy Imperative Helpers (removed)

`thumbCenterPx`, `clampBadgePosition`, `applySliderFill`, and `refreshAllSliderUI`
were imperative DOM helpers for slider fill gradients and badge positioning. They are
no longer needed — SliderRow handles all display reactively via SolidJS signals.

``` {.typescript file=_generated/app-slider.ts}
```

## Info Dialogs

`setupInfoDialogs` wires each `.slider-info-btn` to an XState `dialogMachine` actor. Clicking a button sends `OPEN` with the matching HTML content from `SLIDER_INFO`. Clicking close, or clicking the backdrop, sends `CLOSE`.

``` {.typescript file=_generated/app-slider.ts}
export function setupInfoDialogs(): void {
  const dialog = document.getElementById('info-dialog');
  const closeBtn = document.getElementById('info-close');
  const contentEl = document.getElementById('info-content');
  if (!(dialog instanceof HTMLDialogElement)) return;

  let activeInfoBtn: HTMLButtonElement | null = null;

  const infoDialogActor = createActor(dialogMachine);
  infoDialogActor.subscribe((snapshot) => {
    if (snapshot.matches('open')) {
      if (contentEl) contentEl.innerHTML = snapshot.context.content;
      dialog.showModal();
    } else {
      dialog.close();
      if (activeInfoBtn) {
        activeInfoBtn.classList.remove('active');
        activeInfoBtn = null;
      }
    }
  });
  infoDialogActor.start();

  document.querySelectorAll<HTMLButtonElement>('.slider-info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (activeInfoBtn) activeInfoBtn.classList.remove('active');
      activeInfoBtn = btn;
      btn.classList.add('active');
      const inline = btn.dataset.infoContent;
      const key = btn.dataset.info;
      const content = inline ?? (key && SLIDER_INFO[key]) ?? '';
      infoDialogActor.send({ type: 'OPEN', content });
    });
  });

  closeBtn?.addEventListener('click', () => { infoDialogActor.send({ type: 'CLOSE' }); });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) infoDialogActor.send({ type: 'CLOSE' });
  });
}
```
