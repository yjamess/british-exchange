import type { ChartMeta, IndicatorMeta } from "@/lib/api";
import styles from "./SourcePanel.module.css";

export function SourcePanel({
  meta,
  observationCount,
  note,
  chart,
}: {
  meta: IndicatorMeta;
  observationCount: number;
  note?: string;
  chart?: ChartMeta;
}) {
  const displayTitle = chart?.display_title ?? meta.title;
  const caveats = chart?.caveats || meta.caveats;
  const warnings = chart?.compatibility_warnings ?? [];

  return (
    <aside className={styles.panel} aria-label="Source and methodology">
      <h2 className={styles.heading}>Source</h2>
      <dl className={styles.list}>
        <div>
          <dt>Series title</dt>
          <dd>{displayTitle}</dd>
        </div>
        <div>
          <dt>Publisher</dt>
          <dd>{meta.publisher}</dd>
        </div>
        <div>
          <dt>Series</dt>
          <dd>
            <code>{meta.series_id}</code>
          </dd>
        </div>
        <div>
          <dt>Geography</dt>
          <dd>
            {meta.geography}
            {chart?.england_only ? " (England only — not UK)" : ""}
          </dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{meta.frequency}</dd>
        </div>
        <div>
          <dt>Unit / measure</dt>
          <dd>
            {meta.unit}
            {chart?.is_cpi ? " · CPI (not CPIH)" : ""}
            {chart?.is_gva_cvm_weight ? " · CVM industry weights, not current-price share" : ""}
            {chart?.is_rail_ppm ? " · Public Performance Measure (PPM)" : ""}
          </dd>
        </div>
        <div>
          <dt>Chart kind</dt>
          <dd>{(chart?.chart_kind ?? "time_series").replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Observations</dt>
          <dd>{observationCount.toLocaleString("en-GB")}</dd>
        </div>
        <div>
          <dt>Licence</dt>
          <dd>{meta.licence}</dd>
        </div>
        <div>
          <dt>Official source</dt>
          <dd>
            <a href={meta.source_url} rel="noreferrer" target="_blank">
              Open publisher page
            </a>
          </dd>
        </div>
      </dl>
      {meta.revision_notes ? (
        <section className={styles.block}>
          <h3>Revisions</h3>
          <p>{meta.revision_notes}</p>
        </section>
      ) : null}
      {caveats ? (
        <section className={styles.block}>
          <h3>Caveats</h3>
          <p>{caveats}</p>
        </section>
      ) : null}
      {warnings.length > 0 ? (
        <section className={styles.block}>
          <h3>Compatibility</h3>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </section>
      ) : null}
      {note ? (
        <section className={styles.block}>
          <h3>Chart notes</h3>
          <p>{note}</p>
        </section>
      ) : null}
    </aside>
  );
}
