import Link from "next/link";
import { BrandRoot } from "../BrandRoot";
import { FooterSectors } from "./FooterSectors";
import f from "./footer.module.css";

/** The one quiet line. About and Contribution are planned pages, not built yet. */
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/data", label: "Data" },
  { href: "/glossary", label: "Glossary" },
  { href: "/contribute", label: "Contribution" },
];

/**
 * Site footer, on every route (root layout). Electric ink ground, paper type.
 *
 *   wordmark · sector index (condensed capitals) · one quiet line: © · About · Data · Contribution
 */
export function SiteFooter() {
  return (
    <BrandRoot className={f.root}>
      <footer className={`bo-on-ink ${f.footer}`}>
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
