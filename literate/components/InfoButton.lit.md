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

export function InfoButton(props: InfoButtonProps): JSX.Element {
  return (
    <button class="slider-info-btn" data-info={props.infoKey}>
      i
    </button>
  );
}
```
