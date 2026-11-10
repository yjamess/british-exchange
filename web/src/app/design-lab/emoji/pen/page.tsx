import type { Metadata } from "next";
import Link from "next/link";
import { BrandRoot } from "@/brand/BrandRoot";
import { PEN_STYLES, PenMoney } from "./PenMoney";
import s from "./pen.module.css";

export const metadata: Metadata = {
  title: "Pen styles · Design lab",
  description: "Lab: one emoji drawn in five pen-and-ink styles, to choose one before drawing the set.",
};

export default function Page() {
  return (
    <BrandRoot>
      <div className={s.page}>
        <nav className={s.nav}>
          <Link href="/design-lab/emoji">Sector emoji</Link>
          <span className="bo-label">Lab · style study</span>
        </nav>
        <header className={s.header}>
          <p className={s.eyebrow}>Design lab · pen styles</p>
          <h1>One emoji, five pens</h1>
          <p>Money with wings, lit from the upper left each time. Only the way the pen makes the shade changes.</p>
        </header>

        <div className={s.grid}>
          {PEN_STYLES.map((st, i) => (
            <article key={st.id} className={s.card}>
              <p className={s.num}>{String.fromCharCode(65 + i)}</p>
              <div className={s.hero}>
                <PenMoney style={st.id} size={240} uid={`h-${st.id}`} />
              </div>
              <h2>{st.name}</h2>
              <p className={s.note}>{st.note}</p>
              <div className={s.sizes}>
                <span>
                  <PenMoney style={st.id} size={96} uid={`m-${st.id}`} />
                  96
                </span>
                <span>
                  <PenMoney style={st.id} size={40} uid={`s-${st.id}`} />
                  40
                </span>
                <span className={s.negative}>
                  <PenMoney style={st.id} size={96} uid={`n-${st.id}`} />
                  Electric
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </BrandRoot>
  );
}
