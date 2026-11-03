---
name: orchestrator
description: >-
  Assign British Exchange tasks across Energy, Economy, and Validation agents,
  prevent path/ownership overlap, and update the work plan. Use when planning
  work, reviewing progress, or acting as the orchestrator.
---

# Orchestrator skill

## When invoked

1. Read `AGENTS.md` and `docs/work-plan.md`.
2. List open tasks; assign any unowned work to exactly one agent.
3. Block Validation until the datasets it will check are marked ready.
4. After a milestone, write a short review into the work plan (Shipped / Blocked / Next).

## Anti-duplication checklist

- [ ] Energy only: DESNZ, `src/energy`, `data/energy`
- [ ] Economy only: ONS, `src/economy`, `data/economy`
- [ ] Validation only: checks + `data/qa` (no silent data edits)
- [ ] No two agents own the same output file

## Work plan task format

```markdown
### T0N — Title
- Owner: Energy | Economy | Validation | Orchestrator
- Status: todo | in_progress | blocked | done
- Inputs: ...
- Output: ...
- Notes: ...
```
