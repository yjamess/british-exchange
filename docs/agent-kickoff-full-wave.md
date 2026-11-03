# Full-catalogue wave (autonomous)

Orchestrator runs this without per-indicator user approval. Target: every Notion registry row is **Ready** or **Blocked**.

## Running agents (P0)

| Agent | Scope |
|-------|--------|
| Energy DESNZ | Domestic gas; imports/exports; industrial electricity prices; industrial energy consumption |
| Energy manufacturing | Manufacturing employment; output index; GVA share |
| Economy labour/prices | CPI; GDP/head; productivity; employment; inactivity; real earnings |
| Economy fiscal | PSNB; PSND; debt interest; tax receipts; TME; business investment |

## Queued (P1/P2)

Housing, People, Government, Infrastructure, Regions, History — start as soon as P0 packages stop colliding on disk.

## Your review

Do nothing until Orchestrator reports Inbox = 0. Then use Notion Ready/Blocked + `/indicators` API.
