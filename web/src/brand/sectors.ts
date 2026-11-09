/**
 * The Exchange's sectors, in catalogue order. `id` matches the manifest `sector` field
 * and the catalogue anchor (`/data#housing-land`). `page` is the sector's page.
 */
export type Sector = { id: string; label: string; page?: string };

export const SECTORS: Sector[] = [
  { id: "housing-land", label: "Housing & Land", page: "/housing" },
  { id: "economy-public-finance", label: "Economy & Public Finance", page: "/economy" },
  { id: "energy-industry", label: "Energy & Industry", page: "/energy" },
  { id: "people-society", label: "People & Society", page: "/people" },
  { id: "government-politics", label: "Government & Politics", page: "/government" },
  { id: "infrastructure", label: "Infrastructure", page: "/infrastructure" },
  { id: "regions-places", label: "Regions & Places", page: "/regions" },
  { id: "history-change", label: "History & Change", page: "/history" },
];

export const sectorLabel = (id: string) => SECTORS.find((s) => s.id === id)?.label ?? id;
