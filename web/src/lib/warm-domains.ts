/**
 * Keep every sector domain payload warm, so a reader never pays for a cold build
 * (10–20 s against the API) on a rail hop or a fresh page.
 *
 * Rolling, not bursty: one domain build at a time, spaced so the whole set cycles inside the
 * cache's freshness window. The API (one worker over a remote Postgres) then sees a steady
 * trickle instead of twenty parallel builds, and reader requests are not queued behind it.
 * Runs from `instrumentation.ts` in the Node runtime only. `BX_WARM_DOMAINS=0` turns it off.
 */

import { DOMAIN_SOURCES } from "@/brand/housing/domain-sources";
import { housingDomainCache } from "@/brand/housing/load";
import { ENERGY_DOMAINS } from "@/brand/energy/domain-sources";
import { energyDomainCache } from "@/brand/energy/load";
import { ECONOMY_DOMAIN_IDS } from "@/brand/economy/types";
import { packsFor as economyPacksFor } from "@/brand/economy/domain-sources";
import { economyDomainCache } from "@/brand/economy/load";

/** One full cycle must finish inside the caches' 10-minute freshness. */
const CYCLE_MS = 9 * 60 * 1000;
/** Breathing room between builds even when a cycle is running late. */
const MIN_GAP_MS = 1500;

type Job = { label: string; run: () => Promise<void> };

function jobs(): Job[] {
  const housing: Job[] = Object.keys(DOMAIN_SOURCES).map((d) => ({
    label: `housing/${d}`,
    run: () => housingDomainCache.refresh(d as keyof typeof DOMAIN_SOURCES),
  }));
  const energy: Job[] = ENERGY_DOMAINS.map((d) => ({ label: `energy/${d}`, run: () => energyDomainCache.refresh(d) }));
  const economy: Job[] = ECONOMY_DOMAIN_IDS.filter((d) => economyPacksFor(d).length > 0).map((d) => ({
    label: `economy/${d}`,
    run: () => economyDomainCache.refresh(d),
  }));
  // Landing domains first, then the rest interleaved across sectors.
  const lists = [housing, energy, economy];
  const out: Job[] = lists.map((l) => l[0]).filter((j): j is Job => Boolean(j));
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 1; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]!);
  return out;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms).unref());

async function loop(): Promise<void> {
  const all = jobs();
  const gap = Math.max(MIN_GAP_MS, Math.floor(CYCLE_MS / all.length));
  for (;;) {
    const started = Date.now();
    for (const job of all) {
      const t = Date.now();
      await job.run();
      if (process.env.NODE_ENV !== "production") console.log(`[warm] ${job.label} ${Date.now() - t}ms`);
      await sleep(Math.max(MIN_GAP_MS, gap - (Date.now() - t)));
    }
    console.log(`[warm] cycle of ${all.length} domains in ${Math.round((Date.now() - started) / 1000)}s`);
  }
}

let started = false;

export function startDomainWarmer(): void {
  if (started || process.env.BX_WARM_DOMAINS === "0") return;
  started = true;
  // Let the server finish booting before the first build.
  setTimeout(() => void loop().catch((err: unknown) => console.warn("[warm] stopped", err)), 1500).unref();
}
