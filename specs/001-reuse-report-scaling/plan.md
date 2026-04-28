# Implementation Plan: Approved V1 Reuse Candidate Report and Warehouse Scaling

**Branch**: `001-reuse-report-scaling` | **Date**: 2026-04-27 | **Spec**: `specs/001-reuse-report-scaling/spec.md`  
**Input**: Feature specification from `/specs/001-reuse-report-scaling/spec.md`

## Summary

Build the next hardening layer on top of the existing browser-local V1 warehouse. The feature turns ranking results into an explainable reuse-candidate report, adds warehouse schema/version diagnostics, prepares import/export of stored approved V1 evidence, and adds performance coverage for larger synthetic warehouses. R5/provision-state-machine integration remains explicitly out of scope until paired R5/V1 evidence exists.

## Technical Context

**Language/Version**: Browser JavaScript inside `index.html`; Node.js test runner for regression tests  
**Primary Dependencies**: No new runtime dependencies planned; use existing browser APIs and test harness  
**Storage**: IndexedDB object store `engines`, plus in-memory fallback used by existing warehouse code  
**Testing**: `node --test tests/option-b-upload-regression.test.js` with headless Chrome/Edge harness  
**Target Platform**: Offline-capable single-page HTML app running locally in modern Chromium browsers  
**Project Type**: Single-page browser application with local tests  
**Performance Goals**: Rank 100 synthetic warehouse engines against a current engine within 5000ms in the existing browser test harness; repeated unchanged rankings should avoid unnecessary metric recomputation
**Constraints**: No server dependency; deterministic scoring; no R5 integration in this feature; preserve existing warehouse records where possible  
**Scale/Scope**: Approved V1 warehouse from small libraries to at least 100 stored engines in synthetic tests

## Constitution Check

The project constitution requires browser-local execution, explainable scoring, deterministic/versioned metrics, regression-backed changes, and explicit limits around approval certainty.

Practical gates for this feature:

- Browser-only: no server or network dependency.
- Deterministic scoring: repeated ranking with unchanged input returns identical order and scores.
- Explainability: every report exposes overall and family-level scores plus top differences/warnings.
- Persistence safety: older/incomplete records are migrated, recomputed, or explicitly skipped with diagnostics.
- Regression coverage: empty/self-only/missing-metric/tie cases remain covered.
- Performance coverage: synthetic 100-engine ranking test must complete within 5000ms before optimization is considered complete.

## Project Structure

### Documentation

```text
specs/001-reuse-report-scaling/
|-- spec.md
|-- plan.md
|-- tasks.md
```

### Source Code

```text
index.html
tests/option-b-upload-regression.test.js
```

**Structure Decision**: Keep this feature in the existing single-page app for now. The current codebase stores warehouse, metric, comparison, ranking, and UI logic in `index.html`; tests live in the existing browser regression file. A later refactor may split warehouse services into `src/`, but doing that here would mix architecture migration with the reuse-report feature.

## Technical Approach

1. Add a report-generation layer on top of `rankWarehouseMatchesForMetrics`.
2. Define stable report objects:
   - `ReuseCandidateReport`
   - `WarehouseRankingReport`/ordered reuse-candidate result set
   - `MigrationDiagnostic`
   - `WarehouseBundle`
3. Add schema/version metadata to stored records without breaking existing records.
4. Add migration/recompute behavior for records with summary but missing/stale metrics.
5. Add explicit skip diagnostics for unusable records.
6. Add export/import JSON bundle functions, deterministic duplicate-id policy, and minimal UI controls.
7. Add performance tests using synthetic warehouse records.
8. Add browser UI rendering for a report summary that can later be expanded into a formal case workbench artifact.

## Risks

- `index.html` is already large; new code should be cohesive and clearly grouped to avoid making future extraction harder.
- Current metric weights are useful but not yet calibrated against paired plan/V1 outcomes; report language must avoid overstating approval certainty.
- IndexedDB records may contain old or partial local data; migration must be defensive.
- Synthetic performance tests may pass while real warehouse records are larger; use conservative budgets and avoid quadratic work where possible.

## Out of Scope

- R5 Summary Builder integration.
- Entitlement state-machine graph construction.
- PBGC case workbench integration across Plan Summary, Data Elements Listing, 436 Analysis, Plan Factors, Benefit Letter configuration, or DOPT outputs.
- Machine-learning or embedding-based similarity.
- Server-side persistence.

## Validation

Primary command:

```powershell
node --test tests\option-b-upload-regression.test.js
```

Expected additional coverage:

- reuse-candidate report object shape
- warning when high overall score hides low benefit architecture or high risk
- migration/recompute of missing metrics from valid summaries
- skip diagnostics for unusable records
- export/import round trip preserves ranking
- duplicate import ids replace by default and skip with `duplicate_record` diagnostics when replacement is disabled
- synthetic 100-engine ranking remains deterministic and within the 5000ms budget

## Complexity Tracking

| Concern | Why Needed | Simpler Alternative Rejected Because |
|---------|------------|--------------------------------------|
| Schema/version diagnostics | Stored browser data can outlive metric changes | Silently using old metrics can produce misleading reuse recommendations |
| Export/import bundle | Approved V1 evidence must move between browsers/machines | Browser-local IndexedDB alone traps useful evidence in one environment |
| Synthetic performance tests | Warehouse value increases with larger approved V1 libraries | Manual testing with a few records will not expose scaling regressions |
