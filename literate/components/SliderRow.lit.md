# Slider Row — pure display component

The ONE slider component used everywhere. A pure reactive display component —
no observers, no rAF, no imperative DOM. Fill gradient and badge position are
derived signals from the value. SolidJS updates them when value changes.

This is a **display component** (dumb): it receives props and renders.
The **state component** (smart parent) manages localStorage, visualizer calls,
and business logic via the `onChange` callback.

## Imports and Types

``` {.typescript file=_generated/components/SliderRow.tsx}
import { createSignal, For, Show, type JSX } from 'solid-js';
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

## Range Input Styling

The native range input is fully restyled. Both WebKit and Firefox thumb
pseudo-elements get a 6px-wide grab cursor. The track inherits its
background from the parent (so the fill gradient applied via `style` works).

``` {.css file=_generated/components/SliderRow.css}
input[type="range"] {
  padding: 0; height: 18px; border: none; cursor: pointer;
  background: #000; -webkit-appearance: none; appearance: none;
}
input[type="range"]::-webkit-slider-runnable-track { height: 18px; background: inherit; }
input[type="range"]::-moz-range-track { height: 18px; background: inherit; border: none; }
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 6px; height: 18px; background: var(--fg); cursor: grab;
}
input[type="range"]::-webkit-slider-thumb:active { cursor: grabbing; }
input[type="range"]::-moz-range-thumb {
  width: 6px; height: 18px; background: var(--fg); cursor: grab; border: none; border-radius: 0;
}
input[type="range"]::-moz-range-thumb:active { cursor: grabbing; }
```

## Track Layout

The `.slider-track` is a flex row: range input (flex: 1), an absolutely
positioned badge above, and a reset button at the end. The label overlays
the slider using `mix-blend-mode: difference` so it's readable on both
the filled and unfilled portions.

``` {.css file=_generated/components/SliderRow.css}
.slider-track {
  position: relative; display: flex; align-items: center; gap: 2px; overflow: visible;
}
.slider-input-area { flex: 1; min-width: 0; position: relative; }
.slider-input-area input[type="range"] { width: 100%; margin: 0; }
.slider-label-overlay {
  position: absolute; left: 4px; top: 50%; transform: translateY(-50%);
  font-size: 9px; color: #fff; mix-blend-mode: difference; text-transform: uppercase;
  letter-spacing: 0.06em; pointer-events: none; z-index: 1; white-space: nowrap;
  line-height: 1; overflow: hidden; text-overflow: ellipsis; max-width: calc(100% - 30px);
}
.slider-row-track { margin-top: 8px; }
```

## Editable Badge

The badge floats above the slider thumb, showing the formatted value. It's
always a text input with a faint border so the user knows it's clickable.
Focus highlights it with the accent color; invalid input turns the border red.

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
```

## Reset Button

The reset button sits at the right edge of the track. `box-sizing: border-box`
ensures its 1px border is included in the 22px width — this is critical for
pixel-perfect alignment with the preset marks below (which use `right: 24px`
= 22px button + 2px flex gap).

``` {.css file=_generated/components/SliderRow.css}
.slider-reset {
  color: var(--dim); background: var(--bg); border: 1px solid var(--border);
  width: 22px; height: 18px; padding: 0; flex-shrink: 0; box-sizing: border-box;
}
.slider-reset:hover { color: var(--fg); border-color: var(--accent); }
```

## Preset Marks

Optional tick marks below the slider snap to named values (like "12-TET",
"DCompose", "Pythagorean"). The container spans the range input's width
(`right: 24px` accounts for the reset button + gap). Each mark is
absolutely positioned at the same `calc()` formula as the thumb — ensuring
the tick aligns with where the thumb would be at that value.

Active presets highlight in green. Alternating tick heights (`slider-tick-staggered`)
prevent label overlap on dense preset lists like TET markers.

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

## Component — Reactive State

The component owns a single `value` signal. All derived values — ratio,
fill gradient, badge text, badge position, preset active states — are
computed from this signal. SolidJS's fine-grained reactivity means only
the specific DOM attributes that depend on `value()` update when it changes.

The `THUMB_W` constant (6px) matches the CSS thumb width. Fill, badge,
and preset positions all use the same `calc(ratio * (100% - 6px) + 3px)`
formula so they align pixel-perfectly with the native thumb.

``` {.typescript file=_generated/components/SliderRow.tsx}

export function SliderRow(props: { def: SliderDef }): JSX.Element {
  const defVal = (): number => props.def.defaultValue;
  const fmt = (): ((v: number) => string) => props.def.formatBadge ?? ((v: number): string => v.toFixed(1));
  const [value, setValue] = createSignal(props.def.defaultValue);

  const ratio = (): number => {
    const range = props.def.max - props.def.min;
    return range > 0 ? (value() - props.def.min) / range : 0;
  };
  const THUMB_W = 6;
  const thumbPos = (): string => `calc(${ratio().toFixed(6)} * (100% - ${THUMB_W}px) + ${THUMB_W / 2}px)`;
  const fillStyle = (): string =>
    `linear-gradient(to right, var(--fg) ${thumbPos()}, #000 ${thumbPos()})`;

  const onInput = (e: Event): void => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    setValue(v);
    props.def.onChange?.(v);
  };

  const applyPreset = (presetValue: number): void => {
    setValue(presetValue);
    props.def.onChange?.(presetValue);
  };

  const sortedPresets = (): PresetDef[] =>
    props.def.presets ? [...props.def.presets].sort((a, b) => a.value - b.value) : [];
```

## Component — JSX Template

The template renders a flex row: label overlay, range input with reactive
fill, editable badge positioned at the thumb, and a reset button. If
`presets` are provided, they render below the track as reactive tick marks.

``` {.typescript file=_generated/components/SliderRow.tsx}
  return (
    <div class="slider-track slider-row-track">
      <div class="slider-input-area">
        <span class="slider-label-overlay">{props.def.label}</span>
        <input
          type="range"
          id={props.def.id}
          min={props.def.min}
          max={props.def.max}
          step={props.def.step}
          value={value()}
          onInput={onInput}
          style={{ background: fillStyle() }}
        />
        <input
          type="text"
          class="badge-input slider-badge-edit"
          value={fmt()(value())}
          style={{ left: thumbPos() }}
          onFocus={(e: FocusEvent): void => { (e.target as HTMLInputElement).select(); }}
          onChange={(e: Event): void => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            if (Number.isFinite(v)) { setValue(Math.max(props.def.min, Math.min(props.def.max, v))); props.def.onChange?.(value()); }
          }}
        />
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
                  style={{ left: `calc(${pRatio().toFixed(6)} * (100% - ${THUMB_W}px) + ${THUMB_W / 2}px)` }}
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
      </div>
      <button class="slider-reset icon-btn icon-md" onClick={(): void => { setValue(defVal()); props.def.onChange?.(defVal()); }}>
        <i data-lucide="rotate-cw" />
      </button>
    </div>
  );
}
```
