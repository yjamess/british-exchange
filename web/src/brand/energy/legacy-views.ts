/**
 * Retired Energy tabs that now live in another domain.
 *
 * Each pair below was a duplicate of a tab that already existed elsewhere, so the
 * duplicate was removed and its old URL is sent to the surviving tab instead of
 * silently falling back to the domain's default view.
 *
 *   industrial-work › atlas    → manufacturing › places   (same BRES regional jobs)
 *   networks › capacity        → imports › connectors     (same NESO cable-capacity series)
 *   networks › border          → imports › connectors     (same quarterly cable flows)
 *   networks › night           → generation › year        (same monthly GB imports line)
 *
 * Plain function, no React — the sector route calls it on the server so a stale
 * bookmark redirects before any pack is loaded.
 */

type EnergySearch = Record<string, string | string[] | undefined>;

type LegacyRule = {
  from: { domain: string; view: string };
  to: { domain: string; view: string };
  /** Query keys that mean the same thing on the destination tab. */
  keep: readonly string[];
};

export const ENERGY_LEGACY_VIEWS: readonly LegacyRule[] = [
  {
    from: { domain: "industrial-work", view: "atlas" },
    to: { domain: "manufacturing", view: "places" },
    keep: ["year", "from", "level", "industry"],
  },
  {
    from: { domain: "networks", view: "capacity" },
    to: { domain: "imports", view: "connectors" },
    keep: ["year"],
  },
  {
    from: { domain: "networks", view: "border" },
    to: { domain: "imports", view: "connectors" },
    keep: ["year", "flow"],
  },
  {
    from: { domain: "networks", view: "night" },
    to: { domain: "generation", view: "year" },
    keep: [],
  },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/energy?...` for the surviving tab, or `null` when the URL is not a retired one. */
export function legacyEnergyRedirect(search: EnergySearch): string | null {
  const domain = first(search.domain);
  const view = first(search.view);
  const rule = ENERGY_LEGACY_VIEWS.find((r) => r.from.domain === domain && r.from.view === view);
  if (!rule) return null;

  const next = new URLSearchParams({ domain: rule.to.domain, view: rule.to.view });
  for (const key of rule.keep) {
    const value = first(search[key]);
    if (value) next.set(key, value);
  }
  return `/energy?${next.toString()}`;
}
