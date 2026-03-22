# App Slider

Slider UI helpers — thumb positioning, fill gradients, badge clamping, and info dialog wiring.

## Imports

``` {.typescript file=_generated/app-slider.ts}
import { parseNum } from './app-helpers';
import { SLIDER_INFO } from './app-constants';
import { createActor } from 'xstate';
import { dialogMachine } from './machines/dialogMachine';
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
