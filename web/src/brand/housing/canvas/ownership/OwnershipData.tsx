"use client";

import { useEffect } from "react";
import type { HousingV1 } from "../../load";
import type { InsideFoot } from "../quality/InsideHomes";
import s from "./ownership.module.css";

type Props = { sources: HousingV1["sources"]; onFoot?: (foot: InsideFoot) => void };

const IDS = [
  "mortgage-approvals",
  "residential-mortgage-book",
  "mortgage-rate-2yr-fixed",
  "household-net-property-wealth",
];

const GLOSSARY = [
  {
    term: "Stock",
    body: "Outstanding mortgage balances and arrears balances, measured at quarter end.",
  },
  {
    term: "Flow",
    body: "Approvals, advances and commitments during a month or a quarter. A flow is not added to the stock.",
  },
  {
    term: "Title",
    body: "The registered legal proprietor. Not occupation, and not an inferred beneficial owner.",
  },
  {
    term: "Charge",
    body: "A lender’s security over the title. Lending does not make the lender the owner.",
  },
  {
    term: "Net property wealth",
    body: "A household’s self-valuation of property, minus mortgage debt. Not a registered title, and not the FCA loan book.",
  },
];

export function OwnershipData({ sources, onFoot }: Props) {
  const loaded = IDS.flatMap((id) => (sources[id] ? [sources[id]] : []));
  const publishers = [...new Set(loaded.map((src) => src.publisher))].join(" · ");

  useEffect(() => {
    onFoot?.({
      source: publishers || "Ownership and property finance",
      coverage: "Stocks and flows are separate series. Quoted mortgage rates are the Economy series already used on Affordability.",
      definition: GLOSSARY.map((item) => `${item.term}. ${item.body}`),
      caveats: [],
      dataHref: "/data",
    });
  }, [onFoot, publishers]);

  return (
    <div className={s.root}>
      <p className={s.lede}>The series behind this domain.</p>
      <section className={s.panel}>
        <h3 className={s.sectionTitle}>Loaded series</h3>
        {loaded.length === 0 ? (
          <p className={s.note}>No ownership series are loaded yet.</p>
        ) : (
          <ul className={s.seriesList}>
            {loaded.map((src) => (
              <li key={src.id}>
                {src.title} · {src.publisher} · {src.count} observations
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
