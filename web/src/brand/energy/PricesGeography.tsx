"use client";

/**
 * Prices › Geography — map + ranked regions on this page (Consumption Energy Geography shape).
 * Choropleth uses English regions only where publisher labels align; full list stays in RankBars.
 * Search lives in the explorer control row; query is passed in.
 */

import { useMemo } from "react";
import { RegionMap } from "../map";
import { RankBars } from "../instrument/TimeChart";
import { explorerClasses as t } from "../template";
import {
  englandCodeForPriceId,
  englandMapFromPriceRanks,
  priceIdForEnglandCode,
  type PriceRegionRank,
} from "./prices-model";
import s from "./generation.module.css";

export type PricesGeographyDetail = {
  label: string;
  value: number;
  lines?: { label: string; value: string }[];
  note?: string;
};

export function PricesGeography({
  mapTitle,
  rankTitle,
  ranks,
  reference,
  selected,
  onSelect,
  query,
  onQuery,
  format,
  mapAria,
  detail,
}: {
  mapTitle: string;
  rankTitle: string;
  ranks: PriceRegionRank[];
  reference?: { label: string; v: number } | null;
  selected: string;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  format: (v: number) => string;
  mapAria: string;
  detail: PricesGeographyDetail | null;
}) {
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return ranks;
    return ranks.filter((r) => r.label.toLowerCase().includes(q));
  }, [ranks, q]);

  const mapData = useMemo(() => englandMapFromPriceRanks(ranks, format), [ranks, format]);
  const mapSelected = selected ? englandCodeForPriceId(selected, ranks) : null;
  const selectedRow = ranks.find((r) => r.id === selected) ?? null;
  const panelOpen = Boolean(selected || q);

  const toggle = (id: string) => onSelect(selected === id ? "" : id);

  return (
    <div className={s.stack}>
      <div className={`${s.atlasLayout} ${panelOpen ? "" : s.atlasLayoutMapOnly}`}>
        <div className={s.atlasMap}>
          <h3 className={t.stageTitle}>{mapTitle}</h3>
          {mapData.length === 0 ? (
            <p className={s.links}>
              No English-region names align with this cut for the map. Use search or the ranked list —
              Scotland, Wales, Northern Ireland and cross-border areas stay there.
            </p>
          ) : (
            <RegionMap
              size="stage"
              data={mapData}
              selected={mapSelected}
              onSelect={(code) => {
                onQuery("");
                const id = priceIdForEnglandCode(code, ranks);
                if (id) toggle(id);
              }}
              label={mapAria}
              legendFormat={format}
              legendUnit="£ a year"
            />
          )}
        </div>

        {panelOpen && (
          <aside className={s.geoPanel} aria-label="Region reading">
            <div className={s.geoPanelHead}>
              <p className="bo-label">{q && !selected ? "Search" : "Region"}</p>
              <button
                type="button"
                className={t.textButton}
                onClick={() => {
                  onQuery("");
                  if (selected) onSelect("");
                }}
              >
                Clear
              </button>
            </div>

            {selectedRow && detail ? (
              <>
                <h3 className={s.stationName}>{detail.label}</h3>
                <p className={s.stationValue}>
                  <span className="bo-fig">{format(detail.value)}</span>
                  <span className="bo-label">a year</span>
                </p>
                {detail.note ? <p className={s.links}>{detail.note}</p> : null}
                {detail.lines && detail.lines.length > 0 ? (
                  <dl className={s.geoPanelMeta}>
                    {detail.lines.map((line) => (
                      <div key={line.label}>
                        <dt>{line.label}</dt>
                        <dd>{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {!mapSelected ? (
                  <p className={s.links}>
                    Not drawn on the English map — use the ranked list for this area.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h3 className={s.stationName}>Find a region</h3>
                <p className={s.links}>
                  {filtered.length === 0
                    ? "No matching regions."
                    : "Choose a region to open its reading."}
                </p>
                {filtered.length > 0 ? (
                  <ul className={s.stationList}>
                    {filtered.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onQuery("");
                            onSelect(r.id);
                          }}
                        >
                          <span>{r.label}</span>
                          <span className="bo-fig">{format(r.v)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </aside>
        )}
      </div>

      <section className={s.panel}>
        <h3 className={t.stageTitle}>{rankTitle}</h3>
        {ranks.length === 0 ? (
          <p className={s.links}>No regional figures for this selection.</p>
        ) : (
          <RankBars
            label={rankTitle}
            rows={(q ? filtered : ranks).map((r) => ({
              ...r,
              active: selected ? r.id === selected : false,
            }))}
            reference={reference ?? undefined}
            format={format}
            onSelect={(id) => {
              onQuery("");
              toggle(id);
            }}
          />
        )}
      </section>
    </div>
  );
}
