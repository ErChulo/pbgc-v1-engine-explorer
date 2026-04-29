# Contract: R5 Matching UI and Report

## User Inputs

- `#r5-json-input`: accepts one or more `.json` files.
- `#r5-match-button`: ranks V1 warehouse records against the current temporary R5 case profile.
- Optional clear action resets the temporary R5 profile.

## Case Profile Report Shape

```json
{
  "profile_version": "r5-proxy-v0.1",
  "source_names": ["case-summary-1.json"],
  "source_count": 1,
  "benefit_domain_coverage": ["normal_retirement", "qpsa"],
  "domain_counts": {"normal_retirement": 3, "qpsa": 2},
  "confidence": 0.72,
  "warnings": [],
  "domain_evidence": {
    "qpsa": [{"source": "case-summary-1.json", "text": "QPSA survivor benefit"}]
  }
}
```

## Match Report Shape

```json
{
  "profile_version": "r5-proxy-v0.1",
  "metric_version": "v0.7",
  "ranked_at": "deterministic-local",
  "source_names": ["case-summary-1.json", "case-summary-2.json"],
  "matches": [
    {
      "rank": 1,
      "engine_id": "engine-record-id",
      "engine_name": "approved-v1.json",
      "reuse_similarity": 0.84,
      "confidence": 0.72,
      "matched_domains": ["normal_retirement", "qpsa", "lump_sum"],
      "missing_from_candidate": ["alternate_payee"],
      "candidate_extra_domains": ["late_retirement"],
      "top_evidence": ["QPSA matched from R5 text and V1 benefit domain"],
      "warnings": []
    }
  ],
  "warnings": []
}
```

## Required UI Behavior

- R5 uploads must not create V1 warehouse records.
- Ranking output must label scores as reuse similarity and confidence/completeness.
- Empty warehouse and low-evidence cases must show clear warnings.
- Candidate cards must expose matched and missing domains at a glance.
