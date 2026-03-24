# Slider Row — Kobalte headless slider

The ONE slider component used everywhere. Built on `@kobalte/core` Slider
which provides accessible fill, thumb, track, and value label out of the box.
No hand-rolled gradients or thumb positioning hacks.

Optional `presets` render tick marks below the slider. Active state highlighting
is a derived signal — no imperative DOM updates.

This is a **display component** (dumb): it receives props and renders.
The **state component** (smart parent) manages localStorage, visualizer calls,
and business logic via the `onChange` callback.

## CSS

Kobalte renders semantic elements (`[data-orientation="horizontal"]`) that we
style to match the app's dark design language. The fill, track, and thumb
all use CSS on Kobalte's data attributes — no inline styles needed.

``` {.css file=_generated/components/SliderRow.css}
.slider-row { position: relative; margin-top: 8px; }
.slider-row [data-orientation="horizontal"] { position: relative; overflow: visible; }
.slider-input-area { flex: 1; min-width: 0; position: relative; overflow: visible; }
.slider-track-el {
  position: relative; display: flex; align-items: center;
  height: 18px; width: 100%; background: #000; cursor: pointer;
  overflow: hidden;
}
.slider-fill-el {
  position: absolute !important; top: 0; bottom: 0; background: var(--fg); pointer-events: none;
}
.slider-thumb-el {
  width: 6px; height: 18px; background: var(--dim); cursor: grab;
  display: block; outline: none;
}
.slider-thumb-el:active { cursor: grabbing; }
.slider-thumb-el:focus-visible { outline: 1px solid var(--accent); }
.slider-label-overlay {
  position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
  font-size: 9px; color: #fff; mix-blend-mode: difference; text-transform: uppercase;
  letter-spacing: 0.06em; pointer-events: none; z-index: 1; white-space: nowrap;
  line-height: 1; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 30px);
}
```

## Badge and Reset

The editable badge floats above the thumb. The reset button sits at the end.

``` {.css file=_generated/components/SliderRow.css}
input.badge-input {
  position: absolute; bottom: 100%; transform: translateX(-50%);
  font-size: 9px; color: #fff; background: none; padding: 0 3px;
  white-space: nowrap; z-index: 2; line-height: 14px; height: 14px;
  text-align: center; font-family: var(--font); border: 1px solid var(--border);
  width: 50px; pointer-events: auto; cursor: text; outline: none;
}
input.badge-input:focus { border-color: var(--accent); background: var(--subtle); }
input.badge-input:invalid { border-color: #cc3333; }
.slider-reset {
  color: var(--dim); background: var(--bg); border: 1px solid var(--border);
  width: 22px; height: 18px; padding: 0; flex-shrink: 0; box-sizing: border-box;
}
.slider-reset:hover { color: var(--fg); border-color: var(--accent); }
.slider-row-flex { display: flex; align-items: center; gap: 2px; width: 100%; }
```

## Preset Marks

Tick marks below the slider snap to named values. Active presets highlight green.

``` {.css file=_generated/components/SliderRow.css}
.slider-presets {
  position: absolute; left: 0; right: 0; top: 100%;
  pointer-events: none; overflow: visible; min-height: 32px; padding-bottom: 4px;
}
.slider-preset-mark {
  position: absolute; transform: translateX(-50%); display: flex;
  flex-direction: column; align-items: center; pointer-events: none; top: 0;
}
.slider-tick { width: 1px; background: #666; }
.slider-tick-long { height: 14px; }
.slider-tick-staggered { height: 24px; }
.slider-tick-staggered + .slider-preset-btn { margin-top: 1px; }
.slider-preset-btn {
  font-family: var(--font); font-size: 8px; color: var(--dim);
  background: none; border: none; cursor: pointer; pointer-events: auto;
  padding: 2px; line-height: 1;
}
.slider-preset-btn:hover { color: var(--fg); }
.slider-preset-btn.active { color: #4f4; text-decoration: underline; }
.slider-preset-mark.active .slider-tick { background: #4f4; }
.slider-preset-mark.active .slider-preset-btn { color: #4f4; }
```

## Interface

``` {.typescript file=_generated/components/SliderRow.tsx}
import { createSignal, For, Show, type JSX } from 'solid-js';
import { Slider } from '@kobalte/core/slider';
import './SliderRow.css';

export interface PresetDef {
  value: number;
  label: string;
  description?: string;
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
  presets?: PresetDef[];
  presetsId?: string;
  alternateTicks?: boolean;
}
```

## Component

Kobalte's `Slider.Root` manages value state, accessibility, and keyboard
navigation. We wrap it with our label overlay, editable badge, reset button,
and optional preset marks.

``` {.typescript file=_generated/components/SliderRow.tsx}

export function SliderRow(props: { def: SliderDef }): JSX.Element {
  const defVal = (): number => props.def.defaultValue;
  const fmt = (): ((v: number) => string) => props.def.formatBadge ?? ((v: number): string => v.toFixed(1));
  const [value, setValue] = createSignal(props.def.defaultValue);

  const ratio = (): number => {
    const range = props.def.max - props.def.min;
    return range > 0 ? (value() - props.def.min) / range : 0;
  };
  const pct = (): string => `${(ratio() * 100).toFixed(2)}%`;

  const handleChange = (vals: number[]): void => {
    const v = vals[0];
    setValue(v);
    props.def.onChange?.(v);
  };

  const applyPreset = (presetValue: number): void => {
    setValue(presetValue);
    props.def.onChange?.(presetValue);
  };

  const sortedPresets = (): PresetDef[] =>
    props.def.presets ? [...props.def.presets].sort((a, b) => a.value - b.value) : [];

  return (
    <div class="slider-row">
      <div class="slider-row-flex">
        <Slider
          value={[value()]}
          onChange={handleChange}
          minValue={props.def.min}
          maxValue={props.def.max}
          step={props.def.step}
          orientation="horizontal"
          class="slider-input-area"
          id={props.def.id}
        >
          <span class="slider-label-overlay">{props.def.label}</span>
          <input
            type="text"
            class="badge-input slider-badge-edit"
            value={fmt()(value())}
            style={{ left: pct() }}
            onFocus={(e: FocusEvent): void => { (e.target as HTMLInputElement).select(); }}
            onChange={(e: Event): void => {
              const v = parseFloat((e.target as HTMLInputElement).value);
              if (Number.isFinite(v)) { setValue(Math.max(props.def.min, Math.min(props.def.max, v))); props.def.onChange?.(value()); }
            }}
          />
          <Slider.Track class="slider-track-el">
            <Slider.Fill class="slider-fill-el" />
            <Slider.Thumb class="slider-thumb-el">
              <Slider.Input />
            </Slider.Thumb>
          </Slider.Track>
          <Show when={props.def.presets}>
            <div class="slider-presets" id={props.def.presetsId}>
              <For each={sortedPresets()}>
                {(preset, i) => {
                  const pRatio = (): number => {
                    const range = props.def.max - props.def.min;
                    return range > 0 ? (preset.value - props.def.min) / range : 0;
                  };
                  const isActive = (): boolean => Math.abs(value() - preset.value) < 0.05;
                  const tickClass = (): string =>
                    props.def.alternateTicks && i() % 2 === 1 ? 'slider-tick slider-tick-staggered' : 'slider-tick slider-tick-long';
                  return (
                    <div
                      class="slider-preset-mark"
                      classList={{ active: isActive() }}
                      style={{ left: `${(pRatio() * 100).toFixed(2)}%` }}
                    >
                      <div class={tickClass()} />
                      <button
                        class="slider-preset-btn"
                        classList={{ active: isActive() }}
                        data-value={preset.value.toString()}
                        data-description={preset.description}
                        onClick={(): void => { applyPreset(preset.value); }}
                      >
                        {preset.label}
                      </button>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </Slider>
        <button class="slider-reset icon-btn icon-md" onClick={(): void => { setValue(defVal()); props.def.onChange?.(defVal()); }}>
          <i data-lucide="rotate-cw" />
        </button>
      </div>
    </div>
  );
}
```
