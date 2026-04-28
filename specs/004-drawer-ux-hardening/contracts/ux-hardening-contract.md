# Contract: Drawer UX Hardening DOM Surface

## Header

- `#current-engine-name`
- `#current-engine-meta`
- `#app-version`

## Upload

- `#load-json-input` accepts multiple JSON files.
- Duplicate upload feedback uses `window.alert()` and upload status text.

## Drawer

- `#drawer-panel` uses wider desktop layout.
- `.drawer-section` elements expose visual section backgrounds.
- `.drawer-overlay` has stronger blur/opacity.

## Analysis

- Aggregate risk help uses `.info-icon` with title/aria-label definition.
- Pairwise comparison renders `.comparison-overall-summary` before metric tiles.
