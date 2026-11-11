# Royal Mint permission: coin reverse designs

**Status:** granted. The owner confirmed it on 2026-11-11. The owner holds the written reply from The Royal Mint; it is not stored in this repository.

## Scope

- **Designs:** the King Charles III definitive reverses (2023 onward):
  - £2: national flowers (rose, thistle, daffodil, shamrock)
  - £1: bees
  - 50p: Atlantic salmon
  - 20p: puffin
  - 10p: capercaillie
  - 5p: oak leaves and acorns
  - 2p: red squirrel
  - 1p: hazel dormouse
- **Treatment:** the site's halftone, printed in one ink, is approved.
- **Method:** each face is traced from a reference photograph. Royal Mint guidance allows this.
- **Reverses only.** The obverse, with the King's portrait, is not drawn or used.

## Conditions

- Reproduce each design faithfully and whole. Do not crop, deface, break up or alter it.
- Use the designs in good taste.
- Do not use them as a brand. They must not stand for British Exchange or suggest that The Royal Mint endorses the site.

## Where the designs are used

- Page: `/economy?domain=inflation&view=index`, in the "What £1 buys" instrument (`web/src/brand/economy/PoundBuys.tsx`).
- Plates: `COIN_PLATES` in `web/src/brand/Plate.tsx`. The files are `web/public/brand/plates/c-coin-{2pound,1pound,50p,20p,10p,5p,2p,1p}.png`.
- Generator: `.claude/skills/observatory-imprint/scripts/coin-types.py`.

## References

- Source register: `data/icon-refs/coins/SOURCES.json`. It gives the Royal Mint file URL, the page, the retrieval date and a sha256 for each reference.
- Fetch script: `data/icon-refs/coins/fetch_refs.py`. Downloads go to `data/icon-refs/coins/raw/`.

If the permission changes or is withdrawn, regenerate the coins without designs or remove the instrument's coin plates.
