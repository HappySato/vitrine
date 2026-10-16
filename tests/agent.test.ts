import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog";
import { SHOPPERS } from "@/lib/shoppers";
import { AMD_BADGE, normalizeOpenAiBase, resolveLlm, successBackend } from "@/lib/llm/config";
import { acceptReply, narrateLocally, parseAgentJson } from "@/lib/llm/narrate";
import { narrateWithModel } from "@/lib/llm/client";
import { runTurn } from "@/lib/agent";
import { affinitiesFromSignals } from "@/lib/taste/graph";
import { scoreCatalog } from "@/lib/taste/score";

const amina = SHOPPERS[0];

describe("model endpoint", () => {
  it("stays on the local planner when no endpoint is configured", () => {
    const config = resolveLlm({});
    expect(config.mode).toBe("local-planner");
    expect(config.baseUrl).toBeNull();
  });

  it("labels a configured MI300X endpoint with the AMD badge only after a successful call", () => {
    const config = resolveLlm({
      LLM_BACKEND: "amd-mi300x",
      LLM_BASE_URL: "http://10.0.0.8:8000/v1",
      LLM_MODEL: "Qwen/Qwen2.5-7B-Instruct",
    });
    expect(config.mode).toBe("amd-mi300x");
    expect(config.host).toBe("10.0.0.8:8000");
    expect(successBackend(config).label).toBe(AMD_BADGE);
    expect(successBackend(config).label).toBe("Served on AMD MI300X via vLLM/ROCm");
  });

  it("does not claim MI300X for a generic OpenAI-compatible URL", () => {
    const config = resolveLlm({ LLM_BASE_URL: "http://127.0.0.1:11434/v1", LLM_MODEL: "llama3.1" });
    expect(config.mode).toBe("openai-compatible");
    expect(successBackend(config).label).not.toContain("MI300X");
  });

  it("refuses to pretend an empty AMD URL is already serving", () => {
    const config = resolveLlm({ LLM_BACKEND: "amd-mi300x" });
    expect(config.mode).toBe("local-planner");
    expect(config.configuredLabel).toMatch(/LLM_BASE_URL/);
  });

  it("normalizes a host root to the /v1 prefix", () => {
    expect(normalizeOpenAiBase("http://gpu.internal:8000")).toBe("http://gpu.internal:8000/v1");
    expect(normalizeOpenAiBase("http://gpu.internal:8000/v1/")).toBe("http://gpu.internal:8000/v1");
  });

  it("keeps the local planner inside the shelf it was given", () => {
    const shelf = scoreCatalog(affinitiesFromSignals(amina.signals)).slice(0, 2);
    const reply = narrateLocally({
      shopper: amina,
      message: "What should we set aside?",
      shelf,
      cart: [],
      catalog: CATALOG,
    });
    const allowed = new Set(shelf.map((item) => item.product.name.toLowerCase()));
    for (const product of CATALOG) {
      if (allowed.has(product.name.toLowerCase())) continue;
      expect(reply.say.toLowerCase()).not.toContain(product.name.toLowerCase());
    }
    expect(reply.offer.every((id) => shelf.some((item) => item.product.id === id))).toBe(true);
  });

  it("drops invented offer ids and rejects a product that is not on the shelf", () => {
    const shelf = scoreCatalog(affinitiesFromSignals(amina.signals)).filter(
      (item) => item.product.id !== "open-back",
    );
    const parsed = parseAgentJson(
      'Sure ```json\n{"say":"Set aside the Berbere stoneware bowl.","offer":["berbere-bowl","not-a-sku"]}\n```',
    );
    expect(parsed?.say).toMatch(/Berbere stoneware bowl/);
    const accepted = acceptReply(parsed!, shelf, CATALOG);
    expect(accepted?.offer).toEqual(["berbere-bowl"]);
    expect(
      acceptReply(
        { say: "Add the Walnut open-back headphones.", offer: [] },
        shelf,
        CATALOG,
      ),
    ).toBeNull();
  });

  it("uses the AMD badge when the endpoint returns grounded JSON", async () => {
    const shelf = scoreCatalog(affinitiesFromSignals(amina.signals));
    const env = {
      LLM_BACKEND: "amd-mi300x",
      LLM_BASE_URL: "http://10.0.0.8:8000/v1",
      LLM_MODEL: "Qwen/Qwen2.5-7B-Instruct",
    };
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  say: "For Amina, set aside the Éthiopiques No. 4 reissue at $32. It shares Ethiopian jazz with Mulatu Astatke.",
                  offer: ["ethiopiques"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;

    const result = await narrateWithModel({
      shopper: amina,
      message: "A gift under $80 that feels like her records.",
      history: [],
      shelf,
      cart: [],
      catalog: CATALOG,
      env,
      fetchImpl,
    });
    expect(result.reply?.offer).toEqual(["ethiopiques"]);
    expect(result.backend.label).toBe("Served on AMD MI300X via vLLM/ROCm");
    expect(result.backend.usedFallback).toBe(false);
  });

  it("does not badge a failed AMD call as served on MI300X", async () => {
    const turn = await runTurn({
      shopper: amina,
      message: "A gift under $80 that feels like her records.",
      history: [],
      cart: [],
      env: {
        LLM_BACKEND: "amd-mi300x",
        LLM_BASE_URL: "http://10.0.0.8:8000/v1",
        LLM_MODEL: "Qwen/Qwen2.5-7B-Instruct",
        LLM_TIMEOUT_MS: "3000",
      },
      fetchImpl: (async () => {
        throw new Error("connect ECONNREFUSED");
      }) as typeof fetch,
    });
    expect(turn.backend.id).toBe("local-planner");
    expect(turn.backend.usedFallback).toBe(true);
    expect(turn.backend.label).not.toContain("Served on AMD");
    expect(turn.say.toLowerCase()).toContain("éthiopiques");
  });

  it("answers from the local planner with no endpoint and no network", async () => {
    let called = false;
    const turn = await runTurn({
      shopper: amina,
      message: "What belongs with the bowl?",
      history: [],
      cart: [],
      env: {},
      fetchImpl: (async () => {
        called = true;
        throw new Error("should not be called");
      }) as typeof fetch,
    });
    expect(called).toBe(false);
    expect(turn.backend.id).toBe("local-planner");
    expect(turn.backend.label).not.toContain("MI300X");
    expect(turn.offer.length).toBeGreaterThan(0);
  });
});
