# Research: Drawer UX Hardening

## Decision: Filename-Based Duplicate Blocking

Block JSON upload when the uploaded filename matches an existing warehouse record `sourceName`.

**Rationale**: The user's concern was duplicate visible warehouse evidence. Filename/source name is understandable and consistent with existing provenance.

**Alternatives considered**:

- Content hash duplicate detection: deferred because summaries may be semantically same but serialized differently.
- Replace existing on upload: rejected because the user asked to cancel duplicate upload.

## Decision: Sequential Bulk Upload

Process selected JSON files sequentially, accepting unique files and skipping duplicates/invalid files.

**Rationale**: Deterministic sequential handling keeps IndexedDB updates simple and gives clear feedback.

**Alternatives considered**:

- Parallel imports: unnecessary and harder to diagnose.
- All-or-nothing batch: rejected because useful unique files should still load.

## Decision: Static App Version Constant

Expose a static `APP_VERSION` in the GUI.

**Rationale**: This repo runs as a standalone HTML app without a package build pipeline.

**Alternatives considered**:

- Git-derived runtime version: not available offline in a static HTML file.
