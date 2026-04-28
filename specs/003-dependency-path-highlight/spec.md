# Feature Specification: Animated Dependency Path Highlight

**Feature Branch**: `003-dependency-path-highlight`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Add animated dependency path highlight to the contained graph UX. When a user selects or hovers a graph node, visually trace the directly connected incoming and outgoing dependency path with a restrained animated edge highlight and related-node emphasis. Preserve reduced-motion fallback, large-graph simplification, edge attachment correctness, and existing graph interactions. Do not change metrics, warehouse behavior, scoring, or R5 integration."

## User Scenarios & Testing *(mandatory)*

## Clarifications

### Session 2026-04-28

- Q: What path should be highlighted first? A: Direct incoming and outgoing dependencies for the selected or hovered node.
- Q: Should this use the existing graph animation policy? A: Yes; reduced-motion and large-graph simplification must apply.

### User Story 1 - Trace Selected Dependencies (Priority: P1)

A user selects a graph node and immediately sees the directly connected dependency path emphasized so they can understand what feeds the selected item and what depends on it.

**Why this priority**: The graph's main value is explaining information flow. Path highlight adds comprehension without changing calculations or rankings.

**Independent Test**: Select a graph node with at least one connection and verify connected edges/nodes receive path-highlight states while unrelated graph elements remain readable.

**Acceptance Scenarios**:

1. **Given** a rendered graph with connected nodes, **When** the user selects a node, **Then** directly connected incoming and outgoing edges receive a highlighted path state.
2. **Given** a selected node, **When** the highlight is applied, **Then** the selected node and directly connected nodes are emphasized while unrelated nodes are dimmed but still visible.
3. **Given** a selected node and a visible formula tree, **When** path highlight updates, **Then** the existing tree inspection state remains correct.

---

### User Story 2 - Preview Paths on Hover (Priority: P2)

A user hovers over a graph node and gets a temporary preview of the node's directly connected dependency path without changing the selected node.

**Why this priority**: Hover preview supports exploration before committing to a selection.

**Independent Test**: Hover over a graph node and verify highlighted path states appear, then clear on mouse leave without changing `inspectCell`.

**Acceptance Scenarios**:

1. **Given** a selected node, **When** the user hovers another node, **Then** the hover node's path is previewed without changing the selected node.
2. **Given** a hover preview is active, **When** the pointer leaves the node, **Then** the graph returns to the selected-node highlight.

---

### User Story 3 - Respect Motion Constraints (Priority: P3)

A user with reduced-motion preference or a large graph sees path emphasis without distracting or expensive animation.

**Why this priority**: Path highlight must remain accessible and responsive.

**Independent Test**: Force reduced-motion and large-graph policy states and verify path emphasis still appears without animated tracing.

**Acceptance Scenarios**:

1. **Given** reduced motion is active, **When** a path is highlighted, **Then** the path state appears instantly without running trace animation.
2. **Given** a large or dense graph, **When** a path is highlighted, **Then** animation is skipped or simplified while selection remains readable.

### Edge Cases

- Selected node has no incoming or outgoing edges: emphasize only the selected node and do not error.
- Hover changes rapidly between nodes: cancel prior path trace animation before starting the next one.
- Graph rerenders during a path highlight: recompute path states from current graph metadata.
- Reduced-motion mode is active: avoid stroke-dash or long-running trace animation.
- Large graph policy is simplified or disabled: apply static path emphasis only.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST highlight directly connected incoming and outgoing edges for the selected graph node.
- **FR-002**: System MUST preview directly connected paths for hovered graph nodes without changing selected-node state.
- **FR-003**: System MUST visually distinguish selected, path-connected, unrelated, and hovered graph elements.
- **FR-004**: System MUST cancel stale path-trace animations before applying a new highlight.
- **FR-005**: System MUST use the existing graph animation policy for reduced-motion and large-graph behavior.
- **FR-006**: System MUST preserve edge endpoint correctness and existing pan, zoom, selection, tooltip, and tree interactions.
- **FR-007**: System MUST avoid changes to metric extraction, scoring, warehouse persistence, and R5 integration.
- **FR-008**: System MUST include automated browser regression coverage for selected path highlight, hover preview, and reduced-motion static fallback.

### Key Entities

- **GraphPathHighlightState**: Current focused cell, selected cell, hovered cell, connected node ids, connected edge ids, and animation mode.
- **HighlightedDependencyPath**: Direct incoming and outgoing edges connected to the active focus node.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecting a connected node highlights at least one connected edge in automated browser tests.
- **SC-002**: Hover preview highlights the hovered node's path without changing the selected inspect cell.
- **SC-003**: Reduced-motion mode applies static path highlighting with zero running trace animations.
- **SC-004**: Existing graph and warehouse regression tests continue passing.

## Assumptions

- Direct incoming/outgoing dependencies are the correct first path scope; multi-hop path tracing can be specified later.
- Path highlight builds on the existing contained graph animation layer.
- This feature does not introduce new runtime dependencies.
