const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const chromeCandidates = [
  process.env.CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);

function findBrowser() {
  return chromeCandidates.find(candidate => fs.existsSync(candidate));
}

function htmlEscapeDecoded(text) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function runBrowserHarness(browser, indexHtml, injection, tempPrefix) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const harnessPath = path.join(tmpDir, 'index.html');
  fs.writeFileSync(harnessPath, indexHtml.replace('</body>', `${injection}\n</body>`));

  const run = spawnSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-networking',
    '--allow-file-access-from-files',
    '--virtual-time-budget=20000',
    '--dump-dom',
    `file:///${harnessPath.replace(/\\/g, '/')}`
  ], { encoding: 'utf8', timeout: 20000 });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);

  const match = `${run.stdout}\n${run.stderr}`.match(/<pre id="browser-check-result">([^<]*)<\/pre>/);
  assert.ok(match, 'browser result marker should be present');

  const payload = JSON.parse(htmlEscapeDecoded(match[1]));
  assert.equal(payload.ok, true, payload.error);
  return payload;
}

test('embedded default selection renders formula graph feeders', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    result.ok = true;
    result.checks = {
      root: document.getElementById('root-select')?.selectedOptions?.[0]?.textContent?.trim() || '',
      run: document.getElementById('run-select')?.value || '',
      source: document.getElementById('source-tab-select')?.value || '',
      treeField: document.getElementById('tree-field')?.textContent?.trim() || '',
      treeText: document.getElementById('tree-stage')?.textContent?.trim() || '',
      graphNodes: Array.from(document.querySelectorAll('#graph-svg .node-hit')).map(n => n.dataset.cell)
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 1000);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'embedded-default-');
  assert.equal(payload.checks.run, 'XRD');
  assert.equal(payload.checks.source, 'Separated Vesteds');
  assert.match(payload.checks.root, /^AMB\s+·\s+Tab: Separated Vesteds\s+·\s+AP2$/);
  assert.equal(payload.checks.treeField, 'AMB');
  assert.match(payload.checks.treeText, /AR2/);
  assert.ok(payload.checks.graphNodes.includes('AP2'), 'graph should include selected output');
  assert.ok(payload.checks.graphNodes.includes('AR2'), 'graph should include formula feeder');
  assert.ok(payload.checks.graphNodes.length > 1, 'graph should expand beyond selected root');
});

test('graph animation metadata keeps edges attached to rendered nodes', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    window.graphAnimationDebug.setReducedMotionForTest(false);
    window.graphAnimationDebug.setGsapAvailableForTest(false);
    renderGraph();
    window.graphAnimationDebug.clearActiveAnimations();
    renderGraph();
    const nodes = new Set(Array.from(document.querySelectorAll('#graph-svg .node-hit')).map(node => node.dataset.cell));
    const edges = Array.from(document.querySelectorAll('#graph-svg .edge')).map(edge => ({
      source: edge.dataset.source,
      target: edge.dataset.target,
      d: edge.getAttribute('d') || '',
      adjacent: edge.classList.contains('is-adjacent'),
      dimmed: edge.classList.contains('is-dimmed')
    }));
    const policy = window.graphAnimationDebug.getPolicy();
    result.ok = true;
    result.checks = {
      nodeCount: nodes.size,
      edgeCount: edges.length,
      activeAnimations: document.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length,
      policyMode: policy && policy.mode,
      policyLibrary: policy && policy.library,
      allEdgesHaveEndpoints: edges.every(edge => nodes.has(edge.source) && nodes.has(edge.target)),
      allEdgesHavePaths: edges.every(edge => /^M\\s/.test(edge.d) && edge.d.includes(' C ')),
      anyEdgeHasMetadata: edges.some(edge => edge.source && edge.target)
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  } finally {
    try {
      window.graphAnimationDebug.setReducedMotionForTest(null);
      window.graphAnimationDebug.setGsapAvailableForTest(null);
    } catch {}
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 500);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-animation-metadata-');

  assert.ok(payload.checks.nodeCount > 1);
  assert.ok(payload.checks.edgeCount > 0);
  assert.ok(payload.checks.activeAnimations > 0);
  assert.ok(['full', 'simple', 'disabled'].includes(payload.checks.policyMode));
  assert.ok(['gsap', 'web-animations', 'none'].includes(payload.checks.policyLibrary));
  assert.equal(payload.checks.allEdgesHaveEndpoints, true);
  assert.equal(payload.checks.allEdgesHavePaths, true);
  assert.equal(payload.checks.anyEdgeHasMetadata, true);
});

test('graph selection marks selected and adjacent dependency elements', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    const candidate = Array.from(document.querySelectorAll('#graph-svg .node-hit'))
      .find(node => node.dataset.cell && node.dataset.cell !== appState.rootCell);
    if (!candidate) throw new Error('No non-root graph node found.');
    const selectedCell = candidate.dataset.cell;
    candidate.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.graphAnimationDebug.clearActiveAnimations();
    const selectedNode = document.querySelector('#graph-svg .node-hit[data-cell="' + CSS.escape(selectedCell) + '"]');
    const adjacentEdges = Array.from(document.querySelectorAll('#graph-svg .edge.is-adjacent')).map(edge => ({
      source: edge.dataset.source,
      target: edge.dataset.target
    }));
    const dimmedNodes = document.querySelectorAll('#graph-svg .node-hit.is-dimmed').length;
    result.ok = true;
    result.checks = {
      selectedCell,
      inspectCell: appState.inspectCell,
      selectedHasClass: selectedNode && selectedNode.classList.contains('is-selected'),
      adjacentEdgeCount: adjacentEdges.length,
      adjacentEdgesTouchSelection: adjacentEdges.every(edge => edge.source === selectedCell || edge.target === selectedCell),
      dimmedNodes
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 700);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-selection-states-');

  assert.equal(payload.checks.inspectCell, payload.checks.selectedCell);
  assert.equal(payload.checks.selectedHasClass, true);
  assert.ok(payload.checks.adjacentEdgeCount > 0);
  assert.equal(payload.checks.adjacentEdgesTouchSelection, true);
  assert.ok(payload.checks.dimmedNodes >= 0);
});

test('graph selection highlights the selected dependency path', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    window.graphAnimationDebug.setReducedMotionForTest(false);
    window.graphAnimationDebug.setGsapAvailableForTest(false);
    renderGraph();
    const candidate = Array.from(document.querySelectorAll('#graph-svg .node-hit'))
      .find(node => node.dataset.cell && node.dataset.cell !== appState.rootCell);
    if (!candidate) throw new Error('No connected non-root node found.');
    const selectedCell = candidate.dataset.cell;
    candidate.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const state = window.graphAnimationDebug.getPathHighlightState();
    const activeEdges = Array.from(document.querySelectorAll('#graph-svg .edge.is-path-active')).map(edge => ({
      source: edge.dataset.source,
      target: edge.dataset.target,
      incoming: edge.classList.contains('is-path-incoming'),
      outgoing: edge.classList.contains('is-path-outgoing')
    }));
    const focusNode = document.querySelector('#graph-svg .node-hit.is-path-focus');
    const relatedNodes = document.querySelectorAll('#graph-svg .node-hit.is-path-related').length;
    result.ok = true;
    result.checks = {
      selectedCell,
      inspectCell: appState.inspectCell,
      focusCell: state && state.focusCell,
      stateMode: state && state.mode,
      connectedEdgeCount: state && state.connectedEdgeCount,
      activeEdgeCount: activeEdges.length,
      activeEdgesTouchSelection: activeEdges.every(edge => edge.source === selectedCell || edge.target === selectedCell),
      hasDirectionalClass: activeEdges.some(edge => edge.incoming || edge.outgoing),
      focusCellClass: focusNode && focusNode.dataset.cell,
      relatedNodes
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  } finally {
    try {
      window.graphAnimationDebug.setReducedMotionForTest(null);
      window.graphAnimationDebug.setGsapAvailableForTest(null);
    } catch {}
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 700);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-path-selected-');

  assert.equal(payload.checks.inspectCell, payload.checks.selectedCell);
  assert.equal(payload.checks.focusCell, payload.checks.selectedCell);
  assert.ok(['animated', 'static'].includes(payload.checks.stateMode));
  assert.ok(payload.checks.connectedEdgeCount > 0);
  assert.equal(payload.checks.activeEdgeCount, payload.checks.connectedEdgeCount);
  assert.equal(payload.checks.activeEdgesTouchSelection, true);
  assert.equal(payload.checks.hasDirectionalClass, true);
  assert.equal(payload.checks.focusCellClass, payload.checks.selectedCell);
  assert.ok(payload.checks.relatedNodes > 0);
});

test('graph hover previews dependency path without changing selection', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    renderGraph();
    const originalInspect = appState.inspectCell;
    const candidate = Array.from(document.querySelectorAll('#graph-svg .node-hit'))
      .find(node => node.dataset.cell && node.dataset.cell !== originalInspect);
    if (!candidate) throw new Error('No hover candidate found.');
    const hoverCell = candidate.dataset.cell;
    candidate.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: 20, clientY: 20 }));
    const hoverState = window.graphAnimationDebug.getPathHighlightState();
    const hoverActiveEdges = document.querySelectorAll('#graph-svg .edge.is-path-active').length;
    candidate.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    const leaveState = window.graphAnimationDebug.getPathHighlightState();
    result.ok = true;
    result.checks = {
      originalInspect,
      hoverCell,
      inspectAfterHover: appState.inspectCell,
      hoverFocus: hoverState && hoverState.focusCell,
      hoverConnectedEdges: hoverState && hoverState.connectedEdgeCount,
      hoverActiveEdges,
      leaveFocus: leaveState && leaveState.focusCell,
      inspectAfterLeave: appState.inspectCell
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 700);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-path-hover-');

  assert.equal(payload.checks.inspectAfterHover, payload.checks.originalInspect);
  assert.equal(payload.checks.inspectAfterLeave, payload.checks.originalInspect);
  assert.equal(payload.checks.hoverFocus, payload.checks.hoverCell);
  assert.ok(payload.checks.hoverConnectedEdges > 0);
  assert.equal(payload.checks.hoverActiveEdges, payload.checks.hoverConnectedEdges);
  assert.equal(payload.checks.leaveFocus, payload.checks.originalInspect);
});

test('graph path highlight is static under reduced motion', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    window.graphAnimationDebug.setReducedMotionForTest(true);
    renderGraph();
    window.graphAnimationDebug.clearActiveAnimations();
    const candidate = Array.from(document.querySelectorAll('#graph-svg .node-hit'))
      .find(node => node.dataset.cell && node.dataset.cell !== appState.rootCell);
    if (!candidate) throw new Error('No reduced-motion candidate found.');
    candidate.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const state = window.graphAnimationDebug.getPathHighlightState();
    const running = document.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length;
    result.ok = true;
    result.checks = {
      policyMode: window.graphAnimationDebug.getPolicy().mode,
      stateMode: state && state.mode,
      connectedEdgeCount: state && state.connectedEdgeCount,
      activeEdgeCount: document.querySelectorAll('#graph-svg .edge.is-path-active').length,
      runningAnimations: running
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  } finally {
    try { window.graphAnimationDebug.setReducedMotionForTest(null); } catch {}
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 700);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-path-reduced-');

  assert.equal(payload.checks.policyMode, 'disabled');
  assert.equal(payload.checks.stateMode, 'static');
  assert.ok(payload.checks.connectedEdgeCount > 0);
  assert.equal(payload.checks.activeEdgeCount, payload.checks.connectedEdgeCount);
  assert.equal(payload.checks.runningAnimations, 0);
});

test('graph animation policy respects reduced motion and large graphs', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    window.graphAnimationDebug.setReducedMotionForTest(true);
    renderGraph();
    const reducedPolicy = window.graphAnimationDebug.getPolicy();
    window.graphAnimationDebug.setReducedMotionForTest(false);

    const summary = {
      schema_version: 'graph-animation-large',
      engine_name: 'Graph Animation Large',
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: { Separated: { runs: ['XRD'], cells: {}, formulas: {} } },
      namedRanges: []
    };
    const cells = summary.worksheets.Separated.cells;
    const formulas = summary.worksheets.Separated.formulas;
    cells.A1 = { cell: 'A1', genericField: 'ROOT_OUTPUT', description: 'Root output', hasFormula: true, runs: { XRD: { field: 'ROOT_OUTPUT', iob: 'O' } } };
    const rootRefs = [];
    for (let i = 1; i <= 75; i++) {
      const row = i + 1;
      const formulaCell = 'F' + row;
      const inputA = 'A' + row;
      const inputB = 'B' + row;
      rootRefs.push(formulaCell);
      cells[formulaCell] = { cell: formulaCell, genericField: 'FORMULA_' + i, description: 'Intermediate formula ' + i, hasFormula: true, runs: { XRD: { field: 'FORMULA_' + i, iob: 'M' } } };
      cells[inputA] = { cell: inputA, genericField: 'INPUT_' + i + '_A', description: 'Input A ' + i, hasFormula: false, runs: { XRD: { field: 'INPUT_' + i + '_A', iob: 'I' } } };
      cells[inputB] = { cell: inputB, genericField: 'INPUT_' + i + '_B', description: 'Input B ' + i, hasFormula: false, runs: { XRD: { field: 'INPUT_' + i + '_B', iob: 'I' } } };
      formulas[formulaCell] = { cell: formulaCell, formula: inputA + '+' + inputB, refs: [inputA, inputB], functions: [] };
    }
    formulas.A1 = { cell: 'A1', formula: rootRefs.join('+'), refs: rootRefs, functions: [] };
    applyLoadedSummary(summary, 'graph-animation-large.json');
    window.eval("appState.rootCell = 'A1'; appState.inspectCell = 'A1'; appState.backwardDepth = 2; appState.forwardDepth = 0; renderGraph();");
    const largePolicy = window.graphAnimationDebug.getPolicy();
    const largeNodeCount = document.querySelectorAll('#graph-svg .node-hit').length;
    const largeEdgeCount = document.querySelectorAll('#graph-svg .edge').length;
    result.ok = true;
    result.checks = {
      reducedMode: reducedPolicy && reducedPolicy.mode,
      reducedReason: reducedPolicy && reducedPolicy.reason,
      largeMode: largePolicy && largePolicy.mode,
      largeReason: largePolicy && largePolicy.reason,
      largePolicyNodes: largePolicy && largePolicy.nodeCount,
      largePolicyEdges: largePolicy && largePolicy.edgeCount,
      largeNodeCount,
      largeEdgeCount
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  } finally {
    try { window.graphAnimationDebug.setReducedMotionForTest(null); } catch {}
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 700);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-animation-policy-');

  assert.equal(payload.checks.reducedMode, 'disabled');
  assert.equal(payload.checks.reducedReason, 'reduced_motion');
  assert.ok(['simple', 'disabled'].includes(payload.checks.largeMode));
  assert.ok(['graph_simplified', 'graph_too_large'].includes(payload.checks.largeReason));
  assert.ok(payload.checks.largePolicyNodes >= 100);
  assert.ok(payload.checks.largePolicyEdges >= 150);
  assert.equal(payload.checks.largeNodeCount, payload.checks.largePolicyNodes);
  assert.equal(payload.checks.largeEdgeCount, payload.checks.largePolicyEdges);
});

test('graph tooltip auto-dismisses after ten seconds of hover', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    const node = document.querySelector('#graph-svg .node-hit');
    if (!node) throw new Error('No graph node found.');
    node.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, clientX: 24, clientY: 24 }));
    setTimeout(() => {
      const visibleInitially = !document.getElementById('graph-tooltip').hidden;
      setTimeout(() => {
        result.ok = true;
        result.checks = {
          visibleInitially,
          hiddenAfterTimeout: document.getElementById('graph-tooltip').hidden,
          hasShowClassAfterTimeout: document.getElementById('graph-tooltip').classList.contains('show')
        };
        const pre = document.createElement('pre');
        pre.id = 'browser-check-result';
        pre.textContent = JSON.stringify(result);
        document.body.appendChild(pre);
      }, 10500);
    }, 80);
  } catch (error) {
    result.error = String(error && error.stack || error);
    const pre = document.createElement('pre');
    pre.id = 'browser-check-result';
    pre.textContent = JSON.stringify(result);
    document.body.appendChild(pre);
  }
}, 300);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'graph-tooltip-timeout-');

  assert.equal(payload.checks.visibleInitially, true);
  assert.equal(payload.checks.hiddenAfterTimeout, true);
  assert.equal(payload.checks.hasShowClassAfterTimeout, false);
});

test('Option B JSON upload scopes source tab/run and keeps tree toggle local', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const optionB = {
    schema_version: 'option-b-regression',
    engine_name: 'Option B Regression',
    sourceTabs: ['Beneficiaries in Pay', 'Other Tab'],
    worksheets: {
      'Beneficiaries in Pay': {
        runs: ['Single Run'],
        cells: {
          AA2: {
            cell: 'AA2',
            genericField: 'BDOB',
            description: "Beneficiary's Date of Birth",
            hasFormula: false,
            runs: { 'Single Run': { field: 'BDOB', iob: 'I' } }
          },
          AB2: {
            cell: 'AB2',
            genericField: 'ZZZ_BDOB_CHECK',
            description: 'Formula after BDOB',
            hasFormula: true,
            runs: { 'Single Run': { field: 'ZZZ_BDOB_CHECK', iob: 'O' } }
          }
        },
        formulas: {
          AB2: { cell: 'AB2', formula: 'AA2', refs: ['AA2'], functions: [] }
        },
        formulaCells: ['AB2'],
        dependents: { AA2: ['AB2'] }
      },
      'Other Tab': {
        runs: ['Other Run'],
        cells: {
          AA2: {
            cell: 'AA2',
            genericField: 'OTHER_AA2',
            description: 'Other tab duplicate',
            hasFormula: false,
            runs: { 'Other Run': { field: 'OTHER_AA2', iob: 'I' } }
          }
        }
      }
    },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function text(id){ return (document.getElementById(id)?.textContent || '').trim(); }
  function selectedText(id){ const el = document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function nodeTexts(){ return Array.from(document.querySelectorAll('#graph-svg .node-hit text')).map(n => n.textContent.trim()); }
  async function waitFor(predicate, timeoutMs = 4000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(optionB)})], 'option-b.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const uploaded = await waitFor(() => text('upload-status-name') === 'option-b.json');
    if (!uploaded) throw new Error('Option B upload did not finish.');
    const beforeToggle = {
      root: selectedText('root-select'),
      source: document.getElementById('source-tab-select').value,
      run: document.getElementById('run-select').value,
      treeField: text('tree-field'),
      treeSource: text('tree-source'),
      treeCell: text('tree-cell'),
      graph: nodeTexts()
    };
    const toggle = document.getElementById('label-toggle');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 100));
    const afterToggle = {
      root: selectedText('root-select'),
      graph: nodeTexts(),
      treeField: text('tree-field')
    };
    result.ok = true;
    result.checks = {
      beforeToggle,
      afterToggle,
      uploadName: text('upload-status-name'),
      uploadMeta: text('upload-status-meta')
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})();
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'option-b-upload-');

  const { beforeToggle, afterToggle, uploadName, uploadMeta } = payload.checks;
  assert.equal(uploadName, 'option-b.json');
  assert.match(uploadMeta, /2 source tabs/);
  assert.equal(beforeToggle.source, 'Beneficiaries in Pay');
  assert.equal(beforeToggle.run, 'Single Run');
  assert.equal(beforeToggle.root, 'BDOB  ·  Tab: Beneficiaries in Pay  ·  AA2');
  assert.equal(beforeToggle.treeField, 'BDOB');
  assert.equal(beforeToggle.treeSource, 'Tab: Beneficiaries in Pay');
  assert.equal(beforeToggle.treeCell, 'Cell: AA2');
  assert.deepEqual(beforeToggle.graph, [
    'BDOB',
    'Tab: Beneficiaries in Pay',
    'AA2'
  ]);
  assert.equal(afterToggle.root, beforeToggle.root);
  assert.deepEqual(afterToggle.graph, beforeToggle.graph);
  assert.equal(afterToggle.treeField, 'BDOB');
});

test('JSON upload stores normalized summary and metrics in browser warehouse', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const warehouseData = {
    schema_version: 'warehouse-regression',
    engine_name: 'Warehouse Regression',
    sourceTabs: ['Warehouse Tab'],
    runs: ['XRD'],
    worksheets: {
      'Warehouse Tab': {
        runs: ['XRD'],
        cells: {
          A1: {
            cell: 'A1',
            genericField: 'FORMULA_OUTPUT',
            description: 'Stored formula output',
            hasFormula: true,
            runs: { XRD: { field: 'FORMULA_OUTPUT', iob: 'O' } }
          },
          B1: {
            cell: 'B1',
            genericField: 'INPUT_B',
            description: 'Stored input',
            hasFormula: false,
            runs: { XRD: { field: 'INPUT_B', iob: 'I' } }
          }
        },
        formulas: {
          A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] }
        },
        formulaCells: ['A1'],
        dependents: { B1: ['A1'] }
      }
    },
    namedRanges: []
  };
  const otherData = {
    schema_version: 'other',
    engine_name: 'Other',
    sourceTabs: ['Other Tab'],
    runs: ['XRD'],
    worksheets: {
      'Other Tab': {
        runs: ['XRD'],
        cells: {
          C1: {
            cell: 'C1',
            genericField: 'OTHER_CELL',
            description: 'Other cell',
            hasFormula: false,
            runs: { XRD: { field: 'OTHER_CELL', iob: 'I' } }
          }
        }
      }
    },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function selectedText(id){ const el = document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function metricTiles(){
    return Array.from(document.querySelectorAll('#warehouse-metrics .metric-tile')).map(tile => ({
      label: tile.querySelector('.metric-label')?.textContent || '',
      value: tile.querySelector('.metric-value')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    if (!window.indexedDB) throw new Error('IndexedDB unavailable');
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(warehouseData)})], 'warehouse-regression.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const stored = await waitFor(async () => {
      const records = await engineWarehouse.getAll();
      return records.some(record => record.sourceName === 'warehouse-regression.json');
    });
    if (!stored) throw new Error('Uploaded engine was not stored.');

    const records = await engineWarehouse.getAll();
    const record = records.find(item => item.sourceName === 'warehouse-regression.json');
    applyLoadedSummary(${JSON.stringify(otherData)}, 'other.json');
    await engineWarehouse.load(record.id);

    result.ok = true;
    result.checks = {
      sourceName: record.sourceName,
      displayName: record.displayName,
      counts: record.counts,
      metricFamilies: Array.from(new Set(record.metricRows.map(row => row.metric_family))).sort(),
      storedFormulaRows: record.metricRows.filter(row => row.metric_family === 'formula').length,
      loadedRoot: selectedText('root-select'),
      loadedSource: document.getElementById('source-tab-select').value,
      selectedWarehouse: document.getElementById('warehouse-select').value,
      loadDisabled: document.getElementById('warehouse-load-button').disabled,
      metricTiles: metricTiles()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-upload-');

  assert.equal(payload.checks.sourceName, 'warehouse-regression.json');
  assert.equal(payload.checks.displayName, 'warehouse-regression.json');
  assert.equal(payload.checks.counts.formulas, 1);
  assert.ok(payload.checks.counts.metricRows > 10);
  assert.deepEqual(payload.checks.metricFamilies, [
    'benefit_architecture',
    'formula',
    'operational_risk',
    'semantic',
    'structural'
  ]);
  assert.ok(payload.checks.storedFormulaRows > 0);
  assert.match(payload.checks.loadedRoot, /^FORMULA_OUTPUT\s+/);
  assert.equal(payload.checks.loadedSource, 'Warehouse Tab');
  assert.ok(payload.checks.selectedWarehouse);
  assert.equal(payload.checks.loadDisabled, false);
  assert.ok(payload.checks.metricTiles.some(tile => tile.label === 'Formulas' && tile.value === '1'));
  assert.ok(payload.checks.metricTiles.some(tile => tile.label === 'Metric rows' && Number(tile.value) > 10));
  assert.ok(payload.checks.metricTiles.some(tile => tile.label === 'Max depth'));
});

test('drawer UX shows current engine version and stronger visual separation', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
setTimeout(() => {
  const result = { ok: false, checks: {} };
  try {
    document.body.classList.add('drawer-open');
    const drawer = document.getElementById('drawer-panel');
    const overlay = document.getElementById('drawer-overlay');
    const sections = Array.from(document.querySelectorAll('#drawer-panel .drawer-section'));
    const button = document.querySelector('#drawer-panel .mini-button');
    const select = document.querySelector('#drawer-panel .compact-select');
    result.ok = true;
    result.checks = {
      drawerWidth: drawer.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
      overlayBlur: getComputedStyle(overlay).backdropFilter || getComputedStyle(overlay).webkitBackdropFilter || '',
      sectionBackgrounds: sections.map(section => getComputedStyle(section).backgroundColor),
      buttonBackground: getComputedStyle(button).backgroundImage || getComputedStyle(button).backgroundColor,
      selectBackground: getComputedStyle(select).backgroundImage || getComputedStyle(select).backgroundColor,
      currentEngine: document.getElementById('current-engine-name').textContent.trim(),
      appVersion: document.getElementById('app-version').textContent.trim(),
      inputMultiple: document.getElementById('load-json-input').multiple
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
}, 300);
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'drawer-ux-hooks-');

  assert.ok(payload.checks.drawerWidth / payload.checks.viewportWidth >= 0.45);
  assert.match(payload.checks.overlayBlur, /blur/);
  assert.ok(new Set(payload.checks.sectionBackgrounds).size >= 2);
  assert.notEqual(payload.checks.buttonBackground, payload.checks.selectBackground);
  assert.ok(payload.checks.currentEngine.length > 0);
  assert.match(payload.checks.appVersion, /^v\d+\./);
  assert.equal(payload.checks.inputMultiple, true);
});

test('bulk JSON upload imports unique files and blocks duplicate source names', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function summary(name, field) {
    return {
      schema_version: 'bulk-upload',
      engine_name: name,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: field, description: field, hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'INPUT', description: 'Input', hasFormula: false, runs: { XRD: { field: 'INPUT', iob: 'I' } } }
          },
          formulas: { A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] } }
        }
      },
      namedRanges: []
    };
  }
  const existing = summary('Existing Bulk', 'EXISTING_BENEFIT');
  const unique = summary('Unique Bulk', 'UNIQUE_BENEFIT');

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  const alerts = [];
  window.alert = message => alerts.push(String(message));
  try {
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(existing)}), 'dup.json');
    const input = document.getElementById('load-json-input');
    const dt = new DataTransfer();
    dt.items.add(new File([JSON.stringify(${JSON.stringify(existing)})], 'dup.json', { type: 'application/json' }));
    dt.items.add(new File([JSON.stringify(${JSON.stringify(unique)})], 'unique-bulk.json', { type: 'application/json' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    async function waitFor(predicate, timeoutMs = 5000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return false;
    }
    const stored = await waitFor(async () => (await engineWarehouse.getAll()).some(record => record.sourceName === 'unique-bulk.json'));
    const finished = await waitFor(() => document.getElementById('upload-status-name').textContent.trim() === 'Bulk upload complete');
    const records = await engineWarehouse.getAll();
    result.ok = true;
    result.checks = {
      stored,
      finished,
      duplicateCount: records.filter(record => record.sourceName === 'dup.json').length,
      uniqueCount: records.filter(record => record.sourceName === 'unique-bulk.json').length,
      alerts,
      uploadName: document.getElementById('upload-status-name').textContent.trim(),
      uploadMeta: document.getElementById('upload-status-meta').textContent.trim(),
      currentEngine: document.getElementById('current-engine-name').textContent.trim()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'bulk-upload-');

  assert.equal(payload.checks.stored, true);
  assert.equal(payload.checks.finished, true);
  assert.equal(payload.checks.duplicateCount, 1);
  assert.equal(payload.checks.uniqueCount, 1);
  assert.ok(payload.checks.alerts.some(message => message.includes('dup.json')));
  assert.equal(payload.checks.uploadName, 'Bulk upload complete');
  assert.match(payload.checks.uploadMeta, /1 imported/);
  assert.equal(payload.checks.currentEngine, 'unique-bulk.json');
});

test('warehouse compare controls render profile similarity tiles for two stored engines', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const engineA = {
    schema_version: 'warehouse-compare-a',
    engine_name: 'Compare A',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement interest benefit', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } },
          B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } }
        },
        formulas: {
          A1: { cell: 'A1', formula: 'NPVF2(B1,Plan_Int)', refs: ['B1', 'Plan_Int'], functions: ['NPVF2'] }
        }
      }
    },
    namedRanges: ['Plan_Int']
  };
  const engineB = {
    schema_version: 'warehouse-compare-b',
    engine_name: 'Compare B',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: { cell: 'A1', genericField: 'QPSA_LUMP_SUM_BENEFIT', description: 'Qualified preretirement survivor lump sum', hasFormula: true, runs: { XRD: { field: 'QPSA_LUMP_SUM_BENEFIT', iob: 'O' } } },
          B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } }
        },
        formulas: {
          A1: { cell: 'A1', formula: 'QPSAPVF(B1,Plan_Int)', refs: ['B1', 'Plan_Int'], functions: ['QPSAPVF'] }
        }
      }
    },
    namedRanges: ['Plan_Int']
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function tiles(){
    return Array.from(document.querySelectorAll('#warehouse-compare-results .metric-tile')).map(tile => ({
      label: tile.querySelector('.metric-label')?.textContent || '',
      value: tile.querySelector('.metric-value')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const recordA = await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(engineA)}), 'compare-a.json');
    const recordB = await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(engineB)}), 'compare-b.json');
    await engineWarehouse.refresh(recordB.id);
    document.getElementById('warehouse-compare-a').value = recordA.id;
    document.getElementById('warehouse-compare-b').value = recordB.id;
    document.getElementById('warehouse-compare-a').dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('warehouse-compare-b').dispatchEvent(new Event('change', { bubbles: true }));
    const report = await engineWarehouse.compare(recordA.id, recordB.id);
    const rendered = await waitFor(() => tiles().some(tile => tile.label === 'Overall'));
    if (!rendered) throw new Error('Comparison tiles did not render.');
    result.ok = true;
    result.checks = {
      compareDisabled: document.getElementById('warehouse-compare-button').disabled,
      selectedA: document.getElementById('warehouse-compare-a').value,
      selectedB: document.getElementById('warehouse-compare-b').value,
      tiles: tiles(),
      overallSummary: document.querySelector('#warehouse-compare-results .comparison-overall-summary')?.textContent || '',
      status: document.getElementById('warehouse-status-name').textContent,
      benefitDistance: report.family_distances.benefit_architecture.distance
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-compare-');

  assert.equal(payload.checks.compareDisabled, false);
  assert.ok(payload.checks.selectedA);
  assert.ok(payload.checks.selectedB);
  assert.notEqual(payload.checks.selectedA, payload.checks.selectedB);
  assert.equal(payload.checks.status, 'Comparison ready');
  assert.ok(payload.checks.benefitDistance > 0);
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Overall' && /%$/.test(tile.value)));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Formula' && /%$/.test(tile.value)));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Benefit' && /%$/.test(tile.value)));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Top difference' && tile.value !== 'None'));
  assert.match(payload.checks.overallSummary, /Overall similarity/);
  assert.match(payload.checks.overallSummary, /Overall distance/);
});

test('warehouse aggregate analysis summarizes stored V1 engine library', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function engine(engineName, field, description, formula, functions, refs, namedRanges = ['Plan_Int']) {
    return {
      schema_version: 'warehouse-aggregate',
      engine_name: engineName,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: field, description, hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Final average compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } },
            C1: { cell: 'C1', genericField: 'SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'SERVICE', iob: 'I' } } }
          },
          formulas: {
            A1: { cell: 'A1', formula, refs, functions }
          }
        }
      },
      namedRanges
    };
  }
  const retirement = engine(
    'Aggregate Retirement',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const survivor = engine(
    'Aggregate Survivor',
    'QPSA_LUMP_SUM_BENEFIT',
    'Qualified preretirement survivor lump sum beneficiary benefit',
    'QPSAPVF(B1*C1,Plan_Int)',
    ['QPSAPVF'],
    ['B1', 'C1', 'Plan_Int']
  );
  const risky = engine(
    'Aggregate Risky',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with unresolved reference',
    'ROUND(B1*Missing_Name,,)',
    ['ROUND'],
    ['B1', 'Missing_Name'],
    []
  );

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function tiles(){
    return Array.from(document.querySelectorAll('#warehouse-aggregate-results .metric-tile')).map(tile => ({
      label: tile.querySelector('.metric-label')?.textContent || '',
      value: tile.querySelector('.metric-value')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(retirement)}), 'aggregate-retirement.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(survivor)}), 'aggregate-survivor.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(risky)}), 'aggregate-risky.json');
    const records = await engineWarehouse.refresh();
    const summary = engineWarehouse.aggregate(records);
    const rendered = await waitFor(() => tiles().some(tile => tile.label === 'Engines' && tile.value === '3'));
    if (!rendered) throw new Error('Aggregate tiles did not render.');
    result.ok = true;
    result.checks = {
      engineCount: summary.engine_count,
      commonDomains: summary.common_benefit_domains.map(item => item.name),
      commonFunctions: summary.common_functions.map(item => item.name),
      highestRisk: summary.highest_risk_engine.name,
      pairCount: summary.pairwise_spread.pairCount,
      hasMostSimilar: !!summary.pairwise_spread.mostSimilar,
      hasMostDistinct: !!summary.pairwise_spread.mostDistinct,
      riskInfoTitle: document.querySelector('#warehouse-aggregate-results .info-icon')?.dataset.tooltip || '',
      tiles: tiles()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-aggregate-');

  assert.equal(payload.checks.engineCount, 3);
  assert.ok(payload.checks.commonDomains.includes('normal_retirement'));
  assert.ok(payload.checks.commonDomains.includes('qpsa'));
  assert.ok(payload.checks.commonFunctions.includes('NPVF2'));
  assert.ok(payload.checks.commonFunctions.includes('QPSAPVF'));
  assert.equal(payload.checks.highestRisk, 'aggregate-risky.json');
  assert.equal(payload.checks.pairCount, 3);
  assert.equal(payload.checks.hasMostSimilar, true);
  assert.equal(payload.checks.hasMostDistinct, true);
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Engines' && tile.value === '3'));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Benefit domains' && tile.value.includes('normal_retirement')));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Functions' && tile.value.includes('NPVF2')));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Highest risk' && tile.value.includes('aggregate-risky.json')));
  assert.match(payload.checks.riskInfoTitle, /unresolved references/);
  assert.match(payload.checks.riskInfoTitle, /raw attention score/);
});

test('warehouse ranks stored engines as reuse candidates for current engine', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function engine(engineName, field, description, formula, functions, refs, namedRanges = ['Plan_Int']) {
    return {
      schema_version: 'warehouse-match',
      engine_name: engineName,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: field, description, hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'FINAL_AVERAGE_COMPENSATION', description: 'Final average compensation input', hasFormula: false, runs: { XRD: { field: 'FINAL_AVERAGE_COMPENSATION', iob: 'I' } } },
            C1: { cell: 'C1', genericField: 'CREDITED_SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'CREDITED_SERVICE', iob: 'I' } } }
          },
          formulas: {
            A1: { cell: 'A1', formula, refs, functions }
          }
        }
      },
      namedRanges
    };
  }
  const current = engine(
    'Current New Case',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const closeMatch = engine(
    'Approved Close Match',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const weakMatch = engine(
    'Approved Weak Match',
    'QPSA_LUMP_SUM_BENEFIT',
    'Qualified preretirement survivor lump sum beneficiary benefit',
    'QPSAPVF(B1*C1,Plan_Int)',
    ['QPSAPVF'],
    ['B1', 'C1', 'Plan_Int']
  );
  const differentMatch = engine(
    'Approved Formula Different',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with unresolved reference',
    'ROUND(B1*Missing_Name,,)',
    ['ROUND'],
    ['B1', 'Missing_Name'],
    []
  );

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function cards(){
    return Array.from(document.querySelectorAll('#warehouse-match-results .match-card')).map(card => ({
      title: card.querySelector('.match-title')?.textContent || '',
      meta: card.querySelector('.match-meta')?.textContent || '',
      diff: card.querySelector('.match-diff')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    applyLoadedSummary(${JSON.stringify(current)}, 'current-new-case.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(closeMatch)}), 'approved-close-match.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(weakMatch)}), 'approved-weak-match.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(differentMatch)}), 'approved-formula-different.json');
    await engineWarehouse.refresh();
    const matches = await engineWarehouse.rankMatchesForCurrent({ limit: 3 });
    const rendered = await waitFor(() => cards().some(card => card.title.includes('approved-close-match.json')));
    if (!rendered) throw new Error('Match cards did not render.');
    result.ok = true;
    result.checks = {
      matchCount: matches.length,
      firstName: matches[0].engine_name,
      firstOverall: matches[0].overall_similarity,
      lastOverall: matches[matches.length - 1].overall_similarity,
      status: document.getElementById('warehouse-match-name').textContent,
      meta: document.getElementById('warehouse-match-meta').textContent,
      buttonDisabled: document.getElementById('warehouse-match-button').disabled,
      riskInfoCount: document.querySelectorAll('#warehouse-match-results .info-icon').length,
      riskInfoTooltip: document.querySelector('#warehouse-match-results .info-icon')?.dataset.tooltip || '',
      cards: cards()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-match-');

  assert.equal(payload.checks.matchCount, 3);
  assert.equal(payload.checks.firstName, 'approved-close-match.json');
  assert.ok(payload.checks.firstOverall > 0.99);
  assert.ok(payload.checks.firstOverall >= payload.checks.lastOverall);
  assert.equal(payload.checks.status, '3 candidates ranked');
  assert.match(payload.checks.meta, /Best match: approved-close-match\.json/);
  assert.equal(payload.checks.buttonDisabled, false);
  assert.ok(payload.checks.riskInfoCount >= 3);
  assert.match(payload.checks.riskInfoTooltip, /Quality profile similarity/);
  assert.match(payload.checks.riskInfoTooltip, /not a percent-risk rating/);
  assert.ok(payload.checks.cards[0].title.includes('approved-close-match.json'));
  assert.ok(payload.checks.cards[0].meta.includes('Overall 100%'));
  assert.ok(payload.checks.cards[0].meta.includes('Quality profile 100%'));
  assert.ok(payload.checks.cards.some(card => card.diff.includes('Top difference')));
});

test('warehouse match ranking handles empty, self-only, missing metrics, and ties', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function engine(engineName) {
    return {
      schema_version: 'warehouse-match-edge',
      engine_name: engineName,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement benefit', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } }
          },
          formulas: {
            A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] }
          }
        }
      },
      namedRanges: []
    };
  }

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function cards(){
    return Array.from(document.querySelectorAll('#warehouse-match-results .match-card')).map(card => ({
      title: card.querySelector('.match-title')?.textContent || '',
      diff: card.querySelector('.match-diff')?.textContent || ''
    }));
  }
  try {
    applyLoadedSummary(${JSON.stringify(engine('Current Edge'))}, 'current-edge.json');
    const emptyMatches = await engineWarehouse.rankMatchesForCurrent();
    const emptyCards = cards();

    const selfRecord = await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(engine('Self Only'))}), 'self-only.json');
    await engineWarehouse.load(selfRecord.id);
    const selfOnlyMatches = await engineWarehouse.rankMatchesForCurrent();
    const selfOnlyCards = cards();

    const targetMetrics = computeCurrentEngineMetrics();
    const tieRecords = [
      { id: 'b-tie', displayName: 'B Tie', metrics: targetMetrics },
      { id: 'a-tie', displayName: 'A Tie', metrics: targetMetrics },
      { id: 'missing-metrics', displayName: 'Missing Metrics' }
    ];
    const tieMatches = engineWarehouse.rankMatchesForMetrics(targetMetrics, tieRecords, { limit: 5 });

    result.ok = true;
    result.checks = {
      emptyCount: emptyMatches.length,
      emptyCardTitle: emptyCards[0]?.title || '',
      emptyCardDiff: emptyCards[0]?.diff || '',
      selfOnlyCount: selfOnlyMatches.length,
      selfOnlyCardTitle: selfOnlyCards[0]?.title || '',
      tieNames: tieMatches.map(match => match.engine_name),
      tieCount: tieMatches.length,
      skippedMissingMetrics: !tieMatches.some(match => match.engine_name === 'Missing Metrics')
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-match-edge-');

  assert.equal(payload.checks.emptyCount, 0);
  assert.equal(payload.checks.emptyCardTitle, 'No candidates');
  assert.match(payload.checks.emptyCardDiff, /Store at least one different engine/);
  assert.equal(payload.checks.selfOnlyCount, 0);
  assert.equal(payload.checks.selfOnlyCardTitle, 'No candidates');
  assert.deepEqual(payload.checks.tieNames, ['A Tie', 'B Tie']);
  assert.equal(payload.checks.tieCount, 2);
  assert.equal(payload.checks.skippedMissingMetrics, true);
});

test('warehouse match ranking emits reuse candidate reports with warnings and evidence', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function engine(engineName, field, description, formula, functions, refs, namedRanges = ['Plan_Int']) {
    return {
      schema_version: 'warehouse-reuse-report',
      engine_name: engineName,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: field, description, hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'FINAL_AVERAGE_COMPENSATION', description: 'Final average compensation input', hasFormula: false, runs: { XRD: { field: 'FINAL_AVERAGE_COMPENSATION', iob: 'I' } } },
            C1: { cell: 'C1', genericField: 'CREDITED_SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'CREDITED_SERVICE', iob: 'I' } } }
          },
          formulas: {
            A1: { cell: 'A1', formula, refs, functions }
          }
        }
      },
      namedRanges
    };
  }
  const current = engine(
    'Current Reuse Report',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const candidate = engine(
    'Risky Candidate',
    'QPSA_LUMP_SUM_BENEFIT',
    'Qualified preretirement survivor lump sum beneficiary benefit',
    'ROUND(B1*Missing_Name,,)',
    ['ROUND'],
    ['B1', 'Missing_Name'],
    []
  );

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function cards(){
    return Array.from(document.querySelectorAll('#warehouse-match-results .match-card')).map(card => ({
      title: card.querySelector('.match-title')?.textContent || '',
      diff: card.querySelector('.match-diff')?.textContent || '',
      evidence: card.querySelector('.match-evidence')?.textContent || '',
      warning: card.querySelector('.match-warning')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    applyLoadedSummary(${JSON.stringify(current)}, 'current-report.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(candidate)}), 'risky-candidate.json');
    await engineWarehouse.refresh();
    const matches = await engineWarehouse.rankMatchesForCurrent({ limit: 1 });
    const rendered = await waitFor(() => cards().some(card => card.warning.includes('Review:')));
    if (!rendered) throw new Error('Reuse report card did not render.');
    const report = matches[0].reuse_candidate_report;
    result.ok = true;
    result.checks = {
      reportType: report.report_type,
      metricVersion: report.metric_version,
      candidateName: report.candidate_name,
      hasFamilyScores: !!report.family_scores.benefit_architecture,
      hasTopDifferences: report.top_differences.length > 0,
      hasTopSimilarities: report.top_similarities.length > 0,
      warnings: report.warnings,
      missingEvidenceIsArray: Array.isArray(report.missing_evidence),
      hasProvenance: !!report.provenance.candidate_counts,
      card: cards()[0]
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-reuse-report-');

  assert.equal(payload.checks.reportType, 'reuse_candidate_report');
  assert.equal(payload.checks.metricVersion, 'v0.7');
  assert.equal(payload.checks.candidateName, 'risky-candidate.json');
  assert.equal(payload.checks.hasFamilyScores, true);
  assert.equal(payload.checks.hasTopDifferences, true);
  assert.equal(payload.checks.hasTopSimilarities, true);
  assert.ok(payload.checks.warnings.length > 0);
  assert.equal(payload.checks.missingEvidenceIsArray, true);
  assert.equal(payload.checks.hasProvenance, true);
  assert.match(payload.checks.card.diff, /Top difference:/);
  assert.match(payload.checks.card.evidence, /Strongest similarity:/);
  assert.match(payload.checks.card.warning, /Review:/);
});

test('warehouse validates, recomputes, and skips records for ranking diagnostics', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const summary = {
    schema_version: 'warehouse-diagnostics',
    engine_name: 'Diagnostics Engine',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement benefit', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } },
          B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } }
        },
        formulas: {
          A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] }
        }
      }
    },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  try {
    applyLoadedSummary(${JSON.stringify(summary)}, 'diagnostics-current.json');
    const currentRecord = await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(summary)}), 'current-record.json');
    const currentValidation = validateWarehouseRecord(currentRecord);

    const missingMetrics = {
      id: 'missing-metrics-record',
      sourceName: 'missing-metrics.json',
      displayName: 'Missing Metrics',
      importedAt: new Date().toISOString(),
      schemaVersion: 'warehouse-diagnostics',
      summary: normalizeSummary(${JSON.stringify(summary)}),
      counts: { cells: 2, formulas: 1, sourceTabs: 1, runs: 1, namedRanges: 0, metricRows: 0 }
    };
    const stale = {
      ...currentRecord,
      id: 'stale-record',
      sourceName: 'stale.json',
      displayName: 'Stale Metrics',
      metricVersion: 'v0.1',
      metrics: { ...currentRecord.metrics, metric_version: 'v0.1' }
    };
    const unusable = {
      id: 'unusable-record',
      sourceName: 'unusable.json',
      displayName: 'Unusable Record',
      importedAt: new Date().toISOString()
    };
    await Promise.all([
      engineWarehouse.putRaw(missingMetrics),
      engineWarehouse.putRaw(stale),
      engineWarehouse.putRaw(unusable)
    ]);
    await engineWarehouse.refresh();
    const matches = await engineWarehouse.rankMatchesForCurrent({ limit: 5, excludeId: currentRecord.id });
    const diagnostics = matches.diagnostics || [];
    const refreshedMissing = await engineWarehouse.get('missing-metrics-record');
    const refreshedStale = await engineWarehouse.get('stale-record');
    result.ok = true;
    result.checks = {
      currentMetricVersion: currentRecord.metricVersion,
      currentMetricsVersion: currentRecord.metrics.metric_version,
      currentValidationStatus: currentValidation.status,
      matchNames: matches.map(match => match.engine_name).sort(),
      diagnostics: diagnostics.map(item => ({ id: item.record_id, status: item.status, reason: item.reason })),
      missingRecomputed: !!refreshedMissing.metrics && refreshedMissing.metricVersion === 'v0.7',
      staleMigrated: !!refreshedStale.metrics && refreshedStale.metricVersion === 'v0.7',
      unusableSkipped: diagnostics.some(item => item.record_id === 'unusable-record' && item.status === 'skipped')
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-diagnostics-');

  assert.equal(payload.checks.currentMetricVersion, 'v0.7');
  assert.equal(payload.checks.currentMetricsVersion, 'v0.7');
  assert.equal(payload.checks.currentValidationStatus, 'current');
  assert.ok(payload.checks.matchNames.includes('Missing Metrics'));
  assert.ok(payload.checks.matchNames.includes('Stale Metrics'));
  assert.ok(!payload.checks.matchNames.includes('Unusable Record'));
  assert.equal(payload.checks.missingRecomputed, true);
  assert.equal(payload.checks.staleMigrated, true);
  assert.equal(payload.checks.unusableSkipped, true);
  assert.ok(payload.checks.diagnostics.some(item => item.id === 'missing-metrics-record' && item.status === 'recomputed'));
  assert.ok(payload.checks.diagnostics.some(item => item.id === 'stale-record' && item.status === 'migrated'));
});

test('warehouse export and import round trip preserves ranking evidence', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  function engine(engineName, field, description, formula, functions, refs, namedRanges = ['Plan_Int']) {
    return {
      schema_version: 'warehouse-bundle',
      engine_name: engineName,
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: {
        Separated: {
          runs: ['XRD'],
          cells: {
            A1: { cell: 'A1', genericField: field, description, hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
            B1: { cell: 'B1', genericField: 'FINAL_AVERAGE_COMPENSATION', description: 'Final average compensation input', hasFormula: false, runs: { XRD: { field: 'FINAL_AVERAGE_COMPENSATION', iob: 'I' } } },
            C1: { cell: 'C1', genericField: 'CREDITED_SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'CREDITED_SERVICE', iob: 'I' } } }
          },
          formulas: {
            A1: { cell: 'A1', formula, refs, functions }
          }
        }
      },
      namedRanges
    };
  }
  const current = engine(
    'Bundle Current',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const close = engine(
    'Bundle Close',
    'NORMAL_RETIREMENT_BENEFIT',
    'Normal retirement benefit with interest and mortality assumptions',
    'NPVF2(B1*C1,Plan_Int)',
    ['NPVF2'],
    ['B1', 'C1', 'Plan_Int']
  );
  const weak = engine(
    'Bundle Weak',
    'QPSA_LUMP_SUM_BENEFIT',
    'Qualified preretirement survivor lump sum beneficiary benefit',
    'QPSAPVF(B1*C1,Plan_Int)',
    ['QPSAPVF'],
    ['B1', 'C1', 'Plan_Int']
  );

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  try {
    applyLoadedSummary(${JSON.stringify(current)}, 'bundle-current.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(close)}), 'bundle-close.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(weak)}), 'bundle-weak.json');
    await engineWarehouse.refresh();
    const beforeMatches = await engineWarehouse.rankMatchesForCurrent({ limit: 2 });
    const beforeAggregate = engineWarehouse.aggregate(await engineWarehouse.getAll());
    const bundle = await engineWarehouse.exportBundle();
    await engineWarehouse.clear();
    await engineWarehouse.refresh();
    const afterClear = await engineWarehouse.getAll();
    const imported = await engineWarehouse.importBundle(JSON.stringify(bundle));
    const afterRecords = await engineWarehouse.getAll();
    const afterMatches = await engineWarehouse.rankMatchesForCurrent({ limit: 2 });
    const afterAggregate = engineWarehouse.aggregate(afterRecords);
    result.ok = true;
    result.checks = {
      bundleVersion: bundle.bundle_schema_version,
      bundleMetricVersion: bundle.metric_version,
      bundleRecordCount: bundle.record_count,
      afterClearCount: afterClear.length,
      importedCount: imported.imported_count,
      skippedCount: imported.skipped_count,
      afterRecordCount: afterRecords.length,
      beforeFirst: beforeMatches[0].engine_name,
      afterFirst: afterMatches[0].engine_name,
      beforeOverall: beforeMatches[0].overall_similarity,
      afterOverall: afterMatches[0].overall_similarity,
      beforeAggregateCount: beforeAggregate.engine_count,
      afterAggregateCount: afterAggregate.engine_count,
      importDiagnostics: imported.diagnostics.map(item => item.status)
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-bundle-');

  assert.equal(payload.checks.bundleVersion, 'v1');
  assert.equal(payload.checks.bundleMetricVersion, 'v0.7');
  assert.equal(payload.checks.bundleRecordCount, 2);
  assert.equal(payload.checks.afterClearCount, 0);
  assert.equal(payload.checks.importedCount, 2);
  assert.equal(payload.checks.skippedCount, 0);
  assert.equal(payload.checks.afterRecordCount, 2);
  assert.equal(payload.checks.beforeFirst, 'bundle-close.json');
  assert.equal(payload.checks.afterFirst, 'bundle-close.json');
  assert.equal(payload.checks.beforeOverall, payload.checks.afterOverall);
  assert.equal(payload.checks.beforeAggregateCount, payload.checks.afterAggregateCount);
  assert.ok(payload.checks.importDiagnostics.every(status => status === 'current'));
});

test('warehouse import duplicate ids follow replacement policy', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const summary = {
    schema_version: 'warehouse-duplicate-policy',
    engine_name: 'Duplicate Policy Engine',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement benefit', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } },
          B1: { cell: 'B1', genericField: 'FINAL_AVERAGE_COMPENSATION', description: 'Final average compensation input', hasFormula: false, runs: { XRD: { field: 'FINAL_AVERAGE_COMPENSATION', iob: 'I' } } },
          C1: { cell: 'C1', genericField: 'CREDITED_SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'CREDITED_SERVICE', iob: 'I' } } }
        },
        formulas: {
          A1: { cell: 'A1', formula: 'NPVF2(B1*C1,Plan_Int)', refs: ['B1', 'C1', 'Plan_Int'], functions: ['NPVF2'] }
        }
      }
    },
    namedRanges: ['Plan_Int']
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  try {
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(summary)}), 'duplicate-policy.json');
    await engineWarehouse.refresh();
    const bundle = await engineWarehouse.exportBundle();
    const skipResult = await engineWarehouse.importBundle(bundle, { replaceExisting: false });
    const afterSkipRecords = await engineWarehouse.getAll();
    const replaceResult = await engineWarehouse.importBundle(bundle);
    const afterReplaceRecords = await engineWarehouse.getAll();
    const duplicateDiagnostic = skipResult.diagnostics.find(item => item.reason === 'duplicate_record');
    result.ok = true;
    result.checks = {
      bundleRecordCount: bundle.record_count,
      skipImported: skipResult.imported_count,
      skipSkipped: skipResult.skipped_count,
      duplicateReason: duplicateDiagnostic && duplicateDiagnostic.reason,
      duplicateStatus: duplicateDiagnostic && duplicateDiagnostic.status,
      afterSkipCount: afterSkipRecords.length,
      replaceImported: replaceResult.imported_count,
      replaceSkipped: replaceResult.skipped_count,
      afterReplaceCount: afterReplaceRecords.length
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-duplicate-policy-');

  assert.equal(payload.checks.bundleRecordCount, 1);
  assert.equal(payload.checks.skipImported, 0);
  assert.equal(payload.checks.skipSkipped, 1);
  assert.equal(payload.checks.duplicateReason, 'duplicate_record');
  assert.equal(payload.checks.duplicateStatus, 'skipped');
  assert.equal(payload.checks.afterSkipCount, 1);
  assert.equal(payload.checks.replaceImported, 1);
  assert.equal(payload.checks.replaceSkipped, 0);
  assert.equal(payload.checks.afterReplaceCount, 1);
});

test('warehouse drawer import/export controls and readiness indicators are wired', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const valid = {
    schema_version: 'warehouse-controls',
    engine_name: 'Controls Valid',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: { Separated: { runs: ['XRD'], cells: { A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } }, B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } } }, formulas: { A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] } } } },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function tiles(){
    return Array.from(document.querySelectorAll('#warehouse-aggregate-results .metric-tile')).map(tile => ({
      label: tile.querySelector('.metric-label')?.textContent || '',
      value: tile.querySelector('.metric-value')?.textContent || ''
    }));
  }
  async function waitFor(predicate, timeoutMs = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const record = await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(valid)}), 'controls-valid.json');
    await engineWarehouse.putRaw({ id: 'controls-stale', displayName: 'Controls Stale', sourceName: 'controls-stale.json', summary: normalizeSummary(${JSON.stringify(valid)}), metrics: { ...record.metrics, metric_version: 'v0.1' }, metricVersion: 'v0.1' });
    await engineWarehouse.putRaw({ id: 'controls-unusable', displayName: 'Controls Unusable' });
    await engineWarehouse.refresh();
    const beforeExportDisabled = document.getElementById('warehouse-export-button').disabled;
    const readiness = engineWarehouse.readiness(await engineWarehouse.getAll());
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function(){ window.__downloadClicked = true; };
    document.getElementById('warehouse-export-button').click();
    await waitFor(() => !!window.lastWarehouseExportBundle);
    result.ok = true;
    result.checks = {
      exportDisabled: beforeExportDisabled,
      lastBundleCount: window.lastWarehouseExportBundle?.record_count || 0,
      statusName: document.getElementById('warehouse-status-name').textContent,
      readiness,
      tiles: tiles()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-controls-');

  assert.equal(payload.checks.exportDisabled, false);
  assert.equal(payload.checks.lastBundleCount, 2);
  assert.equal(payload.checks.statusName, 'Warehouse exported');
  assert.equal(payload.checks.readiness.candidate_count, 3);
  assert.equal(payload.checks.readiness.usable_count, 2);
  assert.equal(payload.checks.readiness.stale_count, 1);
  assert.equal(payload.checks.readiness.skipped_count, 1);
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Usable' && tile.value === '2/3'));
  assert.ok(payload.checks.tiles.some(tile => tile.label === 'Skipped' && tile.value === '1'));
});

test('warehouse ranking scales deterministically across synthetic 100-engine library', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const injection = `
<script>
(function(){
  const result = { ok: false, checks: {} };
  function summary(i){
    const close = i === 0;
    const field = close ? 'NORMAL_RETIREMENT_BENEFIT' : (i % 3 === 0 ? 'QPSA_LUMP_SUM_BENEFIT' : 'EARLY_RETIREMENT_BENEFIT');
    const fn = close ? 'NPVF2' : (i % 2 === 0 ? 'QPSAPVF' : 'ROUND');
    return {
      schema_version: 'synthetic-scale',
      engine_name: close ? 'Synthetic Best' : 'Synthetic ' + String(i).padStart(3, '0'),
      sourceTabs: ['Separated'],
      runs: ['XRD'],
      worksheets: { Separated: { runs: ['XRD'], cells: {
        A1: { cell: 'A1', genericField: field, description: field.replaceAll('_', ' '), hasFormula: true, runs: { XRD: { field, iob: 'O' } } },
        B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation input', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } },
        C1: { cell: 'C1', genericField: 'CREDITED_SERVICE', description: 'Credited service input', hasFormula: false, runs: { XRD: { field: 'CREDITED_SERVICE', iob: 'I' } } }
      }, formulas: { A1: { cell: 'A1', formula: close ? 'NPVF2(B1*C1,Plan_Int)' : fn + '(B1*C1)', refs: close ? ['B1', 'C1', 'Plan_Int'] : ['B1', 'C1'], functions: [fn] } } } },
      namedRanges: close ? ['Plan_Int'] : []
    };
  }
  try {
    const target = normalizeSummary(summary(0));
    const targetMetrics = computeEngineMetrics(target, 'TARGET');
    const records = [];
    for (let i = 0; i < 100; i++) {
      const normalized = normalizeSummary(summary(i));
      const metrics = computeEngineMetrics(normalized, 'REC_' + i);
      records.push({ id: 'rec-' + String(i).padStart(3, '0'), displayName: normalized.engine_name, sourceName: normalized.engine_name + '.json', metrics, metricVersion: 'v0.7', summary: normalized, counts: { cells: Object.keys(normalized.cells).length, formulas: Object.keys(normalized.formulas).length, sourceTabs: normalized.sourceTabs.length, runs: normalized.runs.length, namedRanges: normalized.namedRanges.length, metricRows: metrics.rows.length } });
    }
    const start = performance.now();
    const matches = engineWarehouse.rankMatchesForMetrics(targetMetrics, records, { limit: 10 });
    const duration = performance.now() - start;
    const repeat = engineWarehouse.rankMatchesForMetrics(targetMetrics, records, { limit: 10 });
    result.ok = true;
    result.checks = {
      duration,
      count: matches.length,
      first: matches[0].engine_name,
      firstSimilarity: matches[0].overall_similarity,
      sameOrder: matches.map(m => m.engine_id).join('|') === repeat.map(m => m.engine_id).join('|')
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-scale-');

  assert.equal(payload.checks.count, 10);
  assert.equal(payload.checks.first, 'Synthetic Best');
  assert.ok(payload.checks.firstSimilarity > 0.99);
  assert.equal(payload.checks.sameOrder, true);
  assert.ok(payload.checks.duration < 5000, `ranking took ${payload.checks.duration}ms`);
});

test('warehouse current metric cache is reused for repeated current-engine rankings', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const summary = {
    schema_version: 'cache-test',
    engine_name: 'Cache Test',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: { Separated: { runs: ['XRD'], cells: { A1: { cell: 'A1', genericField: 'NORMAL_RETIREMENT_BENEFIT', description: 'Normal retirement', hasFormula: true, runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } } }, B1: { cell: 'B1', genericField: 'COMPENSATION', description: 'Compensation', hasFormula: false, runs: { XRD: { field: 'COMPENSATION', iob: 'I' } } } }, formulas: { A1: { cell: 'A1', formula: 'ROUND(B1,2)', refs: ['B1'], functions: ['ROUND'] } } } },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  try {
    applyLoadedSummary(${JSON.stringify(summary)}, 'cache-current.json');
    await engineWarehouse.putSummary(normalizeSummary(${JSON.stringify(summary)}), 'cache-candidate.json');
    await engineWarehouse.refresh();
    const first = await engineWarehouse.rankMatchesForCurrent({ limit: 1 });
    const afterFirst = engineWarehouse.debugStats().currentMetricCache;
    const second = await engineWarehouse.rankMatchesForCurrent({ limit: 1 });
    const afterSecond = engineWarehouse.debugStats().currentMetricCache;
    result.ok = true;
    result.checks = {
      firstOrder: first.map(m => m.engine_id).join('|'),
      secondOrder: second.map(m => m.engine_id).join('|'),
      missesAfterFirst: afterFirst.misses,
      hitsAfterSecond: afterSecond.hits,
      missesAfterSecond: afterSecond.misses
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'warehouse-cache-');

  assert.equal(payload.checks.firstOrder, payload.checks.secondOrder);
  assert.ok(payload.checks.missesAfterFirst >= 1);
  assert.ok(payload.checks.hitsAfterSecond >= 1);
  assert.equal(payload.checks.missesAfterSecond, payload.checks.missesAfterFirst);
});

test('run selection does not borrow formulas from cells missing that run entry', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const data = {
    schema_version: 'run-scope-regression',
    engine_name: 'Run Scope Regression',
    sourceTabs: ['Separated'],
    runs: ['XRD', 'RBD'],
    worksheets: {
      Separated: {
        runs: ['XRD', 'RBD'],
        cells: {
          GU2: {
            cell: 'GU2',
            genericField: 'XRD_MB_LS',
            description: 'XRD monthly benefit lump sum',
            hasFormula: true,
            runs: { XRD: { field: 'XRD_MB_LS', iob: 'O' } }
          },
          N308: {
            cell: 'N308',
            genericField: 'N308',
            description: 'XRD-only field regression',
            hasFormula: false,
            runs: { XRD: { field: 'N308', iob: 'I' } }
          },
          A1: {
            cell: 'A1',
            genericField: 'RBD_ONLY',
            description: 'Only available for RBD',
            hasFormula: false,
            runs: { RBD: { field: 'RBD_ONLY', iob: 'I' } }
          }
        },
        formulas: {
          GU2: { cell: 'GU2', formula: 'A1', refs: ['A1'], functions: [] }
        },
        formulaCells: ['GU2'],
        dependents: { A1: ['GU2'] }
      }
    },
    namedRanges: []
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function text(id){ return (document.getElementById(id)?.textContent || '').trim(); }
  function selectedText(id){ const el = document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function options(id){ return Array.from(document.getElementById(id).options).map(o => o.textContent.trim()); }
  function values(id){ return Array.from(document.getElementById(id).options).map(o => o.value); }
  function graphNodes(){ return Array.from(document.querySelectorAll('#graph-svg .node-hit')).map(n => n.dataset.cell); }
  async function waitFor(predicate, timeoutMs = 4000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(data)})], 'run-scope.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const uploaded = await waitFor(() => values('root-select').includes('N308'));
    if (!uploaded) throw new Error('Run-scope upload did not finish.');

    document.getElementById('root-select').value = 'N308';
    document.getElementById('root-select').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 150));
    const xrdOnlyState = {
      root: selectedText('root-select'),
      run: document.getElementById('run-select').value,
      runValues: values('run-select'),
      runStatus: text('run-scope-status'),
      options: options('root-select'),
      treeField: text('tree-field'),
      treeText: document.getElementById('tree-stage').textContent.trim(),
      graphNodes: graphNodes()
    };

    document.getElementById('root-select').value = 'A1';
    document.getElementById('root-select').dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 150));
    const rbdOnlyState = {
      root: selectedText('root-select'),
      run: document.getElementById('run-select').value,
      runValues: values('run-select'),
      runStatus: text('run-scope-status'),
      treeText: document.getElementById('tree-stage').textContent.trim(),
      graphNodes: graphNodes()
    };

    window.eval("appState.run = 'RBD'; appState.rootCell = 'GU2'; appState.inspectCell = 'GU2'; renderGraph(); renderTree();");
    await new Promise(resolve => setTimeout(resolve, 50));
    const forcedStaleState = {
      treeField: text('tree-field'),
      treeText: document.getElementById('tree-stage').textContent.trim(),
      graphNodes: graphNodes()
    };

    result.ok = true;
    result.checks = { xrdOnlyState, rbdOnlyState, forcedStaleState };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})();
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'run-scope-');

  const { xrdOnlyState, rbdOnlyState, forcedStaleState } = payload.checks;
  assert.equal(xrdOnlyState.root, 'N308  ·  Tab: Separated  ·  N308', JSON.stringify(payload.checks));
  assert.deepEqual(xrdOnlyState.options, [
    'N308  ·  Tab: Separated  ·  N308',
    'RBD_ONLY  ·  Tab: Separated  ·  A1',
    'XRD_MB_LS  ·  Tab: Separated  ·  GU2'
  ]);
  assert.equal(xrdOnlyState.run, 'XRD');
  assert.deepEqual(xrdOnlyState.runValues, ['XRD']);
  assert.equal(xrdOnlyState.runStatus, 'N308 is available in 1 run: XRD');
  assert.equal(xrdOnlyState.treeText, 'No formula exists for this selected source tab and run.');
  assert.deepEqual(xrdOnlyState.graphNodes, ['N308']);
  assert.equal(rbdOnlyState.root, 'RBD_ONLY  ·  Tab: Separated  ·  A1');
  assert.equal(rbdOnlyState.run, 'RBD');
  assert.deepEqual(rbdOnlyState.runValues, ['RBD']);
  assert.equal(rbdOnlyState.runStatus, 'RBD_ONLY is available in 1 run: RBD');
  assert.equal(rbdOnlyState.treeText, 'No formula exists for this selected source tab and run.');
  assert.deepEqual(rbdOnlyState.graphNodes, ['A1']);
  assert.equal(forcedStaleState.treeField, 'XRD_MB_LS');
  assert.equal(forcedStaleState.treeText, 'No formula exists for this selected source tab and run.');
  assert.deepEqual(forcedStaleState.graphNodes, ['GU2']);
});

test('quoted named range formula renders named range precedent', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const data = {
    schema_version: 'named-range-regression',
    engine_name: 'Named Range Regression',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    cells: {
      'Separated::IE2': {
        key: 'Separated::IE2',
        sourceTab: 'Separated',
        cell: 'IE2',
        genericField: 'AEQ_INTEREST',
        description: 'Interest Rate Range Name',
        hasFormula: true,
        runs: { XRD: { field: 'AEQ_INTEREST', iob: 'O' } }
      }
    },
    formulas: {
      'Separated::IE2': {
        key: 'Separated::IE2',
        sourceTab: 'Separated',
        cell: 'IE2',
        sheet: 'Separated',
        formula: '"Plan_INT"',
        refs: [],
        functions: []
      }
    },
    formulaCells: ['Separated::IE2'],
    namedRanges: ['Plan_Int']
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function selectedText(id){ const el = document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function graphNodes(){ return Array.from(document.querySelectorAll('#graph-svg .node-hit')).map(n => n.dataset.cell); }
  async function waitFor(predicate, timeoutMs = 4000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(data)})], 'named-range.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const uploaded = await waitFor(() => selectedText('root-select').includes('AEQ_INTEREST'));
    if (!uploaded) throw new Error('Named-range upload did not finish.');
    result.ok = true;
    result.checks = {
      root: selectedText('root-select'),
      run: document.getElementById('run-select').value,
      treeText: document.getElementById('tree-stage').textContent.trim(),
      graphNodes: graphNodes()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})();
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'named-range-');

  assert.equal(payload.checks.root, 'AEQ_INTEREST  ·  Tab: Separated  ·  IE2');
  assert.equal(payload.checks.run, 'XRD');
  assert.match(payload.checks.treeText, /Plan_Int/);
  assert.ok(payload.checks.graphNodes.includes('IE2'));
  assert.ok(payload.checks.graphNodes.includes('Plan_Int'));
});

test('sample 4 AEQ_INTEREST renders Plan_Int named range precedent', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const sample4Text = fs.readFileSync(
    path.join(repoRoot, 'data', 'private', 'raw-v1-engines', 'sample-4-v1Summary.json'),
    'utf8'
  ).replace(/^\uFEFF/, '');
  const sample4 = JSON.parse(sample4Text);

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  function selectedText(id){ const el = document.getElementById(id); return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function graphNodes(){ return Array.from(document.querySelectorAll('#graph-svg .node-hit')).map(n => n.dataset.cell); }
  async function waitFor(predicate, timeoutMs = 4000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (predicate()) return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(sample4)})], 'sample-4-v1Summary.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await waitFor(() =>
      document.getElementById('upload-status-name').textContent.trim() === 'sample-4-v1Summary.json' &&
      Array.from(document.getElementById('source-tab-select').options).some(o => o.value === 'Separated')
    );

    const source = document.getElementById('source-tab-select');
    source.value = 'Separated';
    source.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));

    const root = document.getElementById('root-select');
    const option = Array.from(root.options).find(o => o.textContent.startsWith('AEQ_INTEREST ') && /Tab: Separated/.test(o.textContent));
    if (!option) {
      const sampleOptions = Array.from(root.options)
        .filter(o => /AEQ|INTEREST|IE2|Separated/.test(o.textContent) || /IE2/.test(o.value))
        .slice(0, 12)
        .map(o => o.value + '=' + o.textContent)
        .join(' | ');
      throw new Error('AEQ_INTEREST option was not found. Options: ' + sampleOptions);
    }
    root.value = option.value;
    root.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));

    const run = document.getElementById('run-select');
    if (Array.from(run.options).some(o => o.value === 'XRD')) {
      run.value = 'XRD';
      run.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    result.ok = true;
    result.checks = {
      root: selectedText('root-select'),
      run: document.getElementById('run-select').value,
      treeText: document.getElementById('tree-stage').textContent.trim(),
      graphNodes: graphNodes()
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})();
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'sample-4-aeq-');

  assert.match(payload.checks.root, /^AEQ_INTEREST\s+·\s+Tab: Separated\s+·\s+IE2$/);
  assert.equal(payload.checks.run, 'XRD');
  assert.match(payload.checks.treeText, /Plan_Int/);
  assert.ok(payload.checks.graphNodes.includes('Separated!IE2'));
  assert.ok(payload.checks.graphNodes.includes('Plan_Int'));
});

test('metric router emits distance vocabulary families and flat warehouse rows', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const data = {
    schema_version: 'metric-router-regression',
    engine_name: 'Metric Router Regression',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: {
            cell: 'A1',
            genericField: 'RETIREMENT_BENEFIT',
            description: 'Retirement benefit with QPSA and interest logic',
            hasFormula: true,
            runs: { XRD: { field: 'RETIREMENT_BENEFIT', iob: 'O' } }
          },
          B1: {
            cell: 'B1',
            genericField: 'INTEREST_INPUT',
            description: 'Plan interest rate',
            hasFormula: false,
            runs: { XRD: { field: 'INTEREST_INPUT', iob: 'I' } }
          }
        },
        formulas: {
          A1: {
            cell: 'A1',
            formula: 'ROUND(B1*Plan_Int,,)',
            refs: ['B1', 'Plan_Int', 'Missing_Name'],
            functions: ['ROUND']
          }
        },
        formulaCells: ['A1'],
        dependents: { B1: ['A1'], Plan_Int: ['A1'] }
      }
    },
    namedRanges: ['Plan_Int']
  };

  const injection = `
<script>
(async function(){
  const result = { ok: false, checks: {} };
  try {
    const normalized = normalizeSummary(${JSON.stringify(data)});
    const metrics = computeEngineMetrics(normalized, 'E_METRIC');
    result.ok = true;
    result.checks = {
      structural: metrics.structural_metrics,
      semantic: metrics.semantic_field_metrics,
      formula: metrics.formula_implementation_metrics,
      benefit: metrics.benefit_architecture_metrics,
      operational: metrics.operational_data_quality_metrics,
      rowFamilies: Array.from(new Set(metrics.rows.map(row => row.metric_family))).sort(),
      nodeCountRow: metrics.rows.find(row => row.metric_name === 'node_count')
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'metric-router-');

  assert.equal(payload.checks.structural.formula_cell_count, 1);
  assert.equal(payload.checks.structural.edge_count, 3);
  assert.equal(payload.checks.semantic.distinct_input_field_count, 1);
  assert.equal(payload.checks.semantic.distinct_output_field_count, 1);
  assert.equal(payload.checks.formula.function_counts.ROUND, 1);
  assert.equal(payload.checks.benefit.has_qpsa_logic, true);
  assert.equal(payload.checks.benefit.has_interest_logic, true);
  assert.equal(payload.checks.operational.unresolved_reference_count, 1);
  assert.equal(payload.checks.operational.empty_argument_formula_count, 1);
  assert.deepEqual(payload.checks.rowFamilies, [
    'benefit_architecture',
    'formula',
    'operational_risk',
    'semantic',
    'structural'
  ]);
  assert.equal(payload.checks.nodeCountRow.engine_id, 'E_METRIC');
  assert.equal(payload.checks.nodeCountRow.metric_type, 'number');
  assert.equal(payload.checks.nodeCountRow.source, 'graph');
});

test('engine comparison emits explainable family distances and named similarity profiles', { timeout: 30000 }, t => {
  const browser = findBrowser();
  if (!browser) {
    t.skip('Chrome or Edge executable was not found');
    return;
  }

  const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const baseEngine = {
    engine_id: 'E_BASE',
    schema_version: 'comparison-fixture',
    engine_name: 'Base Retirement Engine',
    sourceTabs: ['Separated'],
    runs: ['XRD'],
    worksheets: {
      Separated: {
        runs: ['XRD'],
        cells: {
          A1: {
            cell: 'A1',
            genericField: 'NORMAL_RETIREMENT_BENEFIT',
            description: 'Normal retirement benefit with interest and mortality assumptions',
            hasFormula: true,
            runs: { XRD: { field: 'NORMAL_RETIREMENT_BENEFIT', iob: 'O' } }
          },
          B1: {
            cell: 'B1',
            genericField: 'FINAL_AVERAGE_COMPENSATION',
            description: 'Final average compensation input',
            hasFormula: false,
            runs: { XRD: { field: 'FINAL_AVERAGE_COMPENSATION', iob: 'I' } }
          },
          C1: {
            cell: 'C1',
            genericField: 'SERVICE',
            description: 'Credited service input',
            hasFormula: false,
            runs: { XRD: { field: 'SERVICE', iob: 'I' } }
          }
        },
        formulas: {
          A1: {
            cell: 'A1',
            formula: 'NPVF2(B1*C1,Plan_Int)',
            refs: ['B1', 'C1', 'Plan_Int'],
            functions: ['NPVF2']
          }
        },
        formulaCells: ['A1'],
        dependents: { B1: ['A1'], C1: ['A1'], Plan_Int: ['A1'] }
      }
    },
    namedRanges: ['Plan_Int']
  };
  const formulaDifferent = JSON.parse(JSON.stringify(baseEngine));
  formulaDifferent.engine_id = 'E_FORMULA';
  formulaDifferent.worksheets.Separated.formulas.A1.formula = 'IF(B1>0,ROUND(B1*C1,2),0)';
  formulaDifferent.worksheets.Separated.formulas.A1.refs = ['B1', 'C1'];
  formulaDifferent.worksheets.Separated.formulas.A1.functions = ['IF', 'ROUND'];
  formulaDifferent.namedRanges = [];

  const benefitDifferent = JSON.parse(JSON.stringify(baseEngine));
  benefitDifferent.engine_id = 'E_BENEFIT';
  benefitDifferent.worksheets.Separated.cells.A1.genericField = 'QPSA_LUMP_SUM_BENEFIT';
  benefitDifferent.worksheets.Separated.cells.A1.description = 'Qualified preretirement survivor lump sum beneficiary benefit';
  benefitDifferent.worksheets.Separated.formulas.A1.formula = 'QPSAPVF(B1*C1,Plan_Int)';
  benefitDifferent.worksheets.Separated.formulas.A1.functions = ['QPSAPVF'];

  const injection = `
<script>
(function(){
  const result = { ok: false, checks: {} };
  try {
    const base = ${JSON.stringify(baseEngine)};
    const formulaDifferent = ${JSON.stringify(formulaDifferent)};
    const benefitDifferent = ${JSON.stringify(benefitDifferent)};
    const identical = compareEngines(base, JSON.parse(JSON.stringify(base)));
    const formulaReport = compareEngines(base, formulaDifferent);
    const benefitReport = compareEngines(base, benefitDifferent);
    result.ok = true;
    result.checks = {
      metricVersion: identical.metric_version,
      familyNames: Object.keys(identical.family_distances).sort(),
      profileNames: Object.keys(identical.profile_scores).sort(),
      identicalOverallDistance: identical.profile_scores.overall_weighted_similarity.distance,
      identicalOverallSimilarity: identical.profile_scores.overall_weighted_similarity.similarity,
      formulaStructuralDistance: formulaReport.family_distances.structural_graph.distance,
      formulaImplementationDistance: formulaReport.family_distances.formula_implementation.distance,
      formulaTopDifference: formulaReport.top_differences[0],
      benefitStructuralDistance: benefitReport.family_distances.structural_graph.distance,
      benefitArchitectureDistance: benefitReport.family_distances.benefit_architecture.distance,
      benefitTopDifferences: benefitReport.top_differences.slice(0, 4).map(row => row.family),
      primitiveScalar: scalarDistance(100, 120),
      primitiveSet: setDistance(['a', 'b'], ['b', 'c']),
      primitiveVector: vectorDistance({ IF: 2 }, { ROUND: 2 }),
      reportShape: {
        engineA: formulaReport.engine_a_id,
        engineB: formulaReport.engine_b_id,
        hasComponents: formulaReport.family_distances.formula_implementation.components.length > 0,
        hasWeights: !!formulaReport.profile_scores.formula_similarity.weights.formula_implementation,
        hasMissingReport: Array.isArray(formulaReport.missing_metric_report)
      }
    };
  } catch (error) {
    result.error = String(error && error.stack || error);
  }
  const pre = document.createElement('pre');
  pre.id = 'browser-check-result';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
})()
</script>`;

  const payload = runBrowserHarness(browser, indexHtml, injection, 'engine-compare-');

  assert.equal(payload.checks.metricVersion, 'v0.7');
  assert.deepEqual(payload.checks.familyNames, [
    'benefit_architecture',
    'formula_implementation',
    'operational_data_quality',
    'semantic_field',
    'structural_graph'
  ]);
  assert.deepEqual(payload.checks.profileNames, [
    'benefit_architecture_similarity',
    'business_field_similarity',
    'formula_similarity',
    'overall_weighted_similarity',
    'risk_complexity_similarity',
    'structural_similarity'
  ]);
  assert.ok(payload.checks.identicalOverallDistance <= 0.000001);
  assert.ok(payload.checks.identicalOverallSimilarity >= 0.999999);
  assert.ok(payload.checks.formulaStructuralDistance < 0.25);
  assert.ok(payload.checks.formulaImplementationDistance > payload.checks.formulaStructuralDistance);
  assert.equal(payload.checks.formulaTopDifference.family, 'formula_implementation');
  assert.ok(payload.checks.benefitStructuralDistance < 0.25);
  assert.ok(payload.checks.benefitArchitectureDistance > payload.checks.benefitStructuralDistance);
  assert.ok(payload.checks.benefitTopDifferences.includes('benefit_architecture'));
  assert.ok(payload.checks.primitiveScalar > 0.16 && payload.checks.primitiveScalar < 0.17);
  assert.ok(payload.checks.primitiveSet > 0.66 && payload.checks.primitiveSet < 0.67);
  assert.equal(payload.checks.primitiveVector, 1);
  assert.equal(payload.checks.reportShape.engineA, 'E_BASE');
  assert.equal(payload.checks.reportShape.engineB, 'E_FORMULA');
  assert.equal(payload.checks.reportShape.hasComponents, true);
  assert.equal(payload.checks.reportShape.hasWeights, true);
  assert.equal(payload.checks.reportShape.hasMissingReport, true);
});
