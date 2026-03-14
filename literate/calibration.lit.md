# Calibration

localStorage-backed calibration — saves and loads the set of reachable cell IDs for the isomorphic grid keyboard.

A "calibrated range" is a `Set<string>` of cell IDs that the player can physically reach. The grid uses this to dim unreachable cells and focus the visual layout. The set is persisted to `localStorage` so calibration survives page reloads.

## Storage Key

All three functions share a single constant key. Centralising it here prevents key-name drift if the storage scheme changes.

``` {.typescript file=_generated/lib/calibration.ts}
const STORAGE_KEY = 'gi_calibrated_range';
```

## Load

`loadCalibratedRange` reads and JSON-parses the stored value. It returns `null` (not an empty set) when no calibration has been saved, so callers can distinguish "never calibrated" from "calibrated to zero cells". Type narrowing ensures only string elements survive the parse — non-string entries are silently dropped. All errors (missing key, malformed JSON, storage unavailable) return `null`.

``` {.typescript file=_generated/lib/calibration.ts}
export function loadCalibratedRange(): ReadonlySet<string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return null;
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return null;
  }
}
```

## Save

`saveCalibratedRange` spreads the set into an array before serialising — `JSON.stringify` does not handle `Set` directly. Storage quota errors and private-browsing restrictions are silently swallowed; the calibration workflow can still function in-session without persistence.

``` {.typescript file=_generated/lib/calibration.ts}
export function saveCalibratedRange(cellIds: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...cellIds]));
  } catch {
    // storage full or private mode — silently ignore
  }
}
```

## Clear

`clearCalibratedRange` removes the key entirely, returning the app to the "never calibrated" state. Errors are swallowed for the same reasons as `saveCalibratedRange`.

``` {.typescript file=_generated/lib/calibration.ts}
export function clearCalibratedRange(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
```
