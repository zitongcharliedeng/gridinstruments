# App Slider

Slider UI helpers — thumb positioning, fill gradients, badge clamping, and info dialog wiring.

``` {.typescript file=_generated/app-slider.ts}
/**
 * Slider UI helpers — thumb positioning, fill gradients, and info dialogs.
 */

import { parseNum } from './app-helpers';
import { SLIDER_INFO } from './app-constants';
import { createActor } from 'xstate';
import { dialogMachine } from './machines/dialogMachine';

/** Thumb center px offset — source of truth for fill, badge & notch alignment. */
export function thumbCenterPx(ratio: number, slider: HTMLInputElement): number {
  const thumbW = 3;
  const trackW = slider.offsetWidth;
  return trackW > 0
    ? ratio * (trackW - thumbW) + thumbW / 2
    : 0;
}

/** Clamp badge position to stay within slider bounds.
 * Badge has transform: translateX(-50%), so we clamp the center position
 * to ensure the badge doesn't extend beyond the slider edges.
 */
export function clampBadgePosition(centerPx: number, slider: HTMLInputElement, badgeWidth = 50): number {
  const trackW = slider.offsetWidth;
  if (trackW <= 0) return centerPx;
  const halfBadgeW = badgeWidth / 2;
  return Math.max(halfBadgeW, Math.min(trackW - halfBadgeW, centerPx));
}

/** Apply fill gradient to a range input (module-level for use in actor subscribers). */
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

/** Re-trigger slider fill gradients and badge positions for all overlay sliders.
 * Called when overlay becomes visible — offsetWidth returns 0 when display:none,
 * so fills and badge positions computed while hidden are incorrect.
 */
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
    const slider = document.getElementById(sliderId) as HTMLInputElement | null;
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

export function setupInfoDialogs(): void {
  const dialog = document.getElementById('info-dialog');
  const closeBtn = document.getElementById('info-close');
  const contentEl = document.getElementById('info-content');
  if (!(dialog instanceof HTMLDialogElement)) return;

  const infoDialogActor = createActor(dialogMachine);
  infoDialogActor.subscribe((snapshot) => {
    if (snapshot.matches('open')) {
      if (contentEl) contentEl.innerHTML = snapshot.context.content;
      dialog.showModal();
    } else {
      dialog.close();
    }
  });
  infoDialogActor.start();

  // Wire all slider info buttons to open the dialog modal
  document.querySelectorAll<HTMLButtonElement>('.slider-info-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
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
