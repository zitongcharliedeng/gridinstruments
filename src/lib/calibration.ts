/**
 * Calibration — saves and loads the set of reachable cell IDs.
 * localStorage key: 'gi_calibrated_range'
 */

const STORAGE_KEY = 'gi_calibrated_range';

/** Load calibrated range from localStorage. Returns null if not set. */
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

/** Save calibrated range to localStorage. */
export function saveCalibratedRange(cellIds: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...cellIds]));
  } catch {
    // storage full or private mode — silently ignore
  }
}

/** Clear calibrated range from localStorage. */
export function clearCalibratedRange(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}
