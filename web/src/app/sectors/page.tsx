import type { Metadata } from "next";
import Link from "next/link";
import { SECTORS } from "@/brand/sectors";
import { PlainPage } from "@/brand/template/PlainPage";

export const metadata: Metadata = { title: "Sectors" };

/** The sector index as a page (the same list the site index panel shows). */
export default function SectorsPage() {
  return (
    <PlainPage label="Sectors" title="Eight sectors, one country.">
      <ol>
        {SECTORS.map((s) => (
          <li key={s.id}>
            <Link href={s.page ?? `/data#${s.id}`}>{s.label}</Link>
            {s.ready ? "" : " — in preparation"}
          </li>
        ))}
      </ol>
    </PlainPage>
  );
}
