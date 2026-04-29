# Tasks: R5-to-V1 Matching

**Input**: `specs/005-r5-v1-matching/spec.md`, `specs/005-r5-v1-matching/plan.md`  
**Tests**: Browser regression tests in `tests/option-b-upload-regression.test.js`

## Phase 1: Setup

- [x] T001 Verify existing warehouse ranking, benefit-domain taxonomy, upload controls, and drawer layout entry points in `index.html`.
- [x] T002 Add R5 matching contract references to `specs/005-r5-v1-matching/contracts/r5-matching-contract.md`.

## Phase 2: Foundational

- [x] T003 Define R5 profile constants, status state, and deterministic report version in `index.html`.
- [x] T004 Add shared helpers for extracting text blocks, structured values, normalized tokens, and evidence snippets from arbitrary JSON in `index.html`.
- [x] T005 Add R5 benefit-domain vocabulary mapping that reuses the existing V1 benefit architecture taxonomy in `index.html`.
- [x] T006 Add regression fixture helpers for R5 summaries in `tests/option-b-upload-regression.test.js`.

## Phase 3: User Story 1 - Rank V1 Reuse Candidates From R5 Summaries (P1)

**Goal**: Upload multiple R5 JSON files, merge them into one temporary case profile, and rank V1 warehouse candidates.

**Independent Test**: Store multiple V1 engines, upload multiple R5 JSON summaries, run ranking, and verify ordered candidates with similarity and confidence.

- [x] T007 [P] [US1] Add R5 upload and match controls to the warehouse drawer in `index.html`.
- [x] T008 [US1] Implement temporary multi-file R5 upload parsing and invalid-file diagnostics in `index.html`.
- [x] T009 [US1] Implement merged R5 case-profile extraction with benefit domains, domain counts, evidence, confidence, and warnings in `index.html`.
- [x] T010 [US1] Implement V1 candidate projection from existing metric warehouse records in `index.html`.
- [x] T011 [US1] Implement deterministic R5-to-V1 ranking with tie-breaking by confidence and identity in `index.html`.
- [x] T012 [US1] Render R5 case profile status and ranked candidate cards with reuse similarity and confidence in `index.html`.
- [x] T013 [P] [US1] Add browser regression test for multi-file R5 upload, merged profile, ranking order, and confidence display in `tests/option-b-upload-regression.test.js`.

## Phase 4: User Story 2 - Understand Why a V1 Was Ranked Highly (P2)

**Goal**: Show matched domains, missing domains, weak domains, and evidence so the ranking is explainable.

**Independent Test**: Upload R5 summaries with known provision domains and verify ranked candidates show matched/missing domain evidence.

- [x] T014 [US2] Add match evidence generation for matched domains, candidate gaps, extra domains, and top evidence snippets in `index.html`.
- [x] T015 [US2] Render domain evidence and warnings inside each R5 match card in `index.html`.
- [x] T016 [P] [US2] Add browser regression test for matched/missing domain explanations and low-overlap candidate evidence in `tests/option-b-upload-regression.test.js`.

## Phase 5: User Story 3 - Keep R5 Data Separate From the V1 Warehouse (P3)

**Goal**: Keep R5 uploads temporary and prevent them from modifying the approved V1 warehouse.

**Independent Test**: Upload R5 summaries and run matching, then verify the V1 warehouse count remains unchanged and clearing R5 inputs removes the temporary profile.

- [x] T017 [US3] Add clear/reset behavior for the temporary R5 case profile in `index.html`.
- [x] T018 [US3] Ensure R5 uploads never call V1 warehouse persistence paths in `index.html`.
- [x] T019 [P] [US3] Add browser regression test for V1 warehouse count preservation and R5 reset behavior in `tests/option-b-upload-regression.test.js`.

## Phase 6: Polish and Validation

- [x] T020 Add empty warehouse and low-confidence warning states for R5 matching in `index.html`.
- [x] T021 Review labels to ensure scores are presented as reuse-candidate evidence, not approval decisions, in `index.html`.
- [x] T022 Run `node --test tests\option-b-upload-regression.test.js`.
- [x] T023 Mark completed tasks in `specs/005-r5-v1-matching/tasks.md`.

## Dependencies

- T001-T006 before user story work.
- US1 tasks T007-T013 before US2 and US3 visual validation.
- US2 and US3 can proceed independently after US1 ranking exists.
- T020-T023 after US1-US3 implementation.

## Parallel Execution Examples

- T007 and T013 can be prepared in parallel after foundational helpers are understood.
- T014 and T017 can proceed independently after ranking results exist.
- T016 and T019 can be authored in parallel because they validate different user stories.

## Implementation Strategy

Deliver MVP first with US1: upload R5 summaries, build a merged case profile, rank V1 warehouse candidates, and show similarity plus confidence. Then add explainability and non-persistence/reset hardening.
