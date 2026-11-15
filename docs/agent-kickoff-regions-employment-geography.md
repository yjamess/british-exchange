# Kickoff — Regions · Geography of Employment (Economy Domain 03 link)

**Economy plan:** [03 · Employment & Labour Market](https://app.notion.com/p/414654717685813fb55ad2fc81cd4e4f)  
**Work plan:** RG-EMP-GEO  
**Owner:** Regions · **Paths:** `src/regions/`, `data/regions/`  
**Opened:** 2026-11-15  
**No React on Economy canvas** — hand Orchestrator a Ready package; Economy G3 Geography tab stays EmptyStage until Orchestrator wires Follow / embed.

## Why Regions owns this

Economy Domain 03 Geography was **planned-not-ready** pending ownership. Orchestrator assigns **Regions & Places** as canonical owner of subnational employment / inactivity geography. Economy keeps UK national LFS only and **links**.

## Existing seed

Repo already has `src/regions/connectors/employment_rate_by_region.py`. Inventory that pin first — complete, re-pin, or replace with APS/NOMIS official series as needed.

## Goal

1. Decide and document the canonical Geography-of-Employment package(s) under `data/regions/` (employment rate and/or inactivity / unemployment by nation/region — comparable definitions).
2. Reproducible connector; checksums; provisional rules; LFS/APS caveats; geography codes.
3. Registry rows (Regions owner). Status → Validation when ready.
4. Explicit boundary note: Economy must not duplicate under `data/economy/`. LA atlas optional later — start with nations / ITL1 / GOR as published.
5. Handover: `docs/handover-regions-employment-geography.md` with recommended Economy Follow target (requirements only).

## Do not

- Edit `src/economy/`, `data/economy/`, or Economy React.
- Treat Claimant Count as ILO unemployment.
- Silently compare regional rates to UK 16–64 without a geography/age break chip in the handover.
- Fork Energy manufacturing BRES under Regions without labelling employee-jobs vs residents.
