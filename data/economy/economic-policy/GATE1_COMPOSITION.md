# Gate 1 — Economic policy · composition studies

**Domain:** Economy 10 · **Date:** 2026-11-15 · **Rule:** three materially different studies; lock one before Gate 2 UI.  
**Brief flagship:** the economic decision ledger, with five content sections: Ledger · Institutions · Eras and turning points · Changes and reversals · Policy and evidence.

## Study A — Housing Time Machine clone

Tabs: Time Machine · Eras · Observatory · Promise · Archive, with tracks plotted under a timeline.

- Truthful: the shared `policy_event` shape fits.
- Fails the brief: the Economy brief asks for traceability (decision → measures → affected domains → indicators → evaluations), not a timeline with tracks. Economy series already live in their own domains; re-plotting them under policy marks invites before/after reading.
- Reject.

## Study B — Policy web

Graph of institutions, Acts and outcomes with typed edges drawn as a diagram.

- Expressive, and typed relationships exist in the register.
- Fails honesty at Gate 2: thirteen records and six edges do not make a web; drawn edges read as causal.
- Reject for Gate 2; relationships are listed as sentences instead.

## Study C — Decision ledger with evidence records (selected)

One Explorer shell, same as Energy Domain 10, with views mapped to the brief's five sections:

1. **Ledger** — chronological slabs, filtered by policy area and era (`MenuControl`s in the outer `ControlRow`); one open catalogue card at a time (`?event=`). The card now carries the evidence record when present: background, objectives, mechanism, measures, implementation, evaluations, related records.
2. **Institutions** — the same ledger, institution records only, with the relationships that created, amended or administered them.
3. **Eras** — the register's eras as titled panels, each listing its decisions. Browsing ranges, not claims about the period.
4. **Changes** — every relationship as a sentence (`from` kind `to`, date, source): repeals, amendments, creations.
5. **Evidence** — every linked indicator across the register, grouped by Economy domain, with the honesty line that series are context; evaluations listed where they exist, empty where they do not.
6. **Promises** — the shared Promise ledger. Nothing scored yet; every pledge lists why.

- Requires: `events.json` and `pledges.json` validated; `CatalogueDossier` extended with optional evidence sections (shared component, not a fork).
- Does not invent: causal effects, commencement dates not read, evaluations not read.

## Locked for Gate 2

**Study C.** Flagship name: **The economic decision ledger**.
