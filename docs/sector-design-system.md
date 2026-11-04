# Sector design system · November 2026

The housing regeneration establishes the sector experience. The homepage is deferred. Current examples: `/housing`, `/design-lab/housing`, and `/design-lab/system` (the component index, including `#imprint`). Both housing routes render the same component and canonical loader.

## Visual language

- Reading surface: warm paper `#F6F5F0`; chart surfaces `#FFFEFA`; ink `#213653`; secondary text `#637080`; selection/comparison accent `#A9472C`.
- Typography: Helvetica Neue / Helvetica / Arial at normal widths. Medium, tightly spaced display headings; regular, tabular headline figures; comfortable body text. System monospace is reserved for dates, units and small section labels. No condensed display or italic editorial voice.
- Stable reading order: sector introduction → small set of current metrics → one topic navigation → question → summary and chart → optional comparison.
- A 1360px outer container with responsive gutters. A 290px narrative column sits beside the main plot at wide sizes; these stack below 760px. Metrics become a 2×2 grid. Topic navigation scrolls horizontally on narrow screens.
- Flat surfaces, fine rules, minimal rounding on controls. Dark ink is used selectively for orientation and place context, rather than as a field behind every section.
- One decorative motif per composition. The terrace elevation is fine vector penwork, not a source-derived geographical diagram. Small static ASCII marginalia and glyphs remain outside plots. No stamp shadows, gold panels or dense texture bands.

## Reusable parts

`web/src/brand/sector/` contains:

- `sector.module.css`: scoped colours, typography, layout and chart conventions.
- `SectionHeading`: section number, topic, plain-language question, optional description/control.
- `MetricStrip`: selectable figures with explicit scope and period. Figures come from the sector loader, never illustrative numbers.
- `Choice`: labelled, keyboard-operable measure/range buttons with explicit pressed state.
- `Evidence`: compact disclosure for definition, caveat and original release link.
- `TrendChart`: linear time scale, precise axes, distinct series, pointer inspection, keyboard date slider and exact-value table. Broken strokes identify provisional observations. Bars use a zero baseline for non-negative counts. Negative values remain in the domain. Missing observations appear as missing, not as another date's value.
- `System.tsx`: live specimens using the same components and housing data.

Housing owns its terrace drawing, topical content, selected measures, geographical comparison and layout composition. Future sectors should reuse the reading and control contracts while choosing charts suited to their own data. Do not copy housing's subject-specific arrangement wholesale.

## Housing behaviours

- Overview: affordability finding, followed by regional price comparison.
- House prices: UK average / property types / new versus existing homes.
- Renting: annual change / private rental price index (January 2023 = 100).
- Affordability: England median price / workplace-based annual earnings.
- Housing supply: quarterly new-build completions / annual dwelling tenure shares.
- Time range: all available years or trailing ten years.
- Regions: all 12 nations/English regions in the existing curated series; nominal prices or indices rebased to the first observation in 1995. UK comparison remains explicit.
- Topic state uses URL fragments, including existing `#afford`, and supports arrow/Home/End keyboard navigation. Existing `#place-CODE` links select the requested geography.

## Verification

TypeScript compilation and focused ESLint checks; browser verification of every topic and measure switch, ten-year filtering, keyboard date selection and tab movement, chart tables, region selection and rebasing. Desktop and 390px mobile layouts inspected. No ingestion, canonical observations or registry statuses were changed.
