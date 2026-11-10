# Explorer URL and browser-history contract

Makes Housing and Energy navigation reliable enough for cross-domain connections. Typed edges live in the [Connections contract](connections-contract.md); this file is the URL substrate (`push` / `replace` / `retain`).

## Expected behaviour

| Action | Expected result | History |
| --- | --- | --- |
| Switch sector domain | Navigable, shareable destination | **push** |
| Change chart control | URL accurately reflects the selection | **replace** |
| Press browser Back | Restores the previous domain destination | — |
| Open a shared link | Reconstructs the intended view and filters | — |
| Enter unsupported selection | Explicit fallback (default view; drop unknown keys) | — |
| Follow a future connection | Retains only semantically compatible context | **push** |

## Implementation

| Piece | Path |
| --- | --- |
| Shared utility | `web/src/brand/navigation/explorer-url.ts` |
| Energy adapter + hook | `web/src/brand/energy/navigation.ts` (`useEnergyNavigation`) |
| Param declarations | `web/src/brand/energy/views/<domain>.ts` → `params` per view |
| Tests | `npm run test:url` |

## Portability rules

- **Within a domain, view change:** keep only keys declared on the **destination view** (not the union of all views). So `measure` on Generation › History does not linger on Generation › Map.
- **Across domains:** keep only keys listed in **both** domains’ `portableParams` and allowed on the destination. Energy currently ports **`year` only**.
- **Do not** mark polysemous keys portable: `measure`, `region`, `event`, `fuel`, `basis`, …
- **Connections:** each declared edge supplies `retain: […]` into `switchExplorerDomain` / `goDomain` / `resolveConnectionHref` (see `web/src/brand/connections/`).

## Adoption

- **Energy shell:** domain hops use `goDomain` (push).
- **All Energy domain canvases:** controls use `useEnergyNavigation("<domain>").sync` (replace + view-scoped prune). No local `history.replaceState`.
- **Housing:** already push-on-domain / replace-on-control; point `setQuery` at this utility when convenient so both sectors share one implementation.

## Adding a view

1. Declare `id`, `params`, and evidence in `views/<domain>.ts`.
2. Use only those keys in the canvas `sync({ … })` calls.
3. Run `npm run test:evidence` and `npm run test:url`.
