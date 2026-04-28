# V1 Warehouse Reuse Workflow

The V1 Engine Explorer stores approved `V1Summary.json` files in the browser-local warehouse and computes reusable metric evidence for each engine.

## Current Workflow

1. Load a `V1Summary.json`.
2. The app normalizes the summary, computes metric rows, and stores the engine locally.
3. Use Aggregate analysis to review warehouse readiness:
   - stored engine count
   - usable/stale/skipped record counts
   - common benefit domains
   - common formula functions
   - highest-risk and most-complex engines
4. Use Best matches for current engine to rank stored approved V1 engines against the currently loaded engine.
5. Review the candidate report evidence:
   - overall weighted similarity
   - benefit architecture similarity
   - formula implementation similarity
   - semantic field similarity
   - structural graph similarity
   - risk/complexity similarity
   - top differences
   - strongest similarities
   - warnings and missing-evidence diagnostics

The similarity score is reuse evidence, not an approval decision. A high score means the candidate deserves review as a reusable starting point.

## Warehouse Portability

The browser API exposes:

- `engineWarehouse.exportBundle()`
- `engineWarehouse.importBundle(bundle)`
- `engineWarehouse.clear()`

Bundles include schema metadata, metric version metadata, stored summaries, metric rows, counts, and diagnostics. Import validates records and recomputes stale or missing metrics when a usable summary is present.

## Known Boundary

R5 Summary Builder output and entitlement state-machine logic are not integrated in this feature.

The R5 bridge should wait until paired evidence exists:

- R5 output JSON for a plan
- approved or reused V1 summary JSON for the same or closely related plan

Without paired R5/V1 evidence, the app can prepare schema adapters but cannot validate whether provision similarity predicts reusable V1 implementation.
