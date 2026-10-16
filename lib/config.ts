import type { AppEnv } from "@/lib/env";
import { resolveLlm, type LlmConfig } from "@/lib/llm/config";
import {
  createMockPaymentProvider,
  createPaypalSandboxProvider,
  type PaymentProvider,
} from "@/lib/payments/provider";
import {
  createMockProvider,
  createQlooProvider,
  type TasteProvider,
} from "@/lib/taste/provider";

function read(env: AppEnv, key: string): string | undefined {
  const value = env[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export type AppConfig = {
  llm: LlmConfig;
  taste: TasteProvider;
  tasteNote: string;
  payment: PaymentProvider;
  paymentNote: string;
};

export function readAppConfig(
  env: AppEnv = process.env,
  deps?: { fetchImpl?: typeof fetch },
): AppConfig {
  const tasteChoice = (read(env, "TASTE_PROVIDER") ?? "mock").toLowerCase();
  const qlooKey = read(env, "QLOO_API_KEY");
  const qlooBase = read(env, "QLOO_BASE_URL") ?? "https://hackathon.api.qloo.com";
  let taste: TasteProvider;
  let tasteNote: string;
  if (tasteChoice === "qloo" && qlooKey) {
    taste = createQlooProvider({
      apiKey: qlooKey,
      baseUrl: qlooBase,
      fetchImpl: deps?.fetchImpl,
    });
    tasteNote = "Qloo Insights is configured. If a call fails, the floor uses the local taste graph.";
  } else if (tasteChoice === "qloo") {
    taste = createMockProvider("TASTE_PROVIDER=qloo but QLOO_API_KEY is empty, so the local taste graph is in use.");
    tasteNote = "TASTE_PROVIDER=qloo but QLOO_API_KEY is empty, so the local taste graph is in use.";
  } else {
    taste = createMockProvider("Local taste graph. Set TASTE_PROVIDER=qloo and QLOO_API_KEY to call Qloo.");
    tasteNote = "Local taste graph. Set TASTE_PROVIDER=qloo and QLOO_API_KEY to call Qloo.";
  }

  const paymentChoice = (read(env, "PAYMENT_PROVIDER") ?? "mock").toLowerCase();
  const paypalBase = read(env, "PAYPAL_BASE_URL") ?? "https://api-m.sandbox.paypal.com";
  const clientId = read(env, "PAYPAL_CLIENT_ID");
  const clientSecret = read(env, "PAYPAL_CLIENT_SECRET");
  let payment: PaymentProvider;
  let paymentNote: string;
  if (paymentChoice === "paypal-sandbox" && clientId && clientSecret) {
    try {
      payment = createPaypalSandboxProvider({
        clientId,
        clientSecret,
        baseUrl: paypalBase,
        fetchImpl: deps?.fetchImpl,
      });
      paymentNote = "PayPal sandbox credentials are set. Orders are created and never captured.";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "PayPal configuration was refused.";
      paymentNote = message;
      payment = {
        id: "paypal-sandbox",
        label: "PayPal sandbox",
        note: message,
        async createOrder() {
          throw new Error(message);
        },
      };
    }
  } else if (paymentChoice === "paypal-sandbox") {
    paymentNote =
      "PAYMENT_PROVIDER=paypal-sandbox but the client id or secret is missing, so checkout stays on the mock sandbox.";
    payment = createMockPaymentProvider(paymentNote);
  } else {
    paymentNote =
      "Mock sandbox. No call leaves the app, and nothing is charged. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET with PAYMENT_PROVIDER=paypal-sandbox to create a real sandbox order.";
    payment = createMockPaymentProvider(paymentNote);
  }

  return {
    llm: resolveLlm(env),
    taste,
    tasteNote,
    payment,
    paymentNote,
  };
}
