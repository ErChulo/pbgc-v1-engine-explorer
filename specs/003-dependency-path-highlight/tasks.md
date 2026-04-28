# Tasks: Animated Dependency Path Highlight

**Input**: `specs/003-dependency-path-highlight/spec.md`, `specs/003-dependency-path-highlight/plan.md`  
**Tests**: Browser regression tests in `tests/option-b-upload-regression.test.js`

## Phase 1: Setup

- [x] T001 Verify existing graph animation state and metadata from `index.html`.

## Phase 2: Foundational Path State

- [x] T002 Add path highlight state helpers in `index.html`.
- [x] T003 Add path highlight CSS classes in `index.html`.
- [x] T004 Extend `window.graphAnimationDebug` with path highlight diagnostics in `index.html`.

## Phase 3: User Story 1 - Trace Selected Dependencies (Priority: P1)

- [x] T005 [US1] Apply selected-node one-hop path classes to graph nodes and edges in `index.html`.
- [x] T006 [US1] Add trace animation for active path edges under full animation policy in `index.html`.
- [x] T007 [US1] Add selected path highlight browser regression test in `tests/option-b-upload-regression.test.js`.

## Phase 4: User Story 2 - Preview Paths on Hover (Priority: P2)

- [x] T008 [US2] Recompute path highlight on hover enter/leave without mutating inspect cell in `index.html`.
- [x] T009 [US2] Add hover preview browser regression test in `tests/option-b-upload-regression.test.js`.

## Phase 5: User Story 3 - Respect Motion Constraints (Priority: P3)

- [x] T010 [US3] Disable trace animation when reduced-motion or non-full graph policy is active in `index.html`.
- [x] T011 [US3] Add reduced-motion static path regression test in `tests/option-b-upload-regression.test.js`.

## Phase 6: Validation

- [x] T012 Run `node --test tests\option-b-upload-regression.test.js`.

## Dependencies

- T001-T004 before user story work.
- US1 before US2.
- US3 after US1 animation hooks.

## Implementation Strategy

Deliver selected-node path highlight first, then hover preview, then reduced-motion validation.
