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
    '--virtual-time-budget=10000',
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
