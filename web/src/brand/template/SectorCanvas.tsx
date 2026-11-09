"use client";

import { useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { REF_ICON_PLATES } from "../Plate";
import type { SectorConfig } from "../sector-pages";
import { Explorer, ExplorerHead, SourceLine, Stage, explorerClasses as x, type ExplorerDomain } from "./Explorer";
import { SectorPage } from "./SectorPage";
import c from "./sectorCanvas.module.css";

/**
 * A sector page from configuration, as Housing behaves: the full hero on the landing view, the
 * thin band once a domain is chosen (`?domain=`), so the question is not pushed down the page.
 */
export function SectorView({ config, titles }: { config: SectorConfig; titles: Record<string, string> }) {
  const hero = useSearchParams().get("domain") ? "band" : "full";
  return (
    <SectorPage name={config.name} label={config.label} hero={hero} plate={{ ...config.plate, treatment: "print" }}>
      <SectorCanvas config={config} titles={titles} />
    </SectorPage>
  );
}

/**
 * The Explorer for a sector page built from configuration (`SECTOR_PAGES`): rail, crumb,
 * Caslon question and stage. Until a domain's stage is drawn it fills the frame with
 * "In preparation" and lists the catalogue series it will use. The domain lives in the URL.
 */
export function SectorCanvas({ config, titles }: { config: SectorConfig; titles: Record<string, string> }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const ids = config.domains.map((d) => d.id);
  const fromUrl = params.get("domain");
  const [active, setActive] = useState(fromUrl && ids.includes(fromUrl) ? fromUrl : ids[0]!);

  // URL state without a server round trip (brand README: history.replaceState).
  const select = useCallback(
    (id: string) => {
      setActive(id);
      const u = new URLSearchParams(window.location.search);
      u.set("domain", id);
      window.history.replaceState(null, "", `${pathname}?${u}`);
    },
    [pathname],
  );

  const domains: ExplorerDomain[] = config.domains.map((d) => ({
    id: d.id,
    title: d.title,
    short: d.short,
    question: d.question,
    plate: d.plate ? REF_ICON_PLATES[d.plate] : undefined,
    status: "preparation",
  }));
  const domain = config.domains.find((d) => d.id === active) ?? config.domains[0]!;

  return (
    <Explorer sector={config.label} indexLabel={config.indexLabel} domains={domains} active={active} onSelectDomain={select}>
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
        {/* Same frame as EmptyStage, with the domain's series listed inside it. */}
        <div className={x.empty}>
          <p className="bo-label">In preparation</p>
          <p>
            {domain.series.length
              ? "This stage is being drawn. The series it will use are already checked and in the catalogue:"
              : "This stage is being drawn. Its series are being sourced for the catalogue."}
          </p>
          <ul className={c.series}>
          {domain.series.map((id) => (
            <li key={id}>
              <a href={`/data#${id}`}>{titles[id] ?? id}</a>
              <span className="bo-label">{id}</span>
            </li>
          ))}
          </ul>
        </div>
      </Stage>
    </Explorer>
  );
}
