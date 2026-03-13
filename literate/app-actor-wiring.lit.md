# App Actor Wiring

App-level XState actor creation, slider subscribers, and DOM-to-actor event wiring.

``` {.typescript file=src/app-actor-wiring.ts}
/**
 * App-level XState actor creation, slider subscribers, and DOM↔actor event wiring.
 */

import { createActor } from 'xstate';
import { appMachine } from './machines/appMachine';
import { getElementOrNull } from './app-dom';
import { thumbCenterPx, clampBadgePosition, applySliderFill } from './app-slider';
import { formatSliderAnnotation, isWaveformType } from './app-helpers';
import { SKEW_PRESETS } from './app-constants';
import type { DComposeApp } from './app-core';

export function setupAppActor(app: DComposeApp): void {
  const appActor = createActor(appMachine, {
    input: { initialVolume: -10.5, defaultZoom: (app as unknown as { defaultZoom: number }).defaultZoom, touchDevice: 'ontouchstart' in window },
  });

  // ─── Skew slider: appActor subscriber drives badge, label & fill ──────────
  const _skewSlider = getElementOrNull('skew-slider', HTMLInputElement);
  const _skewBadge = getElementOrNull('skew-thumb-badge', HTMLInputElement);
  const _skewLabel = getElementOrNull('skew-label', HTMLSpanElement);
  let _prevSkewValue = NaN;

  appActor.subscribe((snapshot) => {
    const skew = snapshot.context.sliders.skew;
    if (skew.value === _prevSkewValue) return;
    _prevSkewValue = skew.value;

     if (_skewBadge && _skewSlider) {
       const sliderMin = parseFloat(_skewSlider.min);
       const sliderMax = parseFloat(_skewSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, skew.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _skewSlider);
       const clampedPx = clampBadgePosition(centerPx, _skewSlider, 50);
       _skewBadge.style.left = `${clampedPx}px`;
       _skewBadge.value = skew.value.toFixed(2);
     }

     if (_skewLabel) {
      const ann = formatSliderAnnotation(skew.value, SKEW_PRESETS, 2);
      _skewLabel.innerHTML = `MECH SKEW <span style='color:#88ff88'>${ann}</span>`;
    }

    if (_skewSlider) {
      applySliderFill(_skewSlider);
    }
   });

  // ─── Volume slider: appActor subscriber drives badge & fill ──────────────────
  const _volumeSlider = getElementOrNull('volume-slider', HTMLInputElement);
  const _volumeBadge = getElementOrNull('volume-thumb-badge', HTMLSpanElement);
  let _prevVolumeValue = NaN;

  appActor.subscribe((snapshot) => {
    const volume = snapshot.context.sliders.volume;
    if (volume.value === _prevVolumeValue) return;
    _prevVolumeValue = volume.value;

     if (_volumeBadge && _volumeSlider) {
       const sliderMin = parseFloat(_volumeSlider.min);
       const sliderMax = parseFloat(_volumeSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, volume.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _volumeSlider);
       const clampedPx = clampBadgePosition(centerPx, _volumeSlider, 50);
       _volumeBadge.style.left = `${clampedPx}px`;
       _volumeBadge.textContent = volume.badgeText;
     }

     if (_volumeSlider) {
      applySliderFill(_volumeSlider);
    }
  });

  // ─── Zoom slider: appActor subscriber drives badge & fill ────────────────────
  const _zoomSlider = getElementOrNull('zoom-slider', HTMLInputElement);
  const _zoomBadge = getElementOrNull('zoom-thumb-badge', HTMLSpanElement);
  let _prevZoomValue = NaN;

  appActor.subscribe((snapshot) => {
    const zoom = snapshot.context.sliders.zoom;
    if (zoom.value === _prevZoomValue) return;
    _prevZoomValue = zoom.value;

     if (_zoomBadge && _zoomSlider) {
       const sliderMin = parseFloat(_zoomSlider.min);
       const sliderMax = parseFloat(_zoomSlider.max);
       const clampedForPos = Math.max(sliderMin, Math.min(sliderMax, zoom.value));
       const ratio = (clampedForPos - sliderMin) / (sliderMax - sliderMin);
       const centerPx = thumbCenterPx(ratio, _zoomSlider);
       const clampedPx = clampBadgePosition(centerPx, _zoomSlider, 50);
       _zoomBadge.style.left = `${clampedPx}px`;
       _zoomBadge.textContent = zoom.badgeText;
     }

    if (_zoomSlider) {
      applySliderFill(_zoomSlider);
    }
  });

   appActor.start();

   if (_skewSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'skew', value: parseFloat(_skewSlider.value) });
   }

   if (_volumeSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'volume', value: parseFloat(_volumeSlider.value) });
   }

   if (_zoomSlider) {
     appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: parseFloat(_zoomSlider.value) });
   }

  // ─── Wire DOM → appActor (dual-write: DComposeApp handles services) ───────
  if (_skewSlider) {
    _skewSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'skew', value: parseFloat(_skewSlider.value) });
    });
  }
  if (_volumeSlider) {
    _volumeSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'volume', value: parseFloat(_volumeSlider.value) });
    });
  }
  if (_zoomSlider) {
    _zoomSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: parseFloat(_zoomSlider.value) });
    });
  }
  if (_skewBadge) {
    _skewBadge.addEventListener('change', () => {
      const raw = parseFloat(_skewBadge.value);
      if (isFinite(raw)) {
        appActor.send({ type: 'SLIDER_BADGE_EDIT', slider: 'skew', rawValue: raw.toString() });
      }
    });
  }
  document.getElementById('midi-settings-toggle')?.addEventListener('click', () => {
    appActor.send({ type: 'MIDI_PANEL_TOGGLE' });
  });
  const _mpeCheckbox = getElementOrNull('mpe-enabled', HTMLInputElement);
  if (_mpeCheckbox) {
    _mpeCheckbox.addEventListener('change', () => {
      appActor.send({ type: 'MPE_ENABLE', enabled: _mpeCheckbox.checked });
    });
  }
  const _mpeSelect = getElementOrNull('mpe-output-select', HTMLSelectElement);
  if (_mpeSelect) {
    _mpeSelect.addEventListener('change', () => {
      appActor.send({ type: 'MPE_SELECT_OUTPUT', outputId: _mpeSelect.value });
    });
  }
  const _waveSelect = getElementOrNull('wave-select', HTMLSelectElement);
  _waveSelect?.addEventListener('change', () => {
    const wf = _waveSelect.value;
    if (isWaveformType(wf)) appActor.send({ type: 'SET_WAVEFORM', waveform: wf });
  });
  const _layoutSelect = getElementOrNull('layout-select', HTMLSelectElement);
  if (_layoutSelect) {
    _layoutSelect.addEventListener('change', () => {
      appActor.send({ type: 'SET_LAYOUT', layoutId: _layoutSelect.value });
    });
  }
  // Expose for debugging and Playwright verification
  (window as Window & { dcomposeApp?: unknown }).dcomposeApp = {
    actor: appActor,
    getSnapshot: () => appActor.getSnapshot(),
    getActiveNoteCount: () => (app as unknown as { activeNotes: Map<string, unknown> }).activeNotes.size,
    isAudioReady: () => (app as unknown as { synth: { isInitialized: () => boolean } }).synth.isInitialized(),
    getGridGeometry: () => (app as unknown as { visualizer: { getGridGeometry: () => { cellHv1: {x:number,y:number}, cellHv2: {x:number,y:number}, width: number, height: number } } | null }).visualizer?.getGridGeometry() ?? null,
    getDefaultZoom: () => (app as unknown as { defaultZoom: number }).defaultZoom,
    };
}
```
