# Tasks: Approved V1 Reuse Candidate Report and Warehouse Scaling

**Input**: `specs/001-reuse-report-scaling/spec.md`, `specs/001-reuse-report-scaling/plan.md`  
**Tests**: Browser regression tests in `tests/option-b-upload-regression.test.js`

## Phase 1: Report Foundation

- [x] T001 [US1] Define `ReuseCandidateReport` object shape in `index.html` using existing comparison report fields.
- [x] T002 [US1] Implement a report generator that wraps `rankWarehouseMatchesForMetrics` results with candidate provenance, family scores, top differences, top similarities, warnings, and missing evidence.
- [x] T003 [US1] Add warning rules for low family scores, high operational risk, stale/missing metrics, and high overall similarity masking low benefit architecture similarity.
- [x] T004 [US1] Render a compact reuse-candidate report summary in the Warehouse drawer without replacing existing match cards.
- [x] T005 [US1] Add browser regression coverage for report object shape, warning rules, and rendered report summary.

## Phase 2: Warehouse Versioning and Diagnostics

- [ ] T006 [US3] Add metric version metadata to newly stored warehouse records in `index.html`.
- [ ] T007 [US3] Implement validation for stored records: current, stale, recomputable, or unusable.
- [ ] T008 [US3] Recompute metrics for records with valid summaries but missing/stale metrics.
- [ ] T009 [US3] Skip unusable records with explicit diagnostics instead of silent omission.
- [ ] T010 [US3] Add browser tests for older records, missing metrics, missing summary, and migration diagnostics.

## Phase 3: Import/Export

- [ ] T011 [US4] Define `WarehouseBundle` JSON shape with bundle schema version, records, timestamps, and validation metadata.
- [ ] T012 [US4] Implement warehouse export function returning a deterministic JSON bundle.
- [ ] T013 [US4] Implement warehouse import validation and restore behavior.
- [ ] T014 [US4] Add minimal drawer controls for export/import if they fit the existing UI; otherwise expose public browser functions first.
- [ ] T015 [US4] Add export/import round-trip regression test verifying ranking equivalence before and after restore.

## Phase 4: Scaling and Caching

- [ ] T016 [US5] Add deterministic synthetic warehouse fixture generator in the test harness.
- [ ] T017 [US5] Add 100-engine ranking performance regression with an explicit time budget.
- [ ] T018 [US5] Cache current-engine metrics for repeated ranking requests until the loaded summary changes.
- [ ] T019 [US5] Avoid recomputing candidate metrics when stored records already contain current metric-version data.
- [ ] T020 [US5] Add repeated-ranking test verifying identical order/scores and reduced recomputation path.

## Phase 5: Warehouse Aggregate Readiness

- [ ] T021 [US2] Extend aggregate analysis to include migration/staleness counts.
- [ ] T022 [US2] Add aggregate indicator for warehouse reuse readiness: candidate count, usable count, stale count, skipped count.
- [ ] T023 [US2] Add regression coverage for aggregate readiness with mixed valid/stale/unusable records.

## Phase 6: Documentation and Review

- [ ] T024 Update `README.md` or `docs/` with the warehouse reuse workflow and limitations.
- [ ] T025 Document that R5/provision-state-machine integration is deferred until paired R5/V1 evidence exists.
- [ ] T026 Run `node --test tests\option-b-upload-regression.test.js`.
- [ ] T027 Commit and push the implementation branch after tests pass.

## Dependencies

- T001-T005 deliver the MVP report.
- T006-T010 should complete before import/export so bundles preserve version state.
- T011-T015 depend on record validation from T006-T010.
- T016-T020 depend on stable ranking/report functions.
- T021-T023 depend on diagnostics from T006-T010.

## Notes

- Keep implementation browser-compatible and client-side.
- Do not introduce R5-specific logic in this feature.
- Do not treat the similarity score as an approval decision; report language should frame it as reuse-candidate evidence requiring review.
