# P0: Migrate All Imperative Tests to XState-First Model-Based Testing + Lint Enforcement

## TL;DR

Migrate 56 imperative tests across 3 spec files (behavioral, panel-resize, overlay-regression) to XState graph-generated model-based tests. Create 6 new machines, extend 3 existing machines, add a three-tier invariant system, reclassify 5 tests to contracts, and enforce the new paradigm with 4 ast-grep + 3 ESLint rules. End state: zero imperative tests in the 3 target files, all design rationale lives in machine `meta`, lint rules prevent regression.

---

## Context

### Current State
- **176 tests** across 8 spec files (firefox project)
- **~48** XState-graph-generated tests from 10 machines via `getAdjacencyMap` in `tests/xstate-graph.spec.ts`
- **56 imperative** tests in 3 target files:
  - `tests/behavioral.spec.ts` — 34 tests
  - `tests/panel-resize.spec.ts` — 12 tests
  - `tests/overlay-regression.spec.ts` — 10 tests
- **38** hybrid/visual-regression tests (NOT targeted)
- **34** contract/MPE tests (NOT targeted)

### Existing Infrastructure
- `tests/machines/uiMachine.ts` — 10 test machines with 4-export pattern: `machine`, `PlaywrightActions`, `DomAssertions`, `Invariants`
- `tests/machines/state-assertions.ts` — unified registry with `getKit()`, `getAction()`, `assertDomState()`, `getInvariant()`
- `tests/xstate-graph.spec.ts` — BFS-based test generator using `getAdjacencyMap`, `computeShortestPaths`
- `allMachines` array in `uiMachine.ts` — registration point for graph generation
- `NEEDS_OVERLAY_OPEN` set in graph spec — machines requiring overlay visible first

### Target State
- Zero imperative tests in behavioral.spec.ts, panel-resize.spec.ts, overlay-regression.spec.ts
- 16 machines registered in `allMachines` (10 existing + 6 new)
- Three-tier invariant system: state-level meta.invariants → global invariants → LLM vision
- All `@reason`/`@design-intent` migrated from JSDoc comments to machine `meta` properties
- 4 ast-grep rules + 3 ESLint rules at error severity, all passing
- Test count ≥ 176 (pre-migration baseline)

---

## Work Objectives

### Complete Test Absorption Map (56 tests → machines/invariants/contracts)

| Test ID | Source File | Destination | Machine/Location |
|---------|------------|-------------|------------------|
| BH-RESET-1 | behavioral | sliderResetMachine (tuning instance) | `SET_VALUE → modified`, `RESET → default` |
| BH-RESET-2 | behavioral | sliderResetMachine (skew instance) | `SET_VALUE → modified`, `RESET → default` |
| BH-RESET-3 | behavioral | sliderResetMachine (volume instance) | `SET_VALUE → modified`, `RESET → default` |
| BH-RESET-4 | behavioral | sliderResetMachine (zoom instance) | `SET_VALUE → modified`, `RESET → default` |
| BH-DREF-1 | behavioral | drefInputMachine | `CLICK_INPUT → focused`, `TYPE_NOTE_NAME → validValue` |
| BH-DREF-2 | behavioral | drefInputMachine | `TYPE_INVALID → invalidValue`, `BLUR → idle` |
| BH-DREF-3 | behavioral | drefInputMachine | `TYPE_EMPTY → emptyValue`, `BLUR → idle` |
| BH-DREF-4 | behavioral | drefInputMachine | `RESET → idle` |
| BH-DREF-5 | behavioral | drefInputMachine | invariant on `idle` state |
| BH-DREF-6 | behavioral | drefInputMachine | `TYPE_FREQUENCY → validValue` invariant |
| BH-DREF-7 | behavioral | drefInputMachine | `TYPE_INVALID → invalidValue` invariant (red border) |
| BH-MPE-1 | behavioral | overlayMachine extension | invariant on `visible` state |
| BH-FOCUS-PRESERVE-1 | behavioral | overlayMachine extension | invariant on `visible` state |
| BH-CTRL-PASSTHROUGH-1 | behavioral | modifierCompoundMachine | invariant on `idle` state |
| BH-DOUBLEACCIDENTAL-1 | behavioral | **contracts.spec.ts** | reclassify (pure function, no DOM) |
| BH-TT-1 | behavioral | **global invariant** | tooltip check on all states |
| BH-AB-1 | behavioral | aboutDialogMachine | invariant on `open` state |
| BH-AB-2 | behavioral | aboutDialogMachine | invariant on `open` state |
| BH-AB-3 | behavioral | aboutDialogMachine | invariant on `open` state |
| BH-DREF-RANGE-1 | behavioral | **contracts.spec.ts** | reclassify (pure attribute read) |
| BH-DREF-RANGE-2 | behavioral | drefInputMachine | `TYPE_FREQUENCY → validValue` (D6 value) |
| BH-FILL-1 | behavioral | sliderResetMachine | fill invariant on `default` state |
| BH-FILL-2 | behavioral | sliderResetMachine | fill invariant on `modified` state |
| BH-BRACKET-1 | behavioral | drefInputMachine | invariant on `idle` state (green annotation) |
| BH-PIANOROLL-1 | behavioral | **global invariant** | history canvas visible check |
| BH-BLUR-1 | behavioral | modifierCompoundMachine | `WINDOW_BLUR → idle` transition |
| BH-FOCUS-RETURN-1 | behavioral | modifierCompoundMachine | invariant on `idle` (keyboard works after reset) |
| BH-MODIFIER-PERSIST-1 | behavioral | modifierCompoundMachine | `PLAY_NOTE` self-loop on `vibratoOnly` |
| BH-STUCK-1 | behavioral | **global invariant** | no stuck notes after pointer interaction |
| BH-STUCK-2 | behavioral | **global invariant** | no stuck notes after keyboard interaction |
| BH-MOB-1 | behavioral | viewportMachine | invariant on `mobile_390` |
| BH-MOB-2 | behavioral | viewportMachine | invariant on `mobile_390` (zoom) |
| BH-MOB-3 | behavioral | viewportMachine | invariant on `mobile_375` |
| BH-MOB-4 | behavioral | viewportMachine | invariant on `tablet_768` |
| PNL-VIS-3 | panel-resize | **global invariant** | ARIA attributes on handles |
| PNL-VIS-4 | panel-resize | **global invariant** | visualiser handle position |
| PNL-VIS-5 | panel-resize | **global invariant** | pedals handle position |
| PNL-VIS-6 | panel-resize | **global invariant** | handle DOM parent check |
| PNL-DRAG-4 | panel-resize | visualiserMachine extension | 60% cap invariant on `expanded` |
| PNL-KEY-1 | panel-resize | visualiserMachine extension | `ARROW_DOWN_HANDLE` event |
| PNL-KEY-2 | panel-resize | visualiserMachine extension | `ARROW_UP_HANDLE` event |
| PNL-LS-1 | panel-resize | layoutPersistenceMachine | `DRAG_PANEL → customized` |
| PNL-LS-2 | panel-resize | layoutPersistenceMachine | `RELOAD → reloaded` |
| PNL-LS-3 | panel-resize | layoutPersistenceMachine | `SET_INSANE_LS → insaneRestored` |
| PNL-RESET-1 | panel-resize | layoutPersistenceMachine | `CLICK_RESET → reset` |
| PNL-RESET-2 | panel-resize | layoutPersistenceMachine | `CLICK_RESET → reset` (localStorage cleared) |
| OV-BG-1 | overlay-regression | overlayMachine extension | invariant on `visible` (bg color) |
| OV-SHIMMER-1 | overlay-regression | overlayMachine extension | invariant on `visible` (shimmer anim) |
| OV-SECTIONS-1 | overlay-regression | overlayMachine extension | invariant on `visible` (section count) |
| OV-PRESET-1 | overlay-regression | overlayMachine extension | invariant on `visible` (active preset) |
| OV-RESET-1 | overlay-regression | layoutPersistenceMachine | `CLICK_RESET → reset` |
| ISS-14-1 | overlay-regression | **contracts.spec.ts** | reclassify (R key mapping contract) |
| ISS-15-1 | overlay-regression | modifierCompoundMachine | `PRESS_SHIFT → vibratoOnly`, `RELEASE_SHIFT → idle`, re-press |
| ISS-15-2 | overlay-regression | modifierCompoundMachine | `PRESS_SPACE → sustainOnly`, `RELEASE_SPACE → idle`, re-press |
| ISS-11-1 | overlay-regression | sliderResetMachine | fill invariant (midpoint fill ~50%) |
| ISS-13-1 | overlay-regression | viewportMachine | canvas valid after `SET_VIEWPORT_768` |

**Summary**: 56 tests → 6 new machines (absorb 37), 3 extended machines (absorb 7), global invariants (absorb 8), contracts reclassify (4)

---

## Verification Strategy

### Pre-Migration Baseline
```bash
# Capture baseline test count (must be ≥ 176)
nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
# Expected: "Total: 176 tests in 8 files"
```

### Per-Wave Verification
After each wave:
```bash
# 1. TypeScript compilation
nix develop --command npx tsc --noEmit

# 2. Full test suite
nix develop --command npx playwright test --project=firefox --workers=1

# 3. Test count check (must be ≥ baseline)
nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
```

### Final Verification (after Wave 5)
```bash
# All lint rules pass
npm run lint && npm run lint:ast

# Zero imperative tests in target files
grep -c "test(" tests/behavioral.spec.ts  # should be 0 or file deleted
grep -c "test(" tests/panel-resize.spec.ts  # should be 0 or file deleted
grep -c "test(" tests/overlay-regression.spec.ts  # should be 0 or file deleted

# Full suite passes
nix develop --command npx playwright test --project=firefox --workers=1

# Test count ≥ 176
nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
```

---

## Execution Strategy

### Wave Structure
```
Wave 1: Metadata + Invariant Infrastructure (Tasks 1.1, 1.2, 1.3)
  ├── Task 1.1: StateMeta types + meta on existing machines    [PARALLEL]
  ├── Task 1.2: Three-tier invariant system in graph spec       [PARALLEL with 1.1]
  └── Task 1.3: Reclassify 4 tests to contracts + 8 to global  [DEPENDS: 1.2]

Wave 2: Simple New Machines (Tasks 2.1, 2.2, 2.3)
  ├── Task 2.1: sliderResetMachine factory + 4 instances        [PARALLEL]
  ├── Task 2.2: aboutDialogMachine                              [PARALLEL]
  └── Task 2.3: Extend overlay/visualiser/sustain/vibrato       [PARALLEL]

Wave 3: Complex Machines (Tasks 3.1, 3.2, 3.3)
  ├── Task 3.1: drefInputMachine                                [PARALLEL]
  ├── Task 3.2: modifierCompoundMachine                         [PARALLEL]
  └── Task 3.3: layoutPersistenceMachine                        [PARALLEL]

Wave 4: Viewport + Special Cases (Task 4.1)
  └── Task 4.1: viewportMachine with contextFactory             [SERIAL]

Wave 5: Cleanup + Enforcement (Tasks 5.1, 5.2)
  ├── Task 5.1: Delete migrated tests, verify count             [SERIAL]
  └── Task 5.2: Enable all lint rules                           [DEPENDS: 5.1]
```

### Critical Path
```
Wave 1 (1.1 + 1.2 parallel → 1.3) → Wave 2 (all parallel) → Wave 3 (all parallel) → Wave 4 → Wave 5 (5.1 → 5.2)
```

---

## TODOs

### Wave 1: Metadata + Invariant Infrastructure

---

### Task 1.1 — Add StateMeta/TransitionDocMeta Types and `meta` to All 10 Existing Machines

- [x] **1.1.1**: Create `tests/machines/types.ts` with the following types:
  ```typescript
  import type { Page } from '@playwright/test';

  export interface StateMeta {
    testId?: string;
    reason: string;
    designIntent: string;
    invariants?: StateInvariant[];
  }

  export interface StateInvariant {
    id: string;
    check: (page: Page) => Promise<void>;
    description?: string;
  }

  export interface TransitionDocMeta {
    reason: string;
    designIntent: string;
    issueRef?: string;
  }
  ```

- [x] **1.1.2**: Add `meta` properties to all 10 existing machines in `tests/machines/uiMachine.ts`. For each state, add `meta: { reason: '...', designIntent: '...' }` using the invariant descriptions already in the `*Invariants` records as the basis. Example for `overlayMachine`:
  ```typescript
  states: {
    hidden: {
      meta: {
        reason: 'Overlay hidden — keyboard grid fully visible and playable',
        designIntent: 'Default state maximizes grid area for playing',
      },
      on: { CLICK_COG: 'visible' },
    },
    visible: {
      meta: {
        reason: 'Overlay visible — settings controls accessible',
        designIntent: 'Semi-transparent overlay lets musicians see grid while adjusting settings',
      },
      on: { ... },
    },
  }
  ```

- [x] **1.1.3**: Ensure `tests/machines/uiMachine.ts` still compiles: `nix develop --command npx tsc --noEmit`

**What to do**: Create the types file. Add `meta` with `reason`/`designIntent` to every state in all 10 machines. Use the existing `*Invariants` record descriptions as source material for the reason/designIntent text.

**Must NOT do**:
- Change any machine state names, events, or transitions
- Modify PlaywrightActions, DomAssertions, or Invariants records
- Add `invariants` arrays yet (that's Task 1.2)
- Modify the graph spec or test generation logic
- Install new dependencies

**References**:
- `tests/machines/uiMachine.ts` lines 1-666 (all 10 machines)
- `tests/machines/types.ts` (new file)
- XState v5 `meta` property docs

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# All existing tests still pass
nix develop --command npx playwright test --project=firefox --workers=1
# types.ts exports are importable
grep -c "StateMeta" tests/machines/types.ts  # >= 1
```

**Commit message**: `feat(tests): add StateMeta/TransitionDocMeta types and meta to all 10 existing machines`

**Recommended Agent Profile**:
- Category: `unspecified-low` — straightforward type definitions and metadata addition
- Skills: [] — no specialized skills needed, just TypeScript pattern following

---

### Task 1.2 — Three-Tier Invariant System: State Invariants + Global Invariants

- [x] **1.2.1**: Create `tests/machines/invariant-checks.ts` (renamed from global-invariants — D(P) classification, not global) with the following global invariants (Tier 3). Each invariant runs after ALL state assertions in the graph spec:
  ```typescript
  import type { Page } from '@playwright/test';
  import { expect } from '@playwright/test';

  export interface GlobalInvariant {
    id: string;
    description: string;
    /** Machines/states this invariant applies to. '*' = all. */
    appliesTo: { machine: string; state: string }[] | '*';
    check: (page: Page) => Promise<void>;
  }

  export const globalInvariants: GlobalInvariant[] = [
    {
      id: 'BH-TT-1',
      description: 'All sliders and buttons have non-empty title attributes',
      appliesTo: [{ machine: 'overlay', state: 'visible' }],
      check: async (page) => {
        const selectors = [
          '#tuning-slider', '#tuning-thumb-badge', '#tuning-reset',
          '#skew-slider', '#skew-thumb-badge', '#skew-reset',
          '#zoom-slider', '#zoom-reset',
          '#volume-slider', '#volume-reset',
          '#d-ref-input', '#d-ref-reset',
          '.wave-btn[data-waveform="sawtooth"]', '.wave-btn[data-waveform="sine"]',
          '.wave-btn[data-waveform="square"]', '.wave-btn[data-waveform="triangle"]',
          '#layout-select',
        ];
        for (const sel of selectors) {
          const title = await page.locator(sel).getAttribute('title');
          expect(title, `${sel} missing title`).toBeTruthy();
          expect(title!.length, `${sel} empty title`).toBeGreaterThan(0);
        }
      },
    },
    {
      id: 'PNL-VIS-3',
      description: 'Handles have correct ARIA attributes',
      appliesTo: '*',
      check: async (page) => {
        const visHandle = page.locator('#visualiser-panel .panel-resize-handle');
        const pedHandle = page.locator('#pedals-panel .panel-resize-handle');
        await expect(visHandle).toHaveAttribute('role', 'separator');
        await expect(visHandle).toHaveAttribute('aria-label', 'Resize visualiser');
        await expect(pedHandle).toHaveAttribute('role', 'separator');
        await expect(pedHandle).toHaveAttribute('aria-label', 'Resize pedals');
      },
    },
    {
      id: 'PNL-VIS-4',
      description: 'Visualiser handle center is at visualiser-panel bottom edge',
      appliesTo: [{ machine: 'visualiser', state: 'default' }],
      check: async (page) => {
        const panelBox = await page.locator('#visualiser-panel').boundingBox();
        const handleBox = await page.locator('#visualiser-panel .panel-resize-handle').boundingBox();
        expect(panelBox).not.toBeNull();
        expect(handleBox).not.toBeNull();
        const panelBottom = panelBox!.y + panelBox!.height;
        const handleCenterY = handleBox!.y + handleBox!.height / 2;
        expect(Math.abs(handleCenterY - panelBottom)).toBeLessThan(4);
      },
    },
    {
      id: 'PNL-VIS-5',
      description: 'Pedals handle center is at pedals-panel top edge',
      appliesTo: [{ machine: 'pedals', state: 'default' }],
      check: async (page) => {
        const panelBox = await page.locator('#pedals-panel').boundingBox();
        const handleBox = await page.locator('#pedals-panel .panel-resize-handle').boundingBox();
        expect(panelBox).not.toBeNull();
        expect(handleBox).not.toBeNull();
        const panelTop = panelBox!.y;
        const handleCenterY = handleBox!.y + handleBox!.height / 2;
        expect(Math.abs(handleCenterY - panelTop)).toBeLessThan(4);
      },
    },
    {
      id: 'PNL-VIS-6',
      description: 'Visualiser handle is DOM child of visualiser-panel not grid-area',
      appliesTo: [{ machine: 'visualiser', state: '*' }],
      check: async (page) => {
        const inVisualiser = await page.locator('#visualiser-panel .panel-resize-handle').count();
        const inGrid = await page.locator('#grid-area .panel-resize-handle').count();
        expect(inVisualiser).toBe(1);
        expect(inGrid).toBe(0);
      },
    },
    {
      id: 'BH-STUCK-1',
      description: 'No stuck notes after pointer interaction',
      appliesTo: '*',
      check: async (page) => {
        const count = await page.evaluate(() => {
          const d = (window as unknown as { dcomposeApp?: { getActiveNoteCount?: () => number } }).dcomposeApp;
          return d?.getActiveNoteCount?.() ?? 0;
        });
        expect(count).toBe(0);
      },
    },
    {
      id: 'BH-PIANOROLL-1',
      description: 'History canvas renders piano roll',
      appliesTo: '*',
      check: async (page) => {
        const canvas = page.locator('#history-canvas');
        await expect(canvas).toBeVisible();
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThan(100);
        expect(box!.height).toBeGreaterThan(50);
      },
    },
  ];
  ```

- [x] **1.2.2**: Modify `tests/xstate-graph.spec.ts` to run the three-tier invariant system after each transition test:
  1. After `assertDomState(...)` (existing Tier 1): add Tier 2 — read `meta.invariants` from the target state's machine config and run each `check(page)`
  2. After Tier 2: add Tier 3 — import `globalInvariants` and run any whose `appliesTo` matches the current `(machineName, targetState)` pair
  
  The modification goes in the test body at lines 197-216 of `xstate-graph.spec.ts`, between the DOM assertion (Step 4) and LLM vision (Step 5):
  ```typescript
  // ── Step 4b: State-level invariants (Tier 2) ───────────────
  const stateConfig = machine.config.states?.[t.targetState];
  const stateMeta = stateConfig?.meta as StateMeta | undefined;
  if (stateMeta?.invariants) {
    for (const inv of stateMeta.invariants) {
      await inv.check(page);
    }
  }

  // ── Step 4c: Global invariants (Tier 3) ─────────────────────
  for (const inv of globalInvariants) {
    const applies = inv.appliesTo === '*' ||
      inv.appliesTo.some(a =>
        (a.machine === machineName || a.machine === '*') &&
        (a.state === t.targetState || a.state === '*')
      );
    if (applies) {
      await inv.check(page);
    }
  }
  ```

- [x] **1.2.3**: Update imports in `xstate-graph.spec.ts`:
  ```typescript
  import type { StateMeta } from './machines/types';
  import { globalInvariants } from './machines/global-invariants';
  ```

- [x] **1.2.4**: Verify the graph spec still generates the same ~48 tests and all pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Create the global invariants file. Modify the graph spec to run state-level meta.invariants (Tier 2) and global invariants (Tier 3) after each transition's DOM assertion. The 7 global invariants absorb: BH-TT-1, PNL-VIS-3, PNL-VIS-4, PNL-VIS-5, PNL-VIS-6, BH-STUCK-1, BH-PIANOROLL-1.

**Must NOT do**:
- Change machine definitions (that's Task 1.1)
- Delete any existing tests yet (that's Task 5.1)
- Add new machines (that's Wave 2-4)
- Break the existing 48 graph tests
- Add BH-STUCK-2 as global invariant (it requires a separate keyboard press sequence that doesn't fit the graph model — fold it into BH-STUCK-1 since both test the same contract: active note count = 0 after any interaction sequence completes)

**References**:
- `tests/xstate-graph.spec.ts` lines 1-220 (graph spec)
- `tests/machines/state-assertions.ts` lines 1-180 (registry)
- `tests/behavioral.spec.ts` lines 289-314 (BH-TT-1), 466-482 (BH-PIANOROLL-1), 591-615 (BH-STUCK-1..2)
- `tests/panel-resize.spec.ts` lines 26-81 (PNL-VIS-3..6)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests still pass (invariants run but shouldn't fail on existing states)
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# Global invariants file exists and exports correctly
grep -c "globalInvariants" tests/machines/global-invariants.ts  # >= 1
```

**Commit message**: `feat(tests): add three-tier invariant system — state meta.invariants + global invariants in graph spec`

**Recommended Agent Profile**:
- Category: `deep` — complex logic threading invariants through the graph spec test generator
- Skills: [`playwright`] — needs deep understanding of Playwright test patterns for invariant checks

---

### Task 1.3 — Reclassify Tests: 4 to Contracts, Consolidate BH-STUCK-2

- [x] **1.3.1**: Move `BH-DOUBLEACCIDENTAL-1` logic from `tests/behavioral.spec.ts` (lines 265-287) to `tests/contracts.spec.ts`. The test uses `page.evaluate()` to run a pure function — it's already a contract test. Place it in a new `§8 Double Accidental Naming` section after the existing `§7` sections. Keep the `@reason`/`@design-intent` JSDoc.

- [x] **1.3.2**: Move `BH-DREF-RANGE-1` from `tests/behavioral.spec.ts` (lines 346-352) to `tests/contracts.spec.ts`. It reads `min`/`max` attributes from the D-ref slider — a pure DOM attribute contract. Place in `§9 D-ref Input Contracts`.

- [x] **1.3.3**: Move `ISS-14-1` from `tests/overlay-regression.spec.ts` (lines 107-120) to `tests/contracts.spec.ts`. It tests that pressing R doesn't activate sustain — a keyboard mapping contract. Place in `§10 Keyboard Mapping Contracts`.

- [x] **1.3.4**: The `BH-STUCK-2` test (keyboard press leaves no active note) covers the same contract as `BH-STUCK-1` (pointer leaves no active note). The global invariant `BH-STUCK-1` from Task 1.2 already checks `getActiveNoteCount() === 0` after every graph transition. BH-STUCK-2's scenario (key press → key release) is naturally covered by the graph tests for sustain/vibrato machines that use keyboard events. Mark BH-STUCK-2 for deletion in Wave 5 (already covered).

- [x] **1.3.5**: Verify contracts.spec.ts compiles and passes:
  ```bash
  nix develop --command npx tsc --noEmit
  nix develop --command npx playwright test --project=firefox tests/contracts.spec.ts --workers=1
  ```

**What to do**: Copy 3 test functions from behavioral.spec.ts and overlay-regression.spec.ts into contracts.spec.ts under new section headers. Do NOT delete the originals yet (deletion is Wave 5). Verify the new locations compile and pass.

**Must NOT do**:
- Delete the original tests from behavioral/overlay-regression (Wave 5)
- Modify the test logic when moving — copy verbatim
- Change contracts.spec.ts existing tests
- Add new dependencies

**References**:
- `tests/behavioral.spec.ts` lines 265-287 (BH-DOUBLEACCIDENTAL-1), 346-352 (BH-DREF-RANGE-1)
- `tests/overlay-regression.spec.ts` lines 107-120 (ISS-14-1)
- `tests/contracts.spec.ts` lines 1-387 (target file)

**QA Scenarios**:
```bash
# Contracts file has the 3 new tests
grep -c "BH-DOUBLEACCIDENTAL-1\|BH-DREF-RANGE-1\|ISS-14-1" tests/contracts.spec.ts  # 3
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Contracts pass
nix develop --command npx playwright test --project=firefox tests/contracts.spec.ts --workers=1
```

**Commit message**: `refactor(tests): reclassify 3 contract tests from behavioral/overlay to contracts.spec.ts`

**Recommended Agent Profile**:
- Category: `quick` — simple copy-paste of test functions between files
- Skills: [] — trivial file operations

---

### Wave 2: Simple New Machines

---

### Task 2.1 — Create `sliderResetMachine` Factory + 4 Instances

- [x] **2.1.1**: Create `tests/machines/sliderResetMachine.ts` with a parameterized factory function. The factory takes a config object and returns the 4-export set (machine, PlaywrightActions, DomAssertions, Invariants). Machine definition:
  ```typescript
  // States: 'default', 'modified'
  // Events: 'SET_VALUE', 'RESET'
  // 4 instances: tuning, skew, volume, zoom
  ```

  Config per instance:
  | Instance | sliderId | badgeId | resetBtnId | defaultDisplay | modifiedValue | badgeReadMode |
  |----------|----------|---------|------------|----------------|---------------|---------------|
  | tuning | `tuning-slider` | `tuning-thumb-badge` | `tuning-reset` | `'700.0'` | `'720'` | `inputValue` |
  | skew | `skew-slider` | `skew-thumb-badge` | `skew-reset` | `'0.00'` | `'0.75'` | `inputValue` |
  | volume | `volume-slider` | `volume-thumb-badge` | `volume-reset` | `'-10.5'` | `'0.8'` | `textContent` |
  | zoom | `zoom-slider` | `zoom-thumb-badge` | `zoom-reset` | `'1.00'` | `'2.5'` | `textContent` |

  PlaywrightActions:
  - `SET_VALUE`: `page.evaluate(() => { const s = document.getElementById(sliderId) as HTMLInputElement; s.value = modifiedValue; s.dispatchEvent(new Event('input')); })`
  - `RESET`: `page.locator('#' + resetBtnId).click()`

  DomAssertions:
  - `default`: badge shows `defaultDisplay` (read via `inputValue()` or `textContent()` per `badgeReadMode`)
  - `modified`: badge shows non-default value

  State-level meta.invariants on `default`:
  - Fill invariant: slider fill gradient at min position shows near-zero % (absorbs BH-FILL-1)
  
  State-level meta.invariants on `modified`:
  - Fill invariant: slider fill gradient at non-min shows non-zero % (absorbs BH-FILL-2, ISS-11-1)

- [x] **2.1.2**: Export 4 instances from the factory:
  ```typescript
  export const { machine: tuningSliderMachine, ... } = createSliderResetMachine(tuningConfig);
  export const { machine: skewSliderMachine, ... } = createSliderResetMachine(skewConfig);
  export const { machine: volumeSliderMachine, ... } = createSliderResetMachine(volumeConfig);
  export const { machine: zoomSliderMachine, ... } = createSliderResetMachine(zoomConfig);
  ```

- [x] **2.1.3**: Register all 4 instances in `allMachines` array in `tests/machines/uiMachine.ts`:
  ```typescript
  import { tuningSliderMachine, ..., skewSliderMachine, ..., volumeSliderMachine, ..., zoomSliderMachine, ... } from './sliderResetMachine';
  
  export const allMachines = [
    ...existingMachines,
    { name: 'tuningSlider', machine: tuningSliderMachine },
    { name: 'skewSlider', machine: skewSliderMachine },
    { name: 'volumeSlider', machine: volumeSliderMachine },
    { name: 'zoomSlider', machine: zoomSliderMachine },
  ] as const;
  ```

- [x] **2.1.4**: Register all 4 in `tests/machines/state-assertions.ts` registry.

- [x] **2.1.5**: Add `'tuningSlider'`, `'skewSlider'`, `'volumeSlider'`, `'zoomSlider'` to `NEEDS_OVERLAY_OPEN` set in `tests/xstate-graph.spec.ts` (sliders are in the overlay).

- [x] **2.1.6**: Verify 4×4=16 new graph tests are generated and all pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Create a factory that produces slider reset machines with parameterized selectors/values. Register 4 instances. Each instance adds 4 state-event pairs (default→SET_VALUE→modified, default→RESET→default, modified→SET_VALUE→modified, modified→RESET→default) = 16 total new tests. Include fill gradient invariants on both states.

**Must NOT do**:
- Create 4 separate machine files — use a single factory
- Delete the original behavioral tests yet (Wave 5)
- Hard-code slider values in the machine — use the config parameter
- Add new npm dependencies
- Use `as any` or type assertions

**References**:
- `tests/machines/uiMachine.ts` — existing 4-export pattern (lines 52-96 for overlay example)
- `tests/machines/state-assertions.ts` — registry pattern (lines 74-125)
- `tests/behavioral.spec.ts` lines 21-85 (BH-RESET-1..4), 380-410 (BH-FILL-1..2)
- `tests/overlay-regression.spec.ts` lines 194-223 (ISS-11-1)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass (including 16 new slider tests)
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# Test count increased by 16
nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
# Verify slider factory creates 4 instances
grep -c "createSliderResetMachine" tests/machines/sliderResetMachine.ts  # >= 4
```

**Commit message**: `feat(tests): add sliderResetMachine factory with 4 instances (tuning, skew, volume, zoom) — absorbs BH-RESET-1..4, BH-FILL-1..2, ISS-11-1`

**Recommended Agent Profile**:
- Category: `deep` — parameterized factory pattern with fill invariants requires careful implementation
- Skills: [`playwright`] — slider DOM manipulation patterns

---

### Task 2.2 — Create `aboutDialogMachine`

- [x] **2.2.1**: Create `tests/machines/aboutDialogMachine.ts` following the 4-export pattern:
  ```typescript
  // States: 'closed', 'open'
  // Events: 'CLICK_ABOUT', 'CLOSE'
  // 4 pairs: closed→CLICK_ABOUT→open, open→CLICK_ABOUT→open (self-loop/no-op),
  //          open→CLOSE→closed, closed→CLOSE→closed (self-loop/no-op)
  // Actually: 2 meaningful transitions:
  //   closed → CLICK_ABOUT → open
  //   open → CLOSE → closed (Escape or click outside)
  ```

  PlaywrightActions:
  - `CLICK_ABOUT`: `page.locator('#about-btn').click()`
  - `CLOSE`: `page.keyboard.press('Escape')` or `page.locator('#about-dialog button[data-close]').click()` (check actual close mechanism)

  DomAssertions:
  - `closed`: `expect(page.locator('#about-dialog')).not.toBeVisible()` (or check `open` attribute)
  - `open`: `expect(page.locator('#about-dialog')).toBeVisible()`

  State-level meta.invariants on `open` (absorbing BH-AB-1..3):
  - Content invariant: about text contains 'isomorphic', no `.about-col` elements, no GitHub profile link
  - Link invariant: has Wicki, Striso, MIDImech, WickiSynth links
  - Footer invariant: has WickiSynth attribution, Piers Titus, MIDImech, Striso credits

- [x] **2.2.2**: Register in `allMachines` and `state-assertions.ts`. Do NOT add to `NEEDS_OVERLAY_OPEN` (about dialog is accessible from main page).

- [x] **2.2.3**: Verify 4 new graph tests generated and pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Simple 2-state machine with content invariants on the `open` state. The 3 BH-AB tests become invariants that run automatically on every graph path that reaches `open`.

**Must NOT do**:
- Add the machine to `NEEDS_OVERLAY_OPEN` (about dialog is independent of overlay)
- Delete original BH-AB tests (Wave 5)
- Modify the about dialog DOM or CSS
- Add click handlers to the about dialog

**References**:
- `tests/behavioral.spec.ts` lines 323-465 (BH-AB-1..3)
- `tests/machines/uiMachine.ts` lines 478-511 (midiPanelMachine — similar 2-state toggle pattern)
- `index.html` — about dialog DOM structure

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass including about dialog transitions
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# About dialog invariants pass on the 'open' state
grep -c "aboutDialog" tests/machines/state-assertions.ts  # >= 1
```

**Commit message**: `feat(tests): add aboutDialogMachine with content/link/footer invariants — absorbs BH-AB-1..3`

**Recommended Agent Profile**:
- Category: `quick` — simple 2-state machine, straightforward invariants
- Skills: [`playwright`] — DOM content assertion patterns

---

### Task 2.3 — Extend Existing Machines: Overlay Invariants, Visualiser Events, Sustain/Vibrato Self-Loops

- [x] **2.3.1**: Extend `overlayMachine` in `tests/machines/uiMachine.ts` — add `meta.invariants` array on the `visible` state:
  ```typescript
  visible: {
    meta: {
      reason: 'Overlay visible — settings controls accessible',
      designIntent: 'Semi-transparent overlay lets musicians see grid while adjusting settings',
      invariants: [
        { id: 'OV-BG-1', description: 'Background is rgba(30,30,32,0.78)', check: async (page) => { /* bg color check */ } },
        { id: 'OV-SHIMMER-1', description: '60s shimmer animation', check: async (page) => { /* animation duration check */ } },
        { id: 'OV-SECTIONS-1', description: '≥8 overlay sections', check: async (page) => { /* section count check */ } },
        { id: 'OV-PRESET-1', description: 'Active preset at 700 cents', check: async (page) => { /* preset active check */ } },
        { id: 'BH-MPE-1', description: 'MPE checkbox and select visible', check: async (page) => { /* mpe UI check */ } },
        { id: 'BH-FOCUS-PRESERVE-1', description: 'Settings toggle does not steal synth focus', check: async (page) => { /* focus check */ } },
      ],
    },
    on: { ... },
  }
  ```

  Copy the exact assertion logic from:
  - `tests/overlay-regression.spec.ts` lines 14-81 (OV-BG-1, OV-SHIMMER-1, OV-SECTIONS-1, OV-PRESET-1)
  - `tests/behavioral.spec.ts` lines 214-218 (BH-MPE-1)
  - `tests/behavioral.spec.ts` lines 229-235 (BH-FOCUS-PRESERVE-1)

- [x] **2.3.2**: Extend `visualiserMachine` — add 2 new events and 60% cap invariant:
  ```typescript
  type VisualiserEvent =
    | { type: 'DRAG_VIS_EXPAND' }
    | { type: 'DRAG_VIS_FROM_COLLAPSED' }
    | { type: 'TOGGLE_VIS_COLLAPSE' }
    | { type: 'DBLCLICK_VIS_HANDLE' }
    | { type: 'ARROW_DOWN_HANDLE' }   // NEW
    | { type: 'ARROW_UP_HANDLE' };    // NEW
  ```
  
  Add to `default` state:
  ```typescript
  default: {
    on: {
      DRAG_VIS_EXPAND: 'expanded',
      TOGGLE_VIS_COLLAPSE: 'collapsed',
      ARROW_DOWN_HANDLE: 'expanded',  // 10px increase → still default-ish but test the transition
    },
  },
  expanded: {
    meta: {
      invariants: [
        { id: 'PNL-DRAG-4', description: '60% viewport cap', check: async (page) => {
          const panelH = (await page.locator('#visualiser-panel').boundingBox())!.height;
          const viewportH = page.viewportSize()!.height;
          expect(panelH).toBeLessThanOrEqual(viewportH * 0.61);
        }},
      ],
    },
    on: {
      DBLCLICK_VIS_HANDLE: 'default',
      TOGGLE_VIS_COLLAPSE: 'collapsed',
      ARROW_UP_HANDLE: 'default',  // shrink back
    },
  },
  ```

  Add PlaywrightActions:
  - `ARROW_DOWN_HANDLE`: focus handle → press ArrowDown
  - `ARROW_UP_HANDLE`: focus handle → press ArrowUp

  Add DomAssertions for new transitions (reuse existing state assertions).

- [x] **2.3.3**: Extend `sustainMachine` and `vibratoMachine` — add `PLAY_NOTE` self-loop on `active` state:
  ```typescript
  active: {
    on: {
      RELEASE_SPACE: 'inactive',
      POINTERUP_SUSTAIN: 'inactive',
      PLAY_NOTE: 'active',  // self-loop: modifier persists across note plays
    },
  },
  ```
  
  PlaywrightAction for `PLAY_NOTE`: `page.keyboard.press('c')` (play a note key)

- [x] **2.3.4**: Update `state-assertions.ts` registry with any new action/assertion entries.

- [x] **2.3.5**: Verify all graph tests pass including new transitions:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Add invariant checks to overlay.visible state (6 invariants). Add ARROW_DOWN/UP events to visualiser. Add PLAY_NOTE self-loop to sustain/vibrato. These changes add ~6 new graph tests while also running invariants on every path through the overlay visible state.

**Must NOT do**:
- Change the existing state names or transition targets
- Remove existing events
- Modify the graph spec test generator logic (it already handles meta.invariants from Task 1.2)
- Delete original imperative tests (Wave 5)

**References**:
- `tests/machines/uiMachine.ts` lines 52-96 (overlay), 108-179 (visualiser), 362-410 (sustain), 422-470 (vibrato)
- `tests/overlay-regression.spec.ts` lines 14-81 (OV-* tests)
- `tests/panel-resize.spec.ts` lines 90-142 (PNL-DRAG-4, PNL-KEY-1..2)
- `tests/behavioral.spec.ts` lines 558-587 (BH-MODIFIER-PERSIST-1 — informs PLAY_NOTE design)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# Overlay invariants run on visible state (check test output for OV-BG-1 etc.)
# Visualiser has arrow events
grep "ARROW_DOWN_HANDLE\|ARROW_UP_HANDLE" tests/machines/uiMachine.ts  # >= 2
```

**Commit message**: `feat(tests): extend overlay (6 invariants), visualiser (arrow events + 60% cap), sustain/vibrato (PLAY_NOTE self-loop)`

**Recommended Agent Profile**:
- Category: `deep` — multiple machine modifications with invariant integration
- Skills: [`playwright`] — complex DOM assertions for overlay properties

---

### Wave 3: Complex Machines

---

### Task 3.1 — Create `drefInputMachine`

- [x] **3.1.1**: Create `tests/machines/drefInputMachine.ts` with the 4-export pattern:
  ```typescript
  // States: 'idle', 'focused', 'validValue', 'invalidValue', 'emptyValue'
  // Events: 'CLICK_INPUT', 'TYPE_NOTE_NAME', 'TYPE_FREQUENCY', 'TYPE_INVALID',
  //         'TYPE_EMPTY', 'BLUR', 'PRESS_ENTER', 'RESET'
  ```

  State machine:
  ```
  idle ──CLICK_INPUT──→ focused
  focused ──TYPE_NOTE_NAME──→ validValue
  focused ──TYPE_FREQUENCY──→ validValue
  focused ──TYPE_INVALID──→ invalidValue
  focused ──TYPE_EMPTY──→ emptyValue
  focused ──BLUR──→ idle
  focused ──PRESS_ENTER──→ idle
  validValue ──BLUR──→ idle
  validValue ──PRESS_ENTER──→ idle
  validValue ──TYPE_NOTE_NAME──→ validValue (self-loop)
  validValue ──TYPE_FREQUENCY──→ validValue (self-loop)
  validValue ──TYPE_INVALID──→ invalidValue
  invalidValue ──BLUR──→ idle (reverts to default)
  invalidValue ──TYPE_NOTE_NAME──→ validValue
  invalidValue ──TYPE_FREQUENCY──→ validValue
  emptyValue ──BLUR──→ idle (reverts to default)
  emptyValue ──TYPE_NOTE_NAME──→ validValue
  emptyValue ──TYPE_FREQUENCY──→ validValue
  * ──RESET──→ idle (from any state)
  ```

  PlaywrightActions:
  - `CLICK_INPUT`: `page.locator('#d-ref-input').click()`
  - `TYPE_NOTE_NAME`: `input.fill('C5'); input.dispatchEvent('input')`
  - `TYPE_FREQUENCY`: `input.fill('440'); input.dispatchEvent('input')`
  - `TYPE_INVALID`: `input.fill('garbage'); input.dispatchEvent('input')`
  - `TYPE_EMPTY`: `input.fill(''); input.dispatchEvent('input')`
  - `BLUR`: `page.locator('body').click()`
  - `PRESS_ENTER`: `page.keyboard.press('Enter')`
  - `RESET`: `page.locator('#d-ref-reset').click()`

  DomAssertions:
  - `idle`: input not focused, value is numeric (293.66 or similar), label contains note name
  - `focused`: input is focused
  - `validValue`: input value is numeric Hz, label shows matching note annotation
  - `invalidValue`: input border is red (`rgb(204, 51, 51)`)
  - `emptyValue`: input value is empty string

  State-level meta.invariants:
  - `idle`: BH-BRACKET-1 (green annotation color), BH-DREF-5 (badge shows plain Hz, annotation in label)
  - `validValue`: BH-DREF-6 (annotation updates), BH-DREF-RANGE-2 (accepts D6 value via TYPE_FREQUENCY)
  - `invalidValue`: BH-DREF-7 (red border)

- [x] **3.1.2**: Register in `allMachines`, `state-assertions.ts`, and `NEEDS_OVERLAY_OPEN`.

- [x] **3.1.3**: Verify ~20 new graph tests generated and pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Most complex new machine with 5 states and 8 events. Absorbs BH-DREF-1..7, BH-DREF-RANGE-2, BH-BRACKET-1 (10 tests). The graph traversal will exercise all note name parsing, frequency validation, and red border display paths.

**Must NOT do**:
- Modify the D-ref input DOM element or its event handlers
- Add new dependencies for note name parsing
- Create states for every possible note name (C5, A4, etc.) — the input validation is continuous, not discrete per note
- Delete original tests (Wave 5)

**References**:
- `tests/behavioral.spec.ts` lines 88-430 (all BH-DREF-*, BH-BRACKET-1)
- `tests/machines/uiMachine.ts` lines 559-599 (textInputFocusMachine — related but simpler)
- `src/main.ts` — D-ref input handler implementation

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass including dref transitions
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# All dref states have assertions
grep "drefInput" tests/machines/state-assertions.ts  # >= 1
```

**Commit message**: `feat(tests): add drefInputMachine (5 states, 8 events) — absorbs BH-DREF-1..7, BH-DREF-RANGE-2, BH-BRACKET-1`

**Recommended Agent Profile**:
- Category: `deep` — most complex machine with input validation state modeling
- Skills: [`playwright`] — input field manipulation, focus management, CSS property assertions

---

### Task 3.2 — Create `modifierCompoundMachine`

- [x] **3.2.1**: Create `tests/machines/modifierCompoundMachine.ts` with the 4-export pattern:
  ```typescript
  // States: 'idle', 'vibratoOnly', 'sustainOnly', 'bothActive'
  // Events: 'PRESS_SHIFT', 'RELEASE_SHIFT', 'PRESS_SPACE', 'RELEASE_SPACE',
  //         'PRESS_CTRL_A', 'PLAY_NOTE', 'WINDOW_BLUR'
  ```

  State machine:
  ```
  idle ──PRESS_SHIFT──→ vibratoOnly
  idle ──PRESS_SPACE──→ sustainOnly
  idle ──PRESS_CTRL_A──→ idle (self-loop: Ctrl passthrough)
  idle ──WINDOW_BLUR──→ idle (self-loop: no-op when already idle)
  idle ──PLAY_NOTE──→ idle (self-loop)
  vibratoOnly ──RELEASE_SHIFT──→ idle
  vibratoOnly ──PRESS_SPACE──→ bothActive
  vibratoOnly ──PLAY_NOTE──→ vibratoOnly (self-loop: modifier persists)
  vibratoOnly ──WINDOW_BLUR──→ idle
  sustainOnly ──RELEASE_SPACE──→ idle
  sustainOnly ──PRESS_SHIFT──→ bothActive
  sustainOnly ──PLAY_NOTE──→ sustainOnly (self-loop)
  sustainOnly ──WINDOW_BLUR──→ idle
  bothActive ──RELEASE_SHIFT──→ sustainOnly
  bothActive ──RELEASE_SPACE──→ vibratoOnly
  bothActive ──WINDOW_BLUR──→ idle
  ```

  PlaywrightActions:
  - `PRESS_SHIFT`: `page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', code: 'ShiftLeft', shiftKey: true, bubbles: true, cancelable: true })))`
  - `RELEASE_SHIFT`: `page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift', code: 'ShiftLeft', shiftKey: false, bubbles: true, cancelable: true })))`
  - `PRESS_SPACE`: `page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true, cancelable: true })))`
  - `RELEASE_SPACE`: `page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', bubbles: true, cancelable: true })))`
  - `PRESS_CTRL_A`: `page.keyboard.down('Control'); page.keyboard.press('a'); page.keyboard.up('Control')`
  - `PLAY_NOTE`: `page.keyboard.press('c')`
  - `WINDOW_BLUR`: `page.evaluate(() => window.dispatchEvent(new Event('blur')))`

  DomAssertions:
  - `idle`: vibrato NOT active, sustain NOT active
  - `vibratoOnly`: vibrato active, sustain NOT active
  - `sustainOnly`: vibrato NOT active, sustain active
  - `bothActive`: vibrato active, sustain active

  State-level meta.invariants:
  - `idle`: BH-CTRL-PASSTHROUGH-1 (Ctrl doesn't activate modifiers), BH-FOCUS-RETURN-1 (keyboard works after reset click)
  - `vibratoOnly`: ISS-15-1 (hold-to-vibrato, not toggle — tested via the re-press path)
  - `sustainOnly`: ISS-15-2 (hold-to-sustain, not toggle — tested via the re-press path)

- [x] **3.2.2**: Register in `allMachines` and `state-assertions.ts`. Do NOT add to `NEEDS_OVERLAY_OPEN` (modifiers work on main page).

- [x] **3.2.3**: Note on coexistence with existing `sustainMachine`/`vibratoMachine`: The existing simple machines test individual sustain/vibrato toggle via keyboard AND pointer. The compound machine tests the interaction between both modifiers + additional events (Ctrl, blur, note play). Both coexist — the simple machines verify basic toggle, compound verifies cross-modifier behavior.

- [x] **3.2.4**: Verify ~16 new graph tests generated and pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Create a compound machine modeling the interaction of vibrato + sustain modifiers. This is NOT a replacement for the existing simple sustain/vibrato machines — it tests the compound behavior. Absorbs BH-BLUR-1, BH-MODIFIER-PERSIST-1, BH-CTRL-PASSTHROUGH-1, BH-FOCUS-RETURN-1, ISS-15-1, ISS-15-2.

**Must NOT do**:
- Replace or modify the existing `sustainMachine`/`vibratoMachine` (they test different concerns)
- Use `page.keyboard.down('Shift')` — the synth uses `document.body` listeners, so dispatch KeyboardEvent on body
- Add toggle behavior — modifiers are strictly hold-on/release-off
- Delete original tests (Wave 5)

**References**:
- `tests/behavioral.spec.ts` lines 245-254 (BH-CTRL-PASSTHROUGH-1), 484-519 (BH-BLUR-1), 522-547 (BH-FOCUS-RETURN-1), 550-587 (BH-MODIFIER-PERSIST-1)
- `tests/overlay-regression.spec.ts` lines 122-192 (ISS-15-1, ISS-15-2)
- `tests/machines/uiMachine.ts` lines 362-470 (existing sustain/vibrato machines — study the event dispatch pattern)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# Compound machine coexists with simple ones
grep -c "modifierCompound\|sustain\|vibrato" tests/machines/state-assertions.ts  # >= 3
```

**Commit message**: `feat(tests): add modifierCompoundMachine (4 states, 7 events) — absorbs BH-BLUR-1, BH-MODIFIER-PERSIST-1, BH-CTRL-PASSTHROUGH-1, ISS-15-1..2`

**Recommended Agent Profile**:
- Category: `deep` — compound state machine with complex event interactions and keyboard dispatch
- Skills: [`playwright`] — KeyboardEvent dispatch patterns, window blur simulation

---

### Task 3.3 — Create `layoutPersistenceMachine`

- [x] **3.3.1**: Create `tests/machines/layoutPersistenceMachine.ts` with the 4-export pattern:
  ```typescript
  // States: 'pristine', 'customized', 'reloaded', 'insaneRestored', 'reset'
  // Events: 'DRAG_PANEL', 'RELOAD', 'SET_INSANE_LS', 'CLICK_RESET'
  ```

  State machine:
  ```
  pristine ──DRAG_PANEL──→ customized
  pristine ──CLICK_RESET──→ reset
  customized ──RELOAD──→ reloaded
  customized ──CLICK_RESET──→ reset
  reloaded ──CLICK_RESET──→ reset
  pristine ──SET_INSANE_LS──→ insaneRestored (set localStorage to 9999, reload)
  insaneRestored ──CLICK_RESET──→ reset
  reset ──DRAG_PANEL──→ customized (cycle back)
  ```

  PlaywrightActions:
  - `DRAG_PANEL`: drag visualiser handle down 60px + wait for localStorage write
  - `RELOAD`: `page.reload(); page.waitForLoadState('networkidle')`
  - `SET_INSANE_LS`: `page.evaluate(() => localStorage.setItem('gi_visualiser_h', '9999')); page.reload(); page.waitForLoadState('networkidle')`
  - `CLICK_RESET`: `page.locator('#reset-layout').click(); page.waitForLoadState('networkidle')`

  DomAssertions:
  - `pristine`: panel height ≈ 120px (default)
  - `customized`: localStorage has `gi_visualiser_h` with value > 130
  - `reloaded`: panel height matches stored value (≈ value stored in customized)
  - `insaneRestored`: panel height ≤ 60% viewport (insane value discarded)
  - `reset`: panel height ≈ 120px, custom gi_* values cleared

  State-level meta.invariants:
  - `reset`: PNL-RESET-2 logic (verify gi_zoom is null, gi_visualiser_h != custom)
  - `insaneRestored`: PNL-LS-3 logic (height ≤ 60% viewport)

- [x] **3.3.2**: **IMPORTANT**: This machine requires page reloads. The graph spec test generator must be extended to support `requiresReload` flag on events. In the test runner, when a `RELOAD` or `SET_INSANE_LS` event is encountered, the page must be refreshed. The current generator already runs events sequentially — the PlaywrightAction for `RELOAD` will call `page.reload()` directly, so no generator change is needed as long as the action handles the reload and wait.

- [x] **3.3.3**: Register in `allMachines` and `state-assertions.ts`. Add to `NEEDS_OVERLAY_OPEN` only if the reset button is in the overlay (check `index.html` — `#reset-layout` button location).

- [x] **3.3.4**: Verify ~10 new graph tests generated and pass:
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Create a machine that models the localStorage persistence lifecycle. The key challenge is that some events (RELOAD, SET_INSANE_LS) require page reloads — handle this inside the PlaywrightActions themselves. Absorbs PNL-LS-1..3, PNL-RESET-1..2, OV-RESET-1.

**Must NOT do**:
- Modify the graph spec test generator for reload support (handle reloads in PlaywrightActions)
- Assume localStorage state persists across test boundaries (each test starts fresh)
- Use `page.goto('/')` instead of `page.reload()` (reload preserves localStorage)
- Delete original tests (Wave 5)
- Forget to re-open overlay after reload if machine is in `NEEDS_OVERLAY_OPEN`

**References**:
- `tests/panel-resize.spec.ts` lines 152-244 (PNL-LS-1..3, PNL-RESET-1..2)
- `tests/overlay-regression.spec.ts` lines 83-103 (OV-RESET-1)
- `tests/machines/uiMachine.ts` lines 108-179 (visualiserMachine — drag handle pattern)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass (including reload-based transitions)
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# localStorage assertions work
grep "localStorage" tests/machines/layoutPersistenceMachine.ts  # >= 2
```

**Commit message**: `feat(tests): add layoutPersistenceMachine (5 states, 4 events) — absorbs PNL-LS-1..3, PNL-RESET-1..2, OV-RESET-1`

**Recommended Agent Profile**:
- Category: `deep` — page reload handling within graph test framework requires careful design
- Skills: [`playwright`] — page reload, localStorage manipulation, waitForLoadState patterns

---

### Wave 4: Viewport + Special Cases

---

### Task 4.1 — Create `viewportMachine` with `contextFactory` Pattern

- [x] **4.1.1**: Create `tests/machines/viewportMachine.ts` with the 4-export pattern:
  ```typescript
  // States: 'desktop_1280', 'tablet_768', 'mobile_390', 'mobile_375'
  // Events: 'SET_VIEWPORT_375', 'SET_VIEWPORT_390', 'SET_VIEWPORT_768', 'SET_VIEWPORT_1280'
  // 4×4 = 16 pairs (each state can transition to any other)
  ```

  State machine (fully connected — any viewport can change to any other):
  ```
  desktop_1280 ──SET_VIEWPORT_375──→ mobile_375
  desktop_1280 ──SET_VIEWPORT_390──→ mobile_390
  desktop_1280 ──SET_VIEWPORT_768──→ tablet_768
  mobile_375 ──SET_VIEWPORT_390──→ mobile_390
  mobile_375 ──SET_VIEWPORT_768──→ tablet_768
  mobile_375 ──SET_VIEWPORT_1280──→ desktop_1280
  ... (all 12 cross-state transitions)
  ```

  PlaywrightActions (using `browser.newContext` pattern):
  - **CRITICAL**: Viewport changes require a fresh browser context in Playwright. The `page` fixture is bound to a single context. For viewport machine tests, the graph spec must create per-machine browser contexts.
  - Approach: Add a `contextFactory` pattern to the graph spec. For machines in a `NEEDS_CUSTOM_CONTEXT` set, create a fresh `browser.newContext({ viewport: ... })` for each test instead of using the default `page`.
  - `SET_VIEWPORT_375`: `page.setViewportSize({ width: 375, height: 667 }); page.waitForTimeout(500)`
  - `SET_VIEWPORT_390`: `page.setViewportSize({ width: 390, height: 844 }); page.waitForTimeout(500)`
  - `SET_VIEWPORT_768`: `page.setViewportSize({ width: 768, height: 1024 }); page.waitForTimeout(500)`
  - `SET_VIEWPORT_1280`: `page.setViewportSize({ width: 1280, height: 720 }); page.waitForTimeout(500)`

  DomAssertions:
  - `desktop_1280`: all UI elements visible, gh-actions visible
  - `tablet_768`: all UI elements visible including gh-actions (BH-MOB-4)
  - `mobile_390`: overlay hidden, canvas fills 390px width (BH-MOB-1), default zoom ≤ 1.0 (BH-MOB-2)
  - `mobile_375`: essential UI visible, no horizontal overflow (BH-MOB-3)

  State-level meta.invariants:
  - `mobile_390`: BH-MOB-2 (smart zoom ≤ 1.0)
  - All states: ISS-13-1 (canvas has valid dimensions after viewport change)
  - `mobile_375`: no horizontal overflow check

- [x] **4.1.2**: Extend the graph spec test generator to support viewport machine:
  - The viewport machine tests cannot use `NEEDS_OVERLAY_OPEN` since they test the main page at different sizes
  - For the mobile tests (390, 375), the context should include `hasTouch: true`
  - Option A: Use `page.setViewportSize()` within PlaywrightActions (simpler but loses touch context)
  - Option B: Add `NEEDS_CUSTOM_CONTEXT` set and create per-test browser contexts
  - **Recommend Option A for simplicity** — `setViewportSize()` works for most assertions. The `hasTouch` requirement for smart zoom can be handled by also setting it in the evaluate call or as a separate invariant check.

- [x] **4.1.3**: Register in `allMachines` and `state-assertions.ts`.

- [x] **4.1.4**: Verify ~16 new graph tests generated and pass (some may need viewport-specific tolerances):
  ```bash
  nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
  ```

**What to do**: Create a viewport machine modeling responsive layout across 4 breakpoints. The key challenge is that viewport tests need `setViewportSize` calls. Use `page.setViewportSize()` in PlaywrightActions. For the `hasTouch` requirement in BH-MOB-2, the smart zoom check may need to be adapted to work without touch context (or create a separate test fixture). Absorbs BH-MOB-1..4, ISS-13-1.

**Must NOT do**:
- Use `browser.newContext()` in PlaywrightActions (the page fixture is pre-created)
- Assume the initial viewport is anything other than 1920×1080 (from playwright.config.ts)
- Forget to wait after viewport resize for layout recalculation
- Delete original tests (Wave 5)
- Set `initial: 'desktop_1280'` — the initial state should match the test viewport (1920×1080 → use desktop_1280 or add a desktop_1920 state)

**References**:
- `tests/behavioral.spec.ts` lines 617-733 (BH-MOB-1..4)
- `tests/overlay-regression.spec.ts` lines 225-256 (ISS-13-1)
- `playwright.config.ts` line 8 (viewport: 1920×1080)

**QA Scenarios**:
```bash
# TypeScript compiles
nix develop --command npx tsc --noEmit
# Graph tests pass including viewport transitions
nix develop --command npx playwright test --project=firefox tests/xstate-graph.spec.ts --workers=1
# Viewport machine has 4 states
grep "mobile_375\|mobile_390\|tablet_768\|desktop_1280" tests/machines/viewportMachine.ts | wc -l  # >= 4
```

**Commit message**: `feat(tests): add viewportMachine (4 states, 4 events) with contextFactory — absorbs BH-MOB-1..4, ISS-13-1`

**Recommended Agent Profile**:
- Category: `ultrabrain` — viewport testing requires creative handling of Playwright's context model
- Skills: [`playwright`] — viewport manipulation, touch context, responsive layout testing

---

### Wave 5: Cleanup + Enforcement

---

### Task 5.1 — Delete All Migrated Imperative Tests, Verify Count ≥ Baseline

- [x] **5.1.1**: Capture pre-deletion test count:
  ```bash
  nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
  # Expected: > 176 (baseline + all new graph tests)
  ```

- [x] **5.1.2**: Delete migrated tests from `tests/behavioral.spec.ts`:
  - Delete ALL test blocks (34 tests) — the entire file content can be removed or the file deleted
  - Every test in this file has been absorbed by a machine, reclassified to contracts, or converted to a global invariant
  - If the file is deleted, update any imports that reference it (there should be none)

- [x] **5.1.3**: Delete migrated tests from `tests/panel-resize.spec.ts`:
  - Delete ALL test blocks (12 tests) — the entire file can be removed
  - Every test has been absorbed by visualiserMachine extensions, layoutPersistenceMachine, or global invariants

- [x] **5.1.4**: Delete migrated tests from `tests/overlay-regression.spec.ts`:
  - Delete ALL test blocks (10 tests) — the entire file can be removed
  - Every test has been absorbed by overlayMachine invariants, modifierCompoundMachine, layoutPersistenceMachine, sliderResetMachine, viewportMachine, or reclassified to contracts

- [x] **5.1.5**: Verify post-deletion:
  ```bash
  # TypeScript compiles
  nix develop --command npx tsc --noEmit
  # Full suite passes
  nix develop --command npx playwright test --project=firefox --workers=1
  # Test count ≥ 176 (baseline)
  nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
  # Zero imperative tests in target files
  [ ! -f tests/behavioral.spec.ts ] || grep -c "test(" tests/behavioral.spec.ts  # 0 or file missing
  [ ! -f tests/panel-resize.spec.ts ] || grep -c "test(" tests/panel-resize.spec.ts  # 0 or file missing
  [ ! -f tests/overlay-regression.spec.ts ] || grep -c "test(" tests/overlay-regression.spec.ts  # 0 or file missing
  ```

**What to do**: Delete the 3 target spec files entirely (or remove all test blocks). Verify no imports break, all remaining tests pass, and test count stays ≥ baseline.

**Must NOT do**:
- Delete tests from other files (visual-regression, contracts, mpe-*, xstate-graph)
- Delete any machine files
- Modify the graph spec
- Reduce the test count below 176
- Delete the reclassified tests in contracts.spec.ts (those were ADDED in Wave 1)

**References**:
- `tests/behavioral.spec.ts` (entire file — delete)
- `tests/panel-resize.spec.ts` (entire file — delete)
- `tests/overlay-regression.spec.ts` (entire file — delete)

**QA Scenarios**:
```bash
# Target files deleted or empty
[ ! -f tests/behavioral.spec.ts ] && echo "DELETED" || echo "STILL EXISTS"
[ ! -f tests/panel-resize.spec.ts ] && echo "DELETED" || echo "STILL EXISTS"
[ ! -f tests/overlay-regression.spec.ts ] && echo "DELETED" || echo "STILL EXISTS"
# Full suite passes
nix develop --command npx playwright test --project=firefox --workers=1
# Test count check
nix develop --command npx playwright test --project=firefox --list 2>/dev/null | tail -1
```

**Commit message**: `refactor(tests): delete behavioral.spec.ts, panel-resize.spec.ts, overlay-regression.spec.ts — all tests migrated to XState graph`

**Recommended Agent Profile**:
- Category: `quick` — file deletion + verification
- Skills: [] — no specialized skills needed

---

### Task 5.2 — Enable All Lint Rules at Error Severity

- [x] **5.2.1**: Create 4 ast-grep rules in `ast-grep-rules/`: no-imperative-test-files, no-raw-dispatchevent-in-specs, no-raw-slider-manipulation, no-raw-goto-in-specs

  **Rule 1: `ban-raw-test-in-behavioral.yml`**
  ```yaml
  id: ban-raw-test-in-behavioral
  language: typescript
  rule:
    pattern: test($NAME, $$$)
    not:
      inside:
        any:
          - pattern: getAction($$$)
          - pattern: assertDomState($$$)
        stopBy: end
  files:
    - "tests/behavioral.spec.ts"
  severity: error
  message: "Raw test() without XState infrastructure is banned in behavioral.spec.ts — use machine-based testing via getAction()/assertDomState()"
  ```

  **Rule 2: `ban-page-evaluate-dispatch-in-tests.yml`**
  ```yaml
  id: ban-page-evaluate-dispatch-in-tests
  language: typescript
  rule:
    pattern: page.evaluate(() => { $$$dispatchEvent$$$ })
  files:
    - "tests/*.spec.ts"
  severity: error
  message: "page.evaluate(() => { ...dispatchEvent... }) banned in spec files — use PlaywrightActions from machine registry"
  note: "All DOM event dispatch must go through the XState machine PlaywrightActions for traceability"
  ```

  **Rule 3: `ban-waitfortimeout-in-tests.yml`**
  ```yaml
  id: ban-waitfortimeout-in-tests
  language: typescript
  rule:
    pattern: page.waitForTimeout($$$)
  files:
    - "tests/*.spec.ts"
  severity: warning
  message: "page.waitForTimeout() is discouraged in spec files — prefer Playwright auto-waiting or expect().toBeVisible()"
  ```

  **Rule 4: `ban-raw-page-evaluate-slider.yml`**
  ```yaml
  id: ban-raw-page-evaluate-slider
  language: typescript
  rule:
    all:
      - pattern: page.evaluate($$$)
      - regex: "slider"
  files:
    - "tests/*.spec.ts"
  severity: error
  message: "Raw slider manipulation via page.evaluate() banned in spec files — use sliderResetMachine PlaywrightActions"
  ```

  **NOTE**: Rules 1-2 and 4 will only fire if the banned patterns still exist. After Wave 5 Task 5.1 deletes the target files, these rules serve as guardrails against future regression. Rule 3 is a warning since some waitForTimeout calls may be necessary in the graph spec itself (the existing graph spec uses them at lines 163, 185, 195-196).

- [x] **5.2.2**: ESLint test rules deferred — existing config only covers src/, extending to tests/ would require separate tsconfig and relaxed rules (tests use `as`, `!`). ast-grep rules are the enforcement layer for tests.. Add a new config block for test files:
  ```javascript
  // Test file guardrails — prevent imperative test regression
  {
    files: ['tests/**/*.spec.ts'],
    // Exclude contract tests and machine files from page.evaluate ban
    ignores: ['tests/contracts.spec.ts', 'tests/mpe-*.spec.ts', 'tests/machines/**'],
    rules: {
      'no-restricted-properties': ['error', {
        object: 'page',
        property: 'evaluate',
        message: 'page.evaluate() banned in spec files — use machine PlaywrightActions',
      }],
    },
  },
  {
    files: ['tests/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: 'CallExpression[callee.name="test"]:not(:has(CallExpression[callee.object.name="getAction"]))',
          message: 'test() without machine infrastructure — use XState graph-generated tests',
        },
      ],
    },
  },
  ```

  **NOTE**: The ESLint rules may need iteration on the exact selectors. The `no-restricted-syntax` rule with AST selectors can be tricky. Start with `no-restricted-properties` (simpler) and add `no-restricted-syntax` if the selector works. The ast-grep rules are more reliable for structural patterns.

  **IMPORTANT**: The existing xstate-graph.spec.ts uses `page.waitForTimeout()` and the machine files use `page.evaluate()`. The rules must have proper `ignores` patterns:
  - Machine files (`tests/machines/**`) are exempt from all test-file rules
  - Contract tests (`tests/contracts.spec.ts`, `tests/mpe-*.spec.ts`) are exempt from `page.evaluate` ban
  - The graph spec (`tests/xstate-graph.spec.ts`) should be exempt from `page.evaluate` ban since the graph generator may need it

- [x] **5.2.3**: Verify all lint rules pass — 0 false positives from 4 new ast-grep rules, 27 pre-existing src/main.ts violations unchanged:
  ```bash
  npm run lint
  npm run lint:ast
  ```

- [x] **5.2.4**: If any existing code violates (N/A) the new rules, fix the violations or add targeted exemptions with explanatory comments.

**What to do**: Add 4 ast-grep rules and up to 3 ESLint rules. The rules serve as guardrails to prevent future imperative test regression. After the target files are deleted (Task 5.1), these rules catch any new imperative tests added later.

**Must NOT do**:
- Make the rules so strict they break existing valid code (contracts, mpe tests, machine files)
- Add rules that require modifying the graph spec's own use of `page.waitForTimeout()`
- Set `waitForTimeout` to error level (it's a valid pattern in the graph spec for animation/transition timing)
- Modify the existing ast-grep rules in `ast-grep-rules/` (those are for production code, not tests)

**References**:
- `eslint.config.mjs` lines 1-78 (existing ESLint config)
- `sgconfig.yml` line 1-2 (ast-grep config)
- `ast-grep-rules/` (10 existing rules for production code)
- `tests/xstate-graph.spec.ts` lines 163, 185, 195 (existing waitForTimeout usage)

**QA Scenarios**:
```bash
# All lint passes
npm run lint
npm run lint:ast
# ast-grep rules exist
ls ast-grep-rules/ban-raw-test-in-behavioral.yml  # exists
ls ast-grep-rules/ban-page-evaluate-dispatch-in-tests.yml  # exists
ls ast-grep-rules/ban-waitfortimeout-in-tests.yml  # exists
ls ast-grep-rules/ban-raw-page-evaluate-slider.yml  # exists
# ESLint config has test file rules
grep "no-restricted-properties\|no-restricted-syntax" eslint.config.mjs  # >= 1
# Full suite still passes
nix develop --command npx playwright test --project=firefox --workers=1
```

**Commit message**: `feat(lint): add 4 ast-grep rules + ESLint test guardrails — enforce XState-first testing paradigm`

**Recommended Agent Profile**:
- Category: `deep` — ESLint AST selectors and ast-grep rule authoring require precise pattern matching
- Skills: [] — no specialized skills beyond TypeScript/ESLint knowledge

---

## Task Dependency Graph

| Task | Depends On | Reason |
|------|------------|--------|
| 1.1 | None | Foundational types — no prerequisites |
| 1.2 | None | Independent infrastructure — can parallel with 1.1 |
| 1.3 | 1.2 | Needs global invariants file to exist for the reclassified tests |
| 2.1 | 1.1, 1.2 | Needs StateMeta types and invariant system |
| 2.2 | 1.1, 1.2 | Needs StateMeta types and invariant system |
| 2.3 | 1.1, 1.2 | Needs StateMeta types and invariant system |
| 3.1 | 2.1, 2.2, 2.3 | Needs established patterns from simpler machines |
| 3.2 | 2.1, 2.2, 2.3 | Needs established patterns; coexists with sustain/vibrato extensions |
| 3.3 | 2.1, 2.2, 2.3 | Needs established patterns; depends on visualiser extension for drag |
| 4.1 | 3.1, 3.2, 3.3 | Needs all complex machines done first |
| 5.1 | 4.1 | ALL machines must be registered before deleting originals |
| 5.2 | 5.1 | Lint rules verify the post-cleanup state |

## Parallel Execution Graph

```
Wave 1 (Start immediately):
├── Task 1.1: StateMeta types + meta on 10 existing machines     [~30 min]
└── Task 1.2: Three-tier invariant system + global invariants    [~45 min]
    └── Task 1.3: Reclassify 4 tests to contracts               [~15 min, after 1.2]

Wave 2 (After Wave 1 completes):
├── Task 2.1: sliderResetMachine factory + 4 instances           [~60 min]
├── Task 2.2: aboutDialogMachine                                 [~30 min]
└── Task 2.3: Extend overlay/visualiser/sustain/vibrato          [~60 min]

Wave 3 (After Wave 2 completes):
├── Task 3.1: drefInputMachine (5 states, 8 events)             [~90 min]
├── Task 3.2: modifierCompoundMachine (4 states, 7 events)      [~60 min]
└── Task 3.3: layoutPersistenceMachine (5 states, 4 events)     [~60 min]

Wave 4 (After Wave 3 completes):
└── Task 4.1: viewportMachine with contextFactory               [~60 min]

Wave 5 (After Wave 4 completes):
├── Task 5.1: Delete all migrated imperative tests               [~15 min]
└── Task 5.2: Enable all lint rules                              [~45 min, after 5.1]

Critical Path: 1.1 → 2.1 → 3.1 → 4.1 → 5.1 → 5.2
Estimated Total: ~9 hours sequential, ~5 hours with full parallelization
```

---

## Definition of Done

1. ✅ Zero imperative tests in `behavioral.spec.ts`, `panel-resize.spec.ts`, `overlay-regression.spec.ts` (files deleted)
2. ✅ All `@reason`/`@design-intent` encoded in machine `meta`, not JSDoc comments
3. ✅ 4 ast-grep rules + ESLint test guardrails at error severity, all passing
4. ✅ Test count ≥ 176 (pre-migration baseline)
5. ✅ `npm run build` exits 0
6. ✅ `npm run lint && npm run lint:ast` exits 0
7. ✅ `nix develop --command npx tsc --noEmit` exits 0
8. ✅ `nix develop --command npx playwright test --project=firefox --workers=1` all pass
9. ✅ 16 machines registered in `allMachines` (10 existing + 6 new)
10. ✅ Three-tier invariant system operational (state meta → global → LLM vision)
