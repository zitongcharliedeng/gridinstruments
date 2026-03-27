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
import { For, Show, type JSX } from 'solid-js';
import { SliderRow } from './SliderRow';
import type { SliderDef } from './SliderRow';
import './SettingsOverlay.css';

export type { SliderDef } from './SliderRow';

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

SliderRow is imported from `./SliderRow` — the shared pure display component
used by both vis and grid overlays.

## Overlay Layout

The overlay fills its containing block absolutely, sitting at z-index 12 above
the canvas. It uses a dark semi-transparent background and enables scrolling for
long settings lists. Touch scrolling is explicitly allowed so mobile users can
scroll the panel without triggering notes.

``` {.css file=_generated/components/SettingsOverlay.css}
.settings-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(30, 30, 32, 0.78); z-index: 12;
  padding: 40px 12px 12px 40px; overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: var(--dim) transparent;
  touch-action: auto !important; -webkit-overflow-scrolling: touch;
  max-width: 520px;
}
```

## Shimmer Animation

A slow-moving light sweep pseudo-element gives the overlay a subtle depth
without any DOM overhead. The gradient runs at 300% width so the sweep travels
fully across in 60 seconds at a constant pace. `pointer-events: none` keeps it
non-interactive.

``` {.css file=_generated/components/SettingsOverlay.css}
.settings-overlay::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0.10) 60%, rgba(255,255,255,0.04) 80%);
  box-shadow: inset 0 0 40px rgba(255,255,255,0.04);
  background-size: 300% 100%; animation: shimmer 60s linear infinite;
  pointer-events: none; z-index: 0;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
```

## Utility Classes

`.hidden` completely removes an element from layout and interaction. `.show-flex`
and `.show-inline` force display back on for elements that are conditionally
revealed. `.faded` and `.visible-full` control opacity transitions.

``` {.css file=_generated/components/SettingsOverlay.css}
.hidden { display: none !important; pointer-events: none !important; }
.show-flex { display: flex !important; }
.show-inline { display: inline-flex !important; }
.faded { opacity: 0; }
.visible-full { opacity: 1; }
```

## Section Layout

Each settings section is a vertical flex column with a title and its controls.
The `.overlay-section-title` uses the `--dim` colour and uppercase tracking to
read as a category header. `.dimmed` disables an entire section when it is
contextually unavailable. `.slider-row-track` adds top margin so sliders don't
crowd their section title. `.slider-badge-edit` styles the inline numeric input
that floats above the slider thumb.

``` {.css file=_generated/components/SettingsOverlay.css}
.overlay-section { display:flex; flex-wrap:wrap; gap:4px; margin-left:0; margin-bottom:8px; }
.overlay-section > * { flex:0 1 100%; min-width:0; }
.overlay-section > .info-box { flex:1 1 200px; }
.overlay-section .tuning-slider-area { flex:0 0 100%; }
.overlay-section .info-box { min-width:0; }
.overlay-section .ctrl-label { color:#fff; }
.overlay-section .tuning-slider-area { position:relative; width:100%; margin-bottom:40px; grid-column:1 / -1; }
.overlay-section .tuning-slider-area .slider-row { width:100%; }
.overlay-section > .slider-track { grid-column:1 / -1; }
.overlay-section .midi-panel-row { min-width:0; }
.overlay-section-title {
  font-size:11px; color:var(--dim); text-transform:uppercase; letter-spacing:0.08em;
  font-family:var(--font); font-weight:700; display:flex; align-items:center; gap:6px;
}
.overlay-section-title:hover { color:var(--fg); }
.dimmed { opacity:0.3; pointer-events:none; transition:opacity 0.3s ease; }
.slider-row-track { margin-top: 8px; }
.slider-badge-edit { width:50px; text-align:center; font-family:var(--font); font-size:10px; background:var(--bg); color:var(--fg); border:1px solid var(--border); padding:1px 3px; }
```

## Buttons

`.overlay-btn` is the standard action button used inside overlays — uppercase
monospace, black background, 1px border in the dim colour. Hover brightens the
border; active press fills with the subtle background.

``` {.css file=_generated/components/SettingsOverlay.css}
.overlay-btn {
  font-family:var(--font); font-size:11px; font-weight:700;
  text-transform:uppercase; letter-spacing:0.08em; background:#000;
  color:#fff; border:1px solid var(--dim); padding:6px 12px;
  cursor:pointer; user-select:none;
}
.overlay-btn:hover { border-color:var(--fg); }
.overlay-btn:active { background:var(--subtle); }
```

## Cog Button

All three settings cogs (grid, vis, game) are rendered by the `SettingsCog`
SolidJS component (`SettingsCog.lit.md`). Positioning is via inline styles
passed as `style` props. No CSS needed here — the component owns its own styles.

``` {.css file=_generated/components/SettingsOverlay.css}
```

## Checkbox

`.gi-checkbox` is the custom checkbox used throughout the overlay. A hidden
native `<input type="checkbox">` sits above a styled `.gi-check` block element.
The checked state fills the block with the foreground colour and draws a
CSS-only checkmark via an `::after` pseudo-element. Focus-visible shows an
accent border for keyboard navigation.

``` {.css file=_generated/components/SettingsOverlay.css}
.gi-checkbox { position:relative; display:inline-block; width:14px; height:14px; cursor:pointer; vertical-align:middle; }
.gi-checkbox input { position:absolute; inset:0; margin:0; cursor:pointer; appearance:none; -webkit-appearance:none; background:transparent; border:none; z-index:1; }
.gi-checkbox .gi-check { display:block; width:14px; height:14px; border:1px solid var(--border); background:var(--bg); pointer-events:none; }
.gi-checkbox input:checked + .gi-check { background:var(--fg); border-color:var(--fg); }
.gi-checkbox input:checked + .gi-check::after { content:''; position:absolute; left:4px; top:1px; width:4px; height:8px; border:solid var(--bg); border-width:0 2px 2px 0; transform:rotate(45deg); }
.gi-checkbox input:focus-visible + .gi-check { border-color:var(--accent); }
```

## Overlay Container

The overlay container uses the shared `.settings-overlay` CSS class for the
frosted background with shimmer animation. Sections render as titled groups
with their slider rows. The overlay stays mounted even when hidden so legacy
DOM lookups and structural tests can still find controls like `#zoom-slider`
before the user opens the panel.

``` {.typescript file=_generated/components/SettingsOverlay.tsx}

export function SettingsOverlay(props: SettingsOverlayProps): JSX.Element {
  const sectionClass = (): string => props.sectionClass ?? 'overlay-section';
  return (
    <div id={props.overlayId} class="settings-overlay" classList={{ hidden: !props.visible() }}>
      <For each={props.sections}>
        {(section) => (
          <>
            <div class="overlay-section-title">{section.title}</div>
            <div class={sectionClass()}>
              <Show when={section.sliders}>
                <For each={section.sliders}>
                  {(slider) => <SliderRow def={slider} />}
                </For>
              </Show>
              <Show when={section.children}>
                {section.children?.()}
              </Show>
            </div>
          </>
        )}
      </For>
    </div>
  );
}
```
