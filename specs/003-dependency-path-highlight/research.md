# Research: Animated Dependency Path Highlight

## Decision: One-Hop Direct Path First

Highlight only edges directly connected to the active node.

**Rationale**: Direct dependencies are immediately explainable and low-risk. Multi-hop tracing can quickly become noisy in pension calculation graphs.

**Alternatives considered**:

- Multi-hop recursive path: rejected for first version because it needs separate UX controls and can overwhelm dense graphs.
- Shortest-path between selected nodes: deferred because the current graph has only one active node selection.

## Decision: Stroke-Dash Trace Only Under Full Animation Policy

Use animated edge tracing only when the graph animation policy is `full`; otherwise apply static path classes.

**Rationale**: This preserves reduced-motion behavior and prevents excessive animation on large graphs.

**Alternatives considered**:

- Always trace highlighted edges: rejected due to accessibility and dense-graph performance risk.
- Node-only highlight: rejected because the requested UX value is seeing the dependency path.
