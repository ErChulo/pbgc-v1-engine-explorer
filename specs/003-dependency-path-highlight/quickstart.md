# Quickstart: Animated Dependency Path Highlight

## Run Tests

```powershell
node --test tests\option-b-upload-regression.test.js
```

## Manual Smoke Test

1. Open `index.html`.
2. Click a connected graph node.
3. Confirm connected dependency edges brighten and the selected node remains selected.
4. Hover another node.
5. Confirm hover previews that node's path without changing the tree selection.
6. Run:

```js
window.graphAnimationDebug.setReducedMotionForTest(true)
renderGraph()
```

Expected: static path emphasis, no trace animation.
