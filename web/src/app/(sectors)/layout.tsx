import { AsciiAtmosphere } from "@/components/AsciiAtmosphere";
import styles from "./sector.module.css";

/** Shared navy field + subliminal ASCII for all sector pages. */
export default function SectorsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.frame}>
      <AsciiAtmosphere tone="hint" />
      {children}
    </div>
  );
}
