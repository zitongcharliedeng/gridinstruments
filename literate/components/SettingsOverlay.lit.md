# Settings Overlay

Reusable settings overlay component built with SolidJS. Used by both the grid
keyboard and the visualiser panel to provide a consistent settings UI with
shimmer animation, section titles, and slider controls.

This is the first SolidJS component in the project — it replaces hand-coded
HTML overlays with a typesafe, testable component that enforces consistent
styling across all settings panels.

## Component Interface

The overlay accepts a `target` element to position itself within, a `toggler`
element (cog button) that shows/hides it, and an array of section definitions
containing sliders and other controls.

``` {.typescript file=_generated/components/SettingsOverlay.tsx}
import { createSignal, For, Show, type JSX } from 'solid-js';
import { applySliderFill } from '../app-slider';

const OVERLAY_CSS = `.settings-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 30, 32, 0.78); z-index: 12;
  padding: 40px 12px 12px 40px; overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: var(--dim) transparent;
  touch-action: auto !important; -webkit-overflow-scrolling: touch;
}
.settings-overlay::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.04) 80%);
  box-shadow: inset 0 0 40px rgba(255,255,255,0.04);
  background-size: 300% 100%; animation: shimmer 60s linear infinite;
  pointer-events: none; z-index: 0;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
.hidden { display: none !important; pointer-events: none !important; }
.overlay-section { display:flex; flex-direction:column; gap:5px; margin-left:40px; margin-bottom:8px; }
.overlay-section .ctrl-label { color:#fff; }
.overlay-section .slider-track { width:100%; }
.overlay-section .tuning-slider-area { position:relative; width:100%; margin-bottom:40px; }
.overlay-section .tuning-slider-area .slider-track { width:calc(100% - 18px); }
.overlay-section-title {
  font-size:11px; color:var(--dim); text-transform:uppercase; letter-spacing:0.08em;
  font-family:var(--font); font-weight:700; display:flex; align-items:center; gap:6px;
}
.overlay-section-title:hover { color:var(--fg); }
.overlay-btn {
  font-family:var(--font); font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:0.08em; background:#000;
  color:#fff; border:1px solid var(--dim); padding:6px 12px;
  cursor:pointer; user-select:none;
}
.overlay-btn:hover { border-color:var(--fg); }
.overlay-btn:active { background:var(--subtle); }
.dimmed { opacity:0.3; pointer-events:none; transition:opacity 0.3s ease; }
.slider-row-track { margin-top: 8px; }
.slider-badge-edit { width:50px; text-align:center; font-family:var(--font); font-size:10px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:1px 3px; }
.grid-cog {
  position:absolute; z-index:15; width:32px; height:32px; font-size:16px;
  background:var(--bg); color:var(--dim); border:1px solid var(--border);
  cursor:pointer; display:flex; align-items:center; justify-content:center;
  font-family:var(--font);
}
#grid-settings-btn { top:8px; left:8px; }
#vis-settings-btn { top:4px; left:8px; }
.grid-cog:hover { color:var(--fg); border-color:var(--accent); }
.grid-cog.active { color:var(--bg); background:var(--fg); border-color:var(--fg); }
.gi-checkbox { position:relative; display:inline-block; width:14px; height:14px; cursor:pointer; vertical-align:middle; }
.gi-checkbox input { position:absolute; inset:0; margin:0; cursor:pointer; appearance:none; -webkit-appearance:none; background:transparent; border:none; z-index:1; }
.gi-checkbox .gi-check { display:block; width:14px; height:14px; border:1px solid var(--border); background:var(--bg); pointer-events:none; }
.gi-checkbox input:checked + .gi-check { background:var(--fg); border-color:var(--fg); }
.gi-checkbox input:checked + .gi-check::after { content:''; position:absolute; left:4px; top:1px; width:4px; height:8px; border:solid var(--bg); border-width:0 2px 2px 0; transform:rotate(45deg); }
.gi-checkbox input:focus-visible + .gi-check { border-color:var(--accent); }
.show-flex { display: flex !important; }
.show-inline { display: inline-flex !important; }`;

let overlayCssInjected = false;
function injectOverlayCSS(): void {
  if (overlayCssInjected) return;
  const s = document.createElement('style');
  s.textContent = OVERLAY_CSS;
  document.head.appendChild(s);
  overlayCssInjected = true;
}

export interface SliderDef {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  formatBadge?: (v: number) => string;
  onChange?: (v: number) => void;
}

export interface SectionDef {
  title: string;
  sliders?: SliderDef[];
  children?: () => JSX.Element;
}

export interface SettingsOverlayProps {
  overlayId?: string;
  sectionClass?: string;
  sections: SectionDef[];
  visible: () => boolean;
  onToggle: () => void;
}
```

## Slider Row

Each slider row renders the standard pattern: label overlay on the track,
range input, value badge, and reset button. The `createSignal` for the current
value ensures fine-grained updates — only the badge text re-renders when the
slider moves, not the entire overlay.

``` {.typescript file=_generated/components/SettingsOverlay.tsx}

function SliderRow(props: { def: SliderDef }): JSX.Element {
  const [value, setValue] = createSignal(props.def.defaultValue);
  const fmt = props.def.formatBadge ?? ((v: number) => v.toFixed(1));

  const onInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const v = parseFloat(input.value);
    setValue(v);
    props.def.onChange?.(v);
    applySliderFill(input);
  };

  const onReset = (): void => {
    setValue(props.def.defaultValue);
    props.def.onChange?.(props.def.defaultValue);
  };

  return (
    <div class="slider-track slider-row-track">
      <span class="slider-label-overlay">{props.def.label}</span>
      <input
        type="range"
        id={props.def.id}
        min={props.def.min}
        max={props.def.max}
        step={props.def.step}
        value={value()}
        onInput={onInput}
      />
      <input
        type="text"
        class="badge-input slider-badge-edit"
        value={fmt(value())}
        onChange={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(v)) { setValue(Math.max(props.def.min, Math.min(props.def.max, v))); props.def.onChange?.(value()); }
        }}
      />
      <button class="slider-reset icon-btn icon-md" onClick={onReset}>
        <i data-lucide="rotate-cw" />
      </button>
    </div>
  );
}
```

## Overlay Container

The overlay container uses the shared `.settings-overlay` CSS class for the
frosted background with shimmer animation. Sections render as titled groups
with their slider rows. The overlay stays mounted even when hidden so legacy
DOM lookups and structural tests can still find controls like `#zoom-slider`
before the user opens the panel.

``` {.typescript file=_generated/components/SettingsOverlay.tsx}

export function SettingsOverlay(props: SettingsOverlayProps): JSX.Element {
  injectOverlayCSS();
  const sectionClass = props.sectionClass ?? 'overlay-section';
  return (
    <div id={props.overlayId} class="settings-overlay" classList={{ hidden: !props.visible() }}>
      <For each={props.sections}>
        {(section) => (
          <div class={sectionClass}>
            <div class="overlay-section-title">{section.title}</div>
            <Show when={section.sliders}>
              <For each={section.sliders}>
                {(slider) => <SliderRow def={slider} />}
              </For>
            </Show>
            <Show when={section.children}>
              {section.children?.()}
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}
```
