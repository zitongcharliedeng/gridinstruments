# App Slider

Slider UI helpers — thumb positioning, fill gradients, badge clamping, and info dialog wiring.

## Imports

``` {.typescript file=_generated/app-slider.ts}
import { parseNum } from './app-helpers';
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
  text-align: center; font-family: var(--font); border: 1px solid transparent;
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
.tet-presets, .slider-presets {
  position: absolute; left: 18px; right: 26px; top: 100%;
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
.tuning-slider-area .slider-info-btn { position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
.tuning-slider-area .slider-track { margin-left: 18px; width: calc(100% - 18px); }
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

## Thumb Center Calculation

`thumbCenterPx` computes the pixel offset of the thumb center given a normalised ratio (0–1) and the slider element. The thumb is 3 px wide; the track's effective travel is `offsetWidth - thumbW`, so the center sits at `ratio * travel + thumbW/2`.

``` {.typescript file=_generated/app-slider.ts}
export function thumbCenterPx(ratio: number, slider: HTMLInputElement): number {
  const thumbW = 3;
  const trackW = slider.offsetWidth;
  return trackW > 0
    ? ratio * (trackW - thumbW) + thumbW / 2
    : 0;
}
```

## Badge Position Clamping

Badges use `transform: translateX(-50%)`, so their left offset equals the thumb center. `clampBadgePosition` keeps the badge fully inside the slider by constraining the center to `[halfBadgeW, trackW - halfBadgeW]`.

``` {.typescript file=_generated/app-slider.ts}
export function clampBadgePosition(centerPx: number, slider: HTMLInputElement, badgeWidth = 50): number {
  const trackW = slider.offsetWidth;
  if (trackW <= 0) return centerPx;
  const halfBadgeW = badgeWidth / 2;
  return Math.max(halfBadgeW, Math.min(trackW - halfBadgeW, centerPx));
}
```

## Slider Fill Gradient

`applySliderFill` paints a `linear-gradient` on the range input so the filled portion uses `--fg` and the empty portion uses `#000`. The fill percentage is derived from the thumb center rather than the raw value ratio so it aligns pixel-perfectly with the thumb.

``` {.typescript file=_generated/app-slider.ts}
export function applySliderFill(slider: HTMLInputElement): void {
  injectSliderCSS();
  const min = parseNum(slider.min, 0);
  const max = parseNum(slider.max, 100);
  const val = parseNum(slider.value, 0);
  const ratio = (val - min) / (max - min);
  const trackW = slider.offsetWidth;
  if (trackW > 0) {
    const fillPct = (thumbCenterPx(ratio, slider) / trackW) * 100;
    slider.style.background = `linear-gradient(to right, var(--fg) ${fillPct.toFixed(2)}%, #000 ${fillPct.toFixed(2)}%)`;
  } else {
    const pct = ratio * 100;
    slider.style.background = `linear-gradient(to right, var(--fg) ${pct.toFixed(2)}%, #000 ${pct.toFixed(2)}%)`;
  }
}
```

## Bulk Slider Refresh

`refreshAllSliderUI` recalculates fills and badge positions for every overlay slider. It must be called when the overlay becomes visible because `offsetWidth` returns 0 while `display: none`, making any earlier fill calculations incorrect.

``` {.typescript file=_generated/app-slider.ts}
export function refreshAllSliderUI(): void {
  const sliderBadgePairs: [string, string | null, number][] = [
    ['skew-slider', 'skew-thumb-badge', 50],
    ['bfact-slider', 'bfact-thumb-badge', 50],
    ['tuning-slider', 'tuning-thumb-badge', 50],
    ['volume-slider', 'volume-thumb-badge', 50],
    ['zoom-slider', 'zoom-thumb-badge', 50],
    ['d-ref-slider', 'd-ref-input', 80],
  ];
  for (const [sliderId, badgeId, badgeWidth] of sliderBadgePairs) {
    const slider = document.querySelector<HTMLInputElement>(`#${sliderId}`);
    if (!slider) continue;
    applySliderFill(slider);
    if (badgeId) {
      const badge = document.getElementById(badgeId);
      if (badge) {
        const min = parseNum(slider.min, 0);
        const max = parseNum(slider.max, 100);
        const val = parseNum(slider.value, 0);
        const ratio = (Math.max(min, Math.min(max, val)) - min) / (max - min);
        const centerPx = thumbCenterPx(ratio, slider);
        const clampedPx = clampBadgePosition(centerPx, slider, badgeWidth);
        badge.style.left = `${clampedPx}px`;
      }
    }
  }
}
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
    const key = btn.dataset.info;
    const content = (key && SLIDER_INFO[key]) ?? '';
    if (content) {
      const preview = document.createElement('div');
      preview.className = 'info-preview';
      preview.innerHTML = content;
      btn.appendChild(preview);
    }
  });

  closeBtn?.addEventListener('click', () => { infoDialogActor.send({ type: 'CLOSE' }); });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) infoDialogActor.send({ type: 'CLOSE' });
  });
}
```
