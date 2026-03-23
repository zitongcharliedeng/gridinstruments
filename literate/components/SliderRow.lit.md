# Slider Row — pure display component

The ONE slider component used everywhere. A pure reactive display component —
no observers, no rAF, no imperative DOM. Fill gradient and badge position are
derived signals from the value. SolidJS updates them when value changes.

The editable badge always shows a faint border (`badge-input` class) so the
user knows it's clickable. Click to type a value, Enter/blur to commit.

Optional `presets` render tick marks below the slider. Active state highlighting
is a derived signal — no imperative DOM updates. The `alternateTicks` flag
staggers every other tick for dense preset lists (like TET markers).

This is a **display component** (dumb): it receives props and renders.
The **state component** (smart parent) manages localStorage, visualizer calls,
and business logic via the `onChange` callback.

## Interface

``` {.typescript file=_generated/components/SliderRow.tsx}
import { createSignal, For, Show, type JSX } from 'solid-js';

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

``` {.typescript file=_generated/components/SliderRow.tsx}

export function SliderRow(props: { def: SliderDef }): JSX.Element {
  const defVal = (): number => props.def.defaultValue;
  const fmt = (): ((v: number) => string) => props.def.formatBadge ?? ((v: number): string => v.toFixed(1));
  const [value, setValue] = createSignal(props.def.defaultValue);

  const ratio = (): number => {
    const range = props.def.max - props.def.min;
    return range > 0 ? (value() - props.def.min) / range : 0;
  };
  const fillStyle = (): string => {
    const pct = (ratio() * 100).toFixed(1);
    return `linear-gradient(to right, var(--fg) ${pct}%, #000 ${pct}%)`;
  };

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
        style={{ background: fillStyle() }}
      />
      <input
        type="text"
        class="badge-input slider-badge-edit"
        value={fmt()(value())}
        style={{ left: `${(ratio() * 100).toFixed(1)}%` }}
        onFocus={(e: FocusEvent): void => { (e.target as HTMLInputElement).select(); }}
        onChange={(e: Event): void => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(v)) { setValue(Math.max(props.def.min, Math.min(props.def.max, v))); props.def.onChange?.(value()); }
        }}
      />
      <button class="slider-reset icon-btn icon-md" onClick={(): void => { setValue(defVal()); props.def.onChange?.(defVal()); }}>
        <i data-lucide="rotate-cw" />
      </button>
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
                  style={{ left: `calc(${pRatio().toFixed(6)} * (100% - 3px) + 1.5px)` }}
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
  );
}
```
