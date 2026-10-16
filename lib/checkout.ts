import { CATALOG, productById, type Product } from "@/lib/catalog";
import type { CartLine } from "@/lib/taste/score";

export type QuoteLine = {
  product: Product;
  quantity: number;
  lineCents: number;
  marginCents: number;
};

export type Quote =
  | { ok: true; lines: QuoteLine[]; totalCents: number; grossMarginCents: number }
  | { ok: false; error: string };

export function quoteCart(
  lines: CartLine[],
  stock: Record<string, number>,
): Quote {
  if (lines.length === 0) return { ok: false, error: "The bag is empty." };
  if (lines.length > 12) return { ok: false, error: "Too many lines in the bag." };

  const quoted: QuoteLine[] = [];
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 9) {
      return { ok: false, error: "Quantity must be a whole number from 1 to 9." };
    }
    const product = productById(line.productId);
    if (!product) return { ok: false, error: `Unknown product ${line.productId}.` };
    const available = stock[product.id] ?? 0;
    if (line.quantity > available) {
      return {
        ok: false,
        error: `Only ${available} of ${product.name} left on the shelf.`,
      };
    }
    quoted.push({
      product,
      quantity: line.quantity,
      lineCents: product.priceCents * line.quantity,
      marginCents: (product.priceCents - product.costCents) * line.quantity,
    });
  }

  return {
    ok: true,
    lines: quoted,
    totalCents: quoted.reduce((sum, line) => sum + line.lineCents, 0),
    grossMarginCents: quoted.reduce((sum, line) => sum + line.marginCents, 0),
  };
}

export function commitStock(
  stock: Record<string, number>,
  lines: CartLine[],
): { ok: true; stock: Record<string, number> } | { ok: false; error: string } {
  const quote = quoteCart(lines, stock);
  if (!quote.ok) return quote;
  const next = { ...stock };
  for (const line of quote.lines) {
    next[line.product.id] = (next[line.product.id] ?? 0) - line.quantity;
  }
  return { ok: true, stock: next };
}

export function initialStock(catalog: Product[] = CATALOG): Record<string, number> {
  return Object.fromEntries(catalog.map((product) => [product.id, product.stock]));
}
