# ADR-0002: Canonical Engine Schema

## Decision

Normalize imported V1 summary artifacts into a canonical engine object before graphing, comparison, reporting, or database persistence.

## Initial Shape

```text
Engine
  engineId
  engineName
  sourceWorkbookName
  importedAt
  workbookSummary
  worksheets
  cells
  namedRanges
  formulas
  edges
  features
  metadata
```
