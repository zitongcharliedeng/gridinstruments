# Pedals Panel

SolidJS component for the sustain and vibrato pedal buttons. The two buttons
occupy equal halves of the pedals row and invert to white-on-black while held,
driven by the `.active` class toggled by the state machine via props callbacks.

## Component Interface

Props expose four pointer-event callbacks — down and up for each pedal — so the
parent can wire the `pedalMachine` actors without any direct DOM access.

``` {.typescript file=_generated/components/PedalsPanel.tsx}
import { type JSX } from 'solid-js';

const PEDALS_CSS = `#pedals-panel {
  flex-shrink:0; display:flex; gap:1px; background:var(--border);
  overflow:visible; position:relative; z-index:1; border-top:1px solid var(--border);
}
#pedals-panel.collapsed { height:0 !important; overflow:visible; }
.pedal-btn {
  flex:1; padding:4px 0 12px 0; font-family:var(--font); font-size:12px;
  font-weight:500; text-transform:uppercase; letter-spacing:0.1em;
  color:var(--dim); background:var(--bg); border:none; cursor:pointer;
  user-select:none; -webkit-user-select:none; touch-action:manipulation;
  -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent;
}
@media (hover:hover) { .pedal-btn:hover { color:var(--fg); background:var(--subtle); } }
.pedal-btn.active { color:var(--bg); background:var(--fg); }`;

let pedalsCssInjected = false;

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
  if (!pedalsCssInjected) { const s = document.createElement('style'); s.textContent = PEDALS_CSS; document.head.appendChild(s); pedalsCssInjected = true; }
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
        onPointerDown={onSustainDown}
        onPointerUp={() => props.onSustainUp()}
        onPointerLeave={() => props.onSustainUp()}
      >
        SUSTAIN
      </button>
      <button
        class="pedal-btn"
        id="vibrato-indicator"
        onPointerDown={onVibratoDown}
        onPointerUp={() => props.onVibratoUp()}
        onPointerLeave={() => props.onVibratoUp()}
      >
        VIBRATO
      </button>
    </>
  );
}
```
