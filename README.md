# PBGC V1 Engine Explorer

A browser-first application for exploring, summarizing, comparing, and organizing PBGC V1 spreadsheet engines.

The project is intended to support development work around V1 formula dependency analysis, engine similarity, case-selection support, and generation of structured engine-complexity reports.

## Purpose

The V1 Engine Explorer is designed to help an analyst answer four practical questions:

1. **How does this V1 engine work locally?**  
   Explore formula dependencies cell-by-cell, worksheet-by-worksheet, and through direct precedent / dependent neighborhoods.

2. **How similar are two or more V1 engines?**  
   Compare engines using structural, formulaic, functional, and graph-based features.

3. **Which prior engine is a good starting point for a new plan?**  
   Use statistical summaries and comparison reports to select a prior engine that is close to the target case architecture.

4. **What features make this case simple or complex?**  
   Generate a `Case_Complexity_Log.xlsx` file summarizing the features compared across processed engines.

## Intended Workflow

```text
V1 workbook
  -> VBA extraction tools
  -> V1Summary JSON / CSV artifacts
  -> canonical engine model
  -> dependency graph
  -> feature vector
  -> local browser database
  -> visual explorer / comparison reports
  -> Case_Complexity_Log.xlsx
```

## Main Capabilities

### 1. Formula Dependency Explorer

The app should visually expose the local information flow of V1 spreadsheet cells:

- direct precedents
- direct dependents
- named-range references
- formula neighborhoods
- worksheet-level dependency structure
- isolated or unused formula regions
- high-degree calculation hubs

The intended result is a navigable concept map of the spreadsheet engine, not merely a flat list of formulas.

### 2. Engine Comparison

The app should compare two or more processed engines using a weighted feature-vector approach.

Potential feature families include:

- worksheet inventory
- formula count by worksheet
- normalized formula signatures
- Excel function usage
- PBGC / ATPBGC function usage
- named-range usage
- dependency graph topology
- cell role classification: input, output, intermediate, lookup, control, or report cell
- benefit-processing concepts where identifiable

Similarity should not be reduced to a single fragile measure. The model should expose component scores and weights.

### 3. Statistical and Summary Reports

For a single engine, the app should summarize:

- number of worksheets
- number of formulas
- formula density by worksheet
- most common functions
- most connected cells
- named ranges
- dependency graph metrics
- possible inputs and outputs
- formula families and repeated patterns

For a group of engines, the app should summarize:

- cross-engine feature matrix
- pairwise distance matrix
- clusters of similar engines
- outlier engines
- candidate engines for reuse
- feature-level reasons for similarity or dissimilarity

### 4. Local Engine Database

The app should persist processed engines inside the browser using a local database layer.

Initial preferred option:

```text
Dexie.js / IndexedDB
```

Possible future option:

```text
SQLite.js
```

Application code should not depend directly on a database implementation. Use a repository abstraction such as:

```js
saveEngine(engine)
getEngine(engineId)
listEngines()
deleteEngine(engineId)
getFeatureMatrix()
```

### 5. Case Complexity Log

The app should generate:

```text
Case_Complexity_Log.xlsx
```

This workbook should contain the features used to compare all processed engines saved in the engine database.

The log should function as a compact audit artifact showing why one engine was considered close to, or distant from, another.

## Repository Layout

```text
pbgc-v1-engine-explorer/
|
|-- docs/                         Architecture, workflows, and project decisions
|   |-- architecture/
|   |-- domain/
|   |-- workflows/
|   `-- decisions/
|
|-- src/                          Application source code
|   |-- app/                      App entry point and state
|   |-- domain/                   Core engine, formula, and graph models
|   |-- features/                 User-facing feature modules
|   |-- infrastructure/           Database, Excel export, and worker adapters
|   `-- ui/                       Components, panels, and styles
|
|-- tools/                        External tools used to prepare engine artifacts
|   |-- excel/                    Excel helper workbooks
|   `-- vba/                      VBA extraction and preparation scripts
|
|-- data/                         Reference and sample input data
|   |-- reference/                Non-sensitive reference data
|   |-- samples/                  Sanitized sample artifacts
|   `-- private/                  Local private data; ignored by Git
|
|-- tests/                        Unit, integration, and fixture data
|-- scripts/                      Development and release scripts
|-- legacy/                       Historical prototypes
|-- output/                       Generated reports and exports; ignored by Git
|-- index.html                    Thin application shell
|-- package.json                  JavaScript project metadata, when introduced
`-- README.md
```

## Source-of-Truth Hierarchy

The source of truth should be layered as follows:

```text
1. Raw V1 workbook
   External source; generally private and not committed.

2. VBA extraction output
   JSON / CSV representation of worksheets, formulas, names, precedents, and dependents.

3. Canonical engine object
   Normalized internal representation used by the app.

4. Feature vector
   Statistical and comparison representation.

5. Local database record
   Browser-persisted processed engine artifact.

6. Report exports
   Generated outputs, not primary source.
```

## Canonical Engine Model

The internal model should normalize each processed engine into an object similar to:

```js
Engine {
  engineId,
  engineName,
  sourceWorkbookName,
  importedAt,
  workbookSummary,
  worksheets,
  cells,
  namedRanges,
  formulas,
  edges,
  features,
  metadata
}
```

A cell-level object should eventually support:

```js
Cell {
  sheetName,
  address,
  valueType,
  formulaRaw,
  formulaNormalized,
  directPrecedents,
  directDependents,
  namedRangeRefs,
  functionCalls,
  isInput,
  isOutput,
  isIntermediate,
  tags
}
```

## Development Phases

### Phase 1: Repository Hygiene

- Organize files into the folder architecture.
- Move legacy prototypes into `legacy/`.
- Move VBA and Excel extraction tools into `tools/`.
- Create `.gitignore` rules for private data and generated output.

### Phase 2: Canonical Engine Schema

- Define the normalized engine object.
- Define cell, formula, worksheet, named-range, and graph-edge schemas.
- Validate imported `V1Summary.json` files.

### Phase 3: Import and Validation

- Import `V1Summary.json`.
- Import reference CSV files.
- Detect missing fields, malformed formulas, duplicated cell keys, and broken references.

### Phase 4: Dependency Graph

- Build graph nodes from cells.
- Build graph edges from formula references.
- Compute local neighborhoods, degree metrics, connected components, and worksheet-level graph summaries.

### Phase 5: Local Database

- Store processed engines in IndexedDB through Dexie.js.
- Add schema versioning and migrations.
- Support engine listing, deletion, export, and reload.

### Phase 6: Engine Comparison

- Define feature vectors.
- Compute weighted distance and similarity scores.
- Generate pairwise distance matrices.
- Identify closest prior engines.

### Phase 7: Reports and Complexity Log

- Generate single-engine reports.
- Generate group-engine reports.
- Export `Case_Complexity_Log.xlsx`.

## File Placement Rule

```text
Can a user run it?             -> scripts/
Is it application logic?       -> src/
Is it VBA/Excel tooling?       -> tools/
Is it explanation?             -> docs/
Is it private data?            -> data/private/
Is it sanitized sample data?   -> data/samples/
Is it generated?               -> output/
Is it old but useful?          -> legacy/
```

## Privacy and Data Handling

Do not commit real participant data, confidential case data, private V1 workbooks, or generated reports containing sensitive information.

Use:

```text
data/private/
```

for local private artifacts. That directory should remain ignored by Git except for `.gitkeep`.

## Project Status

Initial repository setup and architecture definition.
