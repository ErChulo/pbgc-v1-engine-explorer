# Feature Specification: Approved V1 Reuse Candidate Report and Warehouse Scaling

**Feature Branch**: `001-reuse-report-scaling`  
**Created**: 2026-04-27  
**Status**: Draft  
**Input**: User description: "Build an Approved V1 Reuse Candidate Report and warehouse scaling hardening layer for the PBGC V1 Engine Explorer. Use the existing browser-local V1 engine warehouse, metric extraction, aggregate analysis, pairwise comparison, and current-engine match ranking. Produce explainable reuse-candidate reports for the current engine against stored approved V1 engines. Prepare the warehouse for larger libraries through deterministic caching, schema versioning, migration handling, import/export, and performance tests. Do not integrate R5 yet."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explain Why a V1 Is Reusable (Priority: P1)

An actuary or technical reviewer loads a new/current V1 summary and uses the warehouse to identify the best approved V1 reuse candidate. The app produces a structured reuse-candidate report that explains why the candidate ranks highly and what differences require review.

**Why this priority**: The primary project purpose is reducing from-scratch V1 development by reusing already-approved engines when the benefit structure, fields, formulas, and risks are sufficiently similar.

**Independent Test**: Store at least three approved V1 summaries, load a current V1 summary, generate the reuse-candidate report, and verify the top-ranked candidate includes overall similarity, family scores, top similarities, top differences, and risk warnings.

**Acceptance Scenarios**:

1. **Given** a current V1 engine and multiple stored approved V1 engines, **When** the user requests a reuse-candidate report, **Then** the app ranks candidates by overall weighted similarity and shows the best candidate first.
2. **Given** a top-ranked candidate, **When** the report is generated, **Then** it includes benefit architecture, formula implementation, semantic field, structural graph, and operational risk scores.
3. **Given** a candidate with high formula similarity but low benefit architecture similarity, **When** the report is generated, **Then** the report flags the mismatch as a review risk rather than presenting the overall score alone.

---

### User Story 2 - Review Warehouse-Level Reuse Readiness (Priority: P2)

A user reviews the stored V1 warehouse as a reusable library and needs to know whether the warehouse is rich enough to support matching decisions.

**Why this priority**: Before R5/provision integration, the warehouse must stand on its own as an explainable library of approved V1 implementation patterns.

**Independent Test**: Store a synthetic warehouse with multiple engines and verify aggregate summaries, outlier engines, common domains/functions, most similar pair, and most distinct pair are deterministic and explainable.

**Acceptance Scenarios**:

1. **Given** a warehouse with multiple engines, **When** aggregate analysis runs, **Then** it shows stored engine count, common benefit domains, common functions, complexity range, highest-risk engine, most complex engine, most similar pair, and most distinct pair.
2. **Given** a warehouse with only one valid engine, **When** aggregate analysis runs, **Then** pairwise spread is reported as unavailable without error.

---

### User Story 3 - Preserve and Migrate Stored Warehouse Evidence (Priority: P2)

A user returns to the app after previous warehouse records were stored under an older metric schema. The app should preserve usable evidence and clearly flag records needing recomputation or migration.

**Why this priority**: Browser-local persistence is useful only if schema evolution does not silently corrupt comparison results or discard approved V1 evidence.

**Independent Test**: Seed IndexedDB with older/missing-version records and verify the app either migrates/recomputes metrics or flags the record as needing refresh.

**Acceptance Scenarios**:

1. **Given** a stored engine with an older metric version, **When** the warehouse loads, **Then** the app identifies the version and either migrates/recomputes metrics or marks it as stale.
2. **Given** a stored record missing metrics but containing a valid summary, **When** the warehouse loads, **Then** metrics are recomputed deterministically before ranking.
3. **Given** a stored record missing both metrics and summary, **When** the warehouse loads, **Then** the record is skipped and included in a missing-evidence report.

---

### User Story 4 - Import and Export Warehouse Records (Priority: P3)

A user moves approved V1 evidence between browsers, machines, or case workspaces without losing metric data or provenance.

**Why this priority**: The long-term case workbench needs repeatable evidence movement; browser-local storage alone is not enough.

**Independent Test**: Export a warehouse bundle, clear storage, import the bundle, and verify aggregate analysis and candidate ranking match the pre-export results.

**Acceptance Scenarios**:

1. **Given** stored warehouse records, **When** the user exports the warehouse, **Then** the app produces a JSON bundle containing summaries, metrics, counts, source names, imported timestamps, and schema versions.
2. **Given** a valid exported warehouse bundle, **When** the user imports it, **Then** the app restores records and preserves deterministic ranking results.
3. **Given** an invalid or partial import bundle, **When** import is attempted, **Then** the app reports which records failed and imports only valid records when safe.

---

### User Story 5 - Scale Ranking to Larger Warehouses (Priority: P3)

A user stores dozens or hundreds of approved V1 engines and expects ranking to remain responsive and deterministic.

**Why this priority**: Pairwise comparisons are acceptable for small libraries, but reuse search must remain usable as approved V1 evidence grows.

**Independent Test**: Generate a synthetic warehouse with at least 100 engines and verify ranking completes within 5000ms on the existing browser test harness while preserving deterministic order.

**Acceptance Scenarios**:

1. **Given** a synthetic warehouse of 100 stored engines, **When** ranking runs against the current engine, **Then** the top candidates are returned in deterministic order within 5000ms on the existing browser test harness.
2. **Given** repeated ranking requests with unchanged inputs, **When** ranking runs again, **Then** cached metric/comparison data is reused and results remain identical.

### Edge Cases

- Empty warehouse: report no candidates without error.
- Warehouse contains only the currently loaded stored engine: self-match is excluded and no candidates are shown.
- Stored record has summary but no metrics: recompute metrics or flag stale record.
- Stored record has metrics but wrong/old metric version: migrate/recompute before ranking or exclude with a warning.
- Stored record has no summary and no metrics: skip and include in missing evidence.
- Two or more candidates have identical overall similarity: sort deterministically by display name/id.
- Candidate has high overall similarity but one critical family score is low: flag as review risk.
- Import bundle contains duplicate engine ids: default import replaces existing records with the bundle records; imports called with `replaceExisting: false` skip duplicate records and emit `duplicate_record` diagnostics.
- Large warehouse: ranking must not block the UI indefinitely.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate a reusable candidate report for the current engine against stored warehouse engines.
- **FR-002**: System MUST rank candidates by `overall_weighted_similarity` while exposing all family-level scores used in the ranking.
- **FR-003**: System MUST include top differences and top similarity evidence for each reported candidate.
- **FR-004**: System MUST flag low family scores, missing evidence, stale metrics, and operational/data-quality risks.
- **FR-005**: System MUST exclude the current stored engine from its own candidate list.
- **FR-006**: System MUST keep ranking deterministic, including tie-breaking.
- **FR-007**: System MUST maintain metric schema/version metadata for stored records and comparison reports.
- **FR-008**: System MUST handle older or incomplete stored records through migration, recomputation, or explicit exclusion diagnostics.
- **FR-009**: Users MUST be able to export stored warehouse records as a JSON bundle.
- **FR-010**: Users MUST be able to import a valid warehouse JSON bundle; duplicate engine ids MUST be handled deterministically by replacing existing records by default or skipping duplicates with diagnostics when replacement is disabled.
- **FR-011**: System MUST preserve provenance fields sufficient for review: source name, display name, imported timestamp, schema version, metric version, and counts.
- **FR-012**: System MUST support performance testing with synthetic warehouses of at least 100 engines.
- **FR-013**: System MUST avoid server dependencies; all behavior remains browser-compatible and client-side.
- **FR-014**: System MUST leave R5/provision-state-machine integration out of scope for this feature.

### Key Entities

- **WarehouseEngineRecord**: Stored approved V1 engine evidence, including id, display name, source name, imported timestamp, normalized summary, metrics, metric rows, counts, summary schema version, and metric version.
- **ReuseCandidateReport**: Report for one candidate against the current engine, including candidate identity, overall similarity/distance, family scores, top differences, top similarities, warnings, missing evidence, and provenance.
- **WarehouseRankingReport**: Ordered reuse-candidate result set plus metadata available through candidate diagnostics, excluded/skipped record diagnostics, metric version, generated timestamp, and performance timing where measured by the caller.
- **WarehouseBundle**: Export/import JSON structure containing records, schema metadata, bundle timestamp, and validation results.
- **MigrationDiagnostic**: Record-level decision describing whether metrics were current, recomputed, migrated, skipped, or failed validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can generate a top-candidate reuse report from a current engine and at least three stored engines in one action.
- **SC-002**: Reports expose all five distance families and the overall weighted score for each displayed candidate.
- **SC-003**: Empty, self-only, missing-metrics, and tie-ranking cases are covered by automated browser regression tests.
- **SC-004**: A synthetic 100-engine warehouse ranking test completes within 5000ms on the existing browser test harness.
- **SC-005**: Export followed by import preserves ranking results for a fixed synthetic warehouse.
- **SC-006**: Older or incomplete records produce explicit diagnostics rather than silent ranking failures.

## Assumptions

- The existing single-page `index.html` app remains the primary runtime for this feature.
- IndexedDB remains the browser-local persistence layer.
- Existing metric families and profile weights are acceptable as the first ranking basis.
- The current engine can be an uploaded summary, embedded sample, or loaded warehouse record; selected stored-engine comparison remains available through pairwise comparison, but reuse-candidate ranking is scoped to the current engine for this feature.
- R5 Summary Builder outputs and entitlement state-machine mapping require paired R5/V1 evidence and will be specified later.
- This feature prepares for a future PBGC case workbench but does not attempt to integrate Plan Summary, Data Elements Listing, 436 Analysis, Plan Factors, V1 engine, Benefit Letter configuration, or DOPT workflows directly.
