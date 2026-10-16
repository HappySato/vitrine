import { money } from "@/lib/money";
import type { Product } from "@/lib/catalog";
import type { Shopper } from "@/lib/shoppers";
import type { CartLine, ScoredProduct } from "@/lib/taste/score";

export type AgentReply = {
  say: string;
  offer: string[];
};

export function checkoutIntent(message: string): boolean {
  return /\b(check\s?out|paypal|pay\b|buy|the bag|ring (it|this) up)\b/i.test(message);
}

export function narrateLocally(input: {
  shopper: Shopper;
  message: string;
  shelf: ScoredProduct[];
  cart: CartLine[];
  catalog: Product[];
}): AgentReply {
  const who = input.shopper.name.split(" ")[0] ?? input.shopper.name;
  const available = input.shelf.filter((item) => item.inStock);
  const top = available[0];
  const next = available[1];

  if (checkoutIntent(input.message)) {
    if (input.cart.length === 0 || !top) {
      if (!top) {
        return {
          say: `The bag is empty, and nothing in stock fits ${who} for that request.`,
          offer: [],
        };
      }
      return {
        say: `The bag is empty. For ${who}, set aside the ${top.product.name} at ${money(top.product.priceCents)}. ${top.because ?? ""}`.trim(),
        offer: [top.product.id],
      };
    }
    const names = input.cart
      .map((line) => {
        const product = input.catalog.find((item) => item.id === line.productId);
        return product ? `${line.quantity} × ${product.name}` : line.productId;
      })
      .join(", ");
    const total = input.cart.reduce((sum, line) => {
      const product = input.catalog.find((item) => item.id === line.productId);
      return sum + (product ? product.priceCents * line.quantity : 0);
    }, 0);
    return {
      say: `${who}'s bag is ${money(total)}: ${names}. Open sandbox checkout when you are ready. Vitrine creates the order and does not capture funds.`,
      offer: [],
    };
  }

  if (!top) {
    return {
      say: `Nothing in stock fits ${who} for that. Restock the floor, or widen the budget.`,
      offer: [],
    };
  }

  if (!next) {
    return {
      say: `For ${who}, set aside the ${top.product.name} (${money(top.product.priceCents)}). ${top.because ?? ""}`.trim(),
      offer: [top.product.id],
    };
  }

  const together = top.product.priceCents + next.product.priceCents;
  return {
    say: `For ${who}, set aside the ${top.product.name} (${money(top.product.priceCents)}). ${top.because ?? ""} Pair it with the ${next.product.name} (${money(next.product.priceCents)}). ${next.because ?? ""} Together, ${money(together)}.`.replace(/\s+/g, " ").trim(),
    offer: [top.product.id, next.product.id],
  };
}

export function buildModelMessages(input: {
  shopper: Shopper;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  shelf: ScoredProduct[];
  cart: CartLine[];
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const shelf = input.shelf
    .filter((item) => item.inStock)
    .slice(0, 6)
    .map(
      (item) =>
        `- ${item.product.id} | ${item.product.name} | ${money(item.product.priceCents)} | stock ${item.product.stock} | fit ${item.tasteFit.toFixed(2)} | ${item.because ?? "no taste path"}`,
    )
    .join("\n");
  const cart =
    input.cart.length === 0
      ? "empty"
      : input.cart.map((line) => `${line.productId} x${line.quantity}`).join(", ");

  const system = [
    "You are Vitrine, the floor agent at Northline Goods, a small shop.",
    "You speak to the clerk, not the customer. Be specific and brief.",
    "Use only products listed in SHELF. Never invent a product, a price, or a stock figure.",
    "Write 2 to 4 sentences in say. Name one or two products and their prices. Use the because path in your own words.",
    "If the clerk is ready to pay, tell them to open sandbox checkout and remind them that funds are not captured.",
    'Reply with JSON only: {"say":"...","offer":["product-id"]}',
    "offer lists product ids to set aside. Use an empty array if you are not suggesting new items.",
  ].join(" ");

  const user = [
    `Shopper: ${input.shopper.name}`,
    `Taste: ${input.shopper.signals.map((signal) => signal.name).join(", ")}`,
    `Cart: ${cart}`,
    "SHELF:",
    shelf || "(nothing in stock)",
    `Clerk: ${input.message}`,
  ].join("\n");

  const history = input.history.slice(-6).map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  return [
    { role: "system", content: system },
    ...history,
    { role: "user", content: user },
  ];
}

export function parseAgentJson(text: string): AgentReply | null {
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const payload = JSON.parse(stripped.slice(start, end + 1)) as {
      say?: unknown;
      offer?: unknown;
    };
    if (typeof payload.say !== "string" || payload.say.trim().length === 0) return null;
    const offer = Array.isArray(payload.offer)
      ? payload.offer.filter((id): id is string => typeof id === "string")
      : [];
    return { say: payload.say.trim(), offer };
  } catch {
    return null;
  }
}

export function acceptReply(
  reply: AgentReply,
  shelf: ScoredProduct[],
  catalog: Product[],
): AgentReply | null {
  const allowed = new Set(shelf.filter((item) => item.inStock).map((item) => item.product.id));
  const allowedNames = shelf
    .filter((item) => allowed.has(item.product.id))
    .map((item) => item.product.name.toLowerCase());
  const offer = reply.offer.filter((id) => allowed.has(id)).slice(0, 3);
  const say = reply.say.toLowerCase();
  for (const product of catalog) {
    if (allowed.has(product.id)) continue;
    const name = product.name.toLowerCase();
    if (!say.includes(name)) continue;
    const covered = allowedNames.some(
      (allowedName) => allowedName.includes(name) && say.includes(allowedName),
    );
    if (!covered) return null;
  }
  return { say: reply.say, offer };
}
