import { affinitiesFromSignals, type TasteAffinity } from "@/lib/taste/graph";
import type { TasteSignal } from "@/lib/shoppers";

export type TasteResult = {
  provider: "mock" | "qloo";
  label: string;
  note: string;
  affinities: TasteAffinity[];
};

export interface TasteProvider {
  id: "mock" | "qloo";
  label: string;
  resolve(signals: TasteSignal[]): Promise<TasteResult>;
}

export function mockTasteResult(signals: TasteSignal[], note: string): TasteResult {
  return {
    provider: "mock",
    label: "Local taste graph",
    note,
    affinities: affinitiesFromSignals(signals, "mock"),
  };
}

type FetchLike = typeof fetch;

export type QlooEntity = {
  name?: string;
  entity_id?: string;
  tags?: { name?: string }[];
};

const ALLOWED_QLOO_HOSTS = new Set([
  "hackathon.api.qloo.com",
  "staging.api.qloo.com",
  "api.qloo.com",
]);

export function assertQlooBase(base: string): URL {
  const url = new URL(base);
  if (url.protocol !== "https:") {
    throw new Error("Qloo base URL must be https");
  }
  if (!ALLOWED_QLOO_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing Qloo host ${url.hostname}`);
  }
  return url;
}

export function qlooRoots(base: string): { origin: string } {
  const url = assertQlooBase(base);
  return { origin: `${url.protocol}//${url.host}` };
}

export function buildQlooSearchUrl(origin: string, query: string): string {
  const url = new URL("/search", origin);
  url.searchParams.set("query", query);
  url.searchParams.set("type", "urn:entity:artist");
  url.searchParams.set("take", "3");
  return url.toString();
}

export function buildQlooInsightsUrl(
  origin: string,
  entityIds: string[],
  filterType: string,
): string {
  const url = new URL("/v2/insights", origin);
  url.searchParams.set("filter.type", filterType);
  url.searchParams.set("signal.interests.entities", entityIds.join(","));
  url.searchParams.set("take", "12");
  return url.toString();
}

export function entitiesFromQlooPayload(payload: unknown): QlooEntity[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as {
    results?: { entities?: QlooEntity[] } | QlooEntity[];
  };
  if (Array.isArray(record.results)) return record.results;
  if (record.results && Array.isArray(record.results.entities)) {
    return record.results.entities;
  }
  return [];
}

const CATALOG_TAGS = [
  "ethiopian",
  "jazz",
  "vinyl",
  "listening",
  "spice",
  "ritual",
  "ceramic",
  "handmade",
  "sculptural",
  "warm",
  "cooking",
  "coffee",
  "ambient",
  "field-recording",
  "trail",
  "mountains",
  "essays",
  "reading",
  "practical",
  "light",
  "bauhaus",
  "graphic",
  "print",
  "monochrome",
  "making",
  "brutalist",
  "heat",
  "pantry",
  "home",
  "canvas",
  "magazine",
  "wool",
  "cold",
  "studio",
  "linen",
  "walnut",
  "audio",
];

export function affinitiesFromQlooEntities(
  entities: QlooEntity[],
  signals: TasteSignal[],
): TasteAffinity[] {
  const base = affinitiesFromSignals(signals, "qloo");
  const byTag = new Map(base.map((affinity) => [affinity.tag, affinity]));
  const blob = entities
    .map((entity) =>
      [entity.name ?? "", ...(entity.tags ?? []).map((tag) => tag.name ?? "")]
        .join(" ")
        .toLowerCase(),
    )
    .join("\n");

  if (!blob.trim()) return base;

  for (const tag of CATALOG_TAGS) {
    const needle = tag.replaceAll("-", " ");
    if (!blob.includes(tag) && !blob.includes(needle)) continue;
    const entityName =
      entities.find((entity) =>
        `${entity.name ?? ""} ${(entity.tags ?? []).map((tagItem) => tagItem.name ?? "").join(" ")}`
          .toLowerCase()
          .includes(needle),
      )?.name ?? "a Qloo neighbor";
    const candidate: TasteAffinity = {
      tag,
      weight: 0.74,
      because: `Qloo connects this to ${entityName}.`,
      signalId: "qloo",
      signalName: entityName,
      via: "the Qloo taste graph",
      source: "qloo",
    };
    const current = byTag.get(tag);
    if (!current || candidate.weight > current.weight) {
      byTag.set(tag, candidate);
    }
  }

  return [...byTag.values()].sort((a, b) => b.weight - a.weight);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function createQlooProvider(options: {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: FetchLike;
}): TasteProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: "qloo",
    label: "Qloo Insights",
    async resolve(signals) {
      const { origin } = qlooRoots(options.baseUrl);
      const headers = { "X-Api-Key": options.apiKey, Accept: "application/json" };
      const entityIds: string[] = [];

      for (const signal of signals.slice(0, 3)) {
        const response = await fetchImpl(buildQlooSearchUrl(origin, signal.name), {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          throw new Error(`Qloo search failed (${response.status})`);
        }
        const entities = entitiesFromQlooPayload(await readJson(response));
        const id = entities.find((entity) => entity.entity_id)?.entity_id;
        if (id) entityIds.push(id);
      }

      if (entityIds.length === 0) {
        return mockTasteResult(
          signals,
          "Qloo returned no entities for these signals, so the local taste graph was used.",
        );
      }

      const collected: QlooEntity[] = [];
      for (const filterType of ["urn:entity:brand", "urn:entity:book"]) {
        const response = await fetchImpl(
          buildQlooInsightsUrl(origin, entityIds, filterType),
          { headers, signal: AbortSignal.timeout(8000) },
        );
        if (!response.ok) {
          throw new Error(`Qloo insights failed (${response.status})`);
        }
        collected.push(...entitiesFromQlooPayload(await readJson(response)));
      }

      return {
        provider: "qloo",
        label: "Qloo Insights",
        note: "Affinities merged from Qloo Insights and the local retail graph.",
        affinities: affinitiesFromQlooEntities(collected, signals),
      };
    },
  };
}

export function createMockProvider(note: string): TasteProvider {
  return {
    id: "mock",
    label: "Local taste graph",
    async resolve(signals) {
      return mockTasteResult(signals, note);
    },
  };
}
