# InfoBox — universal wrapper for settings components

A generic wrapper that adds an info button (left) and optional reset button
(right) around ANY child component. The wrapper forms a single bordered box:
`[i | child content | ↺]`. Works with sliders, checkboxes, dropdowns, or
any other setting control.

This is the standard pattern for ALL settings in the app. Every setting
should be wrapped in an InfoBox. No setting should render an InfoButton
or reset button directly — InfoBox handles both.

``` {.css file=_generated/components/InfoBox.css}
.info-box {
  display: flex; align-items: center; gap: 0;
  border: 1px solid var(--border); width: 100%;
}
.info-box > .slider-info-btn {
  border: none; border-right: 1px solid var(--border); margin: 0;
  height: 100%; align-self: stretch;
}
.info-box > .info-box-content { flex: 1; min-width: 0; }
.info-box > .slider-reset {
  border: none; border-left: 1px solid var(--border);
  align-self: stretch; height: auto;
}
```

``` {.typescript file=_generated/components/InfoBox.tsx}
import { type JSX, type ParentProps } from 'solid-js';
import { InfoButton } from './InfoButton';
import './InfoBox.css';

export interface InfoBoxProps {
  infoKey: string;
  infoContent?: string;
  resetId?: string;
}

export function InfoBox(props: ParentProps<InfoBoxProps>): JSX.Element {
  return (
    <div class="info-box">
      <InfoButton infoKey={props.infoKey} content={props.infoContent} />
      <div class="info-box-content">
        {props.children}
      </div>
      {props.resetId && (
        <button class="slider-reset icon-btn icon-md" id={props.resetId}>
          <i data-lucide="rotate-cw" />
        </button>
      )}
    </div>
  );
}
```
