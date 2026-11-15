import { DOMAIN_SOURCES } from "../housing/domain-sources";
import { DOMAINS as HOUSING_DOMAINS } from "../housing/canvas/model";
import { SECTOR_PAGES } from "../sector-pages";
import { ECONOMY_READY_DOMAINS } from "../economy/types";
import type { EconomyDomainId } from "../economy/types";
import { ENERGY_DOMAIN_VIEWS, domainUiStatus } from "../energy/views";
import type { EnergyDomainId } from "../energy/domain-sources";

/**
 * Where each dataset can be explored, derived from what each visualisation declares it draws.
 *
 * One source of truth per sector, already used to load each domain's data:
 *   Housing   housing/domain-sources.ts → DOMAIN_SOURCES (the server data boundary)
 *   Energy, Economy   sector-pages.ts → domains[].series
 *
 * A dataset gets an "Explore" destination only when a live domain (status ready, with a drawn
 * canvas) declares it. Nothing is inferred from names or correlation (docs/connections-contract.md).
 * The relationship works both ways: a domain lists its datasets, a dataset lists its domains, and
 * datasets drawn in the same domain are shown alongside each other.
 */

export type ExploreDestination = {
  /** Domain title, e.g. "Renting". */
  title: string;
  /** Sector label, e.g. "Housing & Land". */
  sector: string;
  /** The domain's question, e.g. "What does it cost to rent a home in Britain?". */
  question: string;
  href: string;
};

export type ExploreEntry = {
  destinations: ExploreDestination[];
  /** Other datasets drawn in the same domains, most shared first. */
  alongside: string[];
};

type LiveDomain = ExploreDestination & { key: string; datasets: readonly string[] };

function liveDomains(): LiveDomain[] {
  const out: LiveDomain[] = [];
  for (const d of HOUSING_DOMAINS) {
    const datasets = DOMAIN_SOURCES[d.id as keyof typeof DOMAIN_SOURCES] ?? [];
    if (d.status !== "ready" || datasets.length === 0) continue;
    out.push({ key: `housing/${d.id}`, title: d.title, sector: "Housing & Land", question: d.question, href: `/housing?domain=${d.id}`, datasets });
  }
  const energy = SECTOR_PAGES.energy;
  for (const d of energy?.domains ?? []) {
    const id = d.id as EnergyDomainId;
    if (!ENERGY_DOMAIN_VIEWS[id] || domainUiStatus(id) !== "ready" || d.series.length === 0) continue;
    out.push({ key: `energy/${d.id}`, title: d.title, sector: energy!.label, question: d.question, href: `/energy?domain=${d.id}`, datasets: d.series });
  }
  const economy = SECTOR_PAGES.economy;
  for (const d of economy?.domains ?? []) {
    if (!ECONOMY_READY_DOMAINS.has(d.id as EconomyDomainId) || d.series.length === 0) continue;
    out.push({ key: `economy/${d.id}`, title: d.title, sector: economy!.label, question: d.question, href: `/economy?domain=${d.id}`, datasets: d.series });
  }
  return out;
}

/** Explore destinations and companions for every dataset id in `ids`. */
export function exploreIndex(ids: readonly string[], maxAlongside = 6): Record<string, ExploreEntry> {
  const known = new Set(ids);
  const domains = liveDomains();
  const index: Record<string, ExploreEntry> = {};
  for (const id of ids) {
    const mine = domains.filter((d) => d.datasets.includes(id));
    if (mine.length === 0) continue;
    const shared = new Map<string, number>();
    for (const d of mine)
      for (const other of d.datasets)
        if (other !== id && known.has(other)) shared.set(other, (shared.get(other) ?? 0) + 1);
    index[id] = {
      destinations: mine.map(({ title, sector, question, href }) => ({ title, sector, question, href })),
      alongside: [...shared.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxAlongside).map(([other]) => other),
    };
  }
  return index;
}

/**
 * Search words per dataset: the titles and questions of every research domain that lists it,
 * live or in preparation, so "how much do people earn?" finds the Wages series.
 */
export function topicWords(ids: readonly string[]): Record<string, string> {
  const words = new Map<string, string[]>();
  const add = (datasets: readonly string[], title: string, question: string) => {
    for (const id of datasets) words.set(id, [...(words.get(id) ?? []), title, question]);
  };
  for (const d of HOUSING_DOMAINS) add(DOMAIN_SOURCES[d.id as keyof typeof DOMAIN_SOURCES] ?? [], d.title, d.question);
  for (const sector of Object.values(SECTOR_PAGES)) for (const d of sector.domains) add(d.series, d.title, d.question);
  return Object.fromEntries(ids.map((id) => [id, (words.get(id) ?? []).join(" ").toLowerCase()]));
}
