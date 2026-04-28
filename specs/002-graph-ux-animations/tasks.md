# Tasks: Contained Graph UX Animations

**Input**: `specs/002-graph-ux-animations/spec.md`, `specs/002-graph-ux-animations/plan.md`  
**Tests**: Browser regression tests in `tests/option-b-upload-regression.test.js`

## Phase 1: Setup

- [x] T001 Verify current graph rendering entry points and existing tests in `index.html` and `tests/option-b-upload-regression.test.js`.

## Phase 2: Foundational Animation Layer

- [x] T002 Add graph animation policy state and thresholds in `index.html`.
- [x] T003 Add browser-compatible animation adapter in `index.html` that prefers `window.gsap`, falls back to Web Animations API, then synchronous final styles.
- [x] T004 Add `window.graphAnimationDebug` test surface in `index.html`.
- [x] T005 Add graph animation CSS classes for selected, hovered, adjacent, dimmed, and entering states in `index.html`.

## Phase 3: User Story 1 - Animate Graph State Changes Safely (Priority: P1)

**Goal**: Graph updates transition inside the pane without detached edges or broken interaction.

**Independent Test**: Load a graph, change graph state, and verify node/edge metadata and final edge geometry remain valid.

- [x] T006 [US1] Add stable `data-source`, `data-target`, and edge id metadata to rendered SVG edges in `index.html`.
- [x] T007 [US1] Apply final-geometry-first node and edge enter/update animation hooks in `renderGraph()` in `index.html`.
- [x] T008 [US1] Cancel previous graph animations before each graph re-render in `index.html`.
- [x] T009 [US1] Add browser regression test for edge metadata and node/edge attachment after graph render in `tests/option-b-upload-regression.test.js`.

## Phase 4: User Story 2 - Improve Inspection Feedback (Priority: P2)

**Goal**: Hover and selection make related graph dependencies easier to inspect.

**Independent Test**: Select and hover graph nodes and verify selected/adjacent/dimmed classes update without losing graph position.

- [x] T010 [US2] Add adjacency state calculation for selected/hovered graph cells in `index.html`.
- [x] T011 [US2] Apply selected, root, adjacent, dimmed, and hovered classes to graph nodes and edges in `index.html`.
- [x] T012 [US2] Preserve existing inspect-cell selection and tree rendering behavior while updating visual states in `index.html`.
- [x] T013 [US2] Add browser regression test for selection adjacency classes in `tests/option-b-upload-regression.test.js`.

## Phase 5: User Story 3 - Respect Motion Preferences and Runtime Limits (Priority: P3)

**Goal**: Reduced-motion and large graphs use minimal animation while remaining responsive.

**Independent Test**: Force reduced motion and render a large synthetic graph; verify animation policy is disabled or simplified and graph still renders.

- [x] T014 [US3] Detect browser reduced-motion preference and test override in `index.html`.
- [x] T015 [US3] Simplify or disable animation when graph node/edge counts exceed thresholds in `index.html`.
- [x] T016 [US3] Add reduced-motion browser regression coverage in `tests/option-b-upload-regression.test.js`.
- [x] T017 [US3] Add large synthetic graph animation-policy regression coverage in `tests/option-b-upload-regression.test.js`.

## Phase 6: Polish and Documentation

- [x] T018 Update `docs/workflows/warehouse-reuse.md` or relevant docs with graph animation fallback limitations.
- [x] T019 Run `node --test tests\option-b-upload-regression.test.js`.
- [x] T020 Commit and push the implementation branch after tests pass.

## Dependencies

- T001 before all implementation.
- T002-T005 before user story implementation.
- US1 before US2 because adjacency classes depend on stable graph metadata.
- US3 can proceed after T002-T005 but should be validated after US1 rendering hooks exist.
- T018-T020 after all user stories.

## Parallel Opportunities

- T005 can run in parallel with T002-T004 after graph code is located.
- T016 and T017 can be drafted in parallel after T014-T015.
- Documentation T018 can run in parallel with final test execution if implementation behavior is settled.

## Implementation Strategy

Deliver US1 first as the MVP: contained, safe graph transitions with edge correctness. Add US2 visual inspection feedback after the rendering contract is stable. Add US3 policy hardening before final validation.
