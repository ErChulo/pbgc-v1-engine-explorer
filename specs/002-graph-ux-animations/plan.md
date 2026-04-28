# Implementation Plan: Contained Graph UX Animations

**Branch**: `002-graph-ux-animations` | **Date**: 2026-04-28 | **Spec**: `specs/002-graph-ux-animations/spec.md`  
**Input**: Feature specification from `/specs/002-graph-ux-animations/spec.md`

## Summary

Add a contained animation layer to the existing SVG dependency graph in `index.html`. The implementation will preserve graph correctness first, use GSAP only when available through a browser-global adapter, and fall back to Web Animations API or instant rendering when GSAP is unavailable, reduced motion is requested, or the graph is too large/dense.

## Technical Context

**Language/Version**: Browser JavaScript inside `index.html`; Node.js test runner for regression tests  
**Primary Dependencies**: Existing browser APIs; optional `window.gsap` adapter if GSAP is present; no required new runtime dependency  
**Storage**: N/A; feature does not change IndexedDB warehouse data  
**Testing**: `node --test tests\option-b-upload-regression.test.js` with headless Chrome/Edge harness  
**Target Platform**: Offline-capable single-page HTML app running locally in modern Chromium browsers  
**Project Type**: Single-page browser application with local tests  
**Performance Goals**: Preserve responsiveness for at least 100 nodes and 150 edges; skip or simplify graph animation above configured thresholds  
**Constraints**: No server dependency; reduced-motion support; deterministic graph rendering; do not alter metric extraction or comparison semantics  
**Scale/Scope**: Existing graph pane, graph hover/selection feedback, drawer/report transition polish where it does not affect graph correctness

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Browser-local first: PASS. No server or network dependency is required.
- Explainable actuarial evidence: PASS. Feature is visual-only and does not alter scoring or evidence.
- Deterministic/versioned metrics: PASS. Metrics and warehouse persistence are explicitly out of scope.
- Regression-backed workflows: PASS. Tests will cover edge alignment, reduced-motion fallback, and large graph behavior.
- Data provenance/integration discipline: PASS. R5 and warehouse evidence are untouched.

## Project Structure

### Documentation (this feature)

```text
specs/002-graph-ux-animations/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- graph-animation-contract.md
`-- tasks.md
```

### Source Code (repository root)

```text
index.html
tests/option-b-upload-regression.test.js
docs/workflows/warehouse-reuse.md
AGENTS.md
```

**Structure Decision**: Keep this feature in the existing single-page app. Graph rendering, controls, and tests already live in `index.html` and `tests/option-b-upload-regression.test.js`; moving them now would mix UX animation work with a structural refactor.

## Technical Approach

1. Add a small graph animation policy helper near existing graph state.
2. Add an animation adapter that prefers `window.gsap` when available, otherwise uses Web Animations API, and otherwise applies final styles synchronously.
3. Render stable `data-cell`, `data-source`, and `data-target` attributes on graph elements so tests and animation logic can reason about nodes and edges.
4. Add selected/hover/adjacent/dimmed classes without changing graph data.
5. Animate graph entry/update only after correct geometry has been rendered; for dense graphs or reduced motion, render final state directly.
6. Keep pan/zoom transforms owned by the existing `graphView` logic; do not animate world transforms except refit/reset transitions if safe.
7. Add browser tests for alignment metadata, hover/selection classes, reduced-motion policy, and large-graph simplification.

## Risks

- Animating SVG paths can make edges appear detached if geometry changes mid-animation. Mitigation: calculate final geometry first and animate opacity/settle only, not path endpoints, unless graph size is small and stable.
- External GSAP loading would violate offline use. Mitigation: optional browser-global adapter, no required CDN or package.
- Existing `index.html` is large. Mitigation: keep helpers grouped and narrow.

## Out of Scope

- New graph layout algorithm.
- New graph screen or polished visual redesign.
- Metric extraction, similarity scoring, warehouse persistence, R5 integration, or entitlement state-machine graph construction.

## Validation

Primary command:

```powershell
node --test tests\option-b-upload-regression.test.js
```

Expected additional coverage:

- graph still renders the embedded default feeders
- graph elements expose stable node/edge metadata
- selected and adjacent states update after node selection
- reduced-motion policy disables long-running graph animations
- synthetic large graph uses simplified/no animation and remains responsive
- existing warehouse and comparison tests continue passing

## Complexity Tracking

No constitution violations.
