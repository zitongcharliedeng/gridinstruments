# P0: mcp_edit Tool Silent Failure — Postmortem

## Incident
**Date**: 2026-02-28
**Severity**: P0 — edits claimed success but did not persist, causing regression
**Files affected**: `src/lib/keyboard-visualizer.ts` (pitch axis formula, lines 329-338)

## Timeline
1. First `mcp_edit` call to replace pitch axis gradient formula with octave direction → tool responded "Updated"
2. Visual inspection confirmed fix worked (HMR applied change to browser for ~10 seconds)
3. Second `mcp_edit` call on a different section of same file → tool responded "Updated"
4. Read-back of file showed **original wrong code** at lines 329-338 — first edit GONE

## Root Cause Analysis
The `mcp_edit` tool uses LINE#ID anchors (e.g. `329#QX`). These anchors are **invalidated** when:
- Another edit changes line numbers (insertion/deletion shifts lines below)
- The file is modified externally (e.g., by another tool call, HMR, or save)
- Multiple edits to the same file happen without re-reading between them

**Most likely cause**: The second edit to a different part of the file caused the tool to
re-read the file, but it applied the second edit using stale LINE#IDs from before the first
edit. The tool's "apply bottom-up" strategy may have silently reverted the first edit's changes
when reconciling the file state.

## Mitigation: MANDATORY Protocol for Code Edits

### Rule 1: NEVER trust mcp_edit for critical changes
For any change that MUST persist:
```bash
# Use sed -i for surgical line replacements
sed -i '329,338c\NEW CONTENT HERE' path/to/file.ts

# ALWAYS verify with read-back
sed -n '326,345p' path/to/file.ts
```

### Rule 2: After EVERY mcp_edit, verify persistence
```bash
# Read back the exact lines that were changed
sed -n 'START,ENDp' path/to/file.ts
# OR
grep -n 'distinctive_new_content' path/to/file.ts
```

### Rule 3: Never make two mcp_edit calls to the same file without re-reading
If multiple edits are needed on one file:
- Option A: Batch all edits in a single mcp_edit call
- Option B: Read file between each edit to get fresh LINE#IDs
- Option C: Use sed/bash for reliability

### Rule 4: For multi-line replacements, prefer sed -i or Write
mcp_edit is designed for small, targeted edits. For replacing 10+ lines,
sed -i with the `c\` (change) command or the Write tool is more reliable.

## How This Was Fixed
Used `sed -i '329,338c\...'` to replace the pitch axis formula, then verified
with `sed -n '326,345p'` and `git diff` to confirm persistence.
