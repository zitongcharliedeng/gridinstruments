# State Assertions

Unified state assertion registry for XState graph test generation — single lookup interface for DOM assertions, LLM invariants, and Playwright actions for any (machine, state) or (machine, event) pair.

The module imports all per-machine assertion triples (actions, invariants, domAssertions) from the central uiMachine barrel, plus the shared Page type from Playwright.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
import type { Page } from '@playwright/test';

import {
  allMachines,
  overlayPlaywrightActions,
  overlayInvariants,
  overlayDomAssertions,
  visualiserPlaywrightActions,
  visualiserInvariants,
  visualiserDomAssertions,
  pedalsPlaywrightActions,
  pedalsInvariants,
  pedalsDomAssertions,
  waveformPlaywrightActions,
  waveformInvariants,
  waveformDomAssertions,
  sustainPlaywrightActions,
  sustainInvariants,
  sustainDomAssertions,
  vibratoPlaywrightActions,
  vibratoInvariants,
  vibratoDomAssertions,
  midiPanelPlaywrightActions,
  midiPanelInvariants,
  midiPanelDomAssertions,
  mpePlaywrightActions,
  mpeInvariants,
  mpeDomAssertions,
  textInputFocusPlaywrightActions,
  textInputFocusInvariants,
  textInputFocusDomAssertions,
```

The second half of the import list brings in the slider, dialog, and newer machine triples — skew label, all four sliders, about dialog, D-ref input, modifier compound, layout persistence, viewport, and song bar.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
  skewLabelPlaywrightActions,
  skewLabelInvariants,
  skewLabelDomAssertions,
  tuningSliderPlaywrightActions,
  tuningSliderInvariants,
  tuningSliderDomAssertions,
  skewSliderPlaywrightActions,
  skewSliderInvariants,
  skewSliderDomAssertions,
  volumeSliderPlaywrightActions,
  volumeSliderInvariants,
  volumeSliderDomAssertions,
  zoomSliderPlaywrightActions,
  zoomSliderInvariants,
  zoomSliderDomAssertions,
  aboutDialogPlaywrightActions,
  aboutDialogInvariants,
  aboutDialogDomAssertions,
  drefInputPlaywrightActions,
  drefInputInvariants,
  drefInputDomAssertions,
  modifierCompoundPlaywrightActions,
  modifierCompoundInvariants,
  modifierCompoundDomAssertions,
  layoutPersistencePlaywrightActions,
  layoutPersistenceInvariants,
  layoutPersistenceDomAssertions,
  viewportPlaywrightActions,
  viewportInvariants,
  viewportDomAssertions,
  songBarPlaywrightActions,
  songBarInvariants,
  songBarDomAssertions,
} from './uiMachine';
```

`MachineAssertionKit` bundles the three assertion surfaces for one machine. The `registry` object maps each machine name to its kit, providing O(1) lookup by name string.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
export interface MachineAssertionKit {
  actions: Partial<Record<string, (page: Page) => Promise<void>>>;
  invariants: Partial<Record<string, string>>;
  domAssertions: Partial<Record<string, (page: Page) => Promise<void>>>;
}
```

The registry's first half covers the core UI machines: overlay, visualiser, pedals, waveform, sustain, vibrato, MIDI panel, MPE, and text-input focus.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
const registry: Partial<Record<string, MachineAssertionKit>> = {
  overlay: {
    actions: overlayPlaywrightActions,
    invariants: overlayInvariants,
    domAssertions: overlayDomAssertions,
  },
  visualiser: {
    actions: visualiserPlaywrightActions,
    invariants: visualiserInvariants,
    domAssertions: visualiserDomAssertions,
  },
  pedals: {
    actions: pedalsPlaywrightActions,
    invariants: pedalsInvariants,
    domAssertions: pedalsDomAssertions,
  },
  waveform: {
    actions: waveformPlaywrightActions,
    invariants: waveformInvariants,
    domAssertions: waveformDomAssertions,
  },
  sustain: {
    actions: sustainPlaywrightActions,
    invariants: sustainInvariants,
    domAssertions: sustainDomAssertions,
  },
  vibrato: {
    actions: vibratoPlaywrightActions,
    invariants: vibratoInvariants,
    domAssertions: vibratoDomAssertions,
  },
  midiPanel: {
    actions: midiPanelPlaywrightActions,
    invariants: midiPanelInvariants,
    domAssertions: midiPanelDomAssertions,
  },
  mpe: {
    actions: mpePlaywrightActions,
    invariants: mpeInvariants,
    domAssertions: mpeDomAssertions,
  },
  textInputFocus: {
    actions: textInputFocusPlaywrightActions,
    invariants: textInputFocusInvariants,
    domAssertions: textInputFocusDomAssertions,
  },
```

The second half of the registry maps the slider, dialog, and newer machines — skew label, the four slider resets, about dialog, D-ref input, modifier compound, layout persistence, viewport, and song bar.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
  skewLabel: {
    actions: skewLabelPlaywrightActions,
    invariants: skewLabelInvariants,
    domAssertions: skewLabelDomAssertions,
  },
  tuningSlider: {
    actions: tuningSliderPlaywrightActions,
    invariants: tuningSliderInvariants,
    domAssertions: tuningSliderDomAssertions,
  },
  skewSlider: {
    actions: skewSliderPlaywrightActions,
    invariants: skewSliderInvariants,
    domAssertions: skewSliderDomAssertions,
  },
  volumeSlider: {
    actions: volumeSliderPlaywrightActions,
    invariants: volumeSliderInvariants,
    domAssertions: volumeSliderDomAssertions,
  },
  zoomSlider: {
    actions: zoomSliderPlaywrightActions,
    invariants: zoomSliderInvariants,
    domAssertions: zoomSliderDomAssertions,
  },
  aboutDialog: {
    actions: aboutDialogPlaywrightActions,
    invariants: aboutDialogInvariants,
    domAssertions: aboutDialogDomAssertions,
  },
```

The final registry entries cover the newer interaction machines — D-ref frequency input, compound modifier keys, panel layout persistence, responsive viewport states, and the song-bar game mode.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
  drefInput: {
    actions: drefInputPlaywrightActions,
    invariants: drefInputInvariants,
    domAssertions: drefInputDomAssertions,
  },
  modifierCompound: {
    actions: modifierCompoundPlaywrightActions,
    invariants: modifierCompoundInvariants,
    domAssertions: modifierCompoundDomAssertions,
  },
  layoutPersistence: {
    actions: layoutPersistencePlaywrightActions,
    invariants: layoutPersistenceInvariants,
    domAssertions: layoutPersistenceDomAssertions,
  },
  viewport: {
    actions: viewportPlaywrightActions,
    invariants: viewportInvariants,
    domAssertions: viewportDomAssertions,
  },
  songBar: {
    actions: songBarPlaywrightActions,
    invariants: songBarInvariants,
    domAssertions: songBarDomAssertions,
  },
};
```

The four exported lookup functions provide the public API consumed by the graph-generated test runner — `getKit` for bulk access, `getAction` for event dispatch, `assertDomState` for state verification, and `getInvariant` for LLM prompt text.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
export function getKit(machineName: string): MachineAssertionKit {
  const kit = registry[machineName];
  if (!kit) throw new Error(`Unknown machine: ${machineName}`);
  return kit;
}

export function getAction(
  machineName: string,
  eventType: string,
): (page: Page) => Promise<void> {
  const kit = getKit(machineName);
  const action = kit.actions[eventType];
  if (!action) throw new Error(`Unknown event '${eventType}' for machine '${machineName}'`);
  return action;
}

export async function assertDomState(
  machineName: string,
  stateName: string,
  page: Page,
): Promise<void> {
  const kit = getKit(machineName);
  const assertion = kit.domAssertions[stateName];
  if (!assertion) throw new Error(`Unknown state '${stateName}' for machine '${machineName}'`);
  await assertion(page);
}

export function getInvariant(
  machineName: string,
  stateName: string,
): string | undefined {
  const kit = registry[machineName];
  return kit?.invariants[stateName];
}

export { allMachines };
```
