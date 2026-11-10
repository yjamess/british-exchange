"use client";

/**
 * Recorded sales search — HM Land Registry Price Paid, one calendar year.
 * This is not the UK House Price Index monthly volume chart beside it.
 * When PostgreSQL is not configured the API returns 503; visitors see an
 * unavailable state. The response detail is logged here, not printed.
 */

import { useId, useState } from "react";
import { fmt, fmtT, toT } from "../../data";
import type { HousingV1 } from "../load";
import s from "./explorer.module.css";
import { explorerClasses as t } from "../..";

type Result = {
  transaction_id: string;
  price: number;
  transfer_date: string;
  postcode: string;
  property_type: string;
  new_build: boolean;
  tenure: string;
  paon: string;
  saon: string;
  street: string;
  locality: string;
  town: string;
  district: string;
  county: string;
};

type Payload = {
  query: string;
  year: number;
  count: number;
  returned: number;
  attribution: string;
  caveat: string;
  results: Result[];
};

const UNAVAILABLE =
  "Recorded-sales search is deferred on this database plan (the full year is too large for the free Postgres quota). The monthly UK transaction count below is a different series and is unaffected.";

function addressLine(r: Result): string {
  const bits = [r.saon, r.paon, r.street, r.locality, r.town].filter(Boolean);
  return bits.join(", ");
}

export function PricePaidSearch({
  apiBase,
  meta,
}: {
  apiBase: string;
  meta: HousingV1["pricePaid"];
}) {
  const uid = useId().replace(/:/g, "");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [payload, setPayload] = useState<Payload | null>(null);
  const down = unavailable || !meta.available;

  const run = async () => {
    const query = q.trim();
    if (query.length < 2) {
      setError("Enter a postcode or street (at least 2 characters).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/housing/price-paid?q=${encodeURIComponent(query)}&limit=40`);
      if (!res.ok) {
        let detail = "";
        try {
          const body = (await res.json()) as { detail?: unknown };
          if (typeof body.detail === "string") detail = body.detail;
        } catch {
          /* status is enough for the log */
        }
        console.error("[price-paid] search failed", { status: res.status, detail });
        if (res.status === 503 || res.status >= 500) {
          setUnavailable(true);
          setPayload(null);
          return;
        }
        setError("That search could not be completed. Try a postcode or a street and town.");
        return;
      }
      const data = (await res.json()) as Payload;
      setPayload(data);
    } catch (err) {
      console.error("[price-paid] search failed", err);
      setPayload(null);
      setError("Recorded-sales search could not be reached. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={s.pricePaid} aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`} className={t.stageTitle}>
        Recorded sales
      </h3>
      {down ? (
        <div className={s.pricePaidUnavailable} role="status">
          <p className="bo-label">Unavailable</p>
          <p>{UNAVAILABLE}</p>
        </div>
      ) : (
        <form
          className={s.pricePaidForm}
          onSubmit={(e) => {
            e.preventDefault();
            void run();
          }}
        >
          <label className={t.control} htmlFor={`${uid}-q`}>
            <span className="bo-label">Postcode or street</span>
            <input
              id={`${uid}-q`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Postcode or street and town"
              autoComplete="off"
            />
          </label>
          <button type="submit" className={s.pricePaidGo} disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>
      )}
      {error && (
        <p className={s.pricePaidError} role="alert">
          {error}
        </p>
      )}
      {payload && !down && (
        <>
          <p className={t.tableNote}>
            {payload.returned} shown · {fmt.count(payload.count)} sales in calendar year {payload.year}
          </p>
          {payload.results.length === 0 ? (
            <p className={t.tableNote}>No matching sales in calendar year {payload.year}.</p>
          ) : (
            <div className={t.tableWrap}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th scope="col">Address</th>
                    <th scope="col">Postcode</th>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.results.map((r) => (
                    <tr key={r.transaction_id}>
                      <th scope="row">
                        {addressLine(r)}
                        {r.new_build ? " · new" : ""}
                      </th>
                      <td>{r.postcode || "—"}</td>
                      <td>{fmtT(toT(r.transfer_date))}</td>
                      <td>
                        {r.property_type}
                        {r.tenure ? ` · ${r.tenure}` : ""}
                      </td>
                      <td>{fmt.gbp(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={t.tableNote}>{payload.caveat}</p>
          <p className={t.tableNote}>{payload.attribution}</p>
        </>
      )}
    </section>
  );
}
