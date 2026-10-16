import type { AppEnv } from "@/lib/env";
import { readAppConfig } from "@/lib/config";
import { CATALOG } from "@/lib/catalog";
import { catalogWithStock } from "@/lib/floor-state";
import { resolveLlm, type BackendInfo } from "@/lib/llm/config";
import { narrateWithModel } from "@/lib/llm/client";
import { narrateLocally } from "@/lib/llm/narrate";
import type { Shopper } from "@/lib/shoppers";
import {
  floorMath,
  scoreCatalog,
  selectShelf,
  type CartLine,
  type ScoredProduct,
} from "@/lib/taste/score";
import { mockTasteResult } from "@/lib/taste/provider";

export type ShelfItem = {
  id: string;
  name: string;
  maker: string;
  category: string;
  priceCents: number;
  grossMarginCents: number;
  stock: number;
  swatch: string;
  blurb: string;
  tasteFit: number;
  score: number;
  because: string | null;
  inStock: boolean;
};

export type TurnResult = {
  say: string;
  offer: string[];
  backend: BackendInfo;
  shelf: ShelfItem[];
  floorMath: ReturnType<typeof floorMath>;
  taste: { id: string; label: string; note: string };
  error?: string;
};

function toShelfItem(item: ScoredProduct): ShelfItem {
  return {
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
  };
}

export async function rankShopper(
  shopper: Shopper,
  cart: CartLine[],
  env: AppEnv = process.env,
): Promise<{ shelf: ScoredProduct[]; taste: TurnResult["taste"] }> {
  const config = readAppConfig(env);
  let taste = await config.taste.resolve(shopper.signals).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Taste provider failed";
    const fallback = mockTasteResult(
      shopper.signals,
      `${message}. The local taste graph was used instead.`,
    );
    return fallback;
  });
  if (taste.affinities.length === 0) {
    taste = mockTasteResult(shopper.signals, "Taste provider returned no affinities.");
  }
  const shelf = scoreCatalog(taste.affinities, cart, catalogWithStock());
  return {
    shelf,
    taste: { id: taste.provider, label: taste.label, note: taste.note },
  };
}

export async function runTurn(input: {
  shopper: Shopper;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
  cart: CartLine[];
  env?: AppEnv;
  fetchImpl?: typeof fetch;
}): Promise<TurnResult> {
  const env = input.env ?? process.env;
  const config = readAppConfig(env, { fetchImpl: input.fetchImpl });
  let tasteNote = config.tasteNote;
  let tasteId: TurnResult["taste"]["id"] = config.taste.id;
  let tasteLabel = config.taste.label;
  let affinities;
  try {
    const resolved = await config.taste.resolve(input.shopper.signals);
    affinities = resolved.affinities;
    tasteId = resolved.provider;
    tasteLabel = resolved.label;
    tasteNote = resolved.note;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Taste provider failed";
    const fallback = mockTasteResult(
      input.shopper.signals,
      `${message}. The local taste graph was used instead.`,
    );
    affinities = fallback.affinities;
    tasteId = "mock";
    tasteLabel = fallback.label;
    tasteNote = fallback.note;
  }

  const ranked = scoreCatalog(affinities, input.cart, catalogWithStock());
  const selected = selectShelf(ranked, input.message);
  const replyShelf = selected.missedBudget ? ranked.filter((item) => item.inStock).slice(0, 1) : selected.shelf;

  const who = input.shopper.name.split(" ")[0] ?? input.shopper.name;
  const local = selected.missedBudget
    ? {
        say: `Nothing in stock for ${who} is at or under that budget. The closest fit is the ${replyShelf[0]?.product.name ?? "shelf"}, and it costs more.`,
        offer: [] as string[],
      }
    : narrateLocally({
        shopper: input.shopper,
        message: input.message,
        shelf: selected.shelf,
        cart: input.cart,
        catalog: CATALOG,
      });

  const model = selected.missedBudget
    ? {
        reply: null,
        backend: {
          id: "local-planner" as const,
          label: "Local planner — nothing in budget to send to the model",
          model: config.llm.model,
          host: config.llm.host,
          usedFallback: false,
          detail: "The budget filter left an empty shelf, so the model was not called.",
        },
      }
    : await narrateWithModel({
        shopper: input.shopper,
        message: input.message,
        history: input.history,
        shelf: selected.shelf,
        cart: input.cart,
        catalog: CATALOG,
        env,
        fetchImpl: input.fetchImpl,
        config: config.llm,
      });

  if (
    !selected.missedBudget &&
    !model.reply &&
    config.llm.mode !== "local-planner" &&
    !config.llm.allowFallback
  ) {
    return {
      say: "",
      offer: [],
      backend: model.backend,
      shelf: selected.shelf.map(toShelfItem),
      floorMath: floorMath([]),
      taste: { id: tasteId, label: tasteLabel, note: tasteNote },
      error: model.backend.detail ?? "The model endpoint did not answer, and fallback is off.",
    };
  }

  const spoken = model.reply ?? local;
  const mathLines: CartLine[] =
    spoken.offer.length > 0
      ? spoken.offer.map((productId) => ({ productId, quantity: 1 }))
      : input.cart.length > 0
        ? input.cart
        : spoken.offer.map((productId) => ({ productId, quantity: 1 }));

  return {
    say: spoken.say,
    offer: spoken.offer,
    backend: model.reply ? model.backend : model.backend,
    shelf: (selected.missedBudget ? [] : selected.shelf).map(toShelfItem),
    floorMath: floorMath(mathLines),
    taste: { id: tasteId, label: tasteLabel, note: tasteNote },
  };
}

export function configuredBackend(env: AppEnv = process.env) {
  return resolveLlm(env);
}
