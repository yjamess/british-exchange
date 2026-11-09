# Generation: one working surface per question

7 November 2026. Supersedes the earlier control-label tidy-up.

Reference: [Electricity Generation brief](https://app.notion.com/p/410654717685812d9babc01e2f053c63). The brief asks for Housing's interaction grammar and distinct electrical imagery. Its fuel focus and evidence requirements do not require stacking every representation vertically.

The previous default combined a historical stream, year composition, selectable table, narrow fuel pane, another history chart, date jumps and related links. Selection added content far from the triggering control. Other tabs repeated the same problem: two comparisons; two monthly charts; a map followed by tiles, rankings and two tables.

The revised structure uses the existing shared Explorer components:

| View | Main task | Working surface |
| --- | --- | --- |
| History | How did the mix change? | Full mix on a zero baseline; fuel selection replaces it with that fuel's full-width trajectory. Year and fuel values remain in the figure strip. |
| Compare | What changed between two years? | One difference chart, two year controls, one measure. |
| Capacity | How does installed power differ from generated energy? | One paired panel with separate GW and TWh scales. Source classifications are explicitly not matched rows. |
| Map | Where are the registered stations? | One station map and one family filter. Coverage is stated. |
| Monthly | How do sources vary through the year? | One monthly line chart, with imports explicitly separate from domestic generation. |
| Data | What are the underlying values? | Annual historical or quarterly Energy Trends table. Historical fuel context persists. Source records/downloads remain reachable through the shared footer. |

Removed from the live canvas: the appended composition table/fuel mini-page, story-chip navigation, duplicate comparison and monthly graphics, atlas tiles/rankings/largest-site tables. Underlying datasets remain available in the catalogue. Related fuel navigation is a concise contextual link alongside the selected-fuel definition, not another pane.

URL query state drives the current view directly, so restored URL state is not overridden by stale component-local selection. Capacity years clamp to that source's actual coverage. Map filtering sits in the shared control location. Chart exact-value disclosures can be omitted when an enclosing explorer supplies the Data/evidence route; other chart consumers retain the existing default.

Validation: TypeScript passed. Eight generation rendering/state regression tests and twelve shared chart tests passed. These assert the number and purpose of rendered visuals, preservation of fuel context, supported capacity years and state restoration. They are not browser interaction tests. Browser verification remains blocked: the browser host is unavailable and native Arc control did not reach the local page reliably. Responsive layout and keyboard interaction still require a visual pass; no full brief sign-off is claimed.

## Station investigation and generation readings

The map now has a coordinated evidence panel, not a stack of unrelated charts. Existing REPD and DUKES points support station-name/technology search, separate storage filtering, exact technology selection, stable circle area proportional to MW, and a persistent station selection. Source-prefixed IDs prevent collisions between registers. All filters and station selection are URL-backed.

The panel reports capacity by register separately, with snapshot versions and mapped-only coverage. A selected site's capacity share uses mapped peers of the same technology and register, independent of the search query. Explicit technology matches connect to the latest complete ET 5.1 calendar year; national generation and its share are clearly separate from station capacity. No inferred station output, capacity factors, historic closures or storage durations are shown. Unsupported matches remain explicitly unavailable.

The map reuses the existing ONS December 2025 boundary evidence as a geographic background, projected with the points at a fixed longitude scale at 55°N. No spatial joins or regional-output claims are inferred. Attribution is carried with the background; missing geometry is labelled.

History now includes a brief arithmetic reading: leading sources for the selected year, or a selected fuel's value and peak under the chosen measure. A share peak can differ from an absolute-generation peak. These readings describe the data, not causes.

Validation: TypeScript; 15 station-model and generation rendering/state tests. Browser verification is still outstanding. Remaining useful work needs additional verified inputs: complete region fields for all station points; consistently dated openings/closures; compatible capacity/output cohorts. REPD's operational snapshot alone cannot answer those questions.
