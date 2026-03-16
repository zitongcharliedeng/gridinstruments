# Pedals Panel

SolidJS component for the sustain and vibrato pedal buttons. The two buttons
occupy equal halves of the pedals row and invert to white-on-black while held,
driven by the `.active` class toggled by the state machine via props callbacks.

## Component Interface

Props expose four pointer-event callbacks — down and up for each pedal — so the
parent can wire the `pedalMachine` actors without any direct DOM access.

``` {.typescript file=_generated/components/PedalsPanel.tsx}
import { type JSX } from 'solid-js';

export interface PedalsPanelProps {
  onSustainDown: () => void;
  onSustainUp: () => void;
  onVibratoDown: () => void;
  onVibratoUp: () => void;
}
```

## Pedal Buttons

Each button uses the `.pedal-btn` CSS class and carries the same `id` attributes
the existing wiring expects (`sustain-indicator`, `vibrato-indicator`). The
`padding-top: 4px` style matches the original markup.

Pointer-leave fires `onUp` so releasing outside the button boundary still
deactivates the pedal, matching the existing imperative behaviour.

``` {.typescript file=_generated/components/PedalsPanel.tsx}

export function PedalsPanel(props: PedalsPanelProps): JSX.Element {
  const onSustainDown = (e: PointerEvent): void => {
    e.preventDefault();
    props.onSustainDown();
  };
  const onVibratoDown = (e: PointerEvent): void => {
    e.preventDefault();
    props.onVibratoDown();
  };

  return (
    <>
      <button
        class="pedal-btn"
        id="sustain-indicator"
        style="padding-top: 4px;"
        onPointerDown={onSustainDown}
        onPointerUp={props.onSustainUp}
        onPointerLeave={props.onSustainUp}
      >
        SUSTAIN
      </button>
      <button
        class="pedal-btn"
        id="vibrato-indicator"
        style="padding-top: 4px;"
        onPointerDown={onVibratoDown}
        onPointerUp={props.onVibratoUp}
        onPointerLeave={props.onVibratoUp}
      >
        VIBRATO
      </button>
    </>
  );
}
```
