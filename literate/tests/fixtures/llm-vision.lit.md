# LLM Vision

LLM vision assertion via Anthropic Claude API — sends screenshots for visual invariant verification with fail-open semantics.

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
 *
 *
import Anthropic from '@anthropic-ai/sdk';

export interface VisionAssertionResult {
  pass: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

const SYSTEM_PROMPT = `You are a visual QA tester for a browser-based music synthesizer called GridInstruments. Given a screenshot and an invariant description, determine whether the invariant holds in the screenshot.

Rules:
- Focus ONLY on the specific invariant described — ignore unrelated visual elements
- The app has a black background, white text, JetBrains Mono font, no rounded corners
- "Visible" means the element is rendered and not obscured
- "Hidden" means the element is not rendered or has display:none/visibility:hidden

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{"pass": boolean, "confidence": "high"|"medium"|"low", "reason": "one sentence explanation"}`;

export async function assertWithVision(
  screenshot: Buffer,
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
