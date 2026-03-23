# Grid Overlay Mount

Mounts the SolidJS SettingsOverlay component into the grid keyboard area.
This is the bridge between the vanilla TS app and the Solid component system
for the per-grid settings panel. The `mountGridOverlay` function is called from
app-core during initialization.

All settings (SOUND, VISUAL, INPUT) live in this single overlay panel.

The overlay preserves every existing DOM ID so that the app-core event
listeners continue to work without modification. Solid renders the structure;
app-core wires up the behaviour.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import { InfoButton } from './InfoButton';
import { SliderRow } from './SliderRow';
import { refreshAllSliderUI } from '../app-slider';
```

The mount function accepts the container element and the cog button. It owns
the `visible` signal and toggles it on cog clicks, returning a `toggle`
function so app-core can drive visibility from the `overlayMachine` actor.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}

const GRID_OVERLAY_CSS = `#mpe-output-select {
  position:absolute !important; width:1px !important; height:1px !important;
  opacity:0 !important; overflow:hidden !important; pointer-events:none !important;
  margin:0 !important; padding:0 !important; border-width:0 !important;
}
.midi-panel-row { display:flex; align-items:center; gap:2px; font-size:11px; flex-wrap:wrap; }
.mt-18 { margin-top:18px; }
.expr-label { display:inline-flex; align-items:center; gap:4px; cursor:pointer; font-size:12px; }
.ctrl-group { display:flex; align-items:center; gap:5px; flex-shrink:0; }
.ctrl-label { font-size:9px; text-transform:uppercase; white-space:nowrap; color:#fff; flex-shrink:0; font-weight:700; letter-spacing:0.06em; }
.text-white { color:#fff; }
.text-white-12 { color:#fff; font-size:12px; }
.text-dim { color:var(--dim); font-size:9px; }
.text-dim-sm { color:var(--dim); font-size:10px; }
.text-dim-plain { color:var(--dim); }
.expr-label-sm { display:inline-flex; align-items:center; gap:3px; cursor:pointer; font-size:10px; }
.expr-label-lg { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; }
.numeric-input { width:4ch; text-align:center; font-family:var(--font); font-size:10px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:2px 3px; }
.select-slot { min-width:120px; display:inline-block; }
#d-ref-input { width:80px; text-transform:none; }`;
let gridOverlayCssInjected = false;

export interface GridOverlayCallbacks {
  onVolumeChange: (v: number) => void;
  initialVolume: number;
  onZoomChange: (v: number) => void;
  initialZoom: number;
}

export function mountGridOverlay(
  mountEl: HTMLElement,
  cogBtn: HTMLElement,
  callbacks: GridOverlayCallbacks,
): { toggle: () => void; setVisible: (v: boolean) => void } {
  if (!gridOverlayCssInjected) {
    const s = document.createElement('style');
    s.textContent = GRID_OVERLAY_CSS;
    document.head.appendChild(s);
    gridOverlayCssInjected = true;
  }
  const [visible, setVisible] = createSignal(false);

  const toggle = (): void => {
    setVisible(v => !v);
    cogBtn.classList.toggle('active', visible());
    if (visible()) requestAnimationFrame(() => { requestAnimationFrame(refreshAllSliderUI); });
  };
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && visible()) {
      setVisible(false);
      cogBtn.classList.remove('active');
    }
  };
  document.addEventListener('keydown', onEscape);
  cogBtn.addEventListener('click', toggle);

  const sections: SectionDef[] = [
    {
      title: 'SOUND (global)',
      children: () => (
        <div>
          <div class="slider-track">
            <span class="ctrl-label">WAVE</span>
            <span id="wave-select-slot" />
            <button class="slider-reset icon-btn icon-md" id="wave-reset"><i data-lucide="rotate-cw" /></button>
          </div>
          <div class="ctrl-group mt-18">
            <InfoButton infoKey="volume" />
            <SliderRow def={{
              id: 'volume-slider',
              label: 'VOL (dB)',
              min: 0, max: 1, step: 0.01,
              defaultValue: callbacks.initialVolume,
              formatBadge: (v: number) => (20 * Math.log10(Math.max(0.001, v))).toFixed(1),
              onChange: callbacks.onVolumeChange,
            }} />
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="tuning" />
              <div class="slider-track">
                <span class="slider-label-overlay" id="tuning-label">FIFTHS TUNING (cents)</span>
                <input type="range" id="tuning-slider" min="683" max="722" step="0.01" value="700" />
                <input type="text" class="badge-input" id="tuning-thumb-badge" value="700" />
                <button class="slider-reset icon-btn icon-md" id="tuning-reset"><i data-lucide="rotate-cw" /></button>
              </div>
            </div>
            <div class="tet-presets" id="tet-presets" data-alternate-ticks />
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="dref" />
              <div class="slider-track">
                <span class="slider-label-overlay" id="d-ref-label">D REF (Hz)</span>
                <input type="range" id="d-ref-slider" min="73.42" max="1174.66" step="0.01" value="293.66" />
                <input type="text" class="badge-input" id="d-ref-input" value="293.66" />
                <button id="d-ref-reset" class="slider-reset icon-btn icon-md"><i data-lucide="rotate-cw" /></button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
```

### VISUAL section

Per-grid visual settings: skew (DCompose ↔ MidiMech morph), wicked shear
(row-offset angle), zoom (cell size), QWERTY overlay toggle, and keyboard
layout selector. Each slider wraps its info button in a `ctrl-group` flex row.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
    {
      title: 'VISUAL (per grid)',
      children: () => (
        <div>
          <div class="tuning-slider-area">
            <div class="ctrl-group">
              <InfoButton infoKey="skew" />
              <div class="slider-track">
                <span class="slider-label-overlay" id="skew-label">MECH SKEW</span>
                <input type="range" id="skew-slider" min="-0.5" max="1.5" step="0.01" value="0" />
                <input type="text" class="badge-input" id="skew-thumb-badge" value="0.00" />
                <button class="slider-reset icon-btn icon-md" id="skew-reset"><i data-lucide="rotate-cw" /></button>
              </div>
            </div>
            <div class="slider-presets" id="skew-presets" />
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="shear" />
              <div class="slider-track">
                <span class="slider-label-overlay" id="bfact-label">WICKED SHEAR</span>
                <input type="range" id="bfact-slider" min="-0.5" max="1.5" step="0.01" value="0" />
                <input type="text" class="badge-input" id="bfact-thumb-badge" value="0.00" />
                <button class="slider-reset icon-btn icon-md" id="bfact-reset"><i data-lucide="rotate-cw" /></button>
              </div>
            </div>
            <div class="slider-presets" id="bfact-presets" />
          </div>
          <div class="tuning-slider-area mt-18">
            <div class="ctrl-group">
              <InfoButton infoKey="zoom" />
              <SliderRow def={{
                id: 'zoom-slider',
                label: 'ZOOM (x)',
                min: 0.2, max: 3, step: 0.01,
                defaultValue: callbacks.initialZoom,
                formatBadge: (v: number) => v.toFixed(2),
                onChange: callbacks.onZoomChange,
              }} />
            </div>
          </div>
          <div class="slider-track mt-18">
            <label class="expr-label-lg">
              <span class="gi-checkbox"><input type="checkbox" id="qwerty-overlay-toggle" checked /><span class="gi-check" /></span>
              <span class="text-white">COMPUTER KEYBOARD LABELS</span>
            </label>
          </div>
        </div>
      ),
    },
```

### INPUT section

Global input settings: MIDI device management, pitch bend range, and expression
controls (bend, velocity, pressure, timbre). Expression checkboxes toggle which
MPE dimensions are active. Pressure mode and CC source use slim-select dropdowns.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
    {
      title: 'INPUT (global)',
      children: () => (
        <div>
          <div class="slider-track">
            <span class="ctrl-label">KEYBOARD LAYOUT</span>
            <span id="layout-select-slot" />
            <button class="slider-reset icon-btn icon-md" id="layout-reset"><i data-lucide="rotate-cw" /></button>
          </div>
          <div class="mt-18">
            <div id="midi-settings-panel">
              <span class="overlay-section-title">MIDI</span> <InfoButton infoKey="midi" />
              <div id="midi-device-list" />
              <span class="overlay-section-title">EXPRESSION</span>
              <div class="midi-panel-row" id="expr-bend-row">
                <InfoButton infoKey="bend" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked /><span class="gi-check" /></span>
                  <span class="text-white">Pitch Bend</span>
                  <input type="text" inputmode="numeric" pattern="[0-9]*" id="midi-pb-range-expr" value="24" class="numeric-input" />
                  <span class="text-dim-sm">semitones</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-velocity-row">
                <InfoButton infoKey="velocity" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked /><span class="gi-check" /></span>
                  <span class="text-white">Note Velocity</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-pressure-row">
                <InfoButton infoKey="pressure" />
                <span class="text-white-12">Pressure</span>
                <span class="text-dim">mode</span>
                <span id="pressure-mode-slot" />
                <span class="text-dim">source</span>
                <span id="pressure-cc-source-slot" />
              </div>
              <div class="midi-panel-row" id="expr-timbre-row">
                <InfoButton infoKey="timbre" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-timbre" checked /><span class="gi-check" /></span>
                  <span class="text-white">Timbre Slide</span>
                </label>
                <span id="timbre-cc-mode-slot" />
                <label class="expr-label-sm">
                  <span class="gi-checkbox"><input type="checkbox" id="timbre-reverse" /><span class="gi-check" /></span>
                  <span class="text-dim-plain">Rev</span>
                </label>
              </div>
              <div class="midi-panel-row" id="mpe-output-row">
                <span class="ctrl-label">MPE Out:</span>
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="mpe-enabled" /><span class="gi-check" /></span>
                  Enable
                </label>
                <span id="mpe-output-select-slot" class="select-slot" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  render(
    () => <SettingsOverlay overlayId="grid-overlay" sections={sections} visible={visible} onToggle={toggle} />,
    mountEl,
  );

  mountEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'grid-overlay') { setVisible(false); cogBtn.classList.remove('active'); }
  });

  return { toggle, setVisible };
}
```
