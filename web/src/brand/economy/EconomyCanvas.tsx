"use client";

/**
 * Economy & Public Finance explorer — shared SectorPage + Explorer shell.
 * Rail: ten domains (01–10). Ready canvases: Inflation · Wages · Employment · Growth · Tax · Spending · Debt;
 * the rest show the shared In-preparation stage until their own G2+G3.
 */

import { useCallback, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrivalFrom, readArrival } from "../connections";
import { REF_ICON_PLATES } from "../Plate";
import type { SectorConfig } from "../sector-pages";
import { EmptyStage, Explorer, ExplorerHead, SourceLine, Stage, type ExplorerDomain } from "../template";
import { SectorPage } from "../template/SectorPage";
import { useDomainData } from "../template/useDomainData";
import { unpackTree, type Wire } from "@/lib/wire";
import { useHeroSize } from "../template/useHeroSize";
import { DebtCanvas } from "./DebtCanvas";
import { EmploymentCanvas } from "./EmploymentCanvas";
import { GrowthCanvas } from "./GrowthCanvas";
import { InflationCanvas } from "./InflationCanvas";
import { SpendingCanvas } from "./SpendingCanvas";
import { TaxCanvas } from "./TaxCanvas";
import { WagesCanvas } from "./WagesCanvas";
import {
  ECONOMY_DOMAIN_IDS,
  ECONOMY_READY_DOMAINS,
  ECONOMY_STAGE_EMPTY,
  LEGACY_ECONOMY_DOMAIN,
  type DebtPack,
  type EconomyDomainId,
  type EmploymentPack,
  type GrowthPack,
  type InflationPack,
  type SpendingPack,
  type TaxPack,
  type WagesPack,
} from "./types";

type EconomyPacks = {
  inflation: InflationPack;
  wages: WagesPack;
  employment: EmploymentPack;
  tax: TaxPack;
  spending: SpendingPack;
  debt: DebtPack;
  growth: GrowthPack;
};

function resolveActive(raw: string | null): EconomyDomainId {
  if (!raw) return "inflation";
  if ((ECONOMY_DOMAIN_IDS as string[]).includes(raw)) return raw as EconomyDomainId;
  return LEGACY_ECONOMY_DOMAIN[raw] ?? "inflation";
}

export function EconomyView({
  config,
  data,
}: {
  config: SectorConfig;
  titles: Record<string, string>;
  /** Packed by column on the server (`packTree`). */
  data: Wire<EconomyPacks>;
}) {
  const initialData = useMemo(() => unpackTree(data), [data]);
  const hero = useHeroSize("inflation");
  const urlDomain = resolveActive(useSearchParams().get("domain"));
  // Rail hops fetch the next domain's packs and push the URL; the page never unmounts.
  const hop = useDomainData<EconomyDomainId, EconomyPacks>({
    endpoint: "/api/economy/domain",
    initialDomain: urlDomain,
    initialData,
    urlDomain,
    decode: (json) => unpackTree(json as Wire<EconomyPacks>),
  });
  return (
    <SectorPage
      name={config.name}
      label={config.label}
      hero={hero}
      plate={{ ...config.plate, treatment: "print" }}
    >
      <EconomyCanvas
        config={config}
        inflation={hop.data.inflation}
        wages={hop.data.wages}
        employment={hop.data.employment}
        tax={hop.data.tax}
        spending={hop.data.spending}
        debt={hop.data.debt}
        growth={hop.data.growth}
        hop={hop}
      />
    </SectorPage>
  );
}

function EconomyCanvas({
  config,
  inflation,
  wages,
  employment,
  tax,
  spending,
  debt,
  growth,
  hop,
}: {
  config: SectorConfig;
  hop: { pending: EconomyDomainId | null; go: (next: EconomyDomainId, href: string) => void };
  inflation: InflationPack;
  wages: WagesPack;
  employment: EmploymentPack;
  tax: TaxPack;
  spending: SpendingPack;
  debt: DebtPack;
  growth: GrowthPack;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  // URL is the source of truth (Energy / Housing pattern): the bare address opens Inflation.
  const active = resolveActive(params.get("domain"));

  // Domain hops fetch that domain's packs (loadEconomy is scoped) through `useDomainData`,
  // then push the URL. A plain replaceState would leave empty packs — blank stages.
  const select = useCallback(
    (id: string) => {
      const next = resolveActive(id);
      if (next === active) return;
      const u = new URLSearchParams();
      u.set("domain", next);
      hop.go(next, `${pathname}?${u}`);
    },
    [pathname, hop, active],
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
      active={hop.pending ?? active}
      onSelectDomain={select}
      busy={hop.pending ? (config.domains.find((d) => d.id === hop.pending)?.title ?? hop.pending) : null}
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
      ) : active === "employment" ? (
        <EmploymentCanvas pack={employment} />
      ) : active === "tax" ? (
        <TaxCanvas pack={tax} />
      ) : active === "spending" ? (
        <SpendingCanvas pack={spending} />
      ) : active === "debt" ? (
        <DebtCanvas pack={debt} />
      ) : (
        <GrowthCanvas pack={growth} />
      )}
    </Explorer>
  );
}
