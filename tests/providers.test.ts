import { describe, expect, it } from "vitest";
import { readAppConfig } from "@/lib/config";
import { commitStock, initialStock, quoteCart } from "@/lib/checkout";
import {
  assertPaypalSandboxBase,
  buildPaypalOrderBody,
  createMockPaymentProvider,
  createPaypalSandboxProvider,
} from "@/lib/payments/provider";
import { parseChatRequest, parseCheckoutRequest } from "@/lib/requests";
import {
  affinitiesFromQlooEntities,
  assertQlooBase,
  buildQlooInsightsUrl,
  entitiesFromQlooPayload,
} from "@/lib/taste/provider";
import { SHOPPERS } from "@/lib/shoppers";

describe("providers", () => {
  it("refuses live PayPal hosts and plain http", () => {
    expect(() => assertPaypalSandboxBase("https://api-m.paypal.com")).toThrow(/Refusing/);
    expect(() => assertPaypalSandboxBase("https://api.paypal.com")).toThrow(/Refusing/);
    expect(() => assertPaypalSandboxBase("http://api-m.sandbox.paypal.com")).toThrow(/https/);
    expect(assertPaypalSandboxBase("https://api-m.sandbox.paypal.com").host).toBe(
      "api-m.sandbox.paypal.com",
    );
  });

  it("builds a sandbox order body and never describes a capture call", () => {
    const body = buildPaypalOrderBody({
      shopperName: "Amina Okonkwo",
      reference: "ref-1",
      lines: [
        { sku: "ethiopiques", name: "Éthiopiques No. 4 reissue", quantity: 1, unitPriceCents: 3200 },
        { sku: "berbere-bowl", name: "Berbere stoneware bowl", quantity: 1, unitPriceCents: 4800 },
      ],
    });
    expect(body.intent).toBe("CAPTURE");
    expect(body.purchase_units[0]?.amount.value).toBe("80.00");
    expect(JSON.stringify(body)).not.toContain("/capture");
  });

  it("mock checkout never leaves the process and never charges", async () => {
    const provider = createMockPaymentProvider("Mock sandbox. Nothing is charged.");
    const result = await provider.createOrder({
      shopperName: "Amina Okonkwo",
      reference: "abc",
      lines: [{ sku: "ethiopiques", name: "Éthiopiques No. 4 reissue", quantity: 1, unitPriceCents: 3200 }],
    });
    expect(result.charged).toBe(false);
    expect(result.mode).toBe("sandbox");
    expect(result.provider).toBe("mock");
    expect(result.orderId).toBe("SANDBOX-MOCK-abc");
    expect(result.approvalUrl).toBeNull();
  });

  it("creates a PayPal sandbox order without calling capture", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/v1/oauth2/token")) {
        return new Response(JSON.stringify({ access_token: "sandbox-token" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          id: "5O190127TN364715T",
          status: "CREATED",
          links: [{ rel: "approve", href: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T" }],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const provider = createPaypalSandboxProvider({
      clientId: "client",
      clientSecret: "secret",
      baseUrl: "https://api-m.sandbox.paypal.com",
      fetchImpl,
    });
    const result = await provider.createOrder({
      shopperName: "Sable Chen",
      reference: "ref-2",
      lines: [{ sku: "bauhaus-poster", name: "1923 Bauhaus poster, reprint", quantity: 1, unitPriceCents: 3600 }],
    });
    expect(result.charged).toBe(false);
    expect(result.orderId).toBe("5O190127TN364715T");
    expect(result.approvalUrl).toContain("sandbox.paypal.com");
    expect(calls.every((url) => url.startsWith("https://api-m.sandbox.paypal.com"))).toBe(true);
    expect(calls.some((url) => url.endsWith("/capture") || url.includes("/capture"))).toBe(false);
  });

  it("refuses a live PayPal base URL before any request", async () => {
    expect(() =>
      createPaypalSandboxProvider({
        clientId: "client",
        clientSecret: "secret",
        baseUrl: "https://api-m.paypal.com",
        fetchImpl: (async () => {
          throw new Error("network should not be used");
        }) as typeof fetch,
      }),
    ).toThrow(/Refusing/);

    const config = readAppConfig({
      PAYMENT_PROVIDER: "paypal-sandbox",
      PAYPAL_CLIENT_ID: "client",
      PAYPAL_CLIENT_SECRET: "secret",
      PAYPAL_BASE_URL: "https://api-m.paypal.com",
    });
    await expect(
      config.payment.createOrder({
        shopperName: "Leo Park",
        reference: "nope",
        lines: [{ sku: "night-rain", name: "Cassette", quantity: 1, unitPriceCents: 1800 }],
      }),
    ).rejects.toThrow(/Refusing/);
  });

  it("uses the local taste graph when the Qloo key is missing", () => {
    const config = readAppConfig({ TASTE_PROVIDER: "qloo" });
    expect(config.taste.id).toBe("mock");
    expect(config.tasteNote).toMatch(/QLOO_API_KEY/);
  });

  it("refuses unexpected Qloo hosts and maps insight entities onto shelf tags", () => {
    expect(() => assertQlooBase("https://evil.example/v2")).toThrow(/Refusing/);
    expect(() => assertQlooBase("http://hackathon.api.qloo.com")).toThrow(/https/);
    const insights = buildQlooInsightsUrl(
      "https://hackathon.api.qloo.com",
      ["abc", "def"],
      "urn:entity:brand",
    );
    expect(insights).toContain("filter.type=urn%3Aentity%3Abrand");
    expect(insights).toContain("signal.interests.entities=abc%2Cdef");

    const entities = entitiesFromQlooPayload({
      results: {
        entities: [{ name: "Mulatu Astatke", entity_id: "abc", tags: [{ name: "ethiopian jazz" }] }],
      },
    });
    const affinities = affinitiesFromQlooEntities(entities, SHOPPERS[0].signals);
    expect(affinities.some((affinity) => affinity.tag === "jazz" || affinity.tag === "ethiopian")).toBe(
      true,
    );
    expect(affinities.some((affinity) => affinity.source === "qloo")).toBe(true);
  });

  it("quotes from the catalog price and refuses an oversell without mutating stock", () => {
    const stock = initialStock();
    const before = stock.ethiopiques;
    const over = quoteCart([{ productId: "ethiopiques", quantity: 9 }], stock);
    expect(over.ok).toBe(false);
    const quote = quoteCart([{ productId: "ethiopiques", quantity: 2 }], stock);
    expect(quote.ok).toBe(true);
    if (quote.ok) expect(quote.totalCents).toBe(6400);
    const committed = commitStock(stock, [{ productId: "ethiopiques", quantity: 2 }]);
    expect(committed.ok).toBe(true);
    if (committed.ok) expect(committed.stock.ethiopiques).toBe(before - 2);
    expect(stock.ethiopiques).toBe(before);
    expect(quoteCart([{ productId: "not-real", quantity: 1 }], stock).ok).toBe(false);
  });

  it("rejects a chat body without a message and accepts a checkout body", () => {
    expect(parseChatRequest({ shopperId: "amina", cart: [] }).ok).toBe(false);
    const chat = parseChatRequest({
      shopperId: "amina",
      message: "  A gift under $80  ",
      cart: [{ productId: "ethiopiques", quantity: 1 }],
      history: [{ role: "user", content: "hello" }, { role: "nope", content: "skip" }],
    });
    expect(chat.ok).toBe(true);
    if (chat.ok) {
      expect(chat.value.message).toBe("A gift under $80");
      expect(chat.value.history).toHaveLength(1);
    }
    const checkout = parseCheckoutRequest({
      shopperId: "sable",
      lines: [{ productId: "bauhaus-poster", quantity: 1 }],
    });
    expect(checkout.ok).toBe(true);
  });
});
