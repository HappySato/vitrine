export type Category =
  | "ceramics"
  | "audio"
  | "kitchen"
  | "books"
  | "apparel"
  | "pantry"
  | "print";

export type Product = {
  id: string;
  name: string;
  maker: string;
  category: Category;
  priceCents: number;
  costCents: number;
  stock: number;
  unitsSold: number;
  tags: string[];
  blurb: string;
  swatch: string;
};

export const CATALOG: Product[] = [
  {
    id: "chili-crisp",
    name: "Chili crisp, small batch",
    maker: "Pantry North",
    category: "pantry",
    priceCents: 1400,
    costCents: 500,
    stock: 22,
    unitsSold: 48,
    tags: ["heat", "pantry"],
    blurb: "The jar that walks out with almost every other purchase.",
    swatch: "#8f2d1f",
  },
  {
    id: "house-beans",
    name: "House blend, 250g",
    maker: "Pantry North",
    category: "pantry",
    priceCents: 1800,
    costCents: 800,
    stock: 18,
    unitsSold: 44,
    tags: ["coffee", "pantry"],
    blurb: "The everyday coffee. Roasted on Monday, gone by Thursday.",
    swatch: "#4a3428",
  },
  {
    id: "cedar-incense",
    name: "Plain cedar sticks",
    maker: "Sable & Smoke",
    category: "pantry",
    priceCents: 1600,
    costCents: 700,
    stock: 20,
    unitsSold: 30,
    tags: ["home", "warm"],
    blurb: "A bestseller because it smells like the shop, not because it fits anyone in particular.",
    swatch: "#b08968",
  },
  {
    id: "canvas-tote",
    name: "One-seam canvas tote",
    maker: "Hill Mill",
    category: "apparel",
    priceCents: 3400,
    costCents: 1400,
    stock: 12,
    unitsSold: 26,
    tags: ["canvas", "practical"],
    blurb: "Undyed canvas, one seam, no logo.",
    swatch: "#d7c7ae",
  },
  {
    id: "grid-issue",
    name: "GRID 19: Concrete",
    maker: "Paper Office",
    category: "books",
    priceCents: 1800,
    costCents: 800,
    stock: 14,
    unitsSold: 10,
    tags: ["magazine", "brutalist", "graphic", "reading"],
    blurb: "A monograph issue on raw concrete, set on a hard grid.",
    swatch: "#8d8a84",
  },
  {
    id: "field-notes",
    name: "Field Notes from the Ridgeline",
    maker: "Gray Press",
    category: "books",
    priceCents: 2200,
    costCents: 1100,
    stock: 11,
    unitsSold: 9,
    tags: ["mountains", "essays", "reading", "trail"],
    blurb: "Essays from a summer of walking the same ridge.",
    swatch: "#6d7a62",
  },
  {
    id: "titanium-spork",
    name: "Two-piece titanium spork",
    maker: "Camp Ordinary",
    category: "kitchen",
    priceCents: 2800,
    costCents: 1200,
    stock: 15,
    unitsSold: 11,
    tags: ["trail", "practical", "light", "cooking"],
    blurb: "Comes apart. Weighs less than the chili crisp.",
    swatch: "#b7b1a8",
  },
  {
    id: "night-rain",
    name: "Cassette: night rain on basalt",
    maker: "Small Press Audio",
    category: "audio",
    priceCents: 1800,
    costCents: 700,
    stock: 9,
    unitsSold: 7,
    tags: ["ambient", "field-recording", "listening", "trail"],
    blurb: "Forty minutes of rain on a basalt field, no music on top.",
    swatch: "#2c3a44",
  },
  {
    id: "wool-beanie",
    name: "Undyed wool beanie",
    maker: "Hill Mill",
    category: "apparel",
    priceCents: 4200,
    costCents: 1900,
    stock: 8,
    unitsSold: 8,
    tags: ["trail", "wool", "cold", "practical"],
    blurb: "Undyed wool from a mill that still lists the flock.",
    swatch: "#c2b6a2",
  },
  {
    id: "trail-kettle",
    name: "Half-litre trail kettle",
    maker: "Camp Ordinary",
    category: "kitchen",
    priceCents: 4600,
    costCents: 2100,
    stock: 6,
    unitsSold: 5,
    tags: ["trail", "coffee", "practical", "light"],
    blurb: "Boils enough for two cups and packs flat.",
    swatch: "#8a8478",
  },
  {
    id: "bauhaus-poster",
    name: "1923 Bauhaus poster, reprint",
    maker: "Paper Office",
    category: "print",
    priceCents: 3600,
    costCents: 1200,
    stock: 7,
    unitsSold: 6,
    tags: ["bauhaus", "print", "graphic", "monochrome"],
    blurb: "The 1923 exhibition poster, reprinted on uncoated stock.",
    swatch: "#1c1c1c",
  },
  {
    id: "black-cup",
    name: "Matte black espresso cups",
    maker: "Kiln House",
    category: "ceramics",
    priceCents: 4000,
    costCents: 1600,
    stock: 10,
    unitsSold: 6,
    tags: ["coffee", "ceramic", "monochrome", "brutalist"],
    blurb: "A pair of heavy cups. No gloss, no logo.",
    swatch: "#242424",
  },
  {
    id: "studio-apron",
    name: "Black linen studio apron",
    maker: "Hill Mill",
    category: "apparel",
    priceCents: 5800,
    costCents: 2400,
    stock: 4,
    unitsSold: 3,
    tags: ["studio", "linen", "monochrome", "making"],
    blurb: "Black linen, crossed back, a pocket that fits a pencil.",
    swatch: "#161616",
  },
  {
    id: "berbere-bowl",
    name: "Berbere stoneware bowl",
    maker: "Kiln House",
    category: "ceramics",
    priceCents: 4800,
    costCents: 1900,
    stock: 6,
    unitsSold: 4,
    tags: ["ceramic", "handmade", "spice", "warm", "cooking"],
    blurb: "A wide bowl with a berbere-red slip. Made in a batch of twenty.",
    swatch: "#9a3b24",
  },
  {
    id: "ethiopiques",
    name: "Éthiopiques No. 4 reissue",
    maker: "Heavenly",
    category: "audio",
    priceCents: 3200,
    costCents: 1400,
    stock: 4,
    unitsSold: 5,
    tags: ["vinyl", "jazz", "ethiopian", "listening"],
    blurb: "Mulatu Astatke, repressed for the shop. Four copies on the shelf.",
    swatch: "#c4552a",
  },
  {
    id: "pour-over",
    name: "Linen pour-over set",
    maker: "Kiln House",
    category: "kitchen",
    priceCents: 6400,
    costCents: 2600,
    stock: 5,
    unitsSold: 3,
    tags: ["coffee", "ceramic", "ritual", "slow"],
    blurb: "Cone, jug, and a linen wrap. Slow by design.",
    swatch: "#efe6d6",
  },
  {
    id: "stoneware-vase",
    name: "Asymmetric stoneware vase",
    maker: "Kiln House",
    category: "ceramics",
    priceCents: 8600,
    costCents: 3000,
    stock: 2,
    unitsSold: 2,
    tags: ["ceramic", "handmade", "sculptural", "home"],
    blurb: "The rim is deliberately uneven. Two left.",
    swatch: "#a36b4a",
  },
  {
    id: "open-back",
    name: "Walnut open-back headphones",
    maker: "Listening Room",
    category: "audio",
    priceCents: 22000,
    costCents: 11000,
    stock: 3,
    unitsSold: 2,
    tags: ["listening", "walnut", "audio"],
    blurb: "Open-back, walnut cups. For a long session, not a commute.",
    swatch: "#6b4226",
  },
  {
    id: "berbere-incense",
    name: "Berbere incense",
    maker: "Sable & Smoke",
    category: "pantry",
    priceCents: 1800,
    costCents: 600,
    stock: 12,
    unitsSold: 4,
    tags: ["ritual"],
    blurb: "Cedar cut with berbere. Not the bestseller incense.",
    swatch: "#a35a32",
  },
];

const byId = new Map(CATALOG.map((product) => [product.id, product]));

export function productById(id: string): Product | undefined {
  return byId.get(id);
}

export function grossMarginCents(product: Product): number {
  return product.priceCents - product.costCents;
}

export function marginRate(product: Product): number {
  if (product.priceCents <= 0) return 0;
  return grossMarginCents(product) / product.priceCents;
}
