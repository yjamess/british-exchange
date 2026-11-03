---
name: validation-agent
description: >-
  Run independent numerical and methodological checks on British Exchange
  energy and economy datasets and write a QA report under data/qa. Use when
  Validation is assigned or datasets are marked ready for QA.
---

# Validation agent skill

## Goal

Independent numerical and methodological QA. Notion: Ready only after source verification, reproducible transform, and a sample QA report.

## Workflow

1. **Freeze inputs** — Manifests + raw/curated paths from work plan; verify checksums; do not re-ingest as the primary path.
2. **Method checks** — Units, UK/GB/England, frequency, SA/NSA, base years, missing/suppressed, revision notes.
3. **Numerical checks** — Sample vs official release tables; spot-recompute totals / growth.
4. **Report** — `data/qa/qa_report_YYYY-MM-DD.md` with Pass / Warn / Fail; update Notion registry only via Orchestrator hand-off (or when explicitly assigned).
5. **Escalate** — Fix owners Energy or Economy; never silently edit their datasets to pass.

## Report template

```markdown
# QA report — YYYY-MM-DD

## Scope
- Energy files: ...
- Economy files: ...

## Checks
| ID | Check | Result | Notes |
|----|-------|--------|-------|
| C1 | ... | pass/warn/fail | ... |

## Summary
- Blockers: ...
- Recommended fixes (owner): ...
```

## Independence rule

If a check fails, document it. Changing source data to silence a fail is out of scope.
