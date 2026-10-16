import { connection } from "next/server";
import { readAppConfig } from "@/lib/config";
import { quoteCart } from "@/lib/checkout";
import { reserveOrder, stockSnapshot } from "@/lib/floor-state";
import { parseCheckoutRequest } from "@/lib/requests";
import { shopperById } from "@/lib/shoppers";

export async function POST(request: Request) {
  await connection();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }
  const parsed = parseCheckoutRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const shopper = shopperById(parsed.value.shopperId);
  if (!shopper) return Response.json({ error: "Unknown shopper." }, { status: 400 });

  const preview = quoteCart(parsed.value.lines, stockSnapshot());
  if (!preview.ok) return Response.json({ error: preview.error }, { status: 400 });

  const config = readAppConfig();
  let payment;
  try {
    payment = await config.payment.createOrder({
      shopperName: shopper.name,
      reference: crypto.randomUUID(),
      lines: preview.lines.map((line) => ({
        sku: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed.";
    return Response.json({ error: message }, { status: 502 });
  }

  if (payment.charged !== false || payment.mode !== "sandbox") {
    return Response.json(
      { error: "Refusing a checkout result that is not an uncaptured sandbox order." },
      { status: 502 },
    );
  }

  const reserved = reserveOrder({
    lines: parsed.value.lines,
    shopperName: shopper.name,
    provider: payment.provider,
    paypalOrderId: payment.orderId,
    approvalUrl: payment.approvalUrl,
    note: payment.note,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });

  if (!reserved.ok) {
    return Response.json(
      {
        error: `${reserved.error} A sandbox order was created (${payment.orderId}) but the shelf did not change.`,
        payment,
      },
      { status: 409 },
    );
  }

  return Response.json({
    order: reserved.order,
    stock: stockSnapshot(),
    payment: {
      provider: payment.provider,
      mode: payment.mode,
      charged: payment.charged,
      note: payment.note,
    },
  });
}
