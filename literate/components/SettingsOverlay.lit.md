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
  sections: SectionDef[];
  visible: boolean;
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
    const v = parseFloat((e.target as HTMLInputElement).value);
    setValue(v);
    props.def.onChange?.(v);
  };

  const onReset = (): void => {
    setValue(props.def.defaultValue);
    props.def.onChange?.(props.def.defaultValue);
  };

  return (
    <div class="slider-track" style="margin-top: 8px">
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
      <span class="slider-value-badge">{fmt(value())}</span>
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
with their slider rows. The `Show` component conditionally renders — when
hidden, no DOM exists (better than `display:none` for performance).

``` {.typescript file=_generated/components/SettingsOverlay.tsx}

export function SettingsOverlay(props: SettingsOverlayProps): JSX.Element {
  return (
    <Show when={props.visible}>
      <div class="settings-overlay">
        <For each={props.sections}>
          {(section) => (
            <>
              <div class="overlay-section-title">{section.title}</div>
              <Show when={section.sliders}>
                <For each={section.sliders}>
                  {(slider) => <SliderRow def={slider} />}
                </For>
              </Show>
              <Show when={section.children}>
                {section.children?.()}
              </Show>
            </>
          )}
        </For>
      </div>
    </Show>
  );
}
```
