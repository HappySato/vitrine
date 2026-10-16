import { centsToPaypal } from "@/lib/money";

export type PaymentLine = {
  sku: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

export type PaymentRequest = {
  lines: PaymentLine[];
  shopperName: string;
  reference: string;
};

export type PaymentResult = {
  provider: "mock" | "paypal-sandbox";
  mode: "sandbox";
  charged: false;
  orderId: string;
  status: "CREATED";
  amountCents: number;
  currency: "USD";
  approvalUrl: string | null;
  note: string;
};

export interface PaymentProvider {
  id: "mock" | "paypal-sandbox";
  label: string;
  note: string;
  createOrder(request: PaymentRequest): Promise<PaymentResult>;
}

const SANDBOX_HOSTS = new Set([
  "api-m.sandbox.paypal.com",
  "api.sandbox.paypal.com",
]);

export function assertPaypalSandboxBase(base: string): URL {
  const url = new URL(base);
  if (url.protocol !== "https:") {
    throw new Error("PayPal base URL must be https");
  }
  if (!SANDBOX_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing non-sandbox PayPal host ${url.hostname}. Vitrine never calls live PayPal.`,
    );
  }
  return url;
}

export function orderAmountCents(lines: PaymentLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

export function buildPaypalOrderBody(request: PaymentRequest) {
  const value = centsToPaypal(orderAmountCents(request.lines));
  return {
    intent: "CAPTURE" as const,
    purchase_units: [
      {
        reference_id: request.reference,
        description: `Northline Goods sandbox order for ${request.shopperName}`.slice(0, 127),
        amount: {
          currency_code: "USD",
          value,
          breakdown: {
            item_total: { currency_code: "USD", value },
          },
        },
        items: request.lines.map((line) => ({
          name: line.name.slice(0, 127),
          sku: line.sku,
          quantity: String(line.quantity),
          unit_amount: {
            currency_code: "USD",
            value: centsToPaypal(line.unitPriceCents),
          },
          category: "PHYSICAL_GOODS" as const,
        })),
      },
    ],
  };
}

type FetchLike = typeof fetch;

export function createMockPaymentProvider(note: string): PaymentProvider {
  return {
    id: "mock",
    label: "PayPal sandbox (mock)",
    note,
    async createOrder(request) {
      const amountCents = orderAmountCents(request.lines);
      return {
        provider: "mock",
        mode: "sandbox",
        charged: false,
        orderId: `SANDBOX-MOCK-${request.reference}`,
        status: "CREATED",
        amountCents,
        currency: "USD",
        approvalUrl: null,
        note,
      };
    },
  };
}

export function createPaypalSandboxProvider(options: {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  fetchImpl?: FetchLike;
}): PaymentProvider {
  const base = assertPaypalSandboxBase(options.baseUrl);
  const origin = `${base.protocol}//${base.host}`;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    id: "paypal-sandbox",
    label: "PayPal sandbox",
    note: "Orders are created on PayPal sandbox and never captured.",
    async createOrder(request) {
      assertPaypalSandboxBase(origin);
      const tokenResponse = await fetchImpl(`${origin}/v1/oauth2/token`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${options.clientId}:${options.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(15000),
      });
      if (!tokenResponse.ok) {
        throw new Error(`PayPal sandbox auth failed (${tokenResponse.status})`);
      }
      const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
      if (!tokenPayload.access_token) {
        throw new Error("PayPal sandbox auth returned no access token");
      }

      const orderResponse = await fetchImpl(`${origin}/v2/checkout/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPaypalOrderBody(request)),
        signal: AbortSignal.timeout(15000),
      });
      if (!orderResponse.ok) {
        throw new Error(`PayPal sandbox order failed (${orderResponse.status})`);
      }
      const order = (await orderResponse.json()) as {
        id?: string;
        links?: { href?: string; rel?: string }[];
      };
      if (!order.id) throw new Error("PayPal sandbox order returned no id");
      const approval =
        order.links?.find((link) => link.rel === "approve")?.href ?? null;

      return {
        provider: "paypal-sandbox",
        mode: "sandbox",
        charged: false,
        orderId: order.id,
        status: "CREATED",
        amountCents: orderAmountCents(request.lines),
        currency: "USD",
        approvalUrl: approval,
        note: "Sandbox order created. Vitrine does not capture payment, so nothing is charged.",
      };
    },
  };
}
