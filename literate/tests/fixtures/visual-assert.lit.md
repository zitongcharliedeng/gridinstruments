# Visual Assert

Unified visual assertion fixture — three-layer verification pyramid: DOM assertions, golden screenshots, and LLM vision fallback.

``` {.typescript file=_generated/tests/fixtures/visual-assert.ts}
/**
 * Unified visual assertion fixture: golden screenshots + LLM vision fallback.
 *
 * @reason Deterministic DOM assertions catch structural regressions but miss
 *   visual ones (wrong color, overlapping elements, broken layout). Golden
 *   screenshots catch pixel-level regressions but are brittle across browsers
 *   and rendering engines. LLM vision catches semantic visual issues that
 *   neither approach handles alone.
 *
 * @design-intent Three-layer verification pyramid:
 *   1. DOM assertions (always, free, fast) — from state-assertions.ts
 *   2. Golden screenshots (always, free, medium) — toHaveScreenshot()
 *   3. LLM vision (opt-in, paid, slow) — assertWithVision() with cache
 *
 * Layer 3 only fires when:
 *   - LLM_VISION_ENABLED=true in env
 *   - Screenshot hash is NOT in the cache
 *   - Golden screenshot comparison passed OR is being generated for first time
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { isVisionEnabled, getScreenshotHash, VisionCache } from './cost-control';
import { assertWithVision } from './llm-vision';
import type { VisionResult } from './cost-control';

let cacheInstance: VisionCache | null = null;

function getCache(): VisionCache {
  cacheInstance ??= new VisionCache();
  return cacheInstance;
}

export interface VisualAssertOptions {
  /** Human-readable invariant for LLM vision (required for LLM layer). */
  invariant: string;
  /** State/event context string for LLM (optional). */
  context?: string;
  /** Golden screenshot name (e.g. 'overlay-visible'). Used as filename. */
  goldenName: string;
  /** Playwright Page instance. */
  page: Page;
  /** Element to screenshot. Defaults to full page. */
  locator?: string;
  /** Max allowed pixel diff ratio for golden comparison. Default 0.05 (5%). */
  maxDiffRatio?: number;
}

export interface VisualAssertResult {
  /** Whether the golden screenshot matched (or was created for first time). */
  goldenPassed: boolean;
  /** LLM vision result, or null if skipped. */
  visionResult: VisionResult | null;
  /** Whether the overall assertion passed. */
  passed: boolean;
}

/**
 * Run the full visual assertion pyramid for a UI state:
 *   1. Take screenshot
 *   2. Compare against golden (toHaveScreenshot)
 *   3. If LLM enabled + not cached: run LLM vision
 *
 * @returns Combined result from all layers.
 */
export async function assertVisualState(
  opts: VisualAssertOptions,
): Promise<VisualAssertResult> {
  const { page, invariant, context, goldenName, locator } = opts;

  const target = locator ? page.locator(locator) : page;
  const screenshotBuffer = await target.screenshot({ type: 'png' });

  await expect(target).toHaveScreenshot(`${goldenName}.png`);
  const goldenPassed = true;

  let visionResult: VisionResult | null = null;

  if (isVisionEnabled()) {
    const hash = getScreenshotHash(screenshotBuffer);
    const cache = getCache();

    if (cache.has(hash)) {
      visionResult = cache.get(hash) ?? null;
    } else {
      const llmResult = await assertWithVision(screenshotBuffer, invariant, context);
      visionResult = {
        pass: llmResult.pass,
        confidence: llmResult.confidence,
        reason: llmResult.reason,
        timestamp: new Date().toISOString(),
      };
      cache.set(hash, visionResult);
    }
  }

  const passed = visionResult === null || visionResult.pass;

  return { goldenPassed, visionResult, passed };
}
```
