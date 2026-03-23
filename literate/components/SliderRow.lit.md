# Slider Row — pure display component

The ONE slider component used everywhere. A pure reactive display component —
no observers, no rAF, no imperative DOM. Fill gradient and badge position are
derived signals from the value. SolidJS updates them when value changes.

The editable badge always shows a faint border (`badge-input` class) so the
user knows it's clickable. Click to type a value, Enter/blur to commit.

This is a **display component** (dumb): it receives props and renders.
The **state component** (smart parent) manages localStorage, visualizer calls,
and business logic via the `onChange` callback.

## Interface

``` {.typescript file=_generated/components/SliderRow.tsx}
import { createSignal, type JSX } from 'solid-js';

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
```

## Component

``` {.typescript file=_generated/components/SliderRow.tsx}

export function SliderRow(props: { def: SliderDef }): JSX.Element {
  const defVal = props.def.defaultValue;
  const fmtFn = props.def.formatBadge;
  const [value, setValue] = createSignal(defVal);
  const fmt = fmtFn ?? ((v: number) => v.toFixed(1));

  const ratio = () => {
    const range = props.def.max - props.def.min;
    return range > 0 ? (value() - props.def.min) / range : 0;
  };
  const fillStyle = () => {
    const pct = (ratio() * 100).toFixed(1);
    return `linear-gradient(to right, var(--fg) ${pct}%, #000 ${pct}%)`;
  };

  const onInput = (e: Event): void => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    setValue(v);
    props.def.onChange?.(v);
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
        style={{ background: fillStyle() }}
      />
      <input
        type="text"
        class="badge-input slider-badge-edit"
        value={fmt(value())}
        style={{ left: `${(ratio() * 100).toFixed(1)}%` }}
        onFocus={(e) => { (e.target as HTMLInputElement).select(); }}
        onChange={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(v)) { setValue(Math.max(props.def.min, Math.min(props.def.max, v))); props.def.onChange?.(value()); }
        }}
      />
      <button class="slider-reset icon-btn icon-md" onClick={() => { setValue(defVal); props.def.onChange?.(defVal); }}>
        <i data-lucide="rotate-cw" />
      </button>
    </div>
  );
}
```
