# DataClinic

Explainable dataset quality inspection, with cleaning previews planned.

## Current milestone: CSV profiling core

Working Python CLI: missing values, exact duplicate rows, numeric statistics,
whitespace hints, mixed numeric/text hints, and IQR outlier flags. No data is
sent to an external service. Python 3.10+; no third-party dependencies.

```bash
python -m dataclinic examples/students.csv
python -m unittest discover -s tests -v
```

Run commands from this repository's root. To save the JSON report:

```bash
python -m dataclinic examples/students.csv > report.json
```

Limits: UTF-8 comma-separated CSV, 5 MiB, 50,000 rows, 200 columns. Invalid
records and duplicate headers are rejected. Missing tokens are documented in
each report; they are case-insensitive and may need customization for real data.
Duplicate detection compares exact cell strings. Numeric inference requires all
nonmissing cells to parse as finite numbers. Outliers use interpolated quartiles
and the 1.5 IQR rule, skipped when IQR is zero. Flags are review hints, not proof
of errors. Identifiers and dates are not yet inferred. Cleaning, web upload,
ML readiness analysis, and deployment are not implemented yet.

## Planned architecture

React dashboard → FastAPI service → reusable profiling and transformation core.
Start with in-memory processing; introduce persistence only for explicit saved
reports. No paid AI API is required for core functionality.

## Delivery milestones

- [x] CSV profiler, sample dataset, CLI, regression tests
- [ ] FastAPI upload endpoint and request validation
- [ ] React upload, sample mode, summary cards, column explorer
- [ ] Opt-in cleaning preview, before/after counts, transformation log
- [ ] Cleaned CSV and JSON report export
- [ ] CI checks, deployment, screenshots, interview walkthrough

Cleaning decisions will be explicit; original data will remain available. CSV
exports must account for spreadsheet formula injection. Leakage checks will
require target and split context, and will be described as heuristics.

## Development progress

2026-11-17: Created and tested the profiling foundation. Source repository:
https://github.com/jeetgupta5/data-clinic. No live deployment exists yet.
