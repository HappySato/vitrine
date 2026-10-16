import type { AppEnv } from "@/lib/env";

export const AMD_BADGE = "Served on AMD MI300X via vLLM/ROCm";

export type BackendId = "amd-mi300x" | "openai-compatible" | "local-planner";

export type BackendInfo = {
  id: BackendId;
  label: string;
  model: string | null;
  host: string | null;
  usedFallback: boolean;
  detail: string | null;
};

export type LlmConfig = {
  mode: BackendId;
  baseUrl: string | null;
  model: string | null;
  apiKey: string | null;
  timeoutMs: number;
  allowFallback: boolean;
  host: string | null;
  configuredLabel: string;
};

function read(env: AppEnv, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeOpenAiBase(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("LLM base URL must be http or https");
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (path === "" || path === "/") {
    url.pathname = "/v1";
  } else {
    url.pathname = path;
  }
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

export function resolveLlm(env: AppEnv): LlmConfig {
  const requested = (read(env, "LLM_BACKEND") ?? "auto").toLowerCase();
  const rawBase = read(env, "LLM_BASE_URL");
  const model = read(env, "LLM_MODEL") ?? null;
  const apiKey = read(env, "LLM_API_KEY") ?? null;
  const timeoutMs = Math.min(
    180000,
    Math.max(3000, Number(read(env, "LLM_TIMEOUT_MS") ?? "60000") || 60000),
  );
  const allowFallback = (read(env, "LLM_FALLBACK") ?? "on").toLowerCase() !== "off";

  let baseUrl: string | null = null;
  let host: string | null = null;
  if (rawBase) {
    baseUrl = normalizeOpenAiBase(rawBase);
    host = new URL(baseUrl).host;
  }

  if (requested === "amd-mi300x") {
    if (!baseUrl) {
      return {
        mode: "local-planner",
        baseUrl: null,
        model,
        apiKey,
        timeoutMs,
        allowFallback,
        host: null,
        configuredLabel: "Local planner — LLM_BACKEND=amd-mi300x but LLM_BASE_URL is empty",
      };
    }
    return {
      mode: "amd-mi300x",
      baseUrl,
      model: model ?? "Qwen/Qwen2.5-7B-Instruct",
      apiKey,
      timeoutMs,
      allowFallback,
      host,
      configuredLabel: "AMD MI300X via vLLM/ROCm",
    };
  }

  if (!baseUrl || requested === "local") {
    return {
      mode: "local-planner",
      baseUrl: null,
      model,
      apiKey,
      timeoutMs,
      allowFallback,
      host: null,
      configuredLabel: "Local planner — no GPU endpoint configured",
    };
  }

  return {
    mode: "openai-compatible",
    baseUrl,
    model: model ?? "local-model",
    apiKey,
    timeoutMs,
    allowFallback,
    host,
    configuredLabel: "OpenAI-compatible endpoint",
  };
}

export function successBackend(config: LlmConfig): BackendInfo {
  if (config.mode === "amd-mi300x") {
    return {
      id: "amd-mi300x",
      label: AMD_BADGE,
      model: config.model,
      host: config.host,
      usedFallback: false,
      detail: null,
    };
  }
  return {
    id: "openai-compatible",
    label: "Served by an OpenAI-compatible endpoint",
    model: config.model,
    host: config.host,
    usedFallback: false,
    detail: null,
  };
}

export function localBackend(detail: string, config?: LlmConfig, usedFallback = false): BackendInfo {
  return {
    id: "local-planner",
    label: usedFallback
      ? "Local planner — the model endpoint did not answer"
      : "Local planner — no GPU endpoint configured",
    model: config?.model ?? null,
    host: config?.host ?? null,
    usedFallback,
    detail,
  };
}
