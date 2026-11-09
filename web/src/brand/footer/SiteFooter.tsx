import Link from "next/link";
import { BrandRoot } from "../BrandRoot";
import { FooterField } from "./FooterField";
import { FooterSectors } from "./FooterSectors";
import f from "./footer.module.css";

/** The one quiet line. About and Contribution are planned pages, not built yet. */
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/data", label: "Data" },
  { href: "/contribute", label: "Contribution" },
];

/**
 * Site footer, on every route (root layout). Design: "Footer — ASCII field"
 * (British Exchange Footer canvas). Electric ink ground, paper type.
 *
 *   left   wordmark · sector index (condensed capitals) · one quiet line: © · About · Data · Contribution
 *   right  dot field: one glyph in the corner, turning from the country into each sector
 */
export function SiteFooter() {
  return (
    <BrandRoot className={f.root}>
      <footer className={`bo-on-ink ${f.footer}`}>
        <FooterField />

        <div className={`bo-wrap ${f.inner}`}>
          <div className={f.copy}>
            <Link href="/" className={`bo-statement ${f.wordmark}`}>
              British Exchange
            </Link>

            <FooterSectors />

            <p className={f.base}>
              <span>© {new Date().getFullYear()} British Exchange</span>
              {LINKS.map((p) => (
                <Link key={p.href} href={p.href}>
                  {p.label}
                </Link>
              ))}
            </p>
          </div>
        </div>
      </footer>
    </BrandRoot>
  );
}
