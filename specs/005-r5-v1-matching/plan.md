# Implementation Plan: R5-to-V1 Matching

**Branch**: `005-r5-v1-matching` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/005-r5-v1-matching/spec.md`

## Summary

Add a browser-local R5 matching workflow that lets the analyst upload multiple R5 plan-summary JSON files for a new case, merges them into a temporary case-level benefit/provision profile, and ranks existing V1 warehouse engines by benefit/provision architecture similarity. The first version will be deterministic and explainable, using the existing benefit-domain vocabulary plus transparent structured-field and token evidence rather than opaque semantic models.

## Technical Context

**Language/Version**: Single-page HTML/CSS/JavaScript in `index.html`  
**Primary Dependencies**: Browser APIs already used by the app; no new runtime dependency planned  
**Storage**: Existing IndexedDB-backed V1 warehouse remains V1-only; R5 case profile is temporary in page state  
**Testing**: Node built-in test runner with headless browser harness in `tests/option-b-upload-regression.test.js`  
**Target Platform**: Offline-capable desktop browser from a static HTML file  
**Project Type**: Browser-local single-page application  
**Performance Goals**: Upload and rank at least 10 R5 JSON files against the local V1 warehouse in under 5 seconds  
**Constraints**: No server, no network, no plan-document upload, no machine-learning/embedding dependency, deterministic ranking  
**Scale/Scope**: Current local warehouse scale plus at least 10 R5 summary files per case; ranking output is a candidate search aid, not approval

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Browser-Local First: PASS. The workflow uses local JSON files and existing browser-local warehouse data.
- Explainable Actuarial Evidence: PASS. Results include similarity, confidence/completeness, matched domains, missing domains, and warnings.
- Deterministic and Versioned Metrics: PASS. R5 profile extraction and ranking will use deterministic taxonomy and tie-breaking; output includes a profile version.
- Regression-Backed Workflows: PASS. Tasks include focused browser regression tests for upload, ranking, empty/low-confidence states, and non-persistence.
- Data Provenance and Integration Discipline: PASS with scope guard. This feature does not integrate a benefit entitlement state machine and does not calibrate against paired R5/V1 evidence. It adds a transparent R5 proxy profile for candidate search only.

## Project Structure

### Documentation (this feature)

```text
specs/005-r5-v1-matching/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── r5-matching-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
index.html
tests/
└── option-b-upload-regression.test.js
```

**Structure Decision**: Keep implementation inside the existing static `index.html` application and extend the existing browser regression suite. This matches the current repository shape and avoids new runtime dependencies.

## Phase 0 Research

Research decisions are captured in [research.md](./research.md).

## Phase 1 Design

Design artifacts:

- [data-model.md](./data-model.md)
- [contracts/r5-matching-contract.md](./contracts/r5-matching-contract.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

- Browser-Local First: PASS. No server or network dependency introduced.
- Explainable Actuarial Evidence: PASS. Contract requires evidence and warning fields.
- Deterministic and Versioned Metrics: PASS. Contract includes profile and matching version fields.
- Regression-Backed Workflows: PASS. Tasks include required regression coverage.
- Data Provenance and Integration Discipline: PASS. R5 data is temporary and separated from the V1 warehouse.

## Complexity Tracking

No constitution violations.
