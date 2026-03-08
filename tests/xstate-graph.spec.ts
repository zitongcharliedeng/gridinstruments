/**
 * XState Graph-Generated Test Suite
 *
 * @reason Every UI state transition in GridInstruments should be covered by
 *   at least one test. Hand-writing tests for every (state, event) pair is
 *   error-prone and leads to coverage gaps. Instead, we enumerate all pairs
 *   from 10 independent UI state machines using `getAdjacencyMap` from
 *   `xstate/graph`, and generate a Playwright test for each.
 *
 * @design-intent Model-based testing via XState graph traversal ensures
 *   complete coverage of all user-reachable UI states. Each generated test:
 *   1. Walks the shortest path from initial state to the source state
 *   2. Fires the event (Playwright action)
 *   3. Verifies the target state (DOM assertions)
 *   4. Optionally runs LLM vision verification (if LLM_VISION_ENABLED=true)
 *
 * Machines:
 *   overlay (2 states, 6 pairs) — overlay show/hide
 *   visualiser (3 states, 12 pairs) — panel resize
 *   pedals (3 states, 12 pairs) — panel resize
 *   waveform (4 states, 16 pairs) — waveform selection
 *   sustain (2 states, 8 pairs) — sustain hold
 *   vibrato (2 states, 8 pairs) — vibrato hold
 *   midiPanel (2 states, 2 pairs) — MIDI panel toggle (skipped: no DOM element)
 *   mpe (2 states, 2 pairs) — MPE toggle
 *   textInputFocus (2 states, 6 pairs) — text input focus/blur
 *   skewLabel (2 states, 4 pairs) — skew label annotation
 *
 * Total: 76 pairs, ~74 active tests (midiPanel skipped).
 */

import { test, expect } from '@playwright/test';
import { type AnyStateMachine } from 'xstate';
import { getAdjacencyMap } from 'xstate/graph';
import { allMachines } from './machines/uiMachine';
import { getKit, getAction, assertDomState, getInvariant } from './machines/state-assertions';
import { assertVisualState } from './fixtures/visual-assert';
import type { StateMeta } from './machines/types';
import {
  handleDomParent,
  panelAriaCheck,
  appLoadedCheck,
  overlayGoldenCheck,
  fullPageGoldenCheck,
  keyboardCanvasGoldenCheck,
  tetNotchGoldenCheck,
} from './machines/invariant-checks';
import { focusReturnCheck } from './machines/modifierCompoundMachine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TransitionTest {
  machineName: string;
  sourceState: string;
  eventType: string;
  targetState: string;
  /** Sequence of events to reach sourceState from initial state. */
  pathToSource: string[];
}

/** Structural type for adjacency map transition entries. */
interface AdjTransition {
  state: { value: unknown } | null;
  event?: { type: string };
  eventType?: string;
}

interface AdjNode {
  transitions: Record<string, AdjTransition>;
}

// ─── Graph enumeration ───────────────────────────────────────────────────────

/**
 * Compute shortest paths from initial state to every other state.
 * Returns a map: stateName → event sequence to reach it.
 */
function computeShortestPaths(machine: AnyStateMachine): Map<string, string[]> {
  const adj = getAdjacencyMap(machine, {
    serializeState: (state) => JSON.stringify(state.value),
  }) as unknown as Record<string, AdjNode>;

  const initialState = String(machine.config.initial);
  const paths = new Map<string, string[]>();
  paths.set(initialState, []);

  // BFS
  const queue: string[] = [initialState];
  const visited = new Set<string>([initialState]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const serialized = `"${current}"`;
    const node = adj[serialized];
    if (!node) continue;

    for (const [, transition] of Object.entries(node.transitions)) {
      const targetSerialized = transition.state
        ? JSON.stringify(transition.state.value)
        : null;
      if (!targetSerialized) continue;

      const targetState = JSON.parse(targetSerialized) as string;
      if (!visited.has(targetState)) {
        visited.add(targetState);
        const eventType = transition.event?.type ?? transition.eventType ?? '';
        paths.set(targetState, [...(paths.get(current) ?? []), eventType]);
        queue.push(targetState);
      }
    }
  }

  return paths;
}

/**
 * Enumerate all (source, event, target) transitions from the adjacency map.
 */
function enumerateTransitions(
  machineName: string,
  machine: AnyStateMachine,
): TransitionTest[] {
  const adj = getAdjacencyMap(machine, {
    serializeState: (state) => JSON.stringify(state.value),
  }) as unknown as Record<string, AdjNode>;
  const shortestPaths = computeShortestPaths(machine);
  const tests: TransitionTest[] = [];

  for (const [serializedState, node] of Object.entries(adj)) {
    const sourceState = JSON.parse(serializedState) as string;

    for (const [, transition] of Object.entries(node.transitions)) {
      const targetSerialized = transition.state
        ? JSON.stringify(transition.state.value)
        : null;
      if (!targetSerialized) continue;

      const targetState = JSON.parse(targetSerialized) as string;
      const eventType = transition.event?.type ?? transition.eventType ?? '';

      tests.push({
        machineName,
        sourceState,
        eventType,
        targetState,
        pathToSource: shortestPaths.get(sourceState) ?? [],
      });
    }
  }

  return tests;
}

// ─── Machines that require overlay to be open first ──────────────────────────

const NEEDS_OVERLAY_OPEN = new Set(['waveform', 'mpe', 'textInputFocus', 'skewLabel', 'midiPanel', 'tuningSlider', 'skewSlider', 'volumeSlider', 'zoomSlider', 'drefInput']);

// ─── Machines to skip (DOM elements don't exist) ─────────────────────────────

const SKIP_MACHINES = new Set<string>([]);

// ─── Structural invariants: D(P) = {} — tested once, not per-state ───────────

test.describe('[Structural] state-independent invariants', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });

  test('PNL-VIS-6: handle is DOM child of visualiser-panel', async ({ page }) => {
    await handleDomParent.check(page);
  });

  test('PNL-VIS-3: panel handles have correct ARIA attributes', async ({ page }) => {
    await panelAriaCheck.check(page);
  });

  test('BH-FOCUS-RETURN-1: keyboard works after clicking neutral element', async ({ page }) => {
    await focusReturnCheck.check(page);
  });

  test('BH-MOB-2: smart zoom on 390px touch device ≤ 1.0', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const p = await ctx.newPage();
    await p.goto('/');
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(1500);

    const defaultZoom = await p.evaluate(() => {
      const app = (window as Window & { dcomposeApp?: { getDefaultZoom: () => number } }).dcomposeApp;
      return app?.getDefaultZoom() ?? -1;
    });
    expect(defaultZoom).toBeGreaterThan(0);
    expect(defaultZoom).toBeLessThanOrEqual(1.0);
    expect(defaultZoom).toBeGreaterThan(0.5);

    await ctx.close();
  });

  test('SM-APP-LOADED: app colors, font, DPR scaling, no rounded corners', async ({ page }) => {
    await appLoadedCheck.check(page);
  });

  test('GOLDEN-1: Grid overlay snapshot', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await overlayGoldenCheck.check(page);
  });

  test('GOLDEN-4: Full page snapshot', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await fullPageGoldenCheck.check(page);
  });

  test('GOLDEN-7: Keyboard canvas snapshot', async ({ page }) => {
    await keyboardCanvasGoldenCheck.check(page);
  });

  test('GOLDEN-8: TET notch labels snapshot', async ({ page }) => {
    await page.locator('#grid-settings-btn').click();
    await page.waitForTimeout(300);
    await tetNotchGoldenCheck.check(page);
  });
});

// ─── Test generation ─────────────────────────────────────────────────────────

for (const { name: machineName, machine } of allMachines) {
  if (SKIP_MACHINES.has(machineName)) continue;

  const transitions = enumerateTransitions(machineName, machine);
  const kit = getKit(machineName);

  test.describe(`[Graph] ${machineName}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
    });

    for (const t of transitions) {
      /**
       * @reason Graph-generated test for the ${t.machineName} machine.
       *   Covers the transition: ${t.sourceState} → ${t.eventType} → ${t.targetState}.
       * @design-intent Model-based test from XState adjacency map ensures
       *   every user-reachable (state, event) pair is exercised.
       */
      test(`${t.sourceState} → ${t.eventType} → ${t.targetState}`, async ({ page }) => {
        // ── Step 0: Open overlay if machine needs it ──────────────────
        if (NEEDS_OVERLAY_OPEN.has(machineName)) {
          await page.locator('#grid-settings-btn').click();
          await page.waitForTimeout(300);
        }

        // ── Step 1: Walk to source state ──────────────────────────────
        for (const eventType of t.pathToSource) {
          const action = getAction(machineName, eventType);
          await action(page);
          await page.waitForTimeout(200);
        }

        // ── Step 2: Verify we're in source state ──────────────────────
        await assertDomState(machineName, t.sourceState, page);

        // ── Step 3: Fire the event ────────────────────────────────────
        const action = getAction(machineName, t.eventType);
        await action(page);
        // Panel drags need extra time for pointer capture teardown + class toggle
        const isDrag = t.eventType.startsWith('DRAG_') || t.eventType.startsWith('DBLCLICK_');
        await page.waitForTimeout(isDrag ? 500 : 300);

        // ── Step 4: Verify target state (DOM assertions) ──────────────
        await assertDomState(machineName, t.targetState, page);

        // ── Step 4b: State-level invariants (Tier 2) ──────────────────
        const stateConfig = machine.config.states?.[t.targetState] as
          | (Record<string, unknown> & { meta?: StateMeta })
          | undefined;
        const stateMeta = stateConfig?.meta;
        if (stateMeta?.invariants) {
          for (const inv of stateMeta.invariants) {
            await inv.check(page);
          }
        }

        // ── Step 5: LLM vision verification (optional) ────────────────
        const invariant = getInvariant(machineName, t.targetState);
        if (invariant) {
          const result = await assertVisualState({
            page,
            invariant,
            context: `Machine: ${machineName}, State: ${t.targetState}, Transition: ${t.sourceState} → ${t.eventType} → ${t.targetState}`,
            goldenName: `graph-${machineName}-${t.targetState}`,
          });

          if (result.visionResult && !result.visionResult.pass) {
            throw new Error(
              `[LLM Vision] ${machineName}.${t.targetState}: ` +
              `${result.visionResult.reason} (confidence: ${result.visionResult.confidence})`,
            );
          }
        }
      });
    }
  });
}
