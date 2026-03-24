# Info Button Component

A reusable SolidJS info button that sits tightly to the LEFT of its
adjacent component. Square border, 14x14, italic "i" text.
Click opens the info dialog. Hover shows a tooltip preview extracted
from the first `<h2>` in the content.

This is the single source of truth for all info buttons in the app.
No other pattern should be used for contextual help icons.

``` {.css file=_generated/components/InfoButton.css}
.slider-info-btn {
  position: relative; transform: none; z-index: 3; color: var(--dim);
  width: 14px; height: 14px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid #555; background: var(--bg); opacity: 1; outline: none;
  cursor: pointer; flex-shrink: 0; vertical-align: middle; margin: 0;
  font-family: var(--font); font-size: 9px; font-style: italic; line-height: 1;
}
.slider-info-btn svg { display: none; }
.slider-info-btn:hover { opacity: 1; color: var(--accent, #4af); border-color: var(--accent, #4af); }
.slider-info-btn.active { color: var(--bg); background: var(--fg); border-color: var(--fg); }
.info-tooltip {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  background: var(--bg); border: 1px solid var(--border); padding: 2px 6px;
  font-size: 9px; font-style: normal; color: var(--fg); white-space: nowrap;
  pointer-events: none; opacity: 0; transition: opacity 0.15s;
  z-index: 20; margin-bottom: 4px;
}
.slider-info-btn:hover .info-tooltip { opacity: 1; }
```

The component extracts the tooltip text from the first `<h2>` tag in the
content HTML. If no content is provided, no tooltip appears.

``` {.typescript file=_generated/components/InfoButton.tsx}
import { type JSX, createMemo } from 'solid-js';
import './InfoButton.css';

export interface InfoButtonProps {
  infoKey: string;
  content?: string;
}

function extractTitle(html: string | undefined): string {
  if (!html) return '';
  const m = html.match(/<h2>(.*?)<\/h2>/);
  return m ? m[1] : '';
}

export function InfoButton(props: InfoButtonProps): JSX.Element {
  const tip = createMemo(() => extractTitle(props.content));
  return (
    <button
      class="slider-info-btn"
      data-info={props.infoKey}
      data-info-content={props.content}
    >
      i
      {tip() && <span class="info-tooltip">{tip()}</span>}
    </button>
  );
}
```
