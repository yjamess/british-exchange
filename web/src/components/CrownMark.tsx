/** Reserved crown mark — placeholder until the real brand mark lands. */

import styles from "./CrownMark.module.css";

export function CrownMark() {
  return (
    <div className={styles.mark} aria-label="Crown mark placeholder">
      <pre className={styles.ascii} aria-hidden="true">{`  .:::.
 ::::: 
':::::'
 ||||| 
 ''''' `}</pre>
      <span className={styles.label}>Crown mark · reserved</span>
    </div>
  );
}
