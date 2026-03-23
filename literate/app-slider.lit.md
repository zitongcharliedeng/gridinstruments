# App Slider

Slider UI helpers — thumb positioning, fill gradients, badge clamping, and info dialog wiring.

## Imports

``` {.typescript file=_generated/app-slider.ts}
import { SLIDER_INFO } from './app-constants';
import { createActor } from 'xstate';
import { dialogMachine } from './machines/dialogMachine';
```

## Slider CSS

All slider styling lives here — co-located with the slider logic. Injected once
on first use via `injectSliderCSS()`. Covers range input thumb/track, `.slider-track`
layout, label overlay, value badge, editable badge-input, reset button, and TET
preset marks.

``` {.typescript file=_generated/app-slider.ts}

const SLIDER_CSS = `input[type="range"] {
  padding: 0; height: 18px; border: none; cursor: pointer;
  background: #000; -webkit-appearance: none; appearance: none;
}
input[type="range"]::-webkit-slider-runnable-track { height: 18px; background: inherit; }
input[type="range"]::-moz-range-track { height: 18px; background: inherit; border: none; }
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 6px; height: 18px; background: var(--fg); cursor: grab;
}
input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }
input[type="range"]::-moz-range-thumb {
  width: 6px; height: 18px; background: var(--fg); cursor: grab; border: none; border-radius: 0;
}
input[type="range"]::-moz-range-thumb:active { cursor: grabbing; }
.slider-track {
  position: relative; display: flex; align-items: center; gap: 2px; overflow: visible;
}
.slider-track input[type="range"] { flex: 1; min-width: 0; margin: 0; }
.slider-label-overlay {
  position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
  font-size: 9px; color: #fff; mix-blend-mode: difference; text-transform: uppercase;
  letter-spacing: 0.06em; pointer-events: none; z-index: 1; white-space: nowrap;
  line-height: 1; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 30px);
}
.slider-value-badge {
  position: absolute; bottom: 100%; transform: translateX(-50%);
  font-size: 9px; color: #fff; background: none; padding: 0 3px;
  white-space: nowrap; z-index: 2; line-height: 14px; height: 14px;
  pointer-events: none; text-align: center; font-family: var(--font);
}
input.badge-input {
  position: absolute; bottom: 100%; transform: translateX(-50%);
  font-size: 9px; color: #fff; background: none; padding: 0 3px;
  white-space: nowrap; z-index: 2; line-height: 14px; height: 14px;
  text-align: center; font-family: var(--font); border: 1px solid var(--border);
  width: 50px; pointer-events: auto; cursor: text; outline: none;
}
input.badge-input:focus { border-color: var(--accent); background: var(--subtle); }
input.badge-input:invalid { border-color: #cc3333; }
.slider-reset {
  color: var(--dim); background: var(--bg); border: 1px solid var(--border);
  width: 22px; height: 18px; padding: 0; flex-shrink: 0; margin-left: 2px;
}
.slider-reset:hover { color: var(--fg); border-color: var(--accent); }
.tuning-slider-area .slider-track { width: 100%; }
.slider-presets {
  position: absolute; left: 0; right: 24px; top: 100%;
  pointer-events: none; overflow: visible; min-height: 32px; padding-bottom: 4px;
}
.slider-preset-mark {
  position: absolute; transform: translateX(-50%); display: flex;
  flex-direction: column; align-items: center; pointer-events: none; top: 0;
}
.slider-tick { width: 1px; background: #666; }
.slider-tick-long { height: 14px; }
.slider-tick-staggered { height: 24px; }
.slider-tick-staggered + .slider-preset-btn { margin-top: 1px; }
.slider-preset-btn {
  font-family: var(--font); font-size: 8px; color: var(--dim);
  background: none; border: none; cursor: pointer; pointer-events: auto;
  padding: 2px; line-height: 1;
}
.slider-preset-btn:hover { color: var(--fg); }
.slider-preset-btn.active { color: #4f4; text-decoration: underline; }
.slider-preset-mark.active .slider-tick { background: #4f4; }
.slider-preset-mark.active .slider-preset-btn { color: #4f4; }
.tuning-slider-area { position: relative; }
.tuning-slider-area .ctrl-group { display: flex; align-items: center; gap: 5px; }
.tuning-slider-area .ctrl-group .slider-track { flex: 1; min-width: 0; }
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
dialog {
  background: var(--bg); color: var(--fg); border: 1px solid var(--border);
  padding: 24px; max-width: 560px; width: 90%; max-height: 80vh;
  overflow-y: auto; font-family: var(--font);
}
dialog::backdrop { background: rgba(0,0,0,0.7); }
#info-dialog, #about-dialog {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  max-width: min(90vw, 600px); max-height: 80vh; overflow-y: auto;
  border: 1px solid var(--border);
}
dialog button { position: absolute; top: 8px; right: 12px; color: var(--dim); }
dialog button:hover { color: var(--fg); }`;

let sliderCssInjected = false;
function injectSliderCSS(): void {
  if (sliderCssInjected) return;
  const s = document.createElement('style');
  s.textContent = SLIDER_CSS;
  document.head.appendChild(s);
  sliderCssInjected = true;
}
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
  injectSliderCSS();
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
      const key = btn.dataset.info;
      const content = (key && SLIDER_INFO[key]) ?? '';
      infoDialogActor.send({ type: 'OPEN', content });
    });
  });

  closeBtn?.addEventListener('click', () => { infoDialogActor.send({ type: 'CLOSE' }); });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) infoDialogActor.send({ type: 'CLOSE' });
  });
}
```
