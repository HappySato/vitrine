import {
  CATALOG,
  grossMarginCents,
  marginRate,
  type Product,
} from "@/lib/catalog";
import { type TasteAffinity } from "@/lib/taste/graph";

export const SCORE_WEIGHTS = {
  taste: 0.62,
  margin: 0.23,
  novelty: 0.15,
  noveltyIfCategoryInCart: 0.72,
} as const;

export type CartLine = {
  productId: string;
  quantity: number;
};

export type ScoredProduct = {
  product: Product;
  tasteFit: number;
  marginRate: number;
  novelty: number;
  score: number;
  because: string | null;
  grossMarginCents: number;
  inStock: boolean;
};

export function scoreCatalog(
  affinities: TasteAffinity[],
  cart: CartLine[] = [],
  catalog: Product[] = CATALOG,
): ScoredProduct[] {
  const byTag = new Map(affinities.map((affinity) => [affinity.tag, affinity]));
  const categoriesInCart = new Set(
    cart
      .map((line) => catalog.find((product) => product.id === line.productId)?.category)
      .filter((category): category is Product["category"] => Boolean(category)),
  );

  const scored = catalog.map((product) => {
    let tasteFit = 0;
    let because: string | null = null;
    for (const tag of product.tags) {
      const affinity = byTag.get(tag);
      if (!affinity) continue;
      if (affinity.weight > tasteFit) {
        tasteFit = affinity.weight;
        because = affinity.because;
      }
    }

    const rate = marginRate(product);
    const novelty = categoriesInCart.has(product.category)
      ? SCORE_WEIGHTS.noveltyIfCategoryInCart
      : 1;
    const inStock = product.stock > 0;
    const raw =
      SCORE_WEIGHTS.taste * tasteFit +
      SCORE_WEIGHTS.margin * rate +
      SCORE_WEIGHTS.novelty * novelty;
    const score = inStock ? raw : 0;

    return {
      product,
      tasteFit,
      marginRate: rate,
      novelty,
      score,
      because,
      grossMarginCents: grossMarginCents(product),
      inStock,
    };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.grossMarginCents - a.grossMarginCents;
  });
}

export function budgetCeilingCents(message: string): number | null {
  const match = message
    .toLowerCase()
    .match(
      /(?:under|below|less than|budget of|within|up to)\s*\$?\s*(\d+(?:\.\d{1,2})?)/,
    );
  if (!match) return null;
  const dollars = Number(match[1]);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

export function selectShelf(
  ranked: ScoredProduct[],
  message: string,
  limit = 8,
): { shelf: ScoredProduct[]; ceilingCents: number | null; missedBudget: boolean } {
  const ceilingCents = budgetCeilingCents(message);
  if (ceilingCents == null) {
    return { shelf: inStockShelf(ranked, limit), ceilingCents, missedBudget: false };
  }
  const within = ranked.filter((item) => item.product.priceCents <= ceilingCents);
  if (within.length === 0) {
    return { shelf: [], ceilingCents, missedBudget: true };
  }
  return {
    shelf: inStockShelf(within, limit),
    ceilingCents,
    missedBudget: false,
  };
}

export function inStockShelf(ranked: ScoredProduct[], limit = 8): ScoredProduct[] {
  const available = ranked.filter((item) => item.inStock);
  const soldThrough = ranked.filter((item) => !item.inStock);
  return [...available, ...soldThrough].slice(0, limit);
}

export function basketGrossMarginCents(
  lines: CartLine[],
  catalog: Product[] = CATALOG,
): number {
  let total = 0;
  for (const line of lines) {
    const product = catalog.find((item) => item.id === line.productId);
    if (!product || line.quantity <= 0) continue;
    total += grossMarginCents(product) * line.quantity;
  }
  return total;
}

export function popularLines(count: number, catalog: Product[] = CATALOG): CartLine[] {
  return [...catalog]
    .filter((product) => product.stock > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold || a.id.localeCompare(b.id))
    .slice(0, count)
    .map((product) => ({ productId: product.id, quantity: 1 }));
}

export function floorMath(
  lines: CartLine[],
  catalog: Product[] = CATALOG,
): {
  pieces: number;
  tasteMarginCents: number;
  baselineMarginCents: number;
  delta: number | null;
} {
  const pieces = lines.reduce((sum, line) => sum + Math.max(0, line.quantity), 0);
  const tasteMarginCents = basketGrossMarginCents(lines, catalog);
  const baselineMarginCents = basketGrossMarginCents(
    popularLines(Math.max(pieces, 1), catalog),
    catalog,
  );
  const delta =
    pieces === 0 || baselineMarginCents === 0
      ? null
      : (tasteMarginCents - baselineMarginCents) / baselineMarginCents;
  return { pieces, tasteMarginCents, baselineMarginCents, delta };
}
