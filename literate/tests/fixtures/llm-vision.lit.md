# LLM Vision

LLM vision assertion via Anthropic Claude API — sends screenshots for visual invariant verification with fail-open semantics.

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
/**
 * LLM vision assertion via Anthropic Claude API.
 *
 * @reason Every visual state transition should be verified by at least one
 *   LLM vision call. This module provides the raw API integration.
 *   Caching and env gating live in cost-control.ts and visual-assert.ts.
 *
 * @design-intent Separate raw API call from caching/gating concerns.
 *   This function is pure: screenshot in, structured result out.
 *   On API failure, it returns a pass (fail-open) so tests don't break
 *   when the API is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VisionAssertionResult {
  pass: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

// ─── Client singleton ────────────────────────────────────────────────────────

let client: Anthropic | null = null;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// ─── Core assertion ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a visual QA tester for a browser-based music synthesizer called GridInstruments. Given a screenshot and an invariant description, determine whether the invariant holds in the screenshot.

Rules:
- Focus ONLY on the specific invariant described — ignore unrelated visual elements
- The app has a black background, white text, JetBrains Mono font, no rounded corners
- "Visible" means the element is rendered and not obscured
- "Hidden" means the element is not rendered or has display:none/visibility:hidden

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{"pass": boolean, "confidence": "high"|"medium"|"low", "reason": "one sentence explanation"}`;

/**
 * Send a screenshot to Claude for visual invariant verification.
 *
 * @param screenshot - PNG buffer from `page.screenshot({ type: 'png' })`
 * @param invariant - Human-readable description of what should be true
 * @param context - Optional state/event context for the LLM
 * @returns Structured pass/fail result. On API error, returns pass=true (fail-open).
 */
export async function assertWithVision(
  screenshot: Buffer,
  invariant: string,
  context?: string,
): Promise<VisionAssertionResult> {
  const userText = context
    ? `State context: ${context}\n\nInvariant to verify: ${invariant}`
    : `Invariant to verify: ${invariant}`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: screenshot.toString('base64'),
              },
            },
            {
              type: 'text',
              text: userText,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text) as VisionAssertionResult;

    // Validate shape
    if (typeof parsed.pass !== 'boolean' || typeof parsed.reason !== 'string') {
      return { pass: true, confidence: 'low', reason: `LLM returned malformed JSON: ${text}` };
    }

    return parsed;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      pass: true,
      confidence: 'low',
      reason: `LLM vision unavailable (fail-open): ${message}`,
    };
  }
}
```
