# Three-minute project walkthrough

1. Open the app and choose Try sample dataset. Explain that files stay local.
2. Show the age missingness bar and switch the distribution to score. Discuss
   the value 900 as a review signal rather than proof of a data error.
3. In Cleaning studio, set age Missing treatment to Fill median, mark age
   Required, enable city Trim, and set score Max to 100. Enable deduplication.
4. Preview. Seven original rows become six. Missing cells become zero. The score
   range violation remains, demonstrating that the app does not silently delete it.
5. Inspect Changed cells: source record 6 trims ` Delhi ` and record 5 receives
   age 21.5. Switch to Validation issues: record 8 retains score 900.
6. Undo the last settings edit. Explain that the stale preview is hidden and must
   be recalculated. Export a recipe to reuse the exact schema and settings.
7. Download the CSV and audit. Explain spreadsheet formula protection and the
   distinction between unchanged original data, transformed preview, and export.

## Questions worth preparing for

- Why use browser processing? Privacy and zero backend setup, balanced against
  main-thread memory and performance limits.
- Why is transformation order explicit? Dropped rows must not influence fills;
  deduplication can change the observations available for statistics.
- How do IDs survive? Meaning is explicit, inferred filling is rejected for ID
  columns, and strings are not coerced.
- How do users trust changes? Deterministic rules, source-record IDs, before/after
  metrics, capped-but-disclosed row details and a downloadable audit.
- Is this an ML project? It is data engineering and preprocessing tooling. Do not
  claim model training, leakage detection or AI features that do not exist.

## Portfolio description

Built a browser-first CSV quality workbench with deterministic per-column cleaning,
schema validation, source-record traceability, reusable versioned recipes and
protected CSV export. Added regression tests for parsing, missing-data handling,
validation, provenance and export safety, plus a Python inspection CLI.
