# Grid Overlay Mount

Mounts the SolidJS SettingsOverlay component into the grid keyboard area.
This is the bridge between the vanilla TS app and the Solid component system
for the per-grid settings panel. The `mountGridOverlay` function is called from
app-core during initialization.

Only per-grid settings (VISUAL) live here. Global settings (SOUND, INPUT)
are in the separate global settings panel mounted by `mountGlobalSettings`.

The overlay preserves every existing DOM ID so that the app-core event
listeners continue to work without modification. Solid renders the structure;
app-core wires up the behaviour.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}
import { render } from 'solid-js/web';
import { createSignal } from 'solid-js';
import { SettingsOverlay } from './SettingsOverlay';
import type { SectionDef } from './SettingsOverlay';
import { InfoButton } from './InfoButton';
import { refreshAllSliderUI } from '../app-slider';
```

The mount function accepts the container element and the cog button. It owns
the `visible` signal and toggles it on cog clicks, returning a `toggle`
function so app-core can drive visibility from the `overlayMachine` actor.

``` {.typescript file=_generated/components/mount-grid-overlay.tsx}

export function mountGridOverlay(
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
            <span class="ctrl-label" class="ctrl-label">WAVE</span>
            <span id="wave-select-slot"></span>
            <button class="slider-reset icon-btn icon-md" id="wave-reset"><i data-lucide="rotate-cw"></i></button>
          </div>
          <div class="ctrl-group mt-18">
            <InfoButton infoKey="volume" />
            <div class="slider-track">
              <span class="slider-label-overlay">VOL (dB)</span>
              <input type="range" id="volume-slider" min="0" max="1" step="0.01" value="0.5" />
              <span class="slider-value-badge" id="volume-thumb-badge">-10.5</span>
              <button class="slider-reset icon-btn icon-md" id="volume-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoButton infoKey="tuning" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="tuning-label">FIFTHS TUNING (cents)</span>
              <input type="range" id="tuning-slider" min="683" max="722" step="0.01" value="700" />
              <input type="text" class="badge-input" id="tuning-thumb-badge" value="700" />
              <button class="slider-reset icon-btn icon-md" id="tuning-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="tet-presets" id="tet-presets" data-alternate-ticks></div>
          </div>
          <div class="tuning-slider-area mt-18">
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
      title: 'VISUAL (per grid)',
      children: () => (
        <div>
          <div class="tuning-slider-area">
            <InfoButton infoKey="skew" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="skew-label">MECH SKEW</span>
              <input type="range" id="skew-slider" min="-0.5" max="1.5" step="0.01" value="0" />
              <input type="text" class="badge-input" id="skew-thumb-badge" value="0.00" />
              <button class="slider-reset icon-btn icon-md" id="skew-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="slider-presets" id="skew-presets"></div>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoButton infoKey="shear" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="bfact-label">WICKED SHEAR</span>
              <input type="range" id="bfact-slider" min="-0.5" max="1.5" step="0.01" value="0" />
              <input type="text" class="badge-input" id="bfact-thumb-badge" value="0.00" />
              <button class="slider-reset icon-btn icon-md" id="bfact-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="slider-presets" id="bfact-presets"></div>
          </div>
          <div class="tuning-slider-area mt-18">
            <InfoButton infoKey="zoom" />
            <div class="slider-track">
              <span class="slider-label-overlay">ZOOM (x)</span>
              <input type="range" id="zoom-slider" min="0.2" max="3" step="0.01" value="1" />
              <span class="slider-value-badge" id="zoom-thumb-badge">1.00</span>
              <button class="slider-reset icon-btn icon-md" id="zoom-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
          <div class="slider-track mt-18">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
              <span class="gi-checkbox"><input type="checkbox" id="qwerty-overlay-toggle" checked /><span class="gi-check"></span></span>
              <span style="color:#fff">COMPUTER KEYBOARD LABELS</span>
            </label>
          </div>
        </div>
      ),
    },
    {
      title: 'INPUT (global)',
      children: () => (
        <div>
          <div class="slider-track">
            <span class="ctrl-label" class="ctrl-label">KEYBOARD LAYOUT</span>
            <span id="layout-select-slot"></span>
            <button class="slider-reset icon-btn icon-md" id="layout-reset"><i data-lucide="rotate-cw"></i></button>
          </div>
          <div class="mt-18">
            <div id="midi-settings-panel">
              <span class="overlay-section-title">MIDI</span> <InfoButton infoKey="midi" />
              <div id="midi-device-list"></div>
              <span class="overlay-section-title">EXPRESSION</span>
              <div class="midi-panel-row" id="expr-bend-row" style="gap:2px">
                <InfoButton infoKey="bend" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-bend" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Pitch Bend</span>
                  <input type="text" inputmode="numeric" pattern="[0-9]*" id="midi-pb-range-expr" value="24" style="width:3ch;text-align:center;font-family:var(--font);font-size:10px;background:var(--bg);color:var(--fg);border:1px solid var(--border);padding:2px 3px;" />
                  <span style="color:var(--dim);font-size:10px;">semitones</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-velocity-row" style="gap:2px">
                <InfoButton infoKey="velocity" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-velocity" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Note Velocity</span>
                </label>
              </div>
              <div class="midi-panel-row" id="expr-pressure-row" style="gap:2px">
                <InfoButton infoKey="pressure" />
                <span style="color:#fff;font-size:12px;">Pressure</span>
                <span id="pressure-mode-slot"></span>
                <span id="pressure-cc-source-slot"></span>
              </div>
              <div class="midi-panel-row" id="expr-timbre-row" style="gap:2px">
                <InfoButton infoKey="timbre" />
                <label class="expr-label">
                  <span class="gi-checkbox"><input type="checkbox" id="expr-timbre" checked /><span class="gi-check"></span></span>
                  <span style="color:#fff">Timbre Slide</span>
                </label>
                <span id="timbre-cc-mode-slot"></span>
                <label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;font-size:10px;">
                  <span class="gi-checkbox"><input type="checkbox" id="timbre-reverse" /><span class="gi-check"></span></span>
                  <span style="color:var(--dim)">Rev</span>
                </label>
              </div>
              <div class="midi-panel-row" id="mpe-output-row">
                <span class="ctrl-label" style="color:#fff">MPE Out:</span>
                <label class="expr-label">
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
    () => <SettingsOverlay overlayId="grid-overlay" sections={sections} visible={visible} onToggle={toggle} />,
    mountEl,
  );

  mountEl.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === 'grid-overlay') setVisible(false);
  });

  return { toggle, setVisible };
}
```
