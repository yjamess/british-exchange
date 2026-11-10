import type { Metadata } from "next";
import Link from "next/link";
import { BrandRoot } from "@/brand/BrandRoot";
import { CANDIDATES } from "./candidates";
import s from "./trace.module.css";

export const metadata: Metadata = {
  title: "Emoji sources · Design lab",
  description: "Lab: open emoji candidates to trace for the sector set. Pick by code.",
};

const SRC = "/design-lab/emoji-sources/fluent/";

export default function Page() {
  return (
    <BrandRoot>
      <div className={s.page}>
        <nav className={s.nav}>
          <Link href="/design-lab/emoji/pen">Pen styles</Link>
          <span className="bo-label">Lab · tracing sources</span>
        </nav>
        <header className={s.header}>
          <p className={s.eyebrow}>Design lab · emoji sources</p>
          <h1>Pick what we trace</h1>
          <p>
            Microsoft Fluent Emoji, High Contrast set, shown in our ink. Choose one or two per sector by code. We
            redraw the choice on our grid, then add the pen shading.
          </p>
        </header>

        {CANDIDATES.map((group) => (
          <section key={group.code} className={s.sector}>
            <h2>
              <span className={s.code}>{group.code}</span> {group.sector}
            </h2>
            <ul className={s.row}>
              {group.items.map((item) => (
                <li key={item.code} className={s.cell}>
                  <span
                    className={s.glyph}
                    role="img"
                    aria-label={item.name}
                    style={{ WebkitMaskImage: `url(${SRC}${item.file})`, maskImage: `url(${SRC}${item.file})` }}
                  />
                  <span className={s.code}>{item.code}</span>
                  <span className={s.name}>{item.name}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <footer className={s.foot}>
          Sources: Microsoft Fluent Emoji (github.com/microsoft/fluentui-emoji), High Contrast, MIT licence. The
          licence text is kept with the files.
        </footer>
      </div>
    </BrandRoot>
  );
}
