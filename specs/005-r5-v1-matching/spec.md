# Feature Specification: R5-to-V1 Matching

**Feature Branch**: `005-r5-v1-matching`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "Upload any number of R5 plan summary JSON files as a temporary current-case benefit/provision profile, merge them into one case-level profile, compare that profile to approved V1 engines in the warehouse primarily through benefit/provision architecture, use structured fields plus transparent text/token matching for known benefit-domain terms, and rank the most reusable V1 engines with similarity plus confidence/completeness."

## Clarifications

### Session 2026-04-29

- Q: What should be the primary comparison model for R5 summaries against V1 engines? -> A: Compare uploaded R5 summaries to V1 engines primarily through benefit/provision architecture.
- Q: How should multiple uploaded R5 summaries be handled? -> A: Merge all uploaded R5 summaries into one case-level profile, then rank V1 engines once.
- Q: Should uploaded R5 summaries be stored in the warehouse? -> A: R5 uploads are temporary for the current session/case ranking only; the V1 warehouse remains V1-only.
- Q: What should the rank output show besides similarity? -> A: Show similarity ranking plus confidence/completeness, so weak evidence is visible.
- Q: What matching method should v1 use? -> A: Use structured fields plus transparent text/token matching for known benefit-domain terms; no machine-learning or external service dependency.

## User Scenarios & Testing

### User Story 1 - Rank V1 Reuse Candidates From R5 Summaries (Priority: P1)

An analyst working a new case with no V1 engine uploads one or more R5 plan summary JSON files and asks the app to rank stored V1 engines by expected reuse suitability.

**Why this priority**: This is the core workflow: choosing a previously approved V1 engine to adapt before a new V1 exists.

**Independent Test**: Can be tested by loading a warehouse with multiple V1 engine summaries, uploading multiple R5 summaries for a new case, running the ranking action, and verifying that ranked V1 candidates are shown with similarity, confidence, and evidence.

**Acceptance Scenarios**:

1. **Given** the V1 warehouse contains at least two engines and the user uploads one valid R5 JSON, **When** the user runs R5 matching, **Then** the app shows ranked V1 candidates ordered by benefit/provision architecture similarity.
2. **Given** the user uploads several valid R5 JSON files for one case, **When** the user runs R5 matching, **Then** the app merges them into one case-level profile before ranking V1 candidates.
3. **Given** an R5 case profile has limited recognized provisions, **When** rankings are shown, **Then** each candidate includes a confidence/completeness signal so the user can see that evidence is thin.

---

### User Story 2 - Understand Why a V1 Was Ranked Highly (Priority: P2)

An analyst reviews a ranked V1 candidate and sees which benefit/provision domains matched and which important domains were missing or weak.

**Why this priority**: A score alone is not enough for actuarial reuse decisions; the analyst needs explainable evidence.

**Independent Test**: Can be tested by using R5 summaries with known domains such as QPSA, lump sum, mortality, interest, service, and compensation, then verifying that rank cards show matched domains and gaps.

**Acceptance Scenarios**:

1. **Given** the R5 profile contains QPSA, lump sum, mortality, and interest evidence, **When** ranking results are shown, **Then** each top candidate shows matched benefit domains and top missing or mismatched domains.
2. **Given** the R5 profile and a V1 candidate share few benefit/provision domains, **When** ranking results are shown, **Then** the candidate appears lower and includes evidence explaining the weak match.

---

### User Story 3 - Keep R5 Data Separate From the V1 Warehouse (Priority: P3)

An analyst uploads R5 summaries to perform a temporary matching search without contaminating the warehouse of approved V1 engines.

**Why this priority**: The warehouse must remain a library of approved V1 engines; R5 summaries are case-search inputs, not reusable V1 engines.

**Independent Test**: Can be tested by uploading R5 summaries, running ranking, refreshing the V1 warehouse list, and verifying that no R5 records were added to the V1 engine store.

**Acceptance Scenarios**:

1. **Given** the user uploads R5 JSON files, **When** the matching workflow completes, **Then** the V1 warehouse record count remains unchanged.
2. **Given** the user clears or replaces the R5 upload, **When** the app recomputes rankings, **Then** previous R5 inputs no longer affect results.

### Edge Cases

- If no V1 engines are stored, the app shows an empty-state message explaining that V1 warehouse records are required before R5 matching can rank candidates.
- If uploaded files include invalid JSON, the app skips invalid files and reports which files could not be read.
- If uploaded R5 summaries contain no recognized benefit/provision evidence, the app shows low confidence and does not present the ranking as reliable.
- If multiple R5 summaries conflict on a domain, the merged case profile records both evidence count and confidence instead of silently discarding one version.
- If R5 JSON shape varies across builder versions, the app extracts from recognized structured fields and fallback text fields without crashing.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to upload one or more R5 summary JSON files as temporary current-case inputs.
- **FR-002**: System MUST merge all valid uploaded R5 summaries into one case-level benefit/provision profile before ranking V1 candidates.
- **FR-003**: System MUST keep R5 uploads out of the V1 warehouse and avoid storing them as V1 engine records.
- **FR-004**: System MUST extract benefit/provision architecture evidence from recognized structured fields and transparent text/token matching over known benefit-domain terms.
- **FR-005**: System MUST rank stored V1 engines against the merged R5 case profile primarily by benefit/provision architecture similarity.
- **FR-006**: System MUST show similarity and confidence/completeness for each ranked V1 candidate.
- **FR-007**: System MUST show explainable evidence for each ranked candidate, including matched benefit domains and important missing or weak domains.
- **FR-008**: System MUST show a clear empty state when there are no usable V1 warehouse records to rank.
- **FR-009**: System MUST show a clear warning when R5 uploads contain insufficient recognized benefit/provision evidence.
- **FR-010**: System MUST support deterministic ranking behavior for the same R5 inputs and V1 warehouse state.
- **FR-011**: System MUST use wording that makes it clear scores are reuse-suitability signals, not approval decisions.

### Key Entities

- **R5 Summary Upload**: A JSON file generated by the plan summary builder for a historical plan document version. Key attributes include source filename, recognized structured fields, text evidence, extracted benefit domains, and parse status.
- **R5 Case Profile**: A temporary merged profile representing the new case across all uploaded R5 summaries. Key attributes include benefit-domain coverage, domain evidence counts, source-file count, recognized-evidence count, confidence/completeness, warnings, and raw evidence snippets or labels.
- **V1 Candidate Profile**: A stored V1 engine metric warehouse record transformed into a benefit/provision architecture profile. Key attributes include engine identity, benefit-domain coverage, domain counts, assumption/limitation indicators, and existing metric version.
- **R5 Match Result**: A ranked candidate result. Key attributes include V1 engine identity, reuse similarity, confidence/completeness, matched domains, missing domains, weak domains, warnings, and evidence summary.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can upload at least 10 R5 summary JSON files and produce a ranked V1 candidate list in under 5 seconds on a typical local browser session.
- **SC-002**: Ranking the same R5 inputs against the same V1 warehouse produces the same candidate order every time.
- **SC-003**: Every ranked candidate displays a similarity score, confidence/completeness signal, and at least one evidence explanation when recognized evidence exists.
- **SC-004**: The V1 warehouse count remains unchanged after R5 uploads and R5 matching.
- **SC-005**: If no recognized R5 evidence is available, the app shows a low-confidence warning instead of presenting a normal confident ranking.

## Assumptions

- R5 summaries are local JSON files produced by the separate plan summary builder and may vary in shape across builder versions.
- This feature does not upload plan documents and does not require network access.
- R5 matching is a reuse-candidate search aid, not an actuarial approval or final validation decision.
- V1 warehouse records already contain benefit architecture metrics from the existing metric layer.
- The first version should remain deterministic and transparent; machine-learning, embeddings, and external semantic services are out of scope.
