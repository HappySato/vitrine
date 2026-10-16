import type { CartLine } from "@/lib/taste/score";

export type ChatHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatRequest = {
  shopperId: string;
  message: string;
  history: ChatHistoryTurn[];
  cart: CartLine[];
};

export type CheckoutRequest = {
  shopperId: string;
  lines: CartLine[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLines(value: unknown): CartLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines: CartLine[] = [];
  for (const entry of value.slice(0, 12)) {
    if (!isRecord(entry)) return null;
    if (typeof entry.productId !== "string") return null;
    if (typeof entry.quantity !== "number" || !Number.isInteger(entry.quantity)) return null;
    lines.push({ productId: entry.productId, quantity: entry.quantity });
  }
  return lines;
}

export function parseChatRequest(body: unknown): { ok: true; value: ChatRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Expected a JSON object." };
  if (typeof body.shopperId !== "string" || body.shopperId.length > 40) {
    return { ok: false, error: "shopperId is required." };
  }
  if (typeof body.message !== "string") return { ok: false, error: "message is required." };
  const message = body.message.trim();
  if (message.length < 1 || message.length > 1000) {
    return { ok: false, error: "Message must be between 1 and 1000 characters." };
  }
  const history: ChatHistoryTurn[] = [];
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) return { ok: false, error: "history must be an array." };
    for (const turn of body.history.slice(-8)) {
      if (!isRecord(turn)) continue;
      if ((turn.role !== "user" && turn.role !== "assistant") || typeof turn.content !== "string") {
        continue;
      }
      history.push({ role: turn.role, content: turn.content.slice(0, 2000) });
    }
  }
  const cart = parseLines(body.cart ?? []);
  if (!cart) return { ok: false, error: "cart must be a list of productId and quantity." };
  return { ok: true, value: { shopperId: body.shopperId, message, history, cart } };
}

export function parseCheckoutRequest(
  body: unknown,
): { ok: true; value: CheckoutRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: "Expected a JSON object." };
  if (typeof body.shopperId !== "string" || body.shopperId.length === 0) {
    return { ok: false, error: "shopperId is required." };
  }
  const lines = parseLines(body.lines);
  if (!lines) return { ok: false, error: "lines must be a list of productId and quantity." };
  return { ok: true, value: { shopperId: body.shopperId, lines } };
}
