import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

/**
 * Thin wrapper around the Messages API for forced-tool-call structured output.
 *
 * Three things it exists to guarantee:
 *
 * - The transcript is sent as a cached prefix. Every scoring call needs the
 *   whole transcript, and on the 65k-character fixture that is ~16k tokens per
 *   call. Caching turns four full-price reads into one write and three reads at
 *   a tenth of the rate.
 * - The model id is recorded on every run, because "scores the same call the
 *   same way twice" is a requirement, not a nicety. (Sonnet 5 no longer
 *   accepts a `temperature` parameter — determinism here rests on the forced
 *   tool call and the model's own defaults, not on a temperature setting.)
 * - Transient API failures retry with backoff; everything else fails fast with
 *   a message a human can act on, rather than a spinner.
 */

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

let cached: Anthropic | null = null;

export function getClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ModelError(
      "missing_api_key",
      "ANTHROPIC_API_KEY is not set. The evaluator cannot score a call without a model key.",
    );
  }
  cached = new Anthropic({ apiKey, maxRetries: 0 });
  return cached;
}

export type ModelErrorCode =
  | "missing_api_key"
  | "rate_limited"
  | "overloaded"
  | "context_too_long"
  | "credit_exhausted"
  | "no_tool_call"
  | "invalid_output"
  | "api_error";

/** An error carrying a code the run page can turn into a specific explanation. */
export class ModelError extends Error {
  constructor(
    readonly code: ModelErrorCode,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ModelError";
  }
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export const ZERO_USAGE: Usage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}

/**
 * Rough cost in USD, for the run page.
 *
 * Published Sonnet rates. Cache writes bill at 1.25x input, cache reads at
 * 0.1x. Shown so the operator can see what a run costs rather than discovering
 * it on an invoice.
 */
export function estimateCostUsd(u: Usage): number {
  const IN = 3 / 1_000_000;
  const OUT = 15 / 1_000_000;
  return (
    u.inputTokens * IN +
    u.outputTokens * OUT +
    u.cacheCreationTokens * IN * 1.25 +
    u.cacheReadTokens * IN * 0.1
  );
}

export interface ToolCallOptions<T> {
  system: string;
  /**
   * Large, stable content placed before the cache breakpoint — the transcript.
   * Must be byte-identical across calls in a run for the cache to hit.
   */
  cachedPrefix: string;
  /** Per-call instructions, after the breakpoint. */
  instructions: string;
  tool: { name: string; description: string; input_schema: object };
  schema: ZodType<T>;
  maxTokens?: number;
  /** Retries for overload/rate-limit only. */
  attempts?: number;
}

export interface ToolCallResult<T> {
  value: T;
  usage: Usage;
  model: string;
}

function classify(err: unknown): ModelError {
  const status = (err as { status?: number })?.status;
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (status === 429 || msg.includes("rate_limit")) {
    return new ModelError("rate_limited", "The model API rate-limited this run.", err);
  }
  if (status === 529 || msg.includes("overloaded")) {
    return new ModelError("overloaded", "The model API is overloaded.", err);
  }
  if (msg.includes("credit balance") || msg.includes("insufficient")) {
    return new ModelError(
      "credit_exhausted",
      "The Anthropic account has no remaining credit, so this call could not be scored.",
      err,
    );
  }
  if (msg.includes("prompt is too long") || msg.includes("context")) {
    return new ModelError(
      "context_too_long",
      "The transcript is longer than the model's context window.",
      err,
    );
  }
  return new ModelError("api_error", `Model API error: ${raw}`, err);
}

// `invalid_output` and `no_tool_call` are included here even though they are
// not transport failures: an isolated malformed tool call is a formatting
// hiccup, not a scoring disagreement, and the other concurrent calls with
// byte-identical instructions routinely succeed. Retrying costs one call,
// against a run that would otherwise be thrown away entirely.
const RETRYABLE: ReadonlySet<ModelErrorCode> = new Set([
  "rate_limited",
  "overloaded",
  "api_error",
  "invalid_output",
  "no_tool_call",
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function callTool<T>(opts: ToolCallOptions<T>): Promise<ToolCallResult<T>> {
  const client = getClient();
  const attempts = opts.attempts ?? 3;
  let last: ModelError | null = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: opts.maxTokens ?? 8000,
        system: opts.system,
        tools: [opts.tool as never],
        tool_choice: { type: "tool", name: opts.tool.name },
        messages: [
          {
            role: "user",
            content: [
              // Everything up to and including this block is the cache prefix.
              {
                type: "text",
                text: opts.cachedPrefix,
                cache_control: { type: "ephemeral" },
              } as never,
              { type: "text", text: opts.instructions },
            ],
          },
        ],
      });

      const usage: Usage = {
        inputTokens: res.usage.input_tokens ?? 0,
        outputTokens: res.usage.output_tokens ?? 0,
        cacheCreationTokens: res.usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: res.usage.cache_read_input_tokens ?? 0,
      };

      const block = res.content.find((c) => c.type === "tool_use");
      if (!block || block.type !== "tool_use") {
        throw new ModelError(
          "no_tool_call",
          "The model returned prose instead of the required structured output.",
        );
      }

      const parsed = opts.schema.safeParse(block.input);
      if (!parsed.success) {
        throw new ModelError(
          "invalid_output",
          `The model's output did not match the expected shape: ${parsed.error.issues
            .slice(0, 3)
            .map((i) => `${i.path.join(".")} ${i.message}`)
            .join("; ")}`,
        );
      }

      return { value: parsed.data, usage, model: DEFAULT_MODEL };
    } catch (err) {
      const e = err instanceof ModelError ? err : classify(err);
      last = e;
      if (!RETRYABLE.has(e.code) || attempt === attempts) throw e;
      await sleep(Math.min(1000 * 2 ** (attempt - 1), 8000) + Math.random() * 400);
    }
  }

  throw last ?? new ModelError("api_error", "Model call failed for an unknown reason.");
}
