# GridInstruments Unified Auto-Loop Handoff (2026-03-17)

## Purpose

This file unifies the currently fragmented GridInstruments state across OpenCode/oh-my-openagent, Claude handoffs, and Sisyphus task tracking so one deterministic continuation loop can run without re-discovering context.

## Canonical Runtime Configuration (Already Applied)

- Project config path: `/home/firstinstallusername/gridinstruments/.opencode`
- `oh-my-opencode` package version: `3.12.0`
- `@opencode-ai/plugin` version: `1.2.27` (project + user config package roots)
- `gridinstruments/.opencode/opencode.json`
  - plugin enabled: `"oh-my-opencode@latest"`
  - `todowrite` permission remains `"deny"`
  - top-level `model` override removed (so agent routing is not manually forced)
- `gridinstruments/.opencode/oh-my-opencode.json`
  - currently restored to exact clean installer defaults (no extra top-level override keys)
  - no custom `model_fallback` / `runtime_fallback` / `experimental` keys are present in project-local file
  - default agent/category routing therefore follows upstream installer mapping for this release

## Why Hephaestus Shows GPT-5.3-Codex

- Current upstream defaults still map Hephaestus to `gpt-5.3-codex`.
- This is expected in current release/docs and is not a broken install signal.
- Fallback behavior is built-in but opt-in by config; in exact installer-default mode this project does not add explicit fallback toggle keys.

## Latest Autonomous Progress (2026-03-17)

Completed batch focused on overlay/pedals regression stability:

- Fixed keyboard-tab reachability for pedals collapse action by increasing test tab budget (`literate/tests/machines/uiMachine.lit.md`).
- Fixed overlay close behavior on Escape and backdrop click in Solid mount layer (`literate/components/mount-grid-overlay.lit.md`).
- Fixed icon hydration race by re-running Lucide icon mounting after dynamic component setup (`literate/app-core.lit.md`).
- Fixed native select visibility contract while keeping runtime select behavior (`literate/app-dom.lit.md`).
- Updated MPE dropdown invariant to assert robustly against current DOM shape (`literate/tests/machines/invariant-checks.lit.md`).
- Updated overlay golden snapshot to current intended overlay layout (`tests/xstate-graph.spec.ts-snapshots/overlay-open-firefox-linux.png`).

Verification evidence for this batch:

- `nix develop --command npm run build` => PASS.
- `nix develop --command npx ast-grep scan` => PASS.
- `nix develop --command npx playwright test --project=firefox --workers=1 -g "VOW-NO-NATIVE-SELECT|GOLDEN-OVERLAY-2|\[Graph\] overlay|\[Graph\] pedals"` => PASS (13/13).

## Unified Context Sources (Read In This Order)

1. `/home/firstinstallusername/gridinstruments/.omx/handoffs/gridinstruments-unified-autoloop-handoff-20260317.md` (this file)
2. `/home/firstinstallusername/.omx/handoffs/gridinstruments-agent-claude.md`
3. `/home/firstinstallusername/.omx/handoffs/gridinstruments-npx-continues-handoff.md`
4. `/home/firstinstallusername/gridinstruments/.continues-handoff.md`
5. `/home/firstinstallusername/gridinstruments/.sisyphus/boulder.json`
6. `/home/firstinstallusername/gridinstruments/.sisyphus/plans/*.md`

## Framework State Snapshot (Cross-Framework Reality)

- `.omc` state exists and contains historical loop metadata tied to session `37fea3ed-b21a-4724-90fc-389051127f5f`.
  - `gridinstruments/.omc/state/sessions/37fea3ed-b21a-4724-90fc-389051127f5f/ralph-state.json` shows `active: true`, iteration `100` (stale legacy state).
  - `gridinstruments/.omc/state/sessions/37fea3ed-b21a-4724-90fc-389051127f5f/ultrawork-state.json` shows `active: false`, `deactivated_reason: max_reinforcements_reached`.
- `.omx` state exists and reflects a cancelled loop from 2026-03-17:
  - `gridinstruments/.omx/state/ralph-state.json` has `current_phase: "cancelled"`, `active: false`.
  - `gridinstruments/.omx/state/ultrawork-state.json` has `current_phase: "cancelled"`, `active: false`.
- `.sisyphus/boulder.json` still points to `literate-migration` as active/completed plan and is not aligned with current bug-fix backlog execution.

Interpretation: loop state is fragmented and stale across frameworks; use this handoff as canonical restart point.

## Current Repository State To Resolve First

`git status --short` currently shows large ongoing work (not yet reconciled):

- Literate source modifications across app/component mounts and overlays
- Snapshot PNG changes under `tests/xstate-graph.spec.ts-snapshots/`
- Untracked `.omx/` and `.opencode/` directory content
- Existing handoff file `.continues-handoff.md`

Treat this as an in-progress branch state, not a clean baseline.

## Deterministic Continuation Loop (No Manual Model Remap)

1. Run from `/home/firstinstallusername/gridinstruments` only.
2. Use exact installer-default routing; do not force all agents to one model unless explicitly requested later.
3. Execute this verification gate before feature work:
   - `nix develop --command npm run build`
   - `nix develop --command npm run lint`
   - `nix develop --command npx ast-grep scan`
   - `nix develop --command npx playwright test --project=firefox --workers=1`
4. Convert failures to explicit tasks, then fix one bounded batch at a time.
5. After each batch, repeat full verification gate.
6. Keep Sisyphus task state and plan checkboxes synchronized after each completed batch.

## Backlog Consolidation Rule

When duplicate tasks exist across frameworks:

- Keep Sisyphus task IDs as execution source of truth for active implementation.
- Use handoff files for context only; do not create parallel execution checklists in multiple places.
- Record cross-reference mapping once in the active plan and continue only from that plan.

## High-Priority Pending Themes (From Active Task System)

- Visual/canvas alignment and notch/axis correctness
- Drag handle/panel resize behavior and regressions
- MIDI and shimmer bug fixes
- Mobile responsiveness and CSS parity fixes
- Structural verification and Playwright stability

Also note large unchecked inventories in `.sisyphus/plans`:

- `game-fixes-tests-search.md` (88 unchecked items)
- `icon-system-bug-sweep.md` (66 unchecked items)
- `calibration-bugs.md` (62 unchecked items)
- `header-game-component.md` (13 unchecked items)
- `gamification-poc.md` (18 unchecked items)

## Safety Constraints For Unattended Work

- Never assume fallback is enabled unless config confirms it.
- Never re-add top-level `model` in `opencode.json` (that overrides agent routing).
- Never close GitHub issues directly; mark ready-for-review after verified fixes.
- Never edit `_generated/*` directly; edit `literate/*.lit.md` and retangle through project commands.

## Completion Condition

Done only when:

- Full verification gate is green on the current tree, and
- Open implementation tasks for this batch are completed with evidence, and
- A fresh handoff snapshot is written with exact remaining tasks (if any).

## Deterministic Restart Prompt (Use Verbatim For Next Autonomous Run)

"Continue from `/home/firstinstallusername/gridinstruments/.omx/handoffs/gridinstruments-unified-autoloop-handoff-20260317.md`. Treat this file as canonical. Use installer-default oh-my-openagent agent routing, keep `model_fallback` + `runtime_fallback` enabled, do not add top-level `model` override, do not manually force all-GPT/all-Claude. First reconcile current dirty tree, then run full verification gate, then execute highest-priority pending bug batch with evidence, repeating verify-after-each-batch until queue is exhausted or a concrete external blocker is reached." 
