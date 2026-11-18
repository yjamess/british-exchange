/**
 * Shared band fills for SVG choropleths + legends (WorldChoropleth, legend swatches).
 * v1.1 maps: each band is a stepped solid tone of the one ink (`toneColor`), not a dot screen.
 * Ids are unchanged (`{prefix}-band-{i}`, `{prefix}-missing`) so existing `url(#…)` fills keep working.
 */

import { TONE_STEPS, toneColor } from "./model";

function ToneDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      {TONE_STEPS.map((_, i) => (
        <pattern key={i} id={`${idPrefix}-band-${i}`} width={8} height={8} patternUnits="userSpaceOnUse">
          <rect width={8} height={8} fill={toneColor(i)} />
        </pattern>
      ))}
    </>
  );
}

export function BandScreenDefs({
  idPrefix,
  /** Keeps the not-observed slash at a fixed screen pitch while the map zooms. */
  zoom = 1,
}: {
  idPrefix: string;
  zoom?: number;
}) {
  const scale = 1 / Math.max(0.001, zoom);
  return (
    <defs>
      <ToneDefs idPrefix={idPrefix} />
      <pattern
        id={`${idPrefix}-missing`}
        width={6}
        height={6}
        patternUnits="userSpaceOnUse"
        patternTransform={`rotate(45) scale(${scale})`}
      >
        {/* Not observed: paper with a hairline slash, never a faded fill. */}
        <rect width={6} height={6} fill="var(--bo-paper)" />
        <path d="M0 0V6" stroke="var(--bo-ink-40)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </pattern>
    </defs>
  );
}

/** Legend swatches — same tones as the map. */
export function LegendBandDefs({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      <ToneDefs idPrefix={idPrefix} />
    </defs>
  );
}
