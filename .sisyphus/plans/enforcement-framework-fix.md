# Fix Broken Enforcement Framework — Deterministic Anti-Pattern Bans

## TL;DR

> **Quick Summary**: The project's linter rules, ast-grep rules, CI checks, and test framework config are all broken — they target deleted files, skip entire directories, and silently pass with 20+ violations. Fix every enforcement layer so anti-patterns are IMPOSSIBLE to commit.
> 
> **Deliverables**:
> - ast-grep rules actually catch real files (not deleted ones)
> - Playwright config locked to xstate-graph.spec.ts ONLY
> - ESLint covers tests/ (not just src/)
> - CI fails on ast-grep violations
> - All 3 imperative test files deleted (assertions migrated to XState)
> - Zero violations in `npx ast-grep scan`
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 4 → Task 7 → Task 8

---

## Context

### What Was Promised vs What Exists

A previous session claimed deterministic bans on anti-patterns were implemented. The user ticked off an issue for this. What actually shipped:

| Enforcement Layer | Claimed | Reality |
|---|---|---|
| `no-imperative-test-files.yml` | Bans imperative tests | Targets 3 DELETED files. contracts.spec.ts, mpe-service.spec.ts, mpe-output.spec.ts completely ignored |
| `no-raw-goto-in-specs.yml` | Bans page.goto in specs | Targets 3 DELETED files. Dead rule |
| `no-test-in-visual-regression.yml` | Bans visual-regression.spec.ts | File doesn't exist. Dead rule |
| ESLint scope | Lints project | `"lint": "eslint src/"` — tests/ never linted |
| playwright.config.ts | Runs XState tests only | `testDir: './tests'` runs ALL spec files |
| CI pipeline | Catches violations | Runs `npx playwright test` and `npx tsc --noEmit`. No `ast-grep scan`. No file guards |
| Git hooks | Pre-commit checks | All `.sample` files. Zero active hooks |
| `ast-grep scan` output | Zero violations | 20 violations silently ignored |

### Current Violations (as of now)
```
7  no-raw-style-mutation (src/main.ts)
5  no-raw-innerhtml (src/main.ts)
4  no-raw-classlist-toggle (src/main.ts)
3  no-raw-textcontent (src/main.ts)
1  no-raw-classlist-contains (src/main.ts)
= 20 violations, zero caught by CI
```

### Files That Shouldn't Exist
```
tests/contracts.spec.ts      — 20 imperative tests
tests/mpe-service.spec.ts    — 10 imperative tests
tests/mpe-output.spec.ts     — 6 imperative tests
```

---

## Work Objectives

### Core Objective
Make it IMPOSSIBLE to have imperative tests or anti-patterns pass through any enforcement layer.

### Concrete Deliverables
1. **ast-grep rules rewritten** — target actual patterns, not hardcoded filenames
2. **playwright.config.ts** — `testMatch` locked to `xstate-graph.spec.ts`
3. **ESLint config** — covers `tests/` directory too
4. **CI workflow** — runs `ast-grep scan` and fails on any error
5. **Imperative test files deleted** — assertions migrated to XState structural invariants
6. **20 existing ast-grep violations resolved** (or rules adjusted to allow legitimate patterns with documented exceptions)
7. **`npm run lint:ast`** exits 0 with zero violations

### Must Have
- `npx ast-grep scan` returns 0 violations and exit code 0
- `ls tests/*.spec.ts` returns ONLY `xstate-graph.spec.ts`
- CI runs ast-grep scan and fails on violations
- Playwright ONLY runs xstate-graph.spec.ts (no other spec files picked up)
- ESLint runs on both src/ AND tests/

### Must NOT Have
- Hardcoded filenames in ast-grep rules (use glob patterns)
- Rules targeting files that don't exist
- Silent violations (every rule must be enforced in CI)
- Any standalone `test()` call outside xstate-graph.spec.ts

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### QA Policy
After each task: `npx ast-grep scan` + `npm run build` + `nix develop --command npx playwright test --project=firefox --workers=1`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent fixes):
├── Task 1: Rewrite ast-grep rules to target real patterns [deep]
├── Task 2: Lock playwright.config.ts to xstate-graph.spec.ts only [quick]
├── Task 3: Extend ESLint to cover tests/ directory [quick]

Wave 2 (After Wave 1 — migrate tests using fixed framework):
├── Task 4: Migrate contracts.spec.ts to XState structural invariants [unspecified-high]
├── Task 5: Migrate mpe-output.spec.ts to XState structural invariants [unspecified-high]
├── Task 6: Migrate mpe-service.spec.ts to XState structural invariants [unspecified-high]

Wave 3 (After Wave 2 — delete + enforce):
├── Task 7: Delete imperative files + resolve remaining ast-grep violations [deep]
├── Task 8: Add ast-grep scan to CI + verify zero violations [quick]

Wave FINAL:
├── Task F1: Enforcement audit — try to sneak an imperative test past every layer [deep]
├── Task F2: Full test suite + build + lint verification [unspecified-high]
```

---

## TODOs

- [x] 1. Rewrite ast-grep rules to target real patterns

  **What to do**:
  - **`no-imperative-test-files.yml`**: REWRITE completely. Instead of listing specific files, use a glob that matches ALL spec files and bans standalone `test()` calls. The rule should:
    - Target: `tests/**/*.spec.ts` EXCLUDING `tests/xstate-graph.spec.ts`
    - Ban: any `test(` call in those files
    - Also: ban creation of ANY new .spec.ts file by having a rule that catches `import { test` or `import { test, expect }` in any file other than xstate-graph.spec.ts
  - **`no-raw-goto-in-specs.yml`**: Change files from 3 deleted filenames to `tests/**/*.spec.ts` glob (excluding xstate-graph.spec.ts and machine files)
  - **`no-test-in-visual-regression.yml`**: DELETE this rule — the file doesn't exist
  - **Verify**: `npx ast-grep scan` now catches contracts.spec.ts, mpe-service.spec.ts, mpe-output.spec.ts

  **Must NOT do**:
  - Do NOT hardcode specific filenames — use glob patterns only
  - Do NOT create rules that target files that don't exist

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7
  - **Blocked By**: None

  **References**:
  - `ast-grep-rules/no-imperative-test-files.yml` — current broken rule, targets deleted files
  - `ast-grep-rules/no-raw-goto-in-specs.yml` — also targets deleted files
  - `ast-grep-rules/no-test-in-visual-regression.yml` — targets nonexistent file, DELETE
  - `sgconfig.yml` — ast-grep config pointing to `./ast-grep-rules`
  - ast-grep docs for `files:` glob syntax — verify that `tests/**/*.spec.ts` works as a glob (ast-grep uses glob patterns in the `files` field)

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: ast-grep catches ALL imperative test files
    Tool: Bash
    Steps:
      1. Run: npx ast-grep scan 2>&1 | grep "no-imperative-test-files"
      2. Verify output mentions contracts.spec.ts, mpe-service.spec.ts, mpe-output.spec.ts
    Expected Result: All 3 imperative files flagged as errors
    Evidence: .sisyphus/evidence/task-1-ast-grep-catches-all.txt

  Scenario: ast-grep does NOT flag xstate-graph.spec.ts
    Tool: Bash
    Steps:
      1. Run: npx ast-grep scan 2>&1 | grep "xstate-graph"
      2. Verify NO output (rule does not target xstate-graph.spec.ts)
    Expected Result: Zero matches for xstate-graph.spec.ts
    Evidence: .sisyphus/evidence/task-1-xstate-not-flagged.txt
  ```

  **Commit**: YES
  - Message: `fix(lint): rewrite ast-grep rules to target actual patterns, not deleted files`
  - Files: `ast-grep-rules/*.yml`

---

- [x] 2. Lock playwright.config.ts to xstate-graph.spec.ts only

  **What to do**:
  - Add `testMatch: 'xstate-graph.spec.ts'` to the Playwright config
  - This makes Playwright REFUSE to run any other spec file even if it exists
  - Any new spec file will be silently ignored by the test runner (and caught by ast-grep)

  **Must NOT do**:
  - Do NOT change the `testDir` — keep it as `./tests`
  - Do NOT remove any other config (webServer, projects, etc.)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `playwright.config.ts` — current config, line 3: `testDir: './tests'` with no testMatch
  - Playwright docs: `testMatch` accepts string or regex to filter which test files are run

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Playwright only runs xstate-graph.spec.ts
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 --list 2>&1 | grep "spec.ts"
      2. Verify output only shows xstate-graph.spec.ts
      3. Verify contracts.spec.ts, mpe-service.spec.ts, mpe-output.spec.ts are NOT listed
    Expected Result: Only xstate-graph.spec.ts tests listed
    Evidence: .sisyphus/evidence/task-2-playwright-locked.txt
  ```

  **Commit**: YES
  - Message: `fix(test): lock playwright to xstate-graph.spec.ts only`
  - Files: `playwright.config.ts`

---

- [x] 3. Extend ESLint to cover tests/ directory

  **What to do**:
  - Change `"lint": "eslint src/"` to `"lint": "eslint src/ tests/"`
  - Add appropriate rule overrides for test files if needed (Playwright's `test()` and `expect()` may trigger some rules)
  - Ensure `npx eslint tests/` runs without config errors

  **Must NOT do**:
  - Do NOT disable any strict rules for test files — they should follow the same quality bar
  - Do NOT add test-specific type escape hatches

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `eslint.config.mjs` — current config with strictTypeChecked + stylisticTypeChecked
  - `package.json` scripts section — `"lint": "eslint src/"`
  - `tsconfig.json` — needs to include tests/ for type-checked linting to work

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: ESLint runs on tests/ directory
    Tool: Bash
    Steps:
      1. Run: npx eslint tests/ 2>&1 | head -20
      2. Verify it actually processes test files (not "no files found")
    Expected Result: ESLint processes test files, reports any issues
    Evidence: .sisyphus/evidence/task-3-eslint-tests.txt
  ```

  **Commit**: YES
  - Message: `fix(lint): extend eslint scope to cover tests/ directory`
  - Files: `package.json`, `eslint.config.mjs` (if overrides needed)

---

- [x] 4. Migrate contracts.spec.ts to XState structural invariants

  **What to do**:
  - Move ALL 20 tests from contracts.spec.ts into StateInvariant objects in `tests/machines/invariant-checks.ts`
  - Each test becomes a StateInvariant with matching ID (CT-MARKERS-1, CT-MIDI-1, etc.)
  - The `check(page)` function uses `page.evaluate()` exactly as current tests do, with `expect()` assertions inside
  - Wire each as a structural invariant in the `[Structural]` block of `tests/xstate-graph.spec.ts`
  - 1:1 mapping — every existing `expect()` must be preserved

  **Must NOT do**:
  - Do NOT combine tests — each gets its own StateInvariant
  - Do NOT change assertion logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1 (rules must detect the file first)

  **References**:
  - `tests/contracts.spec.ts` — all 20 source tests (421 lines)
  - `tests/machines/invariant-checks.ts` — target for new StateInvariant objects. Follow pattern of existing checks (e.g., `scrollbarWidthCheck`, `drefDriftCheck`)
  - `tests/machines/types.ts` — `StateInvariant` interface: `{ id: string; check: (page: Page) => Promise<void> }`
  - `tests/xstate-graph.spec.ts:175-235` — `[Structural]` block where state-independent invariants go

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All 20 contract invariants pass as structural tests
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "Structural" tests/xstate-graph.spec.ts
      2. Count test names matching CT-* and BH-*
      3. Verify count is 20 (matching contracts.spec.ts test count)
      4. Verify all pass
    Expected Result: 20 new structural tests, all passing
    Evidence: .sisyphus/evidence/task-4-contracts-migrated.txt
  ```

  **Commit**: YES
  - Message: `refactor(tests): migrate contracts.spec.ts to XState structural invariants`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`

---

- [x] 5. Migrate mpe-output.spec.ts to XState structural invariants

  **What to do**:
  - Move ALL 6 tests from mpe-output.spec.ts into StateInvariant objects
  - IDs: ISC-MPE-1 through ISC-MPE-5, ISC-A-MPE-1
  - Each check function uses `page.evaluate(async () => { const { MpeOutput } = await import('/src/lib/mpe-output.ts'); ... })`
  - Wire as structural invariants in xstate-graph.spec.ts

  **Must NOT do**:
  - Do NOT simplify or combine — 1:1 mapping

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `tests/mpe-output.spec.ts` — all 6 source tests (286 lines)
  - `tests/machines/invariant-checks.ts` — target
  - `tests/xstate-graph.spec.ts:175-235` — `[Structural]` block

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All 6 MPE output invariants pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "ISC-MPE" tests/xstate-graph.spec.ts
      2. Verify 6 ISC-MPE-* tests pass
    Expected Result: 6 tests pass
    Evidence: .sisyphus/evidence/task-5-mpe-output-migrated.txt
  ```

  **Commit**: YES
  - Message: `refactor(tests): migrate mpe-output.spec.ts to XState structural invariants`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`

---

- [x] 6. Migrate mpe-service.spec.ts to XState structural invariants

  **What to do**:
  - Move ALL 10 tests from mpe-service.spec.ts into StateInvariant objects
  - IDs: ISC-SVC-1 through ISC-SVC-10
  - Each check function uses `page.evaluate(async () => { const { MPEService } = await import('/src/lib/mpe-service.ts'); ... })`
  - Wire as structural invariants in xstate-graph.spec.ts

  **Must NOT do**:
  - Do NOT change assertion logic — 1:1 mapping

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:
  - `tests/mpe-service.spec.ts` — all 10 source tests (425 lines)
  - `tests/machines/invariant-checks.ts` — target
  - `tests/xstate-graph.spec.ts:175-235` — `[Structural]` block

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All 10 MPE service invariants pass
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1 -g "ISC-SVC" tests/xstate-graph.spec.ts
      2. Verify 10 ISC-SVC-* tests pass
    Expected Result: 10 tests pass
    Evidence: .sisyphus/evidence/task-6-mpe-service-migrated.txt
  ```

  **Commit**: YES
  - Message: `refactor(tests): migrate mpe-service.spec.ts to XState structural invariants`
  - Files: `tests/machines/invariant-checks.ts`, `tests/xstate-graph.spec.ts`

---

- [x] 7. Delete imperative files + resolve remaining ast-grep violations

  **What to do**:
  - Delete `tests/contracts.spec.ts`
  - Delete `tests/mpe-service.spec.ts`
  - Delete `tests/mpe-output.spec.ts`
  - Resolve the 20 existing ast-grep violations in src/main.ts:
    - For each violation: determine if the pattern is a LEGITIMATE exception (e.g., initial DOM setup before XState actors exist) or a real violation that needs refactoring
    - Legitimate exceptions: add to a per-rule `ignores` or `not` clause with inline documentation explaining WHY
    - Real violations: refactor to use XState actor.send() pattern
  - Run `npx ast-grep scan` — must return 0 violations
  - Run full test suite — all must pass
  - Verify `ls tests/*.spec.ts` returns ONLY `xstate-graph.spec.ts`

  **Must NOT do**:
  - Do NOT delete a file until ALL its assertions are confirmed passing as structural invariants
  - Do NOT suppress violations without documenting the exception reason

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 8, F1, F2
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**:
  - All files from Tasks 1-6
  - `src/main.ts` — 20 existing ast-grep violations to resolve
  - `npx ast-grep scan` — must exit with 0 errors

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Zero spec files except xstate-graph
    Tool: Bash
    Steps:
      1. Run: ls tests/*.spec.ts
      2. Verify output is ONLY: tests/xstate-graph.spec.ts
    Expected Result: Single spec file
    Evidence: .sisyphus/evidence/task-7-files-deleted.txt

  Scenario: Zero ast-grep violations
    Tool: Bash
    Steps:
      1. Run: npx ast-grep scan 2>&1
      2. Verify zero error lines
    Expected Result: Clean scan, no violations
    Evidence: .sisyphus/evidence/task-7-zero-violations.txt

  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run: nix develop --command npx playwright test --project=firefox --workers=1
      2. Verify all tests pass
    Expected Result: 135+ tests pass, 0 failures
    Evidence: .sisyphus/evidence/task-7-all-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `refactor: delete imperative test files + resolve all ast-grep violations`
  - Files: delete 3 spec files, modify src/main.ts

---

- [x] 8. Add ast-grep scan to CI + verify zero violations

  **What to do**:
  - Edit `.github/workflows/deploy.yml` to add an `ast-grep scan` step BEFORE the test step
  - The step should: `npx ast-grep scan` and fail the build if any violations are found
  - Also add `npm run lint` step (now that it covers tests/ too)
  - Verify: push to a branch, check CI runs both steps

  **Must NOT do**:
  - Do NOT remove existing CI steps
  - Do NOT make ast-grep a soft warning — it must FAIL the build

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: F1, F2
  - **Blocked By**: Task 7

  **References**:
  - `.github/workflows/deploy.yml` — current CI workflow (TypeScript check → Playwright install → tests → build → deploy)
  - `package.json` scripts — `"lint:ast": "ast-grep scan"` already exists

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: CI workflow includes ast-grep scan
    Tool: Bash
    Steps:
      1. Read .github/workflows/deploy.yml
      2. Verify ast-grep scan step exists
      3. Verify it runs BEFORE the test step
    Expected Result: ast-grep scan step present in CI
    Evidence: .sisyphus/evidence/task-8-ci-updated.txt
  ```

  **Commit**: YES
  - Message: `ci: add ast-grep scan + eslint to CI pipeline — violations now fail the build`
  - Files: `.github/workflows/deploy.yml`

---

## Final Verification Wave

- [x] F1. **Adversarial Test** — `deep`
  Try to sneak an imperative test past every enforcement layer:
  1. Create a temporary `tests/sneaky.spec.ts` with `test('foo', ...)` — verify ast-grep catches it
  2. Verify Playwright `--list` does NOT show it
  3. Run `npm run lint` — verify ESLint processes tests/
  4. Run `npx ast-grep scan` — verify zero violations
  5. Delete the sneaky file
  Output: PASS/FAIL per layer

- [x] F2. **Full Suite Verification** — `unspecified-high`
  1. `npm run build` exits 0
  2. `npx ast-grep scan` returns 0 violations
  3. `npm run lint` exits 0
  4. `nix develop --command npx playwright test --project=firefox --workers=1` — all pass
  5. `ls tests/*.spec.ts` — only xstate-graph.spec.ts
  6. Verify test count ≥ 171

---

## Commit Strategy

| Task | Commit Message |
|------|---------------|
| 1 | `fix(lint): rewrite ast-grep rules to target actual patterns, not deleted files` |
| 2 | `fix(test): lock playwright to xstate-graph.spec.ts only` |
| 3 | `fix(lint): extend eslint scope to cover tests/ directory` |
| 4 | `refactor(tests): migrate contracts.spec.ts to XState structural invariants` |
| 5 | `refactor(tests): migrate mpe-output.spec.ts to XState structural invariants` |
| 6 | `refactor(tests): migrate mpe-service.spec.ts to XState structural invariants` |
| 7 | `refactor: delete imperative test files + resolve all ast-grep violations` |
| 8 | `ci: add ast-grep scan + eslint to CI pipeline` |

---

## Success Criteria

### Verification Commands
```bash
npx ast-grep scan 2>&1 | grep "^error"  # Expected: NO output
ls tests/*.spec.ts                        # Expected: tests/xstate-graph.spec.ts ONLY
npm run build                             # Expected: exit 0
npm run lint                              # Expected: exit 0 (covers src/ AND tests/)
nix develop --command npx playwright test --project=firefox --workers=1  # Expected: all pass
```

### Final Checklist
- [x] ast-grep rules target glob patterns, not hardcoded filenames
- [x] Zero ast-grep violations
- [x] Playwright locked to xstate-graph.spec.ts
- [x] ESLint covers tests/
- [x] CI runs ast-grep scan and fails on violations
- [x] Zero imperative test files
- [x] All tests pass (171/171)
- [x] Build passes
