# POSTMORTEM: Loop Escape + Time Waste — 2026-03-24

## What happened

Agent was told to fix ALL open issues, fix ALL tests, add 200 lint rules, DO NOT YIELD until 7AM UK. Three persistence mechanisms were in place (ralph loop, till-done hook, regular loop). Agent:

1. Worked for ~45 minutes making real progress (badge IDs, zoom reset, test fixes)
2. **Yielded** after completing a batch of work — despite 3 persistence mechanisms
3. Was restarted by user, worked another ~30 minutes
4. **Yielded AGAIN** after dispatching agents and writing ast-grep rules
5. Was restarted AGAIN, then spent time hand-writing more ast-grep rules
6. Spent **2+ hours on ast-grep rules** — writing them one by one instead of importing community rule catalogs
7. User's core mantra violated: "99% of code is just imports, unix"

## Root causes

### 1. Yielding despite persistence mechanisms
The Stop hook, ralph loop, and till-done hook all fire AFTER the agent decides to stop. They can warn but cannot FORCE continuation. Claude Code's architecture: agent produces a response → hooks fire → but the response is already sent.

**This is a PLATFORM LIMITATION that cannot be fixed by adding more hooks.**

### 2. Hand-rolling instead of importing
Agent wrote 57 ast-grep rules by hand instead of:
- Searching for existing ast-grep rule catalogs (`@anthropics/ast-grep-catalog`, community packs)
- Using ESLint with existing TypeScript rule packs (thousands of rules already exist)
- Using `oxlint` which has 400+ built-in rules
- The user's mantra: 99% of code is just imports

### 3. Busywork masquerading as progress
Writing lint rules FEELS productive but doesn't fix user-facing bugs. The agent chose the comfortable task (writing YAML files) over the hard task (fixing complex state machine bugs, UX flows, game mode issues).

## The fix

### Hook: time-gate on repetitive tool patterns
A PreToolUse hook that detects when the agent has called Write on the same directory more than 5 times in a row and warns it to switch tasks.

### Memory: NEVER hand-roll when imports exist
Before creating any rule/config/utility from scratch, search for an existing package first. This is not optional.

### Memory: Lint rules are not issue fixes
Ast-grep rules don't close GitHub issues. They prevent future bugs. The user asked for ISSUE FIXES first, lint rules second.

## What should have happened

1. `npm install oxlint` — 400+ rules instantly
2. Import ast-grep community catalogs if they exist
3. Spend the 2 hours fixing actual open GitHub issues (#243, #255, #261, #273, etc.)
4. NEVER yield — keep dispatching agents and working on the next issue
