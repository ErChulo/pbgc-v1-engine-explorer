# Implementation Plan: Drawer UX Hardening

**Branch**: `004-drawer-ux-hardening` | **Date**: 2026-04-28 | **Spec**: `specs/004-drawer-ux-hardening/spec.md`  
**Input**: Feature specification from `/specs/004-drawer-ux-hardening/spec.md`

## Summary

Improve the existing single-page V1 Engine Explorer UX by widening and clarifying the controls drawer, strengthening contextual feedback, adding bulk upload with duplicate-source-name blocking, surfacing current engine/app version in the header, explaining risk, and making pairwise comparison scores easier to read.

## Technical Context

**Language/Version**: Browser JavaScript and CSS inside `index.html`; Node.js test runner  
**Primary Dependencies**: Existing browser APIs; no new runtime dependencies  
**Storage**: Existing IndexedDB warehouse object store  
**Testing**: `node --test tests\option-b-upload-regression.test.js` with headless Chrome/Edge harness  
**Target Platform**: Offline-capable single-page HTML app running locally in modern Chromium browsers  
**Project Type**: Single-page browser application  
**Performance Goals**: Bulk upload should process selected JSON files sequentially without blocking existing single-file workflows  
**Constraints**: Browser-local; no scoring/metric semantic changes; maintain current graph animation behavior  
**Scale/Scope**: UI/readability hardening plus upload workflow improvements in `index.html`

## Constitution Check

- Browser-local first: PASS. No server or network dependency.
- Explainable actuarial evidence: PASS. Risk and pairwise score definitions become clearer.
- Deterministic/versioned metrics: PASS. Metric definitions and versions are unchanged.
- Regression-backed workflows: PASS. Tests will cover UI hooks, duplicate upload, bulk upload, tooltip timeout, and comparison summary.
- Data provenance/integration discipline: PASS. Warehouse provenance remains source-name based; R5 untouched.

## Project Structure

### Documentation (this feature)

```text
specs/004-drawer-ux-hardening/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- ux-hardening-contract.md
`-- tasks.md
```

### Source Code (repository root)

```text
index.html
tests/option-b-upload-regression.test.js
AGENTS.md
```

**Structure Decision**: Keep changes in `index.html` and existing browser tests. This is a focused hardening pass, not a structural refactor.

## Technical Approach

1. Add static app version and header current-engine display.
2. Adjust drawer CSS to use desktop 50vw width, stronger overlay, distinct section backgrounds, and clearer button/input contrast.
3. Add tooltip auto-dismiss timer with cleanup.
4. Change upload input to accept multiple JSON files and process batch uploads sequentially.
5. Before upload/store, compare file names against existing warehouse `sourceName` values; skip duplicates with `alert()` and status feedback.
6. Add risk info affordance in aggregate analysis and a prominent overall score summary in pairwise comparison.
7. Add browser regression tests for all new behaviors.

## Risks

- Duplicate filename blocking may reject intentional revised files. Mitigation: explicit user feedback; import bundle replacement policy remains available separately.
- Bulk upload can mix valid, invalid, and duplicate files. Mitigation: sequential processing with per-file skip/error summary.
- UI color changes can reduce accessibility if too saturated. Mitigation: soft theme-aware backgrounds and testable class hooks.

## Out of Scope

- Content-hash duplicate detection.
- Full design system extraction.
- Server-side upload.
- Metric, scoring, warehouse schema, R5, or entitlement graph changes.

## Validation

Primary command:

```powershell
node --test tests\option-b-upload-regression.test.js
```

Expected additional coverage:

- drawer width/overlay/section/control contrast hooks
- header current engine and app version
- tooltip auto-dismiss after 10 seconds
- duplicate source-name upload blocked
- bulk upload imports unique files and skips duplicates
- pairwise comparison prominent overall score summary

## Complexity Tracking

No constitution violations.
