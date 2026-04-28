# Research: Contained Graph UX Animations

## Decision: Optional GSAP Adapter With Browser Fallback

Use `window.gsap` when present, but do not require GSAP to render or test the graph.

**Rationale**: The project is an offline single-page app. A required CDN dependency would break the browser-local principle. A small adapter lets the app benefit from GSAP in environments where it is bundled or injected, while preserving current behavior everywhere else.

**Alternatives considered**:

- Required CDN GSAP: rejected because it adds a network dependency.
- Required npm/bundled GSAP: rejected because this repo currently runs as a single HTML app without a package/build pipeline.
- CSS-only transitions: rejected as the only approach because graph updates need explicit cancellation and policy controls.

## Decision: Animate Opacity and Settling, Not Edge Geometry

Edges should be rendered with final paths first, then animated by opacity or a subtle reveal. Node transforms may settle from a small offset only when graph size is below threshold.

**Rationale**: The previous risk was edge detachment during CSS-driven animation. Final-geometry-first rendering avoids misleading dependency lines.

**Alternatives considered**:

- Morph edge paths between layouts: rejected for first version due to higher correctness risk.
- Animate the entire SVG world on every update: rejected because pan/zoom state already owns world transforms.

## Decision: Reduced Motion and Large Graph Simplification

Disable or simplify animation when `prefers-reduced-motion: reduce` is active or when graph size exceeds configured thresholds.

**Rationale**: Motion is an enhancement, not the product. Large V1 graphs must remain responsive and readable.

**Alternatives considered**:

- Always animate: rejected due to accessibility and performance risk.
- User-only toggle: deferred; browser preference and internal policy are enough for this feature.
