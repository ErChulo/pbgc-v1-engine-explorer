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
    '--virtual-time-budget=5000',
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
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(optionB)})], 'option-b.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 600));
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
    'AA2',
    'ZZZ_BDOB_CHECK',
    'Tab: Beneficiaries in Pay',
    'AB2'
  ]);
  assert.equal(afterToggle.root, beforeToggle.root);
  assert.deepEqual(afterToggle.graph, beforeToggle.graph);
  assert.equal(afterToggle.treeField, 'BDOB');
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
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(data)})], 'run-scope.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 600));

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
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(data)})], 'named-range.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 600));
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
  try {
    const input = document.getElementById('load-json-input');
    const file = new File([JSON.stringify(${JSON.stringify(sample4)})], 'sample-4-v1Summary.json', { type: 'application/json' });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 900));

    const source = document.getElementById('source-tab-select');
    source.value = 'Separated';
    source.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 200));

    const root = document.getElementById('root-select');
    const option = Array.from(root.options).find(o => /^AEQ_INTEREST\\s/.test(o.textContent));
    if (!option) throw new Error('AEQ_INTEREST option was not found');
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
