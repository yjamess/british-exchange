/** Atmospheric ASCII field — Dragonfly-style depth on navy, not a literal brand box. */

import styles from "./AsciiAtmosphere.module.css";

const FIELD = `
        .  .    *     .      .   *    .
   .         .::.         .:::.      .
      .   .:'  .:     .  .:'  ':.  .
          ::.  ::         ::    ::
     .    ':.  .:'   .    ':.  .:'    .
           ''::''          ''::''
      .  .::::.   .   .  .::::::.  .
        .:'  ':.       .:'      ':.
   *    ::    ::   *   ::   ##   ::     .
        ':.  .:'       ':.      .:'
      .  '::::'   .   .  '::::::'  .
           .::.          .::::.
      .   .:'  ':.    . .:'  ':.   .
          ::.  ::         ::    ::
     .    ':.  .:'        ':.  .:'
           ''::''    *     ''::''
   .    .          .           .     *
        .  .::.         .::.       .
           ::::         ::::
      .    '::'    .    '::'    .
 .              .              .
      .-=[ UK ]=-.        .-=[ BX ]=-.
     /  .--.--.  \\      /   .----.   \\
    |  /  ||  \\  |    |   /  ||  \\   |
    |  \\  ||  /  |    |   \\  ||  /   |
     \\  '--''--  /      \\   '----'   /
      '-=[  ]=-'        '-=[  ]=-'
   .     |||||    .        |||||    .
         |||||             |||||
 .   .   '''''   .    .    '''''  .
      .-.   .-.     crowns · flags · plans
     (   )-(   )    .     technical field
      '-'   '-'
   .      .:::.      .      .:::.
         :::::            :::::
    *    ':::'   .        ':::'    .
         .:::.            .:::.
        :::::::          :::::::
         ':::'            ':::'
   .  .   ' '   .    .     ' '   .
`;

type Tone = "field" | "hint";

export function AsciiAtmosphere({ tone = "field" }: { tone?: Tone }) {
  return (
    <div className={tone === "hint" ? styles.hint : styles.field} aria-hidden="true">
      <pre className={styles.pre}>{FIELD}</pre>
      <pre className={`${styles.pre} ${styles.shift}`}>{FIELD}</pre>
    </div>
  );
}
