# InfoBox — universal wrapper for settings components

Wraps ANY child component with an info button (left) and optional reset
button (right). The wrapper forms ONE continuous bordered box:
`[i | child content | ↺]`. No gaps. Same height. One border.

``` {.css file=_generated/components/InfoBox.css}
.info-box {
  display: inline-flex; align-items: stretch; gap: 0;
  border: 1px solid var(--border);
}
.info-box > .slider-info-btn {
  border: none; border-right: 1px solid var(--border); margin: 0;
  height: auto; width: 14px;
}
.info-box > .info-box-content {
  flex: 1; min-width: 0; display: flex; align-items: center;
}
.info-box > .slider-reset {
  border: none; border-left: 1px solid var(--border);
  height: auto;
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
