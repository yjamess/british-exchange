import Link from "next/link";
import { BrandRoot } from "../BrandRoot";
import p from "./page.module.css";
import s from "./explorer.module.css";

/**
 * What a sector route shows while its first server render is on the way (`loading.tsx`).
 * Same frame as `SectorPage` + `Explorer` — crumb, the ink strip where the plate will be,
 * rail column, canvas — so the page does not collapse to one line and the footer stays put.
 * Rail hops never show this: they fetch in place (see `useDomainData`).
 */
export function SectorSkeleton({ label, name }: { label?: string; name?: string }) {
  return (
    <BrandRoot>
      <div className={p.page} aria-busy="true">
        <nav aria-label="Breadcrumb" className={`bo-wrap bo-label ${p.crumb}`}>
          <Link href="/sectors">Sectors</Link>
          {label ? (
            <>
              {" "}
              / <span aria-current="page">{label}</span>
            </>
          ) : null}
        </nav>
        <section className={p.hero} data-size="full">
          <div className={`${p.heroPlate} ${p.skeletonPlate}`} aria-hidden="true" />
          <div className={`bo-on-ink ${p.heroTitle}`}>
            <div className={`bo-wrap ${p.heroTitleInner}`}>
              <h1 className={`bo-statement ${p.sectorName}`}>{name ?? " "}</h1>
            </div>
          </div>
        </section>
        <main className={p.main}>
          <div className={s.shell}>
            <aside className={s.skeletonRail} aria-hidden="true" />
            <section className={s.canvas}>
              <p className="bo-label" role="status" style={{ padding: "var(--bo-s6) 0" }}>
                Loading{label ? ` ${label.toLowerCase()}` : ""}…
              </p>
            </section>
          </div>
        </main>
      </div>
    </BrandRoot>
  );
}
