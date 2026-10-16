import { CATALOG, grossMarginCents, type Product } from "@/lib/catalog";
import { shopperById, SHOPPERS, type Shopper } from "@/lib/shoppers";
import { SCORE_WEIGHTS, scoreCatalog, type ScoredProduct } from "@/lib/taste/score";
import { affinitiesFromSignals } from "@/lib/taste/graph";
import { VISITS } from "@/lib/visits";

export type ShopperReport = {
  shopperId: string;
  shopperName: string;
  tasteTop: { id: string; name: string; grossMarginCents: number }[];
  tasteMarginCents: number;
  baselineMarginCents: number;
  delta: number | null;
};

export type DeskReport = {
  weights: {
    taste: number;
    margin: number;
    novelty: number;
    noveltyIfCategoryInCart: number;
  };
  formula: string;
  baselineNames: string[];
  baselineMarginCents: number;
  shoppers: ShopperReport[];
  recall: {
    visits: number;
    tasteHits: number;
    tasteItems: number;
    popularityHits: number;
    popularityItems: number;
    tasteRate: number;
    popularityRate: number;
  };
  note: string;
};

function topInStock(ranked: ScoredProduct[], count: number) {
  return ranked.filter((item) => item.inStock).slice(0, count);
}

export function deskReport(
  catalog: Product[] = CATALOG,
  shoppers: Shopper[] = SHOPPERS,
): DeskReport {
  const popularity = [...catalog]
    .filter((product) => product.stock > 0)
    .sort((a, b) => b.unitsSold - a.unitsSold || a.id.localeCompare(b.id));
  const baseline = popularity.slice(0, 3);
  const baselineIds = new Set(baseline.map((product) => product.id));
  const baselineMarginCents = baseline.reduce(
    (sum, product) => sum + grossMarginCents(product),
    0,
  );

  const shopperReports: ShopperReport[] = shoppers.map((shopper) => {
    const ranked = scoreCatalog(affinitiesFromSignals(shopper.signals), [], catalog);
    const tasteTop = topInStock(ranked, 3);
    const tasteMarginCents = tasteTop.reduce(
      (sum, item) => sum + item.grossMarginCents,
      0,
    );
    return {
      shopperId: shopper.id,
      shopperName: shopper.name,
      tasteTop: tasteTop.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        grossMarginCents: item.grossMarginCents,
      })),
      tasteMarginCents,
      baselineMarginCents,
      delta:
        baselineMarginCents === 0
          ? null
          : (tasteMarginCents - baselineMarginCents) / baselineMarginCents,
    };
  });

  let tasteHits = 0;
  let tasteItems = 0;
  let popularityHits = 0;
  let popularityItems = 0;

  for (const visit of VISITS) {
    const shopper = shopperById(visit.shopperId);
    if (!shopper) continue;
    const ranked = scoreCatalog(affinitiesFromSignals(shopper.signals), [], catalog);
    const tasteIds = new Set(topInStock(ranked, 3).map((item) => item.product.id));
    for (const id of visit.bought) {
      tasteItems += 1;
      popularityItems += 1;
      if (tasteIds.has(id)) tasteHits += 1;
      if (baselineIds.has(id)) popularityHits += 1;
    }
  }

  return {
    weights: SCORE_WEIGHTS,
    formula: `score = inStock × (${SCORE_WEIGHTS.taste} × tasteFit + ${SCORE_WEIGHTS.margin} × marginRate + ${SCORE_WEIGHTS.novelty} × novelty). tasteFit is the strongest edge from the shopper's signals onto the product's tags. novelty is ${SCORE_WEIGHTS.noveltyIfCategoryInCart} when the bag already holds that category, otherwise 1. Gross margin is price minus cost. The language model does not enter this calculation.`,
    baselineNames: baseline.map((product) => product.name),
    baselineMarginCents,
    shoppers: shopperReports,
    recall: {
      visits: VISITS.length,
      tasteHits,
      tasteItems,
      popularityHits,
      popularityItems,
      tasteRate: tasteItems === 0 ? 0 : tasteHits / tasteItems,
      popularityRate: popularityItems === 0 ? 0 : popularityHits / popularityItems,
    },
    note: "Worked example on eight counter visits. Swap the fixture for a till export before treating the rates as a forecast.",
  };
}
