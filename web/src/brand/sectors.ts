/**
 * The Exchange's sectors, in catalogue order. `id` matches the manifest `sector` field
 * and the catalogue anchor (`/data#housing-land`). `page` is the sector's page.
 */
export type Sector = {
  id: string;
  label: string;
  page?: string;
  /** True once the sector has Ready series on its page; the index says "In preparation" otherwise. */
  ready?: boolean;
};

export const SECTORS: Sector[] = [
  { id: "housing-land", label: "Housing & Land", page: "/housing", ready: true },
  { id: "economy-public-finance", label: "Economy & Public Finance", page: "/economy", ready: true },
  { id: "energy-industry", label: "Energy & Industry", page: "/energy", ready: true },
  { id: "people-society", label: "People & Society", page: "/people" },
  { id: "government-politics", label: "Government & Politics", page: "/government" },
  { id: "infrastructure", label: "Infrastructure", page: "/infrastructure" },
  { id: "regions-places", label: "Regions & Places", page: "/regions" },
  { id: "history-change", label: "History & Change", page: "/history" },
];

export const sectorLabel = (id: string) => SECTORS.find((s) => s.id === id)?.label ?? id;
