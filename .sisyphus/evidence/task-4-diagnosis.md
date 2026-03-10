# Zoom Slider Diagnosis (#78)

## Root Cause

**Missing `addEventListener('input')` → `appActor.send(SLIDER_INPUT)` bridge for the zoom slider.**

During user interaction (dragging), the zoom slider's fill gradient and badge text/position never update because the `appActor` subscriber that drives those visual updates is never triggered.

## Evidence

### Empirical Data (Playwright diagnostic)

**Before overlay open** (overlay hidden, `display: none`):
- `#zoom-slider` offsetWidth: **0** (expected — hidden element)
- Fill set via fallback percentage formula (correct behavior)

**After overlay open** (overlay visible):
- `#zoom-slider` offsetWidth: **1206px** (correct)
- Fill: `linear-gradient(to right, var(--fg) 28.62%, #000 28.62%)` (correct for value=1.0, range 0.2-3.0)
- Badge: `left: 345.214px`, text: `"1.00"` (correct)
- `refreshAllSliderUI()` successfully recalculated after `rAF` at line 1096

**After setting zoom to 2.0** (BUG):
- Slider DOM value: `"2.0"` (correct — HTML updated)
- Fill: **FROZEN** at `28.62%` (should be ~64.29%)
- Badge left: **FROZEN** at `345.214px` (should be ~775px)
- Badge text: **FROZEN** at `"1.00"` (should be `"2.00"`)

Volume slider exhibits the SAME bug — also missing the SLIDER_INPUT bridge.

### Code Path Analysis

**Working slider (skew) has 3 input bindings:**
1. **Class method** (`src/main.ts:607`): `this.skewSlider.addEventListener('input', ...)` → calls `setSkewFactor()`, `saveSetting()`
2. **Module-level** (`src/main.ts:1844`): `_skewSlider.addEventListener('input', ...)` → sends `SLIDER_INPUT` to appActor
3. **appActor subscriber** (`src/main.ts:1750`): responds to state change → updates badge position, badge text, label, fill gradient

**Broken slider (zoom) has only 2 bindings:**
1. **Class method** (`src/main.ts:1050`): `this.zoomSlider?.addEventListener('input', ...)` → calls `setZoom()`, `updateGraffiti()`, `saveSetting()`
2. **appActor subscriber** (`src/main.ts:1807`): responds to state change → updates badge position, badge text, fill gradient
3. **MISSING**: No module-level `addEventListener('input')` that sends `SLIDER_INPUT` to appActor ← **THIS IS THE BUG**

Without binding #2, user input on the zoom slider never reaches appActor, so the subscriber never fires during interaction, and badge/fill remain frozen at their initial computed values.

### Init Sequence (not the bug, but context)

1. `appActor.subscribe(...)` registered (line 1807) — subscriber attached
2. `appActor.start()` (line 1828) — fires subscriber with initial context (zoom = defaultZoom = 1.0 on desktop)
3. `appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: 1.0 })` (line 1839) — sends DOM value
4. Subscriber fires again, but `1.0 === _prevZoomValue (1.0)` → early return (no-op)
5. When overlay opens → `refreshAllSliderUI()` runs via rAF (line 1096) → recalculates fill/badge with correct offsetWidth

Init is fine. The bug is purely about ongoing interaction not reaching appActor.

## Screenshots

- `task-4-zoom-diagnosis.png` — Full overlay view after opening (initial state correct)
- `task-4-zoom-closeup.png` — Zoom slider close-up (initial state correct)
- `task-4-after-interact.png` — After setting zoom=2.0 and volume=0.5 (fill/badge frozen)

## Proposed Fix

**File**: `src/main.ts`
**Location**: After line 1839 (after the initial `SLIDER_INPUT` sends), in the `// Wire DOM → appActor` section

**Add** a module-level `addEventListener('input')` for the zoom slider, identical to the skew slider bridge at line 1844:

```typescript
// After line ~1840, alongside the existing skew bridge:
if (_zoomSlider) {
  _zoomSlider.addEventListener('input', () => {
    appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: parseFloat(_zoomSlider.value) });
  });
}
```

This mirrors the pattern at lines 1843-1846 for skew. The class-level listener at line 1050 continues handling `setZoom()`, `saveSetting()`, etc. The new module-level listener sends `SLIDER_INPUT` to appActor → subscriber fires → badge/fill update.

**Also fix volume** (same bug): add a volume bridge in the same section:

```typescript
if (_volumeSlider) {
  _volumeSlider.addEventListener('input', () => {
    appActor.send({ type: 'SLIDER_INPUT', slider: 'volume', value: parseFloat(_volumeSlider.value) });
  });
}
```

### Exact Lines for the Fix

Insert at `src/main.ts`, after line 1846 (after the skew `addEventListener` block), before the `_skewBadge` change handler:

```typescript
  if (_volumeSlider) {
    _volumeSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'volume', value: parseFloat(_volumeSlider.value) });
    });
  }
  if (_zoomSlider) {
    _zoomSlider.addEventListener('input', () => {
      appActor.send({ type: 'SLIDER_INPUT', slider: 'zoom', value: parseFloat(_zoomSlider.value) });
    });
  }
```

## What About the "White Block" Description?

The "white block" likely refers to the **frozen fill gradient** when a user has previously saved a different zoom value (via localStorage). On page reload:
- The slider DOM value is restored (e.g., 2.5)
- `SLIDER_INPUT` fires once during init → subscriber sets fill with `offsetWidth === 0` → fallback percentage fill
- `refreshAllSliderUI()` runs on overlay open → recalculates correctly
- But if the user then drags → fill FREEZES → the white fill region doesn't match thumb position → looks like a "white block" stuck on the left side of the slider while the thumb is far to the right

## Severity

- **Visual bug**: Fill gradient and badge don't track during interaction
- **Functional**: Zoom itself WORKS (grid zooms correctly via class listener) — only visual feedback is broken
- **Scope**: Same bug affects volume slider too
