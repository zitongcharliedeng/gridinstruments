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
  scrollbarWidthCheck,
  scrollbarOverflowCheck,
  drefDriftCheck,
  ctMarkers1Check,
  ctMarkers2Check,
  ctNearest1Check,
  ctMidi1Check,
  ctMidi2Check,
  ctPc1Check,
  ctPc2Check,
  ctNotename1Check,
  ctNotename2Check,
  ctNotename3Check,
  ctHue1Check,
  ctHue2Check,
  ctRoundtrip1Check,
  ctCents1Check,
  ctCents2Check,
  ctMachine1Check,
  ctMachine2Check,
  ctMachine3Check,
  ctMachine4Check,
  bhDoubleAccidental1Check,
  iscMpe1Check,
  iscMpe2Check,
  iscMpe3Check,
  iscMpe4Check,
  iscMpe5Check,
  iscAMpe1Check,
  iscSvc1Check,
  iscSvc2Check,
  iscSvc3Check,
  iscSvc4Check,
  iscSvc5Check,
  iscSvc6Check,
  iscSvc7Check,
  iscSvc8Check,
  iscSvc9Check,
  iscSvc10Check,
  iss81SkewNotchCheck,
  iss87CogNoOverlapCheck,
  iss96WaveSelectCheck,
  iss97LayoutResetCheck,
  iss98AlignmentCheck,
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

  test('ISS-62-1: OverlayScrollbars scrollbar has 12px width when content overflows (#62)', async ({ page }) => {
    await scrollbarWidthCheck.check(page);
  });

  test('ISS-62-2: OverlayScrollbars viewport has real overflow at small viewport (#62)', async ({ page }) => {
    await scrollbarOverflowCheck.check(page);
  });

  test('ISS-84-1: rapid keyboard clicks do not change D-ref value (#84)', async ({ page }) => {
    await drefDriftCheck.check(page);
  });

  test('CT-MARKERS-1: TUNING_MARKERS sorted descending by fifth', async ({ page }) => {
    await ctMarkers1Check.check(page);
  });

  test('CT-MARKERS-2: All 8 expected TET markers present', async ({ page }) => {
    await ctMarkers2Check.check(page);
  });

  test('CT-NEAREST-1: findNearestMarker(700) returns 12-TET with distance 0', async ({ page }) => {
    await ctNearest1Check.check(page);
  });

  test('CT-MIDI-1: coordToMidi(0, 0) = 62 (D4)', async ({ page }) => {
    await ctMidi1Check.check(page);
  });

  test('CT-MIDI-2: coordToMidi for known notes', async ({ page }) => {
    await ctMidi2Check.check(page);
  });

  test('CT-PC-1: pitchClassFromCoordX(0) = 2 (D)', async ({ page }) => {
    await ctPc1Check.check(page);
  });

  test('CT-PC-2: pitchClassFromCoordX for various coordinates', async ({ page }) => {
    await ctPc2Check.check(page);
  });

  test('CT-NOTENAME-1: D is at coordinate 0', async ({ page }) => {
    await ctNotename1Check.check(page);
  });

  test('CT-NOTENAME-2: Known note names at various coordinates', async ({ page }) => {
    await ctNotename2Check.check(page);
  });

  test('CT-NOTENAME-3: Double accidentals exist at extreme coordinates', async ({ page }) => {
    await ctNotename3Check.check(page);
  });

  test('CT-HUE-1: D (pitch class 2) has hue 29\u00B0', async ({ page }) => {
    await ctHue1Check.check(page);
  });

  test('CT-HUE-2: Adjacent fifths differ by 210\u00B0 for max contrast', async ({ page }) => {
    await ctHue2Check.check(page);
  });

  test('CT-ROUNDTRIP-1: coordToMidiNote round-trips for canonical positions', async ({ page }) => {
    await ctRoundtrip1Check.check(page);
  });

  test('CT-CENTS-1: At 12-TET (700\u00A2), all coordinates have 0 deviation', async ({ page }) => {
    await ctCents1Check.check(page);
  });

  test('CT-CENTS-2: At 720\u00A2 (5-TET), deviation is 20\u00A2 per fifth step', async ({ page }) => {
    await ctCents2Check.check(page);
  });

  test('CT-MACHINE-1: Runtime overlay machine states match test machine', async ({ page }) => {
    await ctMachine1Check.check(page);
  });

  test('CT-MACHINE-2: Runtime pedal machine states match test sustain/vibrato', async ({ page }) => {
    await ctMachine2Check.check(page);
  });

  test('CT-MACHINE-3: Test panel states map to runtime panel machine states', async ({ page }) => {
    await ctMachine3Check.check(page);
  });

  test('CT-MACHINE-4: Runtime waveform machine has correct initial waveform', async ({ page }) => {
    await ctMachine4Check.check(page);
  });

  test('BH-DOUBLEACCIDENTAL-1: Note naming includes double sharps and flats', async ({ page }) => {
    await bhDoubleAccidental1Check.check(page);
  });

  test('ISC-MPE-1: noteOn sends correct status byte on member channel 2–16', async ({ page }) => {
    await iscMpe1Check.check(page);
  });

  test('ISC-MPE-2: pitch bend produces valid 14-bit LSB/MSB encoding', async ({ page }) => {
    await iscMpe2Check.check(page);
  });

  test('ISC-MPE-3: CC74 slide normalizes 0–1 to 0–127', async ({ page }) => {
    await iscMpe3Check.check(page);
  });

  test('ISC-MPE-4: FIFO channel allocation across channels 2–16', async ({ page }) => {
    await iscMpe4Check.check(page);
  });

  test('ISC-MPE-5: MCM sent on output selection', async ({ page }) => {
    await iscMpe5Check.check(page);
  });

  test('ISC-A-MPE-1: no per-note messages go to manager channel 1', async ({ page }) => {
    await iscAMpe1Check.check(page);
  });

  test('ISC-SVC-1: MPEService constructor creates default settings', async ({ page }) => {
    await iscSvc1Check.check(page);
  });

  test('ISC-SVC-2: updateSettings changes configuration', async ({ page }) => {
    await iscSvc2Check.check(page);
  });

  test('ISC-SVC-3: noteOn allocates member channel and sends correct MIDI', async ({ page }) => {
    await iscSvc3Check.check(page);
  });

  test('ISC-SVC-4: noteOff sends correct note-off message', async ({ page }) => {
    await iscSvc4Check.check(page);
  });

  test('ISC-SVC-5: subscribe receives voice state updates', async ({ page }) => {
    await iscSvc5Check.check(page);
  });

  test('ISC-SVC-6: panic sends all-notes-off on all member channels', async ({ page }) => {
    await iscSvc6Check.check(page);
  });

  test('ISC-SVC-7: dispose cleans up resources', async ({ page }) => {
    await iscSvc7Check.check(page);
  });

  test('ISC-SVC-8: configurable pressureMode changes message type', async ({ page }) => {
    await iscSvc8Check.check(page);
  });

  test('ISC-SVC-9: setEnabled(false) prevents note output', async ({ page }) => {
    await iscSvc9Check.check(page);
  });

  test('ISC-SVC-10: configurable timbreCC uses custom CC number', async ({ page }) => {
    await iscSvc10Check.check(page);
  });

  test('ISS-81-1: skew notch at DCompose shows "DCompose / Wicki-Hayden"', async ({ page }) => {
    await iss81SkewNotchCheck.check(page);
  });

  test('ISS-87-1: cog button does not overlap overlay content', async ({ page }) => {
    await iss87CogNoOverlapCheck.check(page);
  });

  test('ISS-96-1: WAVE is a select dropdown with reset button', async ({ page }) => {
    await iss96WaveSelectCheck.check(page);
  });

  test('ISS-97-1: KEYBOARD LAYOUT has reset button that resets to ANSI', async ({ page }) => {
    await iss97LayoutResetCheck.check(page);
  });

  test('ISS-98-1: all slider-track rows share same right edge', async ({ page }) => {
    await iss98AlignmentCheck.check(page);
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
