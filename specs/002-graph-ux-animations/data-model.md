# Data Model: Contained Graph UX Animations

## GraphAnimationPolicy

Controls whether graph animation is enabled for a render.

Fields:

- `enabled`: boolean final decision.
- `library`: `gsap`, `web-animations`, or `none`.
- `reducedMotion`: boolean from browser preference or forced test override.
- `nodeCount`: rendered node count.
- `edgeCount`: rendered edge count.
- `maxAnimatedNodes`: threshold for full node animation.
- `maxAnimatedEdges`: threshold for full edge animation.
- `mode`: `full`, `simple`, or `disabled`.
- `reason`: optional explanation when animation is simplified or disabled.

Validation:

- If `reducedMotion` is true, `mode` must be `disabled`.
- If node or edge counts exceed thresholds, `mode` must be `simple` or `disabled`.
- `enabled` must be false when `mode` is `disabled`.

## GraphElementState

Visual state attached to SVG graph elements through classes and data attributes.

Fields:

- `id`: node id or edge id.
- `kind`: `node` or `edge`.
- `cell`: node cell id for node elements.
- `source`: edge source id for edge elements.
- `target`: edge target id for edge elements.
- `selected`: boolean.
- `hovered`: boolean.
- `adjacent`: boolean.
- `dimmed`: boolean.
- `entering`: boolean transient animation marker.

Validation:

- Node elements must expose `data-cell`.
- Edge elements must expose `data-source` and `data-target`.
- Selected state must correspond to `appState.inspectCell` or `appState.rootCell`.

## GraphTransitionEvent

Logical event that may trigger animation.

Fields:

- `type`: `render`, `selection`, `hover`, `reset-view`, or `resize`.
- `previousRoot`: optional previous root node.
- `nextRoot`: optional next root node.
- `selectedCell`: optional selected node id.
- `policy`: `GraphAnimationPolicy`.

Validation:

- Transition handling must be deterministic and cancel previous animations before starting replacement animation.
