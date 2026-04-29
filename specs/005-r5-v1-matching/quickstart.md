# Quickstart: R5-to-V1 Matching

1. Open the app from `index.html`.
2. Ensure the V1 warehouse contains at least two stored V1 summaries.
3. Upload one or more R5 plan-summary JSON files through the R5 matching section.
4. Verify the app shows a temporary case profile summary with source count, recognized domains, and confidence.
5. Run the R5 match ranking.
6. Verify V1 candidates are ranked by reuse similarity and show confidence, matched domains, and missing domains.
7. Verify the V1 warehouse record count did not change after R5 upload or ranking.

Regression command:

```powershell
node --test tests\option-b-upload-regression.test.js
```
