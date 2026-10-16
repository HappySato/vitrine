export type TasteSignal = {
  id: string;
  name: string;
  domain: "music" | "food" | "design" | "books" | "place";
  weight: number;
};

export type Shopper = {
  id: string;
  name: string;
  line: string;
  signals: TasteSignal[];
  prompts: string[];
};

export const SHOPPERS: Shopper[] = [
  {
    id: "amina",
    name: "Amina Okonkwo",
    line: "Ethiopian jazz, a long Sunday in the kitchen, clay on the table.",
    signals: [
      {
        id: "mulatu-astatke",
        name: "Mulatu Astatke",
        domain: "music",
        weight: 0.95,
      },
      {
        id: "berbere-cooking",
        name: "berbere cooking",
        domain: "food",
        weight: 0.88,
      },
      {
        id: "handmade-ceramics",
        name: "handmade ceramics",
        domain: "design",
        weight: 0.82,
      },
    ],
    prompts: [
      "A gift under $80 that feels like her records.",
      "Something for a long Sunday in the kitchen.",
      "What belongs with the bowl?",
    ],
  },
  {
    id: "leo",
    name: "Leo Park",
    line: "Field recordings, ridge essays, a kit that earns its weight.",
    signals: [
      {
        id: "field-recordings",
        name: "field recordings",
        domain: "music",
        weight: 0.92,
      },
      {
        id: "mountaineering-essays",
        name: "mountaineering essays",
        domain: "books",
        weight: 0.84,
      },
      {
        id: "camp-cooking",
        name: "camp cooking",
        domain: "food",
        weight: 0.78,
      },
    ],
    prompts: [
      "A light kit for two nights on the ridge.",
      "Something to play when the tent is up.",
      "Keep it under $50.",
    ],
  },
  {
    id: "sable",
    name: "Sable Chen",
    line: "Bauhaus posters, raw concrete, coffee in a black cup.",
    signals: [
      {
        id: "bauhaus",
        name: "Bauhaus",
        domain: "design",
        weight: 0.96,
      },
      {
        id: "brutalist-architecture",
        name: "brutalist architecture",
        domain: "place",
        weight: 0.8,
      },
      {
        id: "black-coffee",
        name: "black coffee",
        domain: "food",
        weight: 0.74,
      },
    ],
    prompts: [
      "A desk that looks like a concrete monograph.",
      "Coffee, but graphic.",
      "Something under $60 for the studio wall.",
    ],
  },
];

export function shopperById(id: string): Shopper | undefined {
  return SHOPPERS.find((shopper) => shopper.id === id);
}
