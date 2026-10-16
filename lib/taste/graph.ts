export type GraphEdge = {
  tag: string;
  strength: number;
  via: string;
};

/**
 * Retail ontology. Cultural signals (the sort Qloo returns) map onto
 * shelf tags through a named path, so a recommendation can say why.
 */
export const TASTE_GRAPH: Record<string, GraphEdge[]> = {
  "mulatu-astatke": [
    { tag: "ethiopian", strength: 0.95, via: "Ethiopian jazz" },
    { tag: "jazz", strength: 0.9, via: "the records" },
    { tag: "vinyl", strength: 0.82, via: "listening on vinyl" },
    { tag: "listening", strength: 0.7, via: "a long listening session" },
    { tag: "spice", strength: 0.58, via: "the pantry from the same nights" },
    { tag: "ritual", strength: 0.5, via: "a ceremonial pace" },
  ],
  "handmade-ceramics": [
    { tag: "ceramic", strength: 0.95, via: "clay on the table" },
    { tag: "handmade", strength: 0.9, via: "things made slowly" },
    { tag: "sculptural", strength: 0.7, via: "an uneven rim" },
    { tag: "warm", strength: 0.4, via: "the color of fired clay" },
  ],
  "berbere-cooking": [
    { tag: "spice", strength: 0.92, via: "berbere in the pan" },
    { tag: "cooking", strength: 0.88, via: "cooking for a long table" },
    { tag: "ethiopian", strength: 0.7, via: "the same cupboard" },
    { tag: "warm", strength: 0.6, via: "a warm kitchen" },
    { tag: "coffee", strength: 0.35, via: "coffee after the meal" },
  ],
  "field-recordings": [
    { tag: "ambient", strength: 0.95, via: "tape of weather" },
    { tag: "field-recording", strength: 0.95, via: "the recording itself" },
    { tag: "trail", strength: 0.72, via: "walking while it plays" },
    { tag: "listening", strength: 0.6, via: "headphones in a quiet camp" },
  ],
  "mountaineering-essays": [
    { tag: "mountains", strength: 0.9, via: "ridge writing" },
    { tag: "essays", strength: 0.85, via: "long essays" },
    { tag: "reading", strength: 0.8, via: "a book in the tent" },
    { tag: "trail", strength: 0.75, via: "the walk the book describes" },
  ],
  "camp-cooking": [
    { tag: "practical", strength: 0.85, via: "gear that earns its weight" },
    { tag: "light", strength: 0.8, via: "ounces" },
    { tag: "trail", strength: 0.8, via: "cooking where you stop" },
    { tag: "cooking", strength: 0.7, via: "a meal outside" },
    { tag: "coffee", strength: 0.55, via: "morning water" },
  ],
  bauhaus: [
    { tag: "bauhaus", strength: 0.98, via: "the 1923 exhibition" },
    { tag: "graphic", strength: 0.85, via: "the grid" },
    { tag: "print", strength: 0.8, via: "a poster on the wall" },
    { tag: "monochrome", strength: 0.75, via: "black, white, and one red" },
    { tag: "making", strength: 0.4, via: "the workshop" },
  ],
  "brutalist-architecture": [
    { tag: "brutalist", strength: 0.95, via: "raw concrete" },
    { tag: "monochrome", strength: 0.7, via: "the grey" },
    { tag: "graphic", strength: 0.45, via: "a hard shadow" },
    { tag: "ceramic", strength: 0.35, via: "a heavy cup" },
  ],
  "black-coffee": [
    { tag: "coffee", strength: 0.9, via: "coffee, taken black" },
    { tag: "ceramic", strength: 0.55, via: "the cup" },
    { tag: "ritual", strength: 0.4, via: "the same cup every morning" },
    { tag: "monochrome", strength: 0.35, via: "a black cup" },
  ],
};

export type TasteAffinity = {
  tag: string;
  weight: number;
  because: string;
  signalId: string;
  signalName: string;
  via: string;
  source: "mock" | "qloo";
};

export function affinitiesFromSignals(
  signals: { id: string; name: string; weight: number }[],
  source: "mock" | "qloo" = "mock",
): TasteAffinity[] {
  const best = new Map<string, TasteAffinity>();

  for (const signal of signals) {
    const edges = TASTE_GRAPH[signal.id] ?? [];
    for (const edge of edges) {
      const weight = clamp01(signal.weight * edge.strength);
      const current = best.get(edge.tag);
      if (current && current.weight >= weight) continue;
      best.set(edge.tag, {
        tag: edge.tag,
        weight,
        because: `It shares ${edge.via} with ${signal.name}.`,
        signalId: signal.id,
        signalName: signal.name,
        via: edge.via,
        source,
      });
    }
  }

  return [...best.values()].sort((a, b) => b.weight - a.weight);
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
