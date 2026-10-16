import { CATALOG, type Product } from "@/lib/catalog";
import { commitStock, initialStock, quoteCart } from "@/lib/checkout";
import type { CartLine } from "@/lib/taste/score";

export type LedgerOrder = {
  id: string;
  createdAt: string;
  shopperName: string;
  lines: {
    productId: string;
    name: string;
    quantity: number;
    lineCents: number;
  }[];
  totalCents: number;
  grossMarginCents: number;
  provider: "mock" | "paypal-sandbox";
  paypalOrderId: string;
  charged: false;
  approvalUrl: string | null;
  note: string;
};

const state = {
  stock: initialStock(),
  orders: [] as LedgerOrder[],
};

export function stockSnapshot(): Record<string, number> {
  return { ...state.stock };
}

export function listOrders(): LedgerOrder[] {
  return state.orders.map((order) => ({ ...order, lines: order.lines.map((line) => ({ ...line })) }));
}

export function resetFloor(): void {
  state.stock = initialStock();
  state.orders = [];
}

export function catalogWithStock(): Product[] {
  const stock = state.stock;
  return CATALOG.map((product) => ({
    ...product,
    stock: stock[product.id] ?? 0,
  }));
}

export function reserveOrder(input: {
  lines: CartLine[];
  shopperName: string;
  provider: LedgerOrder["provider"];
  paypalOrderId: string;
  approvalUrl: string | null;
  note: string;
  id: string;
  createdAt: string;
}): { ok: true; order: LedgerOrder } | { ok: false; error: string } {
  const quote = quoteCart(input.lines, state.stock);
  if (!quote.ok) return quote;
  const committed = commitStock(state.stock, input.lines);
  if (!committed.ok) return committed;
  state.stock = committed.stock;
  const order: LedgerOrder = {
    id: input.id,
    createdAt: input.createdAt,
    shopperName: input.shopperName,
    lines: quote.lines.map((line) => ({
      productId: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      lineCents: line.lineCents,
    })),
    totalCents: quote.totalCents,
    grossMarginCents: quote.grossMarginCents,
    provider: input.provider,
    paypalOrderId: input.paypalOrderId,
    charged: false,
    approvalUrl: input.approvalUrl,
    note: input.note,
  };
  state.orders = [order, ...state.orders].slice(0, 20);
  return { ok: true, order };
}
