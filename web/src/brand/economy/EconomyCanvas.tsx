"use client";

/**
 * Economy & Public Finance explorer — shared SectorPage + Explorer shell.
 * Rail: ten domains (01–10). Wave A canvases: Inflation · Wages · Growth · Debt (Review Gate
 * 2026-11-11); the rest show the shared In-preparation stage until their own G2+G3.
 */

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrivalFrom, readArrival } from "../connections";
import { REF_ICON_PLATES } from "../Plate";
import type { SectorConfig } from "../sector-pages";
import { EmptyStage, Explorer, ExplorerHead, SourceLine, Stage, type ExplorerDomain } from "../template";
import { SectorPage } from "../template/SectorPage";
import { useHeroSize } from "../template/useHeroSize";
import { DebtCanvas } from "./DebtCanvas";
import { GrowthCanvas } from "./GrowthCanvas";
import { InflationCanvas } from "./InflationCanvas";
import { WagesCanvas } from "./WagesCanvas";
import {
  ECONOMY_DOMAIN_IDS,
  ECONOMY_READY_DOMAINS,
  ECONOMY_STAGE_EMPTY,
  LEGACY_ECONOMY_DOMAIN,
  type DebtPack,
  type EconomyDomainId,
  type GrowthPack,
  type InflationPack,
  type WagesPack,
} from "./types";

function resolveActive(raw: string | null): EconomyDomainId {
  if (!raw) return "inflation";
  if ((ECONOMY_DOMAIN_IDS as string[]).includes(raw)) return raw as EconomyDomainId;
  return LEGACY_ECONOMY_DOMAIN[raw] ?? "inflation";
}

export function EconomyView({
  config,
  inflation,
  wages,
  debt,
  growth,
}: {
  config: SectorConfig;
  titles: Record<string, string>;
  inflation: InflationPack;
  wages: WagesPack;
  debt: DebtPack;
  growth: GrowthPack;
}) {
  const hero = useHeroSize("inflation");
  return (
    <SectorPage
      name={config.name}
      label={config.label}
      hero={hero}
      plate={{ ...config.plate, treatment: "print" }}
    >
      <EconomyCanvas
        config={config}
        inflation={inflation}
        wages={wages}
        debt={debt}
        growth={growth}
      />
    </SectorPage>
  );
}

function EconomyCanvas({
  config,
  inflation,
  wages,
  debt,
  growth,
}: {
  config: SectorConfig;
  inflation: InflationPack;
  wages: WagesPack;
  debt: DebtPack;
  growth: GrowthPack;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  // URL is the source of truth (Energy / Housing pattern): the bare address opens Inflation.
  const active = resolveActive(params.get("domain"));

  // Domain hops must router.push so the server reloads that domain's packs
  // (loadEconomy is scoped). replaceState leaves empty wages/debt/growth packs — blank stages.
  // Same contract as Energy: docs/performance.md.
  const select = useCallback(
    (id: string) => {
      const next = resolveActive(id);
      if (next === active) return;
      const u = new URLSearchParams();
      u.set("domain", next);
      router.push(`${pathname}?${u}`, { scroll: false });
    },
    [pathname, router, active],
  );

  const domains: ExplorerDomain[] = config.domains.map((d) => ({
    id: d.id,
    title: d.title,
    short: d.short,
    question: d.question,
    plate: d.plate ? REF_ICON_PLATES[d.plate] : undefined,
    // Wave A canvases are Ready; Wave B/C domains wait in the rail. Never inferred from packs.
    status: ECONOMY_READY_DOMAINS.has(d.id as EconomyDomainId) ? "ready" : "preparation",
  }));
  const domain = config.domains.find((d) => d.id === active) ?? config.domains[0]!;
  const arrival = readArrival(params);

  return (
    <Explorer
      sector={config.label}
      indexLabel={config.indexLabel}
      domains={domains}
      active={active}
      onSelectDomain={select}
    >
      {arrival ? (
        <ArrivalFrom from={arrival.from} returnHref={arrival.returnHref} />
      ) : null}
      {!ECONOMY_READY_DOMAINS.has(active) ? (
        <>
          <ExplorerHead />
          <Stage
            title={domain.title}
            foot={
              <SourceLine
                rows={[
                  {
                    label: "Data",
                    text: domain.series.length
                      ? `${domain.series.length} series in the catalogue for this domain`
                      : "No series in the catalogue for this domain yet",
                    href: `/data#${config.sectorId}`,
                    linkLabel: `All ${config.label} series`,
                  },
                ]}
              />
            }
          >
            <EmptyStage label={ECONOMY_STAGE_EMPTY.preparation.label}>
              {ECONOMY_STAGE_EMPTY.preparation.hint}
            </EmptyStage>
          </Stage>
        </>
      ) : active === "inflation" ? (
        <InflationCanvas pack={inflation} />
      ) : active === "wages" ? (
        <WagesCanvas pack={wages} />
      ) : active === "debt" ? (
        <DebtCanvas pack={debt} />
      ) : (
        <GrowthCanvas pack={growth} />
      )}
    </Explorer>
  );
}
