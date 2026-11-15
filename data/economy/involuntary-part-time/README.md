# involuntary-part-time (YCCX)

**Owner:** Economy · EC-G2-03c  
**What it is:** UK people in part-time work because they could not find a full-time job. Seasonally adjusted. **Thousands.**

ONS title: “LFS: Part-time workers: Could not find full-time job: UK: All: Thousands: SA”. The title says **All**, not 16–64. It belongs with the EMP01 part-time family (YCBH is 16+). Do not drop it into the 16–64 workforce stack.

This is a level, not a share of part-time employment. It is not EMP16 underemployment.

## Reproduce

```bash
uv run python -m economy.connectors.involuntary_part_time
```

## Spot (LMS release 2026-10-19)

Jul 2026 (Jun–Aug) = **915** thousand.
