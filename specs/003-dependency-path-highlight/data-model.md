# Data Model: Animated Dependency Path Highlight

## GraphPathHighlightState

Fields:

- `focusCell`: active path focus, preferring hovered cell over selected inspect cell.
- `selectedCell`: current `appState.inspectCell`.
- `hoveredCell`: current `appState.graphHoverCell`.
- `connectedNodes`: set of node ids directly connected to the focus cell.
- `connectedEdges`: set of edge ids directly connected to the focus cell.
- `upstreamEdges`: edges where target is the focus cell.
- `downstreamEdges`: edges where source is the focus cell.
- `mode`: `animated`, `static`, or `none`.

Validation:

- `focusCell` must exist in current graph layout before path state is applied.
- `connectedEdges` must correspond to rendered edges with `data-source` and `data-target`.
- Reduced-motion and non-full policy states must use `static` or `none`.

## HighlightedDependencyPath

Fields:

- `edgeId`: stable `${source}->${target}` value.
- `source`: source node id.
- `target`: target node id.
- `direction`: `incoming` or `outgoing` relative to focus.

Validation:

- Source and target must both exist in current rendered graph node set.
