# Info Button Component

A reusable SolidJS info button that sits tightly to the LEFT of its
adjacent component. Square border, 16x16, Lucide info icon at 10px.
Click opens the info dialog. Hover shows a preview snippet.

This is the single source of truth for all info buttons in the app.
No other pattern should be used for contextual help icons.

``` {.typescript file=_generated/components/InfoButton.tsx}
import { type JSX } from 'solid-js';

export interface InfoButtonProps {
  infoKey: string;
}

const INFO_BTN_CSS = `.slider-info-btn {
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
.slider-info-btn .info-preview {
  display: none; position: absolute; left: 100%; top: 0;
  margin-left: 6px;
  background: rgba(20, 20, 22, 0.97); border: 1px solid var(--border);
  padding: 10px 12px; font-size: 10px; color: var(--fg);
  line-height: 1.5; max-width: 320px; max-height: 400px;
  overflow-y: auto; overflow-x: hidden; z-index: 30; pointer-events: none;
  scrollbar-width: thin; scrollbar-color: var(--dim) transparent;
}
.slider-info-btn .info-preview h2 { font-size: 12px; margin: 0 0 6px; }
.slider-info-btn .info-preview h3 { font-size: 11px; margin: 8px 0 4px; color: var(--dim); }
.slider-info-btn .info-preview p { margin: 4px 0; }
.slider-info-btn .info-preview ul, .slider-info-btn .info-preview ol { margin: 4px 0; padding-left: 16px; }
.slider-info-btn .info-preview table { font-size: 9px; border-collapse: collapse; }
.slider-info-btn .info-preview td { padding: 2px 6px; border: 1px solid var(--border); }
.slider-info-btn .info-preview a { color: var(--accent, #4af); }
.slider-info-btn:hover .info-preview { display: block; }`;

let cssInjected = false;

export function InfoButton(props: InfoButtonProps): JSX.Element {
  if (!cssInjected) {
    const style = document.createElement('style');
    style.textContent = INFO_BTN_CSS;
    document.head.appendChild(style);
    cssInjected = true;
  }
  return (
    <button class="slider-info-btn" data-info={props.infoKey}>
      i
    </button>
  );
}
```
