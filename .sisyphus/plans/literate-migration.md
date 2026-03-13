# Literate Programming Migration — GridInstruments

## TL;DR

> **Quick Summary**: Migrate the entire gridinstruments codebase from hand-written TypeScript to Entangled literate programming, where `.lit.md` files in `literate/` are the source of truth and `src/*.ts` becomes generated output. Add enforcement rules that mechanically ban anti-patterns. Fix 11 broken issues within the new framework.
>
> **Deliverables**:
> - **P0 ENFORCEMENT LAYER**: gitignore + chmod 444 + delete-before-tangle — generated .ts are immutable build artifacts (like node_modules/)
> - `scripts/tangle.sh` — the ONLY way to produce .ts: delete → tangle → chmod 444
> - Entangled integrated into Nix devshell with Python venv (auto-tangles on entry)
> - `literate/*.lit.md` files as source of truth for all 31 source modules
> - Generated `src/*.ts` gitignored — cannot be committed, cannot be edited by Claude Code (EACCES)
> - `tool-decision.lit.md` — the project's first literate document (framework choice rationale)
> - Effect-TS service layer for browser API DI
> - main.ts decomposed from 2,664-line monolith into focused modules
> - 11 broken GitHub issues fixed (#130, #128, #100, #142, #121, #103, #67, #140, #93, #88, #80)
> - CI tangles from scratch before build/test (no .ts in git)
>
> **Estimated Effort**: XL (multi-day, 31 modules + decomposition + 11 bug fixes)
> **Parallel Execution**: YES — 10 waves, up to 11 tasks per wave
> **Critical Path**: T1 (flake.nix) → T2 (entangled.toml) → T4 (enforcement) → T7 (first module migration) → T18+ (remaining modules) → T30 (main.ts decomposition) → T31+ (main.ts migration) → T37+ (bug fixes) → F1-F4 (verification)

---

## Context

### Original Request
Full literate programming migration. `.lit.md` files become the ONLY source of truth. Enforcement-first: linter must mechanically ban patterns that violate decisions. Fix the 11 issues that were falsely marked done in the previous plan. Document every tool evaluated and rejected.

### Interview Summary
**Key Discussions**:
- **30+ tools evaluated** across 9 parallel research agents (Tier 1-5 categorization)
- **Entangled won** for bidirectional sync (`stitch` command) — decisive over @thi.ng/tangle
- **Nix integration verified**: Entangled NOT in nixpkgs (issue #64), but Python venv in devshell works perfectly
- **Tangle into `src/`**: Avoids 67+ import path rewrites. .lit.md in `literate/`, output replaces `src/*.ts`
- **Generated .ts NOT tracked in git**: Immutable build artifacts. gitignore + chmod 444 + delete-regen.
- **Effect-TS approved**: Amend AGENTS.md dependency rule. Services only (~50KB budget)
- **main.ts decompose first**: As plain .ts refactoring before literate migration
- **LP + AI resurgence**: Three major articles THIS WEEK validate the approach

**Research Findings**:
- Entangled 2.4.2 requires Python ≥3.13, hatchling build backend
- TypeScript NOT in Entangled's built-in languages — must add to `entangled.toml`
- `.entangled/filedb.json` must be committed (Entangled docs explicit)
- Annotation format: `// ~~ begin <<file#block>>[hash]` / `// ~~ end`
- `annotation = "standard"` required for bidirectional stitch to work
- Format-on-save on generated files breaks stitch (hash mismatch) — needs mitigation
- Watch mode race conditions with tsc --watch — sequential pipeline recommended

### Metis Review
**Identified Gaps** (addressed):
- `_compiled/` would cause 67-path cascade → resolved: tangle into `src/`
- Test coupling: 62 dynamic imports + 4 static imports → resolved: paths unchanged
- Effect-TS violates "no new deps" → resolved: amend AGENTS.md explicitly
- main.ts compound risk → resolved: decompose before migration
- CI needs Python if gitignored → resolved: add Python+entangled to CI
- Format-on-save breaks stitch → addressed: document workflow, VS Code settings
- Pin entangled version → addressed: `entangled-cli==2.4.2` in requirements.txt

---

## Work Objectives

### Core Objective
Transform gridinstruments from hand-written TypeScript to literate programming with Entangled, making `.lit.md` files the enforced source of truth while preserving all existing behavior verified by the 292-test suite.

### Concrete Deliverables
- `literate/*.lit.md` files for all 31 source modules
- `entangled.toml` configuration with TypeScript language definition
- Updated `flake.nix` with Python venv + entangled-cli
- `requirements.txt` pinning `entangled-cli==2.4.2`
- 4+ new ast-grep enforcement rules
- `literate/tool-decision.lit.md` — first literate document
- Effect-TS service layer (`src/services/`)
- main.ts decomposed into ~5-8 focused modules
- 11 bug fixes in literate source
- CI workflow updates with tangle step

### Definition of Done
- [ ] `nix develop --command entangled tangle` produces all `src/*.ts` files
- [ ] `nix develop --command entangled stitch` round-trips changes back to `.lit.md`
- [ ] `nix develop --command npm run build` exits 0
- [ ] `nix develop --command npx playwright test --project=firefox --workers=1` — 292 tests pass
- [ ] `nix develop --command npx ast-grep scan` exits 0 (including new literate rules)
- [ ] Hand-creating a `.ts` file in `src/lib/` triggers ast-grep failure
- [ ] All 11 issues verified fixed with specific acceptance criteria

### Must Have
- **P0: 3-layer mechanical enforcement** — no honor system, no bypassable hooks:
  - Layer 1: **gitignore** — generated `src/*.ts` not in git. `git add` silently skips them. Only `git add -f` works (deliberate, auditable). Same model as `node_modules/` and `dist/`.
  - Layer 2: **chmod 444** — generated files are read-only after tangle. Claude Code `Edit`/`Write` → OS `EACCES` error. Editors show "read-only" warning. LLMs can READ (for context) but CANNOT WRITE.
  - Layer 3: **delete + regen** — every `npm run build` and `npm test` deletes all generated .ts and retangles from .lit.md. Zero stale state possible. Even if someone `chmod u+w` and edits, the next build nukes it.
  - Bonus: `nix develop` shellHook auto-tangles on entry — `git clone && nix develop` = working project
- `scripts/tangle.sh` — single blessed entry point: delete → tangle → chmod 444
- Entangled tangle working (`.lit.md` → `.ts`)
- TypeScript language in `entangled.toml`
- Pin `entangled-cli==2.4.2`
- `.entangled/filedb.json` committed to git
- Byte-identical .ts output during migration (no behavior changes until Wave 8)
- All 292 existing tests pass after every migration task

### Must NOT Have (Guardrails)
- NO generated `.ts` files in git — they are gitignored build artifacts
- NO writable generated files — chmod 444 after every tangle, no exceptions
- NO pre-commit hooks as primary enforcement — they can be bypassed with `--no-verify`
- NO honor-system checks — enforcement must be mechanical (gitignore + chmod + delete-regen)
- NO behavior changes during migration waves (2-7) — same code, different source-of-truth
- NO Effect-TS outside `src/services/` boundary — banned from synth hot path, render loop, pure math, machines
- NO wiki metadata or frontmatter in `.lit.md` during migration — wiki is a separate future effort
- NO prose polishing during migration — first pass is mechanical wrapping with minimal docs
- NO `index.html` literate migration — stays as plain file
- NO import path changes in test files during migration
- NO `annotation = "naked"` — must use `"standard"` for stitch to work
- NO `as any`, `@ts-ignore`, `@ts-expect-error`, `!` non-null assertions (existing rule)
- NO new `<select>` elements (existing rule)
- NO bare `npm`/`npx` — always `nix develop --command`

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Playwright + ast-grep, 292 tests)
- **Automated tests**: Tests-after (Wave 8 bug fixes get new StateInvariant objects FIRST)
- **Framework**: Playwright (browser tests) + ast-grep (linting)
- **Migration waves**: NO new tests needed — it's a representation change, same behavior

### QA Policy
Every task MUST run: `entangled tangle && npm run build && npx playwright test --project=firefox --workers=1 && npx ast-grep scan`
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Migration tasks**: Diff pre/post .ts files (stripping annotations) — must be identical
- **Bug fixes**: Specific issue acceptance criteria + full regression suite
- **Enforcement**: Create forbidden file, verify ast-grep catches it, remove file

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — framework scaffold, 6 tasks):
├── T1: Add entangled-cli to nix devshell via Python venv [quick] ✅
├── T2: Create entangled.toml with TypeScript config [quick] ✅
├── T3: Write tool-decision.lit.md (first literate document) [writing] ✅
├── T4: Add ast-grep enforcement rules for literate programming [deep] ✅
├── T5: Add CI sync check workflow [quick] ✅
├── T6: Update AGENTS.md with literate workflow + amended dep rule [writing] ✅

Wave 2 (Validation spike — 1 module to prove pipeline, 1 task):
└── T7: Migrate note-colors.ts to literate (validation spike) [deep]
    (depends: T1, T2, T4)

Wave 3 (Layer 0 leaf modules — no local deps, MAX PARALLEL, 10 tasks):
├── T8:  Migrate calibration.ts [quick] (depends: T7)
├── T9:  Migrate synth.ts [unspecified-high] (depends: T7)
├── T10: Migrate chord-detector.ts [quick] (depends: T7)
├── T11: Migrate keyboard-layouts.ts [unspecified-high] (depends: T7)
├── T12: Migrate midi-input.ts [unspecified-high] (depends: T7)
├── T13: Migrate midi-parser.ts [unspecified-high] (depends: T7)
├── T14: Migrate midi-search.ts [unspecified-high] (depends: T7)
├── T15: Migrate mpe-output.ts [unspecified-high] (depends: T7)
├── T16: Migrate mpe-service.ts [unspecified-high] (depends: T7)
└── T17: Migrate NumericSlider.ts [quick] (depends: T7)

Wave 4 (Layer 1-2 modules — single/cross deps, 5 tasks):
├── T18: Migrate keyboard-visualizer.ts [unspecified-high] (depends: T11)
├── T19: Migrate note-history-visualizer.ts [unspecified-high] (depends: T7, T10)
├── T20: Migrate chord-graffiti.ts [unspecified-high] (depends: T18)
├── T21: Migrate game-engine.ts [unspecified-high] (depends: T13)
└── T22: Migrate sliderConfigs.ts [quick] (depends: T7)

Wave 5 (Layer 3 — state machines, 8 tasks):
├── T23: Migrate machines/types.ts [unspecified-high] (depends: T9, T11)
├── T24: Migrate appMachine.ts [unspecified-high] (depends: T23)
├── T25: Migrate gameMachine.ts [unspecified-high] (depends: T23)
├── T26: Migrate midiActor.ts [unspecified-high] (depends: T23)
├── T27: Migrate inputActors.ts [unspecified-high] (depends: T23)
└── T28: Migrate remaining machines (panel, overlay, dialog, waveform, midiPanel, mpe, pedals) [unspecified-high] (depends: T23)

Wave 6 (main.ts decomposition — plain .ts refactoring, 1 task):
└── T30: Decompose main.ts into 5-8 focused modules [deep]
    (depends: T24-T28 — all machines migrated first)

Wave 7 (main.ts literate migration, 1 task):
└── T31: Migrate decomposed main.ts modules to literate [deep]
    (depends: T30)

Wave 8 (Effect-TS service layer, 2 tasks):
├── T32: Install Effect-TS, create service layer scaffold [deep] (depends: T31)
└── T33: Wrap browser APIs in Effect services (AudioContext, MIDI, Canvas) [deep] (depends: T32)

Wave 9 (Bug fixes — 11 issues, MAX PARALLEL, 11 tasks):
├── T34: Fix #130 — Key brightness uniform [unspecified-high] (depends: T33)
├── T35: Fix #128 — Song bar decoupled from grid [deep] (depends: T33)
├── T36: Fix #100 — Hardcoded zoom vs DPI [unspecified-high] (depends: T33)
├── T37: Fix #142 — Keys stuck on alt-tab [unspecified-high] (depends: T33)
├── T38: Fix #121 — Chord progress visuals [unspecified-high] (depends: T33)
├── T39: Fix #103 — Equivalent note colors non-12TET [unspecified-high] (depends: T33)
├── T40: Fix #67  — MPE duplicate notes [deep] (depends: T33)
├── T41: Fix #140 — Song search broken [unspecified-high] (depends: T33)
├── T42: Fix #93  — Notation D-relative [unspecified-high] (depends: T33)
├── T43: Fix #88  — QWERTY overlay [unspecified-high] (depends: T33)
└── T44: Fix #80  — MPE visualizers [unspecified-high] (depends: T33)

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright skill)
└── F4: Scope fidelity check (deep)

Critical Path: T1 → T2 → T7 → T9/T11 → T23 → T24 → T30 → T31 → T32 → T33 → T34-T44 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 11 (Wave 9)
```

---

## TODOs

- [x] 1. Add entangled-cli to Nix devshell via Python venv

  **Commit**: `f1d7118 chore(literate): add entangled-cli to nix devshell via Python venv`

- [x] 2. Create entangled.toml with TypeScript config

  **Commit**: `6e090f6 chore(literate): add entangled.toml with TypeScript language config`

- [x] 3. Write tool-decision.lit.md — project's first literate document

  **Commit**: `8a318f9 docs(literate): add tool-decision.lit.md — framework choice rationale`

- [x] 4. Add P0 enforcement layer — gitignore + tangle.sh + chmod 444 + ast-grep rules

  **Commit**: `56d0380 chore(literate): add P0 enforcement — tangle.sh + package.json hooks + gitignore + ast-grep rules`

- [x] 5. Update CI workflows — tangle before build/test (generated .ts not in git)

  **Commit**: `4d6d5fb ci(literate): add tangle step to CI workflows (generated .ts not in git)`

- [x] 6. Update AGENTS.md with literate workflow + amended dep rule

  **Commit**: `00907b6 docs: update AGENTS.md with literate workflow and amended dep rule`

- [x] 7. Migrate note-colors.ts to literate (VALIDATION SPIKE)

  **What to do**:
  - Create `literate/note-colors.lit.md` wrapping `src/lib/note-colors.ts` (172 lines)
  - Use Entangled code block syntax: ``` {.typescript file=src/lib/note-colors.ts}
  - Add minimal prose: one heading per exported symbol, one paragraph explaining purpose
  - Save the original .ts file as reference: `cp src/lib/note-colors.ts /tmp/note-colors-original.ts`
  - Run `bash scripts/tangle.sh` — verify it produces `src/lib/note-colors.ts` (locked, chmod 444)
  - Diff the tangled output (stripping `// ~~ ` annotations) against the original — must be identical
  - **Add `src/lib/note-colors.ts` to `.gitignore`** (it's now a generated artifact)
  - **`git rm --cached src/lib/note-colors.ts`** (remove from git index, keep on disk)
  - Run full test suite to verify no regressions
  - Verify chmod 444: try to write → "Permission denied"
  - This is the PROOF that the entire pipeline works before committing to 30 more modules

  **Must NOT do**:
  - Do NOT change any behavior in note-colors.ts — byte-identical output (minus annotations)
  - Do NOT polish prose — mechanical wrapping only
  - Do NOT touch any other module

  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: Wave 2 (solo) | **Blocked By**: T1, T2, T4 (all done) | **Blocks**: T8-T17

  **References**:
  - `src/lib/note-colors.ts` — 172 lines, OKLCH color system. Layer 0 leaf module (no local deps)
  - Entangled code block syntax: ` ```typescript file=src/lib/note-colors.ts`
  - `entangled.toml` — config from T2
  - `scripts/tangle.sh` — enforcement script from T4

  **Acceptance Criteria**:
  ```
  Scenario: Tangle produces identical output
    Steps:
      1. cp src/lib/note-colors.ts /tmp/note-colors-original.ts
      2. Run nix develop --command entangled tangle
      3. Strip annotation lines: grep -v "^// ~~ " src/lib/note-colors.ts > /tmp/note-colors-tangled.ts
      4. diff /tmp/note-colors-original.ts /tmp/note-colors-tangled.ts
    Expected Result: diff shows no differences (byte-identical minus annotations)
    Evidence: .sisyphus/evidence/task-7-migration-fidelity.txt

  Scenario: Full test suite passes after migration
    Steps:
      1. nix develop --command npm run build
      2. nix develop --command npx playwright test --project=firefox --workers=1
    Expected Result: Build exit 0, all 292 tests pass
    Evidence: .sisyphus/evidence/task-7-test-results.txt

  Scenario: chmod 444 verified
    Steps:
      1. ls -la src/lib/note-colors.ts
      2. Assert permissions are -r--r--r-- (444)
      3. echo "test" >> src/lib/note-colors.ts → assert "Permission denied"
    Evidence: .sisyphus/evidence/task-7-chmod.txt
  ```

  **Commit**: YES
  - Message: `refactor(literate): migrate note-colors.ts to literate programming`
  - Files: `literate/note-colors.lit.md`, `.gitignore`, `.entangled/filedb.json`

- [x] 8. Migrate calibration.ts to literate

  **What to do**: Create `literate/calibration.lit.md` wrapping `src/lib/calibration.ts` (32 lines)
  Follow exact same pattern established in T7 (validation spike). Minimal prose, byte-identical output, full test verification.
  **Recommended Agent Profile**: `quick` | **Skills**: []
  **Parallelization**: Wave 3 (parallel with T9-T17) | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/lib/calibration.ts:1-32` — localStorage range persistence, 32 lines
  **Acceptance Criteria**: Full pipeline: `nix develop --command bash -c 'entangled tangle && npm run build && npx playwright test --project=firefox --workers=1'`
  **Evidence**: `.sisyphus/evidence/task-8-calibration.txt`
  **Commit**: YES — `refactor(literate): migrate calibration.ts to literate programming`

- [x] 9. Migrate synth.ts to literate

  **What to do**: Create `literate/synth.lit.md` wrapping `src/lib/synth.ts` (506 lines)
  This is a complex module (Web Audio synthesis, tuning markers) — prose should explain audio architecture.
  Byte-identical output, full test verification.
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 (parallel with T8, T10-T17) | **Blocked By**: T7 | **Blocks**: T23
  **References**: `src/lib/synth.ts:1-506` — Web Audio synth with oscillators, ADSR envelope, tuning system
  **Acceptance Criteria**: Same pattern as T8
  **Evidence**: `.sisyphus/evidence/task-9-synth.txt`
  **Commit**: YES — `refactor(literate): migrate synth.ts to literate programming`

- [x] 10. Migrate chord-detector.ts to literate

  **What to do**: Create `literate/chord-detector.lit.md` wrapping `src/lib/chord-detector.ts` (156 lines)
  **Recommended Agent Profile**: `quick` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: T19
  **References**: `src/lib/chord-detector.ts:1-156` — Chord name detection
  **Acceptance Criteria**: Same pattern — full pipeline verification
  **Evidence**: `.sisyphus/evidence/task-10-chord-detector.txt`
  **Commit**: YES — `refactor(literate): migrate chord-detector.ts to literate programming`

- [x] 11. Migrate keyboard-layouts.ts to literate

  **What to do**: Create `literate/keyboard-layouts.lit.md` wrapping `src/lib/keyboard-layouts.ts` (277 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: T18, T23
  **References**: `src/lib/keyboard-layouts.ts:1-277` — Isomorphic-qwerty coordinate formulas, note naming
  **Acceptance Criteria**: Same pattern — full pipeline verification
  **Evidence**: `.sisyphus/evidence/task-11-keyboard-layouts.txt`
  **Commit**: YES — `refactor(literate): migrate keyboard-layouts.ts to literate programming`

- [x] 12. Migrate midi-input.ts to literate

  **What to do**: Create `literate/midi-input.lit.md` wrapping `src/lib/midi-input.ts` (226 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/lib/midi-input.ts:1-226` — Web MIDI device management
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-12-midi-input.txt`
  **Commit**: YES — `refactor(literate): migrate midi-input.ts to literate programming`

- [x] 13. Migrate midi-parser.ts to literate

  **What to do**: Create `literate/midi-parser.lit.md` wrapping `src/lib/midi-parser.ts` (348 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: T21
  **References**: `src/lib/midi-parser.ts:1-348` — MIDI file parsing
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-13-midi-parser.txt`
  **Commit**: YES — `refactor(literate): migrate midi-parser.ts to literate programming`

- [x] 14. Migrate midi-search.ts to literate

  **What to do**: Create `literate/midi-search.lit.md` wrapping `src/lib/midi-search.ts` (320 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/lib/midi-search.ts:1-320` — Online MIDI library search
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-14-midi-search.txt`
  **Commit**: YES — `refactor(literate): migrate midi-search.ts to literate programming`

- [x] 15. Migrate mpe-output.ts to literate

  **What to do**: Create `literate/mpe-output.lit.md` wrapping `src/lib/mpe-output.ts` (200 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/lib/mpe-output.ts:1-200` — MPE MIDI output
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-15-mpe-output.txt`
  **Commit**: YES — `refactor(literate): migrate mpe-output.ts to literate programming`

- [x] 16. Migrate mpe-service.ts to literate

  **What to do**: Create `literate/mpe-service.lit.md` wrapping `src/lib/mpe-service.ts` (338 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/lib/mpe-service.ts:1-338` — MPE protocol service
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-16-mpe-service.txt`
  **Commit**: YES — `refactor(literate): migrate mpe-service.ts to literate programming`

- [x] 17. Migrate NumericSlider.ts to literate

  **What to do**: Create `literate/components/NumericSlider.lit.md` wrapping `src/components/NumericSlider.ts` (94 lines)
  **Recommended Agent Profile**: `quick` | **Skills**: []
  **Parallelization**: Wave 3 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/components/NumericSlider.ts:1-94` — Custom slider component
  **Acceptance Criteria**: Same pattern
  **Evidence**: `.sisyphus/evidence/task-17-numeric-slider.txt`
  **Commit**: YES — `refactor(literate): migrate NumericSlider.ts to literate programming`

- [x] 18. Migrate keyboard-visualizer.ts to literate

  **What to do**: Create `literate/keyboard-visualizer.lit.md` wrapping `src/lib/keyboard-visualizer.ts` (691 lines)
  Largest lib module — Canvas rendering, Voronoi hit detection, layout math.
  Use noweb references to break into logical sections (rendering, geometry, input handling).
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 4 | **Blocked By**: T11 | **Blocks**: T20
  **References**: `src/lib/keyboard-visualizer.ts:1-691`
  **Evidence**: `.sisyphus/evidence/task-18-keyboard-visualizer.txt`
  **Commit**: YES — `refactor(literate): migrate keyboard-visualizer.ts to literate programming`

- [x] 19. Migrate note-history-visualizer.ts to literate

  **What to do**: Create `literate/note-history-visualizer.lit.md` wrapping `src/lib/note-history-visualizer.ts` (481 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 4 | **Blocked By**: T7, T10 | **Blocks**: None
  **References**: `src/lib/note-history-visualizer.ts:1-481` — Staff notation, waterfall, chord panel
  **Evidence**: `.sisyphus/evidence/task-19-note-history-visualizer.txt`
  **Commit**: YES — `refactor(literate): migrate note-history-visualizer.ts to literate programming`

- [x] 20. Migrate chord-graffiti.ts to literate

  **What to do**: Create `literate/chord-graffiti.lit.md` wrapping `src/lib/chord-graffiti.ts` (192 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 4 | **Blocked By**: T18 | **Blocks**: None
  **References**: `src/lib/chord-graffiti.ts:1-192` — Yellow chord shape hints (roughjs SVG overlay)
  **Evidence**: `.sisyphus/evidence/task-20-chord-graffiti.txt`
  **Commit**: YES — `refactor(literate): migrate chord-graffiti.ts to literate programming`

- [x] 21. Migrate game-engine.ts to literate

  **What to do**: Create `literate/game-engine.lit.md` wrapping `src/lib/game-engine.ts` (334 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 4 | **Blocked By**: T13 | **Blocks**: None
  **References**: `src/lib/game-engine.ts:1-334` — Song learning, quantization engine
  **Evidence**: `.sisyphus/evidence/task-21-game-engine.txt`
  **Commit**: YES — `refactor(literate): migrate game-engine.ts to literate programming`

- [x] 22. Migrate sliderConfigs.ts to literate

  **What to do**: Create `literate/machines/sliderConfigs.lit.md` wrapping `src/machines/sliderConfigs.ts` (89 lines)
  **Recommended Agent Profile**: `quick` | **Skills**: []
  **Parallelization**: Wave 4 | **Blocked By**: T7 | **Blocks**: None
  **References**: `src/machines/sliderConfigs.ts:1-89` — Slider configuration constants
  **Evidence**: `.sisyphus/evidence/task-22-slider-configs.txt`
  **Commit**: YES — `refactor(literate): migrate sliderConfigs.ts to literate programming`

- [x] 23. Migrate machines/types.ts to literate

  **What to do**: Create `literate/machines/types.lit.md` wrapping `src/machines/types.ts` (384 lines)
  This re-exports types from synth and keyboard-layouts — critical dependency node.
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 | **Blocked By**: T9, T11 | **Blocks**: T24-T28
  **References**: `src/machines/types.ts:1-384` — Central type definitions
  **Evidence**: `.sisyphus/evidence/task-23-machines-types.txt`
  **Commit**: YES — `refactor(literate): migrate machines/types.ts to literate programming`

- [x] 24. Migrate appMachine.ts to literate

  **What to do**: Create `literate/machines/appMachine.lit.md` wrapping `src/machines/appMachine.ts` (185 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 (parallel with T25-T28) | **Blocked By**: T23 | **Blocks**: T30
  **References**: `src/machines/appMachine.ts:1-185` — Top-level application state machine
  **Evidence**: `.sisyphus/evidence/task-24-app-machine.txt`
  **Commit**: YES — `refactor(literate): migrate appMachine.ts to literate programming`

- [x] 25. Migrate gameMachine.ts to literate

  **What to do**: Create `literate/machines/gameMachine.lit.md` wrapping `src/machines/gameMachine.ts` (208 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 (parallel) | **Blocked By**: T23 | **Blocks**: T30
  **References**: `src/machines/gameMachine.ts:1-208` — Game/tutorial state machine
  **Evidence**: `.sisyphus/evidence/task-25-game-machine.txt`
  **Commit**: YES — `refactor(literate): migrate gameMachine.ts to literate programming`

- [x] 26. Migrate midiActor.ts to literate

  **What to do**: Create `literate/machines/midiActor.lit.md` wrapping `src/machines/midiActor.ts` (160 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 (parallel) | **Blocked By**: T23 | **Blocks**: T30
  **References**: `src/machines/midiActor.ts:1-160` — MIDI device actor
  **Evidence**: `.sisyphus/evidence/task-26-midi-actor.txt`
  **Commit**: YES — `refactor(literate): migrate midiActor.ts to literate programming`

- [x] 27. Migrate inputActors.ts to literate

  **What to do**: Create `literate/machines/inputActors.lit.md` wrapping `src/machines/inputActors.ts` (244 lines)
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 (parallel) | **Blocked By**: T23 | **Blocks**: T30
  **References**: `src/machines/inputActors.ts:1-244` — Input handling actors (keyboard, touch)
  **Evidence**: `.sisyphus/evidence/task-27-input-actors.txt`
  **Commit**: YES — `refactor(literate): migrate inputActors.ts to literate programming`

- [x] 28. Migrate remaining machine files to literate (batch)

  **What to do**: Migrate these 7 smaller machine files in one task:
  - `panelMachine.ts` (127 lines) → `literate/machines/panelMachine.lit.md`
  - `overlayMachine.ts` (89 lines) → `literate/machines/overlayMachine.lit.md`
  - `dialogMachine.ts` (48 lines) → `literate/machines/dialogMachine.lit.md`
  - `waveformMachine.ts` (68 lines) → `literate/machines/waveformMachine.lit.md`
  - `midiPanelMachine.ts` (56 lines) → `literate/machines/midiPanelMachine.lit.md`
  - `mpeMachine.ts` (51 lines) → `literate/machines/mpeMachine.lit.md`
  - `pedalMachines.ts` (82 lines) → `literate/machines/pedalMachines.lit.md`
  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 5 (parallel) | **Blocked By**: T23 | **Blocks**: T30
  **Acceptance Criteria**: All 7 migrated, full pipeline verification
  **Evidence**: `.sisyphus/evidence/task-28-remaining-machines.txt`
  **Commit**: YES — `refactor(literate): migrate remaining state machine files to literate programming`

- [ ] 30. Decompose main.ts into focused modules (plain .ts refactoring)

  **What to do**:
  - Read `src/main.ts` (2,664 lines) and identify natural decomposition boundaries
  - Extract into ~5-8 focused modules (app-init, app-input, app-audio, app-midi, app-rendering, app-state)
  - This is BEHAVIOR-PRESERVING refactoring — same functionality, better organization
  - Run FULL test suite after decomposition — all 292 tests must pass
  - Do NOT make these literate yet — that's T31

  **Must NOT do**: Do NOT change any behavior. Do NOT make literate. Do NOT touch other modules.
  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: NO | **Blocked By**: T24-T28 | **Blocks**: T31
  **Acceptance Criteria**: Build exit 0, all 292 tests pass, `wc -l src/main.ts` < 500
  **Evidence**: `.sisyphus/evidence/task-30-decomposition-tests.txt`
  **Commit**: YES — `refactor(main): decompose main.ts into focused modules`

- [ ] 31. Migrate decomposed main.ts modules to literate

  **What to do**: Create .lit.md files for each module from T30. Follow established pattern. Full pipeline verification.
  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: NO | **Blocked By**: T30 | **Blocks**: T32
  **Evidence**: `.sisyphus/evidence/task-31-main-literate.txt`
  **Commit**: YES — `refactor(literate): migrate decomposed main.ts modules to literate programming`

- [ ] 32. Install Effect-TS, create service layer scaffold

  **What to do**:
  - `nix develop --command npm install effect`
  - Create `src/services/` and `literate/services/` directories
  - Define service interfaces: AudioService, MidiService, CanvasService
  - Create `literate/services/index.lit.md` with service definitions
  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: NO | **Blocked By**: T31 | **Blocks**: T33
  **Evidence**: `.sisyphus/evidence/task-32-effect-scaffold.txt`
  **Commit**: YES — `feat(services): add Effect-TS service layer scaffold`

- [ ] 33. Wrap browser APIs in Effect services

  **What to do**: Implement AudioService, MidiService, CanvasService. Update modules to use services.
  **Must NOT**: Touch synth hot audio path. Wrap pure functions. Use Effect in state machines.
  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: NO | **Blocked By**: T32 | **Blocks**: T34-T44
  **Evidence**: `.sisyphus/evidence/task-33-effect-services.txt`
  **Commit**: YES — `feat(services): wrap browser APIs in Effect-TS services`

- [ ] 34. Fix #130 — Key brightness uniform

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel with T35-T44) | **Blocked By**: T33
  **References**: Issue #130, `src/lib/keyboard-visualizer.ts`, `src/lib/note-colors.ts`
  **Evidence**: `.sisyphus/evidence/task-34-issue-130.txt`
  **Commit**: YES — `fix(#130): key brightness uniform`

- [ ] 35. Fix #128 — Song bar decoupled from grid

  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #128, `src/machines/gameMachine.ts`
  **Evidence**: `.sisyphus/evidence/task-35-issue-128.txt`
  **Commit**: YES — `fix(#128): decouple song bar from grid`

- [ ] 36. Fix #100 — Hardcoded zoom vs DPI

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #100, `src/main.ts`, `src/lib/keyboard-visualizer.ts`
  **Evidence**: `.sisyphus/evidence/task-36-issue-100.txt`
  **Commit**: YES — `fix(#100): use devicePixelRatio instead of hardcoded zoom`

- [ ] 37. Fix #142 — Keys stuck on alt-tab

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #142, `src/lib/midi-input.ts`, `src/machines/appMachine.ts`
  **Evidence**: `.sisyphus/evidence/task-37-issue-142.txt`
  **Commit**: YES — `fix(#142): release stuck keys on alt-tab/focus loss`

- [ ] 38. Fix #121 — Chord progress visuals

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #121, `src/machines/gameMachine.ts`
  **Evidence**: `.sisyphus/evidence/task-38-issue-121.txt`
  **Commit**: YES — `fix(#121): chord progress visuals`

- [ ] 39. Fix #103 — Equivalent note colors non-12TET

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #103, `src/lib/note-colors.ts`, `src/lib/keyboard-visualizer.ts`
  **Evidence**: `.sisyphus/evidence/task-39-issue-103.txt`
  **Commit**: YES — `fix(#103): equivalent note colors in non-12TET tunings`

- [ ] 40. Fix #67 — MPE duplicate notes

  **Recommended Agent Profile**: `deep` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #67, `src/lib/mpe-service.ts`, `src/lib/midi-input.ts`, `src/lib/synth.ts`
  **Evidence**: `.sisyphus/evidence/task-40-issue-67.txt`
  **Commit**: YES — `fix(#67): prevent MPE duplicate notes`

- [ ] 41. Fix #140 — Song search broken

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #140, `src/lib/midi-search.ts`, `src/machines/gameMachine.ts`
  **Evidence**: `.sisyphus/evidence/task-41-issue-140.txt`
  **Commit**: YES — `fix(#140): restore song search functionality`

- [ ] 42. Fix #93 — Notation D-relative

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #93, `src/lib/note-history-visualizer.ts`, `src/lib/keyboard-layouts.ts`
  **Evidence**: `.sisyphus/evidence/task-42-issue-93.txt`
  **Commit**: YES — `fix(#93): D-relative notation display`

- [ ] 43. Fix #88 — QWERTY overlay

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #88, `src/lib/keyboard-visualizer.ts`, `src/main.ts`
  **Evidence**: `.sisyphus/evidence/task-43-issue-88.txt`
  **Commit**: YES — `fix(#88): QWERTY key overlay on grid`

- [ ] 44. Fix #80 — MPE visualizers

  **Recommended Agent Profile**: `unspecified-high` | **Skills**: []
  **Parallelization**: Wave 9 (parallel) | **Blocked By**: T33
  **References**: Issue #80, `src/lib/keyboard-visualizer.ts`, `src/lib/mpe-service.ts`
  **Evidence**: `.sisyphus/evidence/task-44-issue-80.txt`
  **Commit**: YES — `fix(#80): MPE expression visualizers`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + ast-grep scan + playwright test. Review for `as any`, `@ts-ignore`, console.log, etc.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Run `entangled tangle` from scratch. Build. Launch app. Execute all QA scenarios.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1. Check migration fidelity (byte-identical).
  Output: `Tasks [N/N compliant] | Migration Fidelity [N/N byte-identical] | VERDICT`

---

## Commit Strategy

Each task = exactly ONE atomic commit. Message format:
- **Wave 1**: `chore(literate): <description>`
- **Wave 2-7**: `refactor(literate): migrate <module>.ts to literate programming`
- **Wave 6**: `refactor(main): decompose main.ts into focused modules`
- **Wave 8**: `feat(services): add Effect-TS service layer for browser APIs`
- **Wave 9**: `fix(#N): <issue title>`
- **Pre-commit**: `nix develop --command bash -c 'entangled tangle && npm run build && npx playwright test --project=firefox --workers=1 && npx ast-grep scan'`

---

## Success Criteria

```bash
# Tangle from scratch
nix develop --command bash scripts/tangle.sh  # exits 0, all src/*.ts generated + chmod 444

# Generated files are read-only
ls -la src/lib/note-colors.ts                 # -r--r--r-- (444)
echo "test" >> src/lib/note-colors.ts         # Permission denied (EACCES)

# Generated files are gitignored
git status src/lib/note-colors.ts             # not shown
git add src/lib/note-colors.ts                # silently skipped by gitignore

# Build succeeds (auto-tangles via prebuild)
nix develop --command npm run build           # exits 0

# All tests pass (auto-tangles via pretest)
nix develop --command npx playwright test --project=firefox --workers=1  # 292+ tests pass
```

### Final Checklist
- [ ] All "Must Have" present (especially P0 enforcement layers)
- [ ] All "Must NOT Have" absent (especially: no .ts in git, no writable generated files)
- [ ] Generated .ts files are chmod 444 (read-only)
- [ ] Generated .ts files are gitignored (not in git index)
- [ ] `scripts/tangle.sh` works: delete → tangle → chmod 444
- [ ] `npm run build` auto-tangles (prebuild hook)
- [ ] `npm test` auto-tangles (pretest hook)
- [ ] `nix develop` auto-tangles (shellHook)
- [ ] CI tangles from scratch before build/test
- [ ] All 292+ tests pass
- [ ] All 11 issues fixed and verified
- [ ] AGENTS.md updated with literate workflow + enforcement model
- [ ] ast-grep enforces Effect-TS boundary and browser API boundary
