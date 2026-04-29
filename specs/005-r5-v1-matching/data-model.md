# Data Model: R5-to-V1 Matching

## R5SummaryUpload

Represents one uploaded R5 plan-summary JSON file.

Fields:

- `source_name`: uploaded filename
- `parse_status`: `valid` or `invalid`
- `raw_summary`: parsed JSON when valid
- `recognized_text_blocks`: text values extracted from known and fallback JSON paths
- `recognized_structured_values`: structured values extracted from known fields when present
- `benefit_domain_hits`: domain-to-evidence map extracted from this file
- `warnings`: parse or extraction warnings

Validation:

- Invalid JSON must not stop other files from being processed.
- Empty valid JSON is accepted but contributes low or zero confidence.

## R5CaseProfile

Represents the merged temporary profile for a new case.

Fields:

- `profile_version`: deterministic profile schema version
- `source_names`: filenames included in the profile
- `source_count`: count of valid uploaded R5 summaries
- `benefit_domain_coverage`: set of recognized benefit domains
- `domain_counts`: domain-to-count map across all R5 uploads
- `domain_evidence`: domain-to-source evidence map
- `token_counts`: normalized token-frequency map for transparent fallback matching
- `recognized_evidence_count`: total recognized structured and token evidence count
- `confidence`: normalized 0 to 1 completeness/confidence value
- `warnings`: low-confidence, invalid-file, or sparse-evidence messages

Relationships:

- Built from many `R5SummaryUpload` records.
- Compared against many `V1CandidateProfile` records.

## V1CandidateProfile

Represents the benefit/provision architecture projection of one stored V1 warehouse engine.

Fields:

- `engine_id`
- `engine_name`
- `source_name`
- `metric_version`
- `benefit_domain_coverage`
- `domain_counts`
- `domain_evidence`
- `assumption_domains`
- `limitation_domains`

Validation:

- Records missing compatible metrics are skipped or recomputed through existing warehouse diagnostics.

## R5MatchResult

Represents one ranked V1 reuse candidate.

Fields:

- `engine_id`
- `engine_name`
- `source_name`
- `reuse_similarity`: normalized 0 to 1 score
- `confidence`: normalized 0 to 1 evidence confidence
- `matched_domains`
- `missing_from_candidate`
- `candidate_extra_domains`
- `top_evidence`
- `warnings`
- `rank`

Ordering:

- Sort by `reuse_similarity` descending.
- Break ties by `confidence` descending, then stable engine/source identity.
