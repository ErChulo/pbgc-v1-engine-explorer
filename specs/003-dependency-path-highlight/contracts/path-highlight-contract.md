# Contract: Dependency Path Highlight DOM Surface

## DOM Classes

Node elements may receive:

- `is-path-focus`
- `is-path-related`

Edge elements may receive:

- `is-path-active`
- `is-path-incoming`
- `is-path-outgoing`

## Debug Surface

`window.graphAnimationDebug.getPathHighlightState()`

Returns:

- `focusCell`
- `selectedCell`
- `hoveredCell`
- `connectedNodeCount`
- `connectedEdgeCount`
- `incomingEdgeCount`
- `outgoingEdgeCount`
- `mode`

## Behavior Contract

- Hover path preview must not mutate `appState.inspectCell`.
- Selection path highlight must follow `appState.inspectCell`.
- Reduced-motion mode must not run stroke-dash trace animations.
