import type { AppEnv } from "@/lib/env";
import {
  localBackend,
  resolveLlm,
  successBackend,
  type BackendInfo,
  type LlmConfig,
} from "@/lib/llm/config";
import {
  acceptReply,
  buildModelMessages,
  parseAgentJson,
  type AgentReply,
} from "@/lib/llm/narrate";
import type { Product } from "@/lib/catalog";
import type { Shopper } from "@/lib/shoppers";
import type { CartLine, ScoredProduct } from "@/lib/taste/score";

type FetchLike = typeof fetch;

export async function narrateWithModel(input: {
  shopper: Shopper;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  shelf: ScoredProduct[];
  cart: CartLine[];
  catalog: Product[];
  env?: AppEnv;
  fetchImpl?: FetchLike;
  config?: LlmConfig;
}): Promise<{ reply: AgentReply; backend: BackendInfo } | { reply: null; backend: BackendInfo }> {
  const config = input.config ?? resolveLlm(input.env ?? process.env);
  if (config.mode === "local-planner" || !config.baseUrl || !config.model) {
    return {
      reply: null,
      backend: localBackend(config.configuredLabel, config, false),
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 450,
        messages: buildModelMessages(input),
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Model endpoint returned ${response.status}`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseAgentJson(text);
    if (!parsed) throw new Error("Model reply was not the expected JSON");
    const accepted = acceptReply(parsed, input.shelf, input.catalog);
    if (!accepted) throw new Error("Model reply named a product that is not on the shelf");
    return { reply: accepted, backend: successBackend(config) };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Model call failed";
    return {
      reply: null,
      backend: localBackend(detail, config, true),
    };
  }
}
