# POSTMORTEM: 3 Bugs That Took Days — 2026-03-25

## The 3 Bugs

1. **Double dialog** — clicking [i] next to gridinstruments.xyz opened BOTH about dialog AND info popup
2. **Game cog white box** — top-right settings cog went fully white when active (invisible icon)
3. **Settings 2D layout** — settings panel renders as single column, not 2D tiled grid

## Root Causes (all trivially simple)

### Bug 1: Double Dialog
- **Root cause**: About button had `class="slider-info-btn"` which made it part of the info popup click handler system
- **Fix**: Changed to `class="about-trigger"` (1 line, 2 seconds)
- **Why it took hours**: Agent tried 15 different CSS fixes (position:absolute, position:sticky, position:fixed, overflow:hidden, display:flex, form method=dialog, moving button outside dialog) — NONE of which addressed the actual problem. The agent never inspected which DOM events were firing.

### Bug 2: Game Cog White Box
- **Root cause**: `SongBar.css` had `#game-settings-btn.active { color:var(--fg); }` — ID selector beat class selector, set color to WHITE on white background
- **Fix**: Deleted that one CSS line (1 line, 2 seconds)
- **Why it took hours**: Agent changed the icon to SVG, then to Unicode ⚙, then back to lucide, added createIcons() calls, wrapped in requestAnimationFrame — NONE of which addressed the CSS specificity override. The agent never compared the computed styles of the working cogs vs the broken one.

### Bug 3: Settings 2D Layout
- **Root cause**: CSS Grid applied but overlay panel too narrow for 2 columns. Also all slider items have `grid-column: 1/-1` forcing full width.
- **Status**: Still pending — user wants a masonry/bin-packing library

## The Pattern

Every bug had a 2-second root cause fix that the agent turned into hours of thrashing by:
1. **Not inspecting the DOM** — never checked what events fire, what CSS applies, what elements exist
2. **Guessing instead of measuring** — "maybe it's Chrome-specific", "maybe it's overflow-y:auto", "maybe lucide timing"
3. **Committing without verifying** — pushed 20+ commits, most of which didn't fix anything
4. **Not self-testing** — only started running Playwright against localhost AFTER the user screamed for hours

## Rules For Next Time

1. **BEFORE any code change**: inspect the DOM in the ACTUAL browser, check computed styles, check event listeners
2. **BEFORE committing**: self-test with Playwright on localhost, verify the fix ACTUALLY works
3. **When the user says "it's the same component"**: COMPARE the computed styles of the working instance vs broken instance — the DIFFERENCE is the bug
4. **CSS specificity**: ID selectors (#foo) beat class selectors (.foo). ALWAYS check for overrides.
5. **Double events**: when TWO things happen on one click, check what CSS CLASSES trigger global event handlers
