# Implementation Plan: Animated Dependency Path Highlight

**Branch**: `003-dependency-path-highlight` | **Date**: 2026-04-28 | **Spec**: `specs/003-dependency-path-highlight/spec.md`  
**Input**: Feature specification from `/specs/003-dependency-path-highlight/spec.md`

## Summary

Add one-hop animated dependency path highlighting to the existing contained SVG graph. The feature uses the graph metadata and animation policy introduced in `002-graph-ux-animations`, highlights directly connected incoming/outgoing edges for selected or hovered nodes, and falls back to static emphasis under reduced-motion or large-graph policies.

## Technical Context

**Language/Version**: Browser JavaScript inside `index.html`; Node.js test runner for regression tests  
**Primary Dependencies**: Existing graph animation adapter; no new runtime dependency  
**Storage**: N/A  
**Testing**: `node --test tests\option-b-upload-regression.test.js` with headless Chrome/Edge harness  
**Target Platform**: Offline-capable single-page HTML app running locally in modern Chromium browsers  
**Project Type**: Single-page browser application with local tests  
**Performance Goals**: Highlight one-hop paths without changing graph layout; no trace animation in reduced-motion or large/dense policy modes  
**Constraints**: Browser-local; deterministic graph state; preserve pan/zoom/selection/tooltips; no metric, warehouse, or R5 changes  
**Scale/Scope**: Existing graph pane and one-hop path emphasis only

## Constitution Check

- Browser-local first: PASS. No server or network dependency.
- Explainable actuarial evidence: PASS. The highlight explains dependencies without altering evidence or scores.
- Deterministic/versioned metrics: PASS. No metric behavior changes.
- Regression-backed workflows: PASS. Tests will cover selected highlight, hover preview, and reduced-motion fallback.
- Data provenance/integration discipline: PASS. Warehouse and R5 behavior untouched.

## Project Structure

### Documentation (this feature)

```text
specs/003-dependency-path-highlight/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- path-highlight-contract.md
`-- tasks.md
```

### Source Code (repository root)

```text
index.html
tests/option-b-upload-regression.test.js
AGENTS.md
```

**Structure Decision**: Keep implementation in `index.html` beside existing graph animation helpers. Tests remain in the established browser regression file.

## Technical Approach

1. Extend graph state with a path-highlight animation handle and debug surface.
2. Compute active focus as hover cell when present, otherwise inspect cell, otherwise root cell.
3. Derive highlighted one-hop edges from existing `data-source` and `data-target` metadata.
4. Add path-specific classes: active path, upstream, downstream, focus, and related node.
5. Animate active path edges with a short stroke-dash trace only when graph policy is `full`; otherwise use static emphasis.
6. Cancel stale trace animations on hover, selection, and graph rerender.
7. Add browser tests for selection highlight, hover preview without inspect mutation, and reduced-motion static fallback.

## Risks

- Stroke-dash animation can be visually noisy on dense graphs. Mitigation: only trace under full animation policy.
- Hover previews can churn animation state. Mitigation: cancel old trace animations before applying new state.
- Path emphasis can obscure existing selected/adjacent classes. Mitigation: use additive classes and preserve current selection behavior.

## Out of Scope

- Multi-hop path tracing.
- Shortest-path search.
- Graph layout redesign.
- Metrics, warehouse, scoring, R5, or entitlement graph work.

## Validation

Primary command:

```powershell
node --test tests\option-b-upload-regression.test.js
```

Expected additional coverage:

- selected node path highlight marks connected edges
- hover preview marks hovered path without changing inspect cell
- reduced-motion mode applies static highlight with no running trace animation
- existing graph animation, warehouse, and comparison tests continue passing

## Complexity Tracking

No constitution violations.
