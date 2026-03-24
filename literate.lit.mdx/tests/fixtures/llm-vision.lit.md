# LLM Vision

LLM vision assertion via any OpenAI-compatible vision API — sends screenshots for visual invariant verification with fail-open semantics. Provider-agnostic: works with local models (ollama, llama.cpp), Anthropic, OpenAI, or any `/v1/chat/completions` endpoint.

Configure via environment variables:
- `LLM_VISION_URL` — base URL (default: `https://api.anthropic.com` if `ANTHROPIC_API_KEY` set, else `http://localhost:11434` for ollama)
- `LLM_VISION_KEY` — API key (falls back to `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`)
- `LLM_VISION_MODEL` — model name (default: auto-detected from provider)

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
export interface VisionAssertionResult {
  pass: boolean;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

function getConfig(): { url: string; key: string; model: string; isAnthropic: boolean } {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? '';
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  const key = process.env.LLM_VISION_KEY ?? anthropicKey ?? openaiKey ?? '';
  const isAnthropic = Boolean(anthropicKey) && !process.env.LLM_VISION_URL;
  const url = process.env.LLM_VISION_URL
    ?? (anthropicKey ? 'https://api.anthropic.com' : (openaiKey ? 'https://api.openai.com' : 'http://localhost:11434'));
  const model = process.env.LLM_VISION_MODEL
    ?? (isAnthropic ? 'claude-sonnet-4-20250514' : (openaiKey ? 'gpt-4o' : 'llava'));
  return { url, key, model, isAnthropic };
}
```

The system prompt instructs the model to evaluate a single visual invariant and return structured JSON.

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
const SYSTEM_PROMPT = `You are a visual QA tester for a browser-based music synthesizer called GridInstruments. Given a screenshot and an invariant description, determine whether the invariant holds in the screenshot.

Rules:
- Focus ONLY on the specific invariant described — ignore unrelated visual elements
- The app has a black background, white text, JetBrains Mono font, no rounded corners
- "Visible" means the element is rendered and not obscured
- "Hidden" means the element is not rendered or has display:none/visibility:hidden

Respond with ONLY valid JSON (no markdown, no explanation outside JSON):
{"pass": boolean, "confidence": "high"|"medium"|"low", "reason": "one sentence explanation"}`;
```

The exported function sends the screenshot and invariant text via the OpenAI-compatible chat completions API (or Anthropic messages API), returning a fail-open result if unavailable.

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
export async function assertWithVision(
  screenshot: Buffer,
  invariant: string,
  context?: string,
): Promise<VisionAssertionResult> {
  const userText = context
    ? `State context: ${context}\n\nInvariant to verify: ${invariant}`
    : `Invariant to verify: ${invariant}`;
  const base64 = screenshot.toString('base64');
  const config = getConfig();

  try {
    let text: string;
    if (config.isAnthropic) {
      const res = await fetch(`${config.url}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': config.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: config.model, max_tokens: 300, system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
            { type: 'text', text: userText },
          ]}],
        }),
      });
      const json = await res.json() as { content: { type: string; text: string }[] };
      text = json.content[0].type === 'text' ? json.content[0].text : '';
    } else {
      const res = await fetch(`${config.url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(config.key ? { 'Authorization': `Bearer ${config.key}` } : {}) },
        body: JSON.stringify({
          model: config.model, max_tokens: 300,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: [
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
              { type: 'text', text: userText },
            ]},
          ],
        }),
      });
      const json = await res.json() as { choices: { message: { content: string } }[] };
      text = json.choices[0].message.content;
    }
```

After the API call, the response text is parsed as JSON. Malformed responses return a fail-open result with `confidence: 'low'` rather than throwing, and any network or API error also returns fail-open so a missing API key never blocks the test suite.

``` {.typescript file=_generated/tests/fixtures/llm-vision.ts}
    const parsed = JSON.parse(text) as unknown as VisionAssertionResult;

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
