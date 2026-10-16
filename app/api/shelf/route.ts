import { connection } from "next/server";
import { rankShopper } from "@/lib/agent";
import { shopperById } from "@/lib/shoppers";
import { inStockShelf } from "@/lib/taste/score";

export async function GET(request: Request) {
  await connection();
  const shopperId = new URL(request.url).searchParams.get("shopper") ?? "amina";
  const shopper = shopperById(shopperId);
  if (!shopper) {
    return Response.json({ error: "Unknown shopper." }, { status: 400 });
  }
  const ranked = await rankShopper(shopper, []);
  return Response.json({
    shopperId: shopper.id,
    taste: ranked.taste,
    shelf: inStockShelf(ranked.shelf, 8).map((item) => ({
      id: item.product.id,
      name: item.product.name,
      maker: item.product.maker,
      category: item.product.category,
      priceCents: item.product.priceCents,
      grossMarginCents: item.grossMarginCents,
      stock: item.product.stock,
      swatch: item.product.swatch,
      blurb: item.product.blurb,
      tasteFit: item.tasteFit,
      score: item.score,
      because: item.because,
      inStock: item.inStock,
    })),
  });
}
