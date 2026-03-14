# State Assertions

Unified state assertion registry for XState graph test generation — single lookup interface for DOM assertions, LLM invariants, and Playwright actions for any (machine, state) or (machine, event) pair.

``` {.typescript file=_generated/tests/machines/state-assertions.ts}
/**
 * Unified state assertion registry for XState graph test generation.
 *
 * @reason The graph spec needs a single lookup interface to find the
 *   DOM assertion, LLM invariant, and Playwright action for any
 *   (machine, state) or (machine, event) pair. This module collects
 *   all per-machine maps from uiMachine.ts into a unified registry.
 *
 * @design-intent Decouple the graph traversal logic (xstate-graph.spec.ts)
 *   from the per-machine assertion details. The spec only needs to call
 *   `getAction(machineName, eventType)` and `assertState(machineName, stateName, page)`.
 */

import type { Page } from '@playwright/test';

import {
  // Machines
  allMachines,
  // Overlay
  overlayPlaywrightActions,
  overlayInvariants,
  overlayDomAssertions,
  // Visualiser
  visualiserPlaywrightActions,
  visualiserInvariants,
  visualiserDomAssertions,
  // Pedals
  pedalsPlaywrightActions,
  pedalsInvariants,
  pedalsDomAssertions,
  // Waveform
  waveformPlaywrightActions,
  waveformInvariants,
  waveformDomAssertions,
  // Sustain
  sustainPlaywrightActions,
  sustainInvariants,
  sustainDomAssertions,
  // Vibrato
  vibratoPlaywrightActions,
  vibratoInvariants,
  vibratoDomAssertions,
  // MIDI Panel
  midiPanelPlaywrightActions,
  midiPanelInvariants,
  midiPanelDomAssertions,
  // MPE
  mpePlaywrightActions,
  mpeInvariants,
  mpeDomAssertions,
  // Text Input Focus
  textInputFocusPlaywrightActions,
  textInputFocusInvariants,
  textInputFocusDomAssertions,
  // Skew Label
  skewLabelPlaywrightActions,
  skewLabelInvariants,
  skewLabelDomAssertions,
  // Slider reset machines
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
  // About Dialog
  aboutDialogPlaywrightActions,
  aboutDialogInvariants,
  aboutDialogDomAssertions,
  // D-ref Input
  drefInputPlaywrightActions,
  drefInputInvariants,
  drefInputDomAssertions,
  // Modifier Compound
  modifierCompoundPlaywrightActions,
  modifierCompoundInvariants,
  modifierCompoundDomAssertions,
  // Layout Persistence
  layoutPersistencePlaywrightActions,
  layoutPersistenceInvariants,
  layoutPersistenceDomAssertions,
  // Viewport
  viewportPlaywrightActions,
  viewportInvariants,
  viewportDomAssertions,
  // Song Bar
  songBarPlaywrightActions,
  songBarInvariants,
  songBarDomAssertions,
} from './uiMachine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MachineAssertionKit {
  actions: Partial<Record<string, (page: Page) => Promise<void>>>;
  invariants: Partial<Record<string, string>>;
  domAssertions: Partial<Record<string, (page: Page) => Promise<void>>>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

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

// ─── Lookup API ──────────────────────────────────────────────────────────────

/**
 * Get the full assertion kit for a machine by name.
 * Throws if machine name is unknown.
 */
export function getKit(machineName: string): MachineAssertionKit {
  const kit = registry[machineName];
  if (!kit) throw new Error(`Unknown machine: ${machineName}`);
  return kit;
}

/**
 * Get the Playwright action for a specific event on a machine.
 * Throws if machine or event is unknown.
 */
export function getAction(
  machineName: string,
  eventType: string,
): (page: Page) => Promise<void> {
  const kit = getKit(machineName);
  const action = kit.actions[eventType];
  if (!action) throw new Error(`Unknown event '${eventType}' for machine '${machineName}'`);
  return action;
}

/**
 * Run the deterministic DOM assertion for a state on a machine.
 * Throws if machine or state is unknown.
 */
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

/**
 * Get the LLM vision invariant string for a state on a machine.
 * Returns undefined if not found (non-throwing for optional LLM layer).
 */
export function getInvariant(
  machineName: string,
  stateName: string,
): string | undefined {
  const kit = registry[machineName];
  return kit?.invariants[stateName];
}

/** Re-export the machine list for the graph spec. */
export { allMachines };
```
