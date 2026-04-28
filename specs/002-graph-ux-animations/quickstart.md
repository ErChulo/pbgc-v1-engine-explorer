# Quickstart: Contained Graph UX Animations

## Run Regression Tests

```powershell
node --test tests\option-b-upload-regression.test.js
```

## Manual Smoke Test

1. Open `index.html` in a Chromium browser.
2. Change root cell, source tab, run, and graph depths.
3. Confirm graph nodes and edges remain inside the graph pane.
4. Select a node and confirm selected/adjacent states update.
5. Pan, zoom, and double-click reset while the graph remains usable.
6. In DevTools, run:

```js
window.graphAnimationDebug.setReducedMotionForTest(true)
renderGraph()
window.graphAnimationDebug.getPolicy()
```

Expected result: policy mode is `disabled` and graph still renders.
