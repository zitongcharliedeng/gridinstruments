/**
 * Cost control utilities for LLM vision assertions.
 *
 * @reason LLM vision calls cost ~$0.004 each. Without gating and caching,
 *   a full test run could spend >$1 per run. This module ensures:
 *   1. Vision is opt-in via LLM_VISION_ENABLED=true env var
 *   2. Identical screenshots are never sent twice (sha256 hash cache)
 *
 * @design-intent Keep test runs free by default. Only spend money when
 *   explicitly enabled, and never waste money on duplicate screenshots.
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VisionResult {
  pass: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  timestamp: string;
}

type CacheStore = Record<string, VisionResult>;

// ─── Env gate ────────────────────────────────────────────────────────────────

/**
 * Returns true only when LLM_VISION_ENABLED is explicitly "true".
 * Any other value (undefined, "1", "yes", etc.) returns false.
 */
export function isVisionEnabled(): boolean {
  return process.env.LLM_VISION_ENABLED === 'true';
}

// ─── Screenshot hashing ──────────────────────────────────────────────────────

/**
 * Compute a sha256 hex digest for a PNG screenshot buffer.
 * Deterministic: same pixels → same hash.
 */
export function getScreenshotHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ─── Cache manager ───────────────────────────────────────────────────────────

const CACHE_FILENAME = '.vision-cache.json';

export class VisionCache {
  private store: CacheStore;
  private readonly cachePath: string;

  constructor(testDir: string = join(process.cwd(), 'tests')) {
    this.cachePath = join(testDir, CACHE_FILENAME);
    this.store = this.load();
  }

  private load(): CacheStore {
    if (!existsSync(this.cachePath)) return {};
    try {
      return JSON.parse(readFileSync(this.cachePath, 'utf-8'));
    } catch {
      return {};
    }
  }

  /** Check if a screenshot hash has a cached result. */
  has(hash: string): boolean {
    return hash in this.store;
  }

  /** Get cached result for a screenshot hash, or undefined. */
  get(hash: string): VisionResult | undefined {
    return this.store[hash];
  }

  /** Store a vision result keyed by screenshot hash. */
  set(hash: string, result: VisionResult): void {
    this.store[hash] = result;
    this.flush();
  }

  /** Write the cache to disk. */
  private flush(): void {
    writeFileSync(this.cachePath, JSON.stringify(this.store, null, 2), 'utf-8');
  }

  /** Number of cached entries. */
  get size(): number {
    return Object.keys(this.store).length;
  }
}
