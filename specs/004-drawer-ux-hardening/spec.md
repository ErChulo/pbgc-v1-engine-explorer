# Feature Specification: Drawer UX Hardening

**Feature Branch**: `004-drawer-ux-hardening`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Improve the app UX and CSS readability: widen controls drawer to about 50 percent viewport width on desktop; auto-dismiss graph tooltips after 10 seconds; block duplicate JSON warehouse uploads by source filename with a modal or alert and cancel upload; show current V1 engine prominently in the header; show app version in the GUI; give drawer sections soft distinct theme-aware backgrounds; define risk via info tooltip; improve pairwise comparison single similarity/distance readability; increase overlay blur/opacity outside drawer; support bulk JSON upload; increase visual contrast between buttons and input/select controls."

## User Scenarios & Testing *(mandatory)*

## Clarifications

### Session 2026-04-28

- Q: How should duplicate uploads be identified? A: Use uploaded JSON filename/source name against existing warehouse source names.
- Q: Should bulk upload replace duplicates? A: No. Import unique files and report skipped duplicates.
- Q: How wide should the drawer be? A: About 50vw on desktop, still responsive on smaller screens.

### User Story 1 - Read the Controls Drawer Comfortably (Priority: P1)

A user opens the controls drawer and can distinguish sections, controls, and actions without the drawer feeling cramped.

**Why this priority**: The drawer holds the app's main workflow controls; crowded controls slow down every task.

**Independent Test**: Open the drawer and verify it uses a wider desktop layout, stronger overlay, distinct section backgrounds, and clearer button/input contrast.

**Acceptance Scenarios**:

1. **Given** a desktop viewport, **When** the drawer opens, **Then** it occupies roughly half the viewport width and remains readable.
2. **Given** the drawer is open, **When** the user scans sections, **Then** section backgrounds are visually distinct in dark and light themes.
3. **Given** buttons and form controls appear near each other, **When** the user scans them, **Then** buttons are immediately distinguishable from select/input controls.

---

### User Story 2 - Keep Current Context Visible (Priority: P1)

A user can always see which V1 engine is currently loaded and which version of the app is running without opening the drawer.

**Why this priority**: The current engine is operational context and should not be hidden inside a crowded drawer.

**Independent Test**: Load a JSON file and verify the header displays the current engine/source name and app version.

**Acceptance Scenarios**:

1. **Given** the default embedded engine is loaded, **When** the app renders, **Then** the header shows current engine context and app version.
2. **Given** a user uploads a JSON file, **When** upload completes, **Then** the header current-engine display updates to that JSON filename.

---

### User Story 3 - Prevent Duplicate Warehouse Evidence (Priority: P2)

A user uploads one or more JSON files and receives immediate feedback if a file duplicates an existing warehouse source name.

**Why this priority**: Duplicate warehouse evidence can confuse aggregate analysis and reuse matching.

**Independent Test**: Upload a JSON with the same filename as a stored warehouse record and verify the app alerts the user, cancels that duplicate upload, and leaves the existing record unchanged.

**Acceptance Scenarios**:

1. **Given** a warehouse record with source name `case.json`, **When** the user uploads another `case.json`, **Then** the app displays a duplicate warning and cancels that file.
2. **Given** multiple JSON files are uploaded together, **When** some are duplicates and some are unique, **Then** unique files are imported and duplicates are skipped with user-visible feedback.

---

### User Story 4 - Understand Analysis Results Faster (Priority: P2)

A user reviewing aggregate and pairwise comparison output can identify risk meaning and the single overall similarity/distance between two engines.

**Why this priority**: Scores are only useful if their meaning is visible without hunting through tiles.

**Independent Test**: Generate aggregate and pairwise analysis and verify risk definition help text exists and pairwise comparison shows a prominent overall score.

**Acceptance Scenarios**:

1. **Given** aggregate analysis is visible, **When** the user sees risk, **Then** an info affordance explains what risk means.
2. **Given** two engines are compared, **When** comparison results render, **Then** the overall weighted similarity and distance are shown prominently before detailed profile tiles.

---

### User Story 5 - Reduce Tooltip and Overlay Friction (Priority: P3)

A user can hover graph nodes without tooltips lingering forever, and drawer focus is visually clear.

**Why this priority**: Persistent tooltips and weak overlays make the app feel messy.

**Independent Test**: Hover a graph node for more than 10 seconds and verify the tooltip dismisses; open drawer and verify backdrop blur/opacity increase.

**Acceptance Scenarios**:

1. **Given** a graph tooltip is visible, **When** hover remains for 10 seconds, **Then** the tooltip dismisses automatically.
2. **Given** the drawer is open, **When** the overlay is shown, **Then** the outside app area is more blurred and darker than before.

### Edge Cases

- Bulk upload contains all duplicates: show feedback and store no new records.
- Bulk upload contains an invalid JSON file: skip invalid file and continue safe imports.
- Drawer is opened on mobile/narrow viewport: keep it within viewport and readable.
- Tooltip target disappears before timeout: clear the timer and hide tooltip safely.
- Light theme drawer sections must remain readable and not over-saturated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST widen the desktop drawer to about 50vw while preserving smaller viewport responsiveness.
- **FR-002**: System MUST auto-dismiss graph tooltips after 10 seconds of continuous hover.
- **FR-003**: System MUST detect uploaded JSON filenames that duplicate existing warehouse source names and cancel those duplicate uploads with user-visible feedback.
- **FR-004**: System MUST support selecting multiple JSON files in the upload control and process each safely.
- **FR-005**: System MUST show the current V1 engine/source name in the header.
- **FR-006**: System MUST show the app version in the GUI.
- **FR-007**: System MUST visually distinguish drawer sections with soft theme-aware backgrounds.
- **FR-008**: System MUST provide a concise definition for operational risk in aggregate analysis.
- **FR-009**: System MUST make the overall pairwise similarity/distance prominent in comparison results.
- **FR-010**: System MUST increase drawer overlay blur/opacity.
- **FR-011**: System MUST visually differentiate buttons from select/input controls.
- **FR-012**: System MUST preserve existing graph, warehouse, comparison, and scoring behavior.

### Key Entities

- **UploadBatchResult**: Counts and messages for accepted files, skipped duplicates, and failed files.
- **CurrentEngineDisplay**: Header-visible current engine name, metadata summary, and app version.
- **AnalysisHelpText**: Definitions displayed through info affordances for aggregate risk and related terms.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Browser tests verify drawer width, overlay strength, section backgrounds, and control contrast hooks.
- **SC-002**: Browser tests verify tooltip auto-dismiss after 10 seconds.
- **SC-003**: Browser tests verify duplicate filename upload is blocked and bulk unique upload succeeds.
- **SC-004**: Browser tests verify header current-engine name and app version update after upload.
- **SC-005**: Browser tests verify pairwise comparison renders a prominent overall similarity/distance summary.
- **SC-006**: Existing regression tests continue passing.

## Assumptions

- Duplicate detection is filename/source-name based, not content-hash based.
- Bulk upload imports unique files sequentially and reports aggregate feedback.
- App version can be a static constant in the single-page app for now.
