# PBGC V1 Engine Explorer

Browser-based explorer for analyzing V1 spreadsheet engines.

## Purpose

This project supports:

1. Visual exploration of local formula dependencies in V1 spreadsheets.
2. Comparison of two or more V1 engines using similarity and distance metrics.
3. Statistical and summary reports for one engine or a group of engines.
4. Local storage of processed engines using a browser database.
5. Generation of a `Case_Complexity_Log.xlsx` file from processed engine features.

## Data Flow

```text
V1 Workbook -> VBA Extraction -> V1Summary JSON/CSV -> Canonical Engine Model
-> Dependency Graph -> Feature Vector -> Local Database -> Reports
```

## Repository Layout

- `src/` - application source code
- `tools/vba/` - VBA extraction and preparation scripts
- `tools/excel/` - Excel helper workbooks
- `data/reference/` - non-sensitive reference data
- `data/samples/` - sanitized sample inputs
- `data/private/` - ignored local/private data
- `docs/` - architecture, workflows, and domain notes
- `legacy/` - historical prototypes
- `output/` - generated reports and exports
