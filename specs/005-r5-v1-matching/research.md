# Research: R5-to-V1 Matching

## Decision: Use R5 as a temporary case-level benefit/provision profile

**Rationale**: The user often has no V1 for a new case, but does have R5 plan-summary JSON files. Merging those files into one case-level profile supports the actual reuse search: find approved V1 engines that resemble the new case's benefit architecture.

**Alternatives considered**:

- Compare each R5 file separately. Rejected because historical plan summaries are noisy individually and would produce fragmented rankings.
- Store R5 profiles in the V1 warehouse. Rejected because the warehouse must remain approved V1 engine records only.

## Decision: Rank primarily on benefit/provision architecture

**Rationale**: The new case has no formula graph. Formula, structural, and operational V1 metrics are useful as candidate context, but the primary signal available from R5 is plan-provision coverage: retirement types, survivor benefits, lump sums, forms, limits, service, compensation, mortality, interest, and assumptions.

**Alternatives considered**:

- Text-only similarity. Rejected because actuarial reuse depends on benefit architecture, not broad prose similarity.
- Learned or embedding similarity. Rejected for v1 because it is opaque, non-local, and not calibrated with paired R5/V1 evidence.

## Decision: Use transparent structured and token evidence

**Rationale**: R5 JSON shape may vary. The extractor should use recognizable structured fields when present and fallback token matching over known benefit-domain vocabulary. Every match should be explainable by domain terms and source evidence.

**Alternatives considered**:

- Structured fields only. Rejected because early R5 builder outputs may not have stable field names.
- Opaque semantic matching. Deferred until paired evidence exists and a separate specification justifies it.

## Decision: Show both similarity and confidence/completeness

**Rationale**: Some R5 profiles may be sparse. A high similarity over thin evidence must not look as strong as a high similarity over rich evidence.

**Alternatives considered**:

- Single score only. Rejected because it hides weak evidence.
- Refuse to rank below a threshold. Rejected for v1 because even low-confidence ranking can be useful if clearly labeled.

## Decision: Do not implement entitlement state-machine comparison in this feature

**Rationale**: The constitution requires R5/provision-state-machine integration to wait for paired R5/V1 evidence and a separate specification. This feature is limited to deterministic benefit/provision architecture proxy matching.

**Alternatives considered**:

- Add state-machine graph matching now. Rejected because it would imply stronger evidence than available and broaden scope materially.
