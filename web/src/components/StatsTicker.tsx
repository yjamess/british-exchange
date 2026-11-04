import Link from "next/link";
import type { TickerStat } from "@/lib/latest";
import styles from "./StatsTicker.module.css";

export function StatsTicker({ stats }: { stats: TickerStat[] }) {
  if (stats.length === 0) {
    return (
      <div className={styles.ticker} role="status">
        <span className={styles.item}>Live ticker · awaiting API</span>
      </div>
    );
  }

  const loop = [...stats, ...stats];

  return (
    <div className={styles.ticker} aria-label="Key indicators">
      <div className={styles.track}>
        {loop.map((stat, i) => (
          <Link
            key={`${stat.id}-${i}`}
            href={stat.href}
            className={styles.item}
          >
            <span className={styles.label}>{stat.label}</span>
            <span className={styles.value}>{stat.value}</span>
            <span className={styles.period}>{stat.period}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
