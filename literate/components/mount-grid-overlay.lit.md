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
          <div class="tuning-slider-area" style="margin-top: 18px">
            <InfoButton infoKey="shear" />
            <div class="slider-track">
              <span class="slider-label-overlay" id="bfact-label">WICKED SHEAR</span>
              <input type="range" id="bfact-slider" min="-0.5" max="1.5" step="0.01" value="0" />
              <input type="text" class="badge-input" id="bfact-thumb-badge" value="0.00" />
              <button class="slider-reset icon-btn icon-md" id="bfact-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
            <div class="slider-presets" id="bfact-presets"></div>
          </div>
          <div class="tuning-slider-area" style="margin-top: 18px">
            <InfoButton infoKey="zoom" />
            <div class="slider-track">
              <span class="slider-label-overlay">ZOOM (x)</span>
              <input type="range" id="zoom-slider" min="0.2" max="3" step="0.01" value="1" />
              <span class="slider-value-badge" id="zoom-thumb-badge">1.00</span>
              <button class="slider-reset icon-btn icon-md" id="zoom-reset"><i data-lucide="rotate-cw"></i></button>
            </div>
          </div>
          <div class="slider-track" style="margin-top: 18px">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;">
              <span class="gi-checkbox"><input type="checkbox" id="qwerty-overlay-toggle" checked /><span class="gi-check"></span></span>
              <span style="color:#fff">COMPUTER KEYBOARD LABELS</span>
            </label>
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
