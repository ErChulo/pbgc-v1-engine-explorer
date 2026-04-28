# Data Model: Drawer UX Hardening

## UploadBatchResult

Fields:

- `accepted`: number of files successfully imported.
- `duplicates`: array of duplicate filenames skipped.
- `failed`: array of filenames that failed parsing/import.
- `messages`: user-visible summary messages.

Validation:

- Duplicate files must not create or replace warehouse records.
- Unique valid files must still import even when duplicates are present in the same batch.

## CurrentEngineDisplay

Fields:

- `name`: current JSON source name or embedded engine label.
- `meta`: schema/count summary.
- `version`: static app version string.

Validation:

- Header display updates whenever `updateUploadStatus()` is called.

## AnalysisHelpText

Fields:

- `term`: e.g. `Risk`.
- `definition`: short user-facing explanation.

Validation:

- Risk definition must be available near aggregate risk output.
