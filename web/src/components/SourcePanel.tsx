import type { IndicatorMeta } from "@/lib/api";
import styles from "./SourcePanel.module.css";

export function SourcePanel({
  meta,
  observationCount,
  note,
}: {
  meta: IndicatorMeta;
  observationCount: number;
  note?: string;
}) {
  return (
    <aside className={styles.panel} aria-label="Source and methodology">
      <h2 className={styles.heading}>Source</h2>
      <dl className={styles.list}>
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
          <dd>{meta.geography}</dd>
        </div>
        <div>
          <dt>Frequency</dt>
          <dd>{meta.frequency}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{meta.unit}</dd>
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
      {meta.caveats ? (
        <section className={styles.block}>
          <h3>Caveats</h3>
          <p>{meta.caveats}</p>
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
