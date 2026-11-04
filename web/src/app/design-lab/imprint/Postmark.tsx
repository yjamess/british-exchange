"use client";

/** Postmark — a cancelled-ink circle with wavy bars. Rough edge + ink voids via SVG filter. */

import { useId } from "react";

type Props = {
  top?: string;
  bottom?: string;
  date?: string;
  year?: string;
  color?: string;
  className?: string;
  waves?: boolean;
};

export function Postmark({
  top = "BRITAIN EXCHANGE",
  bottom = "VERIFIED AT SOURCE",
  date = "03 NOV",
  year = "2026",
  color = "#111318",
  className,
  waves = true,
}: Props) {
  const id = useId().replace(/:/g, "");
  const arcTop = `pm-top-${id}`;
  const arcBot = `pm-bot-${id}`;
  const rough = `pm-rough-${id}`;

  return (
    <svg className={className} viewBox="0 0 300 130" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <filter id={rough} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="2.6" result="shaken" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.22" numOctaves="2" seed="11" result="wear" />
          <feColorMatrix
            in="wear"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 1.9"
            result="voids"
          />
          <feComposite in="shaken" in2="voids" operator="in" />
        </filter>
        <path id={arcTop} d="M 22 65 A 43 43 0 0 1 108 65" />
        <path id={arcBot} d="M 18 65 A 47 47 0 0 0 112 65" />
      </defs>
      <g filter={`url(#${rough})`} fill="none" stroke={color} strokeWidth="2.4" opacity="0.72">
        <circle cx="65" cy="65" r="56" />
        <circle cx="65" cy="65" r="35" strokeWidth="1.6" />
        <text
          fill={color}
          stroke="none"
          fontFamily="var(--font-mono), monospace"
          fontSize="10.5"
          letterSpacing="2.2"
          fontWeight="500"
        >
          <textPath href={`#${arcTop}`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fill={color} stroke="none" fontFamily="var(--font-mono), monospace" fontSize="8.5" letterSpacing="2">
          <textPath href={`#${arcBot}`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
            {bottom}
          </textPath>
        </text>
        <text x="65" y="63" fill={color} stroke="none" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="13" fontWeight="500" letterSpacing="1">
          {date}
        </text>
        <text x="65" y="80" fill={color} stroke="none" textAnchor="middle" fontFamily="var(--font-mono), monospace" fontSize="11" letterSpacing="2">
          {year}
        </text>
        {waves
          ? [0, 1, 2, 3, 4].map((i) => {
              const y = 33 + i * 16;
              let d = `M 128 ${y}`;
              for (let k = 0; k < 12; k += 1) {
                const x = 128 + k * 14;
                d += ` Q ${x + 7} ${y + (k % 2 ? 6 : -6)} ${x + 14} ${y}`;
              }
              return <path key={i} d={d} strokeWidth="2.2" />;
            })
          : null}
      </g>
    </svg>
  );
}
