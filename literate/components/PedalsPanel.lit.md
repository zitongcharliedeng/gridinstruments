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
  flex-shrink:0; display:flex; gap:0; background:var(--bg);
  overflow:visible; position:relative; z-index:1; border-top:1px solid var(--border);
}
#pedals-panel.collapsed { height:0 !important; overflow:visible; }
.pedal-btn {
  flex:1; padding:8px 0; font-family:var(--font); font-size:11px;
  font-weight:700; text-transform:uppercase; letter-spacing:0.12em;
  color:var(--dim); background:var(--bg); border:none; border-right:1px solid var(--border); cursor:pointer;
  user-select:none; -webkit-user-select:none; touch-action:manipulation;
  -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent;
}
@media (hover:hover) { .pedal-btn:hover { color:var(--fg); background:var(--subtle); } }
.pedal-btn:last-child { border-right:none; }
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

function HoldButton(props: {
  id: string;
  label: string;
  onDown: () => void;
  onUp: () => void;
}): JSX.Element {
  const down = (e: PointerEvent): void => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    props.onDown();
  };
  const up = (e: PointerEvent): void => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    props.onUp();
  };
  return (
    <button
      class="pedal-btn"
      id={props.id}
      on:pointerdown={down}
      on:pointerup={up}
      on:pointercancel={() => { props.onUp(); }}
    >
      {props.label}
    </button>
  );
}

export function PedalsPanel(props: PedalsPanelProps): JSX.Element {
  if (!pedalsCssInjected) { const s = document.createElement('style'); s.textContent = PEDALS_CSS; document.head.appendChild(s); pedalsCssInjected = true; }
  return (
    <>
      <HoldButton id="sustain-indicator" label="SUSTAIN" onDown={() => { props.onSustainDown(); }} onUp={() => { props.onSustainUp(); }} />
      <HoldButton id="vibrato-indicator" label="VIBRATO" onDown={() => { props.onVibratoDown(); }} onUp={() => { props.onVibratoUp(); }} />
    </>
  );
}
```
