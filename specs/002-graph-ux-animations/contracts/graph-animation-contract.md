# Contract: Graph Animation Browser Surface

The graph animation layer is internal to the single-page app but must expose enough stable browser surface for tests and future UI work.

## Public Test Surface

`window.graphAnimationDebug`

- `getPolicy()`: returns the last `GraphAnimationPolicy`.
- `setReducedMotionForTest(value)`: sets a test override. `true` forces reduced motion, `false` forces normal motion, `null` returns to browser preference.
- `setGsapAvailableForTest(value)`: optional test override for adapter selection.
- `clearActiveAnimations()`: cancels active graph animations and leaves final rendered state visible.

## DOM Surface

Node elements:

- selector: `#graph-svg .node-hit`
- required attributes: `data-cell`
- state classes: `is-selected`, `is-root`, `is-adjacent`, `is-dimmed`, `is-hovered`

Edge elements:

- selector: `#graph-svg .edge`
- required attributes: `data-source`, `data-target`
- state classes: `is-adjacent`, `is-dimmed`

## Fallback Contract

If GSAP is unavailable, graph rendering must still complete. If both GSAP and Web Animations API are unavailable, the adapter must apply final opacity/transform styles synchronously.
