import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog";
import { SHOPPERS } from "@/lib/shoppers";
import { deskReport } from "@/lib/desk";
import { affinitiesFromSignals } from "@/lib/taste/graph";
import {
  floorMath,
  scoreCatalog,
  selectShelf,
} from "@/lib/taste/score";

const amina = SHOPPERS[0];
const leo = SHOPPERS[1];
const sable = SHOPPERS[2];

function topIds(shopperId: string, count = 3): string[] {
  const shopper = SHOPPERS.find((person) => person.id === shopperId)!;
  return scoreCatalog(affinitiesFromSignals(shopper.signals))
    .filter((item) => item.inStock)
    .slice(0, count)
    .map((item) => item.product.id);
}

describe("taste ranking", () => {
  it("puts Amina on the record and the berbere bowl, not the trail spork", () => {
    const ids = topIds("amina", 4);
    expect(ids).toContain("ethiopiques");
    expect(ids).toContain("berbere-bowl");
    expect(ids).not.toContain("titanium-spork");
    expect(ids).not.toContain("bauhaus-poster");
  });

  it("puts Leo on the ridge kit, not the Bauhaus poster", () => {
    const ids = topIds("leo", 4);
    expect(ids).toContain("night-rain");
    expect(ids).toContain("field-notes");
    expect(ids).not.toContain("bauhaus-poster");
  });

  it("puts Sable on the poster and the black cup, not the spork", () => {
    const ids = topIds("sable", 4);
    expect(ids).toContain("bauhaus-poster");
    expect(ids[0]).toBe("bauhaus-poster");
    expect(ids).not.toContain("titanium-spork");
  });

  it("zeros the score when the shelf is empty for that sku", () => {
    const catalog = CATALOG.map((product) =>
      product.id === "ethiopiques" ? { ...product, stock: 0 } : product,
    );
    const ranked = scoreCatalog(affinitiesFromSignals(amina.signals), [], catalog);
    expect(ranked.find((item) => item.product.id === "ethiopiques")?.score).toBe(0);
    expect(ranked.find((item) => item.product.id === "ethiopiques")?.inStock).toBe(false);
  });

  it("lowers novelty when the bag already holds the category", () => {
    const affinities = affinitiesFromSignals(amina.signals);
    const open = scoreCatalog(affinities);
    const holdingBowl = scoreCatalog(affinities, [{ productId: "berbere-bowl", quantity: 1 }]);
    const before = open.find((item) => item.product.id === "stoneware-vase")!;
    const after = holdingBowl.find((item) => item.product.id === "stoneware-vase")!;
    expect(after.novelty).toBeLessThan(before.novelty);
    expect(after.score).toBeLessThan(before.score);
  });

  it("keeps an under-$80 gift inside the ceiling and on the taste path", () => {
    const ranked = scoreCatalog(affinitiesFromSignals(amina.signals));
    const selected = selectShelf(ranked, "A gift under $80 that feels like her records.");
    expect(selected.missedBudget).toBe(false);
    expect(selected.ceilingCents).toBe(8000);
    expect(selected.shelf.every((item) => item.product.priceCents <= 8000)).toBe(true);
    expect(selected.shelf.some((item) => item.product.id === "ethiopiques")).toBe(true);
    expect(selected.shelf.some((item) => item.product.id === "stoneware-vase")).toBe(false);
  });

  it("reports a higher gross margin than the bestsellers for Amina", () => {
    const report = deskReport();
    const row = report.shoppers.find((shopper) => shopper.shopperId === "amina")!;
    expect(row.tasteMarginCents).toBeGreaterThan(row.baselineMarginCents);
    expect(row.delta).not.toBeNull();
    expect(row.delta!).toBeGreaterThan(0.5);
    expect(report.recall.tasteRate).toBeGreaterThan(report.recall.popularityRate);
    expect(report.formula.toLowerCase()).toContain("language model does not");
  });

  it("explains floor math from the same margin function", () => {
    const math = floorMath([
      { productId: "ethiopiques", quantity: 1 },
      { productId: "berbere-bowl", quantity: 1 },
    ]);
    expect(math.pieces).toBe(2);
    expect(math.tasteMarginCents).toBe(1800 + 2900);
    expect(math.baselineMarginCents).toBeGreaterThan(0);
    expect(math.tasteMarginCents).toBeGreaterThan(math.baselineMarginCents);
  });

  it("names a because-path for every shopper signal", () => {
    for (const shopper of [amina, leo, sable]) {
      const affinities = affinitiesFromSignals(shopper.signals);
      expect(affinities.length).toBeGreaterThan(0);
      expect(affinities[0]?.because).toMatch(/It shares .+ with /);
    }
  });
});
