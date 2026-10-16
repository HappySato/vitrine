export type Visit = {
  shopperId: string;
  bought: string[];
};

/**
 * Eight counter visits. A worked example, not a production forecast.
 * Replace this fixture with an export from the till.
 */
export const VISITS: Visit[] = [
  { shopperId: "amina", bought: ["ethiopiques", "berbere-bowl"] },
  { shopperId: "amina", bought: ["stoneware-vase", "ethiopiques"] },
  { shopperId: "leo", bought: ["night-rain", "field-notes"] },
  { shopperId: "leo", bought: ["titanium-spork", "wool-beanie"] },
  { shopperId: "sable", bought: ["bauhaus-poster", "black-cup"] },
  { shopperId: "sable", bought: ["grid-issue", "studio-apron"] },
  { shopperId: "amina", bought: ["berbere-bowl", "berbere-incense"] },
  { shopperId: "leo", bought: ["trail-kettle", "night-rain"] },
];
