# Tasks: Drawer UX Hardening

**Input**: `specs/004-drawer-ux-hardening/spec.md`, `specs/004-drawer-ux-hardening/plan.md`  
**Tests**: Browser regression tests in `tests/option-b-upload-regression.test.js`

## Phase 1: Setup

- [x] T001 Verify drawer, upload, tooltip, aggregate, and comparison entry points in `index.html`.

## Phase 2: Layout and Context

- [x] T002 Add app version and current-engine header display in `index.html`.
- [x] T003 Widen drawer and strengthen overlay CSS in `index.html`.
- [x] T004 Add section background and button/input contrast CSS in `index.html`.

## Phase 3: Upload Safety

- [x] T005 Enable multiple JSON selection in `index.html`.
- [x] T006 Add duplicate filename detection and user alert for upload workflow in `index.html`.
- [x] T007 Add sequential bulk upload handling and status summary in `index.html`.

## Phase 4: Analysis Readability

- [x] T008 Add aggregate risk definition info affordance in `index.html`.
- [x] T009 Add prominent pairwise overall similarity/distance summary in `index.html`.

## Phase 5: Tooltip Behavior

- [x] T010 Add 10-second graph tooltip auto-dismiss with cleanup in `index.html`.

## Phase 6: Tests and Validation

- [x] T011 Add browser tests for drawer/header/version styling hooks in `tests/option-b-upload-regression.test.js`.
- [x] T012 Add browser tests for duplicate and bulk upload behavior in `tests/option-b-upload-regression.test.js`.
- [x] T013 Add browser tests for risk help, pairwise overall summary, and tooltip timeout in `tests/option-b-upload-regression.test.js`.
- [x] T014 Run `node --test tests\option-b-upload-regression.test.js`.

## Dependencies

- T001 before all work.
- T002-T004 can proceed before upload and analysis tasks.
- T005-T007 must be completed together.
- T008-T010 can proceed independently after T001.
- T011-T014 after implementation tasks.

## Implementation Strategy

Deliver layout/context updates first, then upload safety, then analysis readability and tooltip behavior, then full regression validation.
