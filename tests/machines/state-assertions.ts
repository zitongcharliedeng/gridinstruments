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
} from './uiMachine';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MachineAssertionKit {
  /** Map from event type → Playwright action to trigger that event. */
  actions: Record<string, (page: Page) => Promise<void>>;
  /** Map from state name → human-readable LLM vision invariant. */
  invariants: Record<string, string>;
  /** Map from state name → deterministic DOM assertion function. */
  domAssertions: Record<string, (page: Page) => Promise<void>>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

const registry: Record<string, MachineAssertionKit> = {
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
  return registry[machineName]?.invariants[stateName];
}

/** Re-export the machine list for the graph spec. */
export { allMachines };
