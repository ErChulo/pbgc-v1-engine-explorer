# PBGC V1 Engine Explorer Constitution

## Core Principles

### I. Browser-Local First

The application MUST remain usable as an offline-capable single-page browser app unless a feature is explicitly scoped as server-backed. Core warehouse, metric extraction, comparison, import/export, and reporting behavior MUST NOT require network access or a running server.

### II. Explainable Actuarial Evidence

Similarity scores MUST be traceable to family-level metrics, component distances, weights, warnings, and missing evidence. The application MUST frame results as reuse-candidate evidence for professional review, not as an approval decision.

### III. Deterministic and Versioned Metrics

Metric extraction, warehouse ranking, tie-breaking, import/export, and migration behavior MUST be deterministic for the same inputs. Stored records and comparison outputs MUST preserve schema and metric-version metadata so stale or incompatible evidence can be migrated, recomputed, or explicitly skipped.

### IV. Regression-Backed Workflows

Changes to scoring, warehouse persistence, import/export, ranking, and UI wiring MUST include focused automated regression coverage. Edge cases such as empty warehouses, self-only warehouses, stale metrics, missing summaries, duplicate imports, and deterministic ranking ties MUST be tested when affected.

### V. Data Provenance and Integration Discipline

Warehouse records MUST preserve enough provenance for review, including source name, display name, import timestamp, summary schema version, metric version, and relevant diagnostics. R5/provision-state-machine integration MUST wait for paired R5/V1 evidence and a separate specification.

## Engineering Constraints

- Keep runtime dependencies minimal and browser-compatible.
- Prefer transparent scalar, set, vector, text-token, and weighted-distance metrics before opaque or machine-learning approaches.
- Keep UI changes proportional to the workflow; do not add polished screens before the underlying evidence model is stable.
- Preserve existing local data whenever safe; otherwise report explicit diagnostics instead of failing silently.

## Development Workflow

- Update spec, plan, tasks, tests, and docs together when behavior changes.
- Run the relevant regression command before commit; for this project the primary command is `node --test tests\option-b-upload-regression.test.js`.
- Commit only coherent, reviewed changes and do not mix unrelated refactors with feature work.

## Governance

This constitution governs feature specifications, implementation plans, tasks, and review decisions for the PBGC V1 Engine Explorer. Amendments require updating this file and reconciling affected specs, plans, tasks, and documentation.

**Version**: 1.0.0 | **Ratified**: 2026-04-27 | **Last Amended**: 2026-04-27
