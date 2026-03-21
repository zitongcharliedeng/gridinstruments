# Mount Global Settings

Mounts the global settings overlay — SOUND and INPUT sections that apply
across all grids. This separates settings that affect the whole instrument
(volume, waveform, tuning, MIDI, keyboard layout) from per-grid settings
(skew, shear, zoom) which live in the grid cog overlay.

The `mountGlobalSettings` function is called from app-core during
initialization. It mirrors the pattern of `mountGridOverlay` — accepts a
container element and a toggle button, owns the `visible` signal, and returns
`toggle` and `setVisible` so the overlayMachine actor can drive visibility.

``` {.typescript file=_generated/components/mount-global-settings.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import { InfoButton } from './InfoButton';
import { refreshAllSliderUI } from '../app-slider';
```

The mount function wires the cog button toggle and returns a `setVisible`
handle so app-core can close the overlay on outside clicks or Escape.

``` {.typescript file=_generated/components/mount-global-settings.tsx}

export function mountGlobalSettings(
  mountEl: HTMLElement,
  cogBtn: HTMLElement,
): { toggle: () => void; setVisible: (v: boolean) => void } {
  const [visible, setVisible] = createSignal(false);

  const toggle = (): void => {
    setVisible(v => !v);
    cogBtn.classList.toggle('active', visible());
    if (visible()) setTimeout(refreshAllSliderUI, 50);
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
            <span class="ctrl-label" style="font-size:9px;text-transform:uppercase;white-space:nowrap;color:#fff;flex-shrink:0">WAVE</span>
            <span id="wave-select-slot"></span>
            <button class="slider-reset icon-btn icon-md" id="wave-reset"><i data-lucide="rotate-cw"></i></button>
          </div>
          <div class="ctrl-group" style="margin-top: 18px">
            <InfoButton infoKey="volume" />
            <div class="slider-track">
              <span class="slider-label-overlay">VOL (dB)</span>
              <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5" />
              <span class="slider-value-badge" id="volume-thumb-badge">-10.5</span>
              <button class="slider-reset icon-btn icon-md" id="volume-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
          <div class="tuning-slider-area" style="margin-top: 18px">
            <InfoButton infoKey="tuning" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="tuning-label">FIFTHS TUNING (cents)</span>
              <input type="range" id="tuning-slider" min="683" max="722" step="0.01" value="700" />
              <input type="text" class="badge-input" id="tuning-thumb-badge" value="700" />
              <button class="slider-reset icon-btn icon-md" id="tuning-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="tet-presets" id="tet-presets" data-alternate-ticks></div>
          </div>
          <div class="tuning-slider-area" style="margin-top: 18px">
            <InfoButton infoKey="dref" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="d-ref-label">D REF (Hz)</span>
              <input type="range" id="d-ref-slider" min="73.42" max="1174.66" step="0.01" value="293.66" />
              <input type="text" class="badge-input" id="d-ref-input" value="293.66" style="width:80px; text-transform:none;" />
              <button id="d-ref-reset" class="slider-reset icon-btn icon-md"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'INPUT (global)',
      children: () => (
        <div>
          <div class="slider-track">
            <span class="ctrl-label" style="font-size:9px;text-transform:uppercase;white-space:nowrap;color:#fff;flex-shrink:0">KEYBOARD LAYOUT</span>
            <span id="layout-select-slot"></span>
            <button class="slider-reset icon-btn icon-md" id="layout-reset"><i data-lucide="rotate-cw"></i></button>
          </div>
          <div style="margin-top: 18px">
            <div id="midi-settings-panel">
              <span class="overlay-section-title">MIDI</span> <InfoButton infoKey="midi" />
              <div id="midi-device-list"></div>
              <span class="overlay-section-title">EXPRESSION</span>
              <div class="midi-panel-row" id="expr-bend-row" style="gap:2px">
                <InfoButton infoKey="bend" />
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Pitch Bend</span>
                  <input type="text" inputmode="numeric" pattern="[0-9]*" id="midi-pb-range-expr" value="24" style="width:3ch;text-align:center;font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 3px;" />
                  <span style="color:var(--dim);font-size:10px;">semitones</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-velocity-row" style="gap:2px">
                <InfoButton infoKey="velocity" />
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Note Velocity</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-pressure-row" style="gap:2px">
                <InfoButton infoKey="pressure" />
                <span style="color:#fff;font-size:12px;">Pressure</span>
                <button id="pressure-mode" style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;" value="channel">Channel</button>
                <button id="pressure-cc-source" style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;" value="aftertouch">Aftertouch</button>
              </div>
              <div class="midi-panel-row" id="expr-timbre-row" style="gap:2px">
                <InfoButton infoKey="timbre" />
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-timbre" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Timbre Slide</span>
                </label>
                <button id="timbre-cc-mode" style="font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 6px;cursor:pointer;" value="74">CC74</button>
                <label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;font-size:10px;">
                  <span class="gi-checkbox"><input type="checkbox" id="timbre-reverse" /><span class="gi-check"></span></span>
                  <span style="color:var(--dim)">Rev</span>
                </label>
              </div>
              <div class="midi-panel-row" id="mpe-output-row">
                <span class="ctrl-label" style="color:#fff">MPE Out:</span>
                <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;">
                  <span class="gi-checkbox"><input type="checkbox" id="mpe-enabled" /><span class="gi-check"></span></span>
                  Enable
                </label>
                <span id="mpe-output-select-slot" style="min-width:120px;display:inline-block;"></span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  render(
    () => <SettingsOverlay overlayId="global-overlay" sections={sections} visible={visible} onToggle={toggle} />,
    mountEl,
  );

  mountEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'global-overlay') setVisible(false);
  });

  return { toggle, setVisible };
}
```
