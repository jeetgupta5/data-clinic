# DataClinic

Explainable dataset quality inspection, with opt-in cleaning previews and safe CSV exports.

## Current milestone: interactive browser dashboard

The dashboard in `web/` runs entirely in the browser. It supports CSV selection
and drag-and-drop, sample mode, quality summary cards, searchable column details,
a first-five-rows preview, and JSON report download. No dataset is uploaded.
It uses vanilla JavaScript and CSS for a dependency-free first deployment; React
and a FastAPI service remain optional future work, not current dependencies.

Open `web/index.html` in a browser, or serve it locally:

```bash
python -m http.server 8000 --directory web
```

Then visit http://localhost:8000. Run browser-engine regression tests with
Node.js 18+: `node --test tests/test_web.cjs`.

## Python CSV profiling core

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
of errors. Identifiers and dates are not yet inferred. Browser cleaning is implemented; the Python CLI remains inspection-only. ML readiness analysis is not implemented yet. Browser file
selection works without server upload. The private hosted dashboard is separate
from a future public recruiter demo.

## Planned architecture

React dashboard → FastAPI service → reusable profiling and transformation core.
Start with in-memory processing; introduce persistence only for explicit saved
reports. No paid AI API is required for core functionality.

## Delivery milestones

- [x] CSV profiler, sample dataset, CLI, regression tests
- [ ] FastAPI upload endpoint and request validation
- [x] Browser upload, sample mode, summary cards, column explorer (vanilla JS)
- [x] Opt-in cleaning preview, before/after counts, transformation log
- [x] JSON quality report export
- [x] Cleaned CSV export
- [ ] CI checks, deployment, screenshots, interview walkthrough

Cleaning decisions will be explicit; original data will remain available. CSV
exports must account for spreadsheet formula injection. Leakage checks will
require target and split context, and will be described as heuristics.

## Development progress

2026-11-17: Created and tested the profiling foundation. Source repository:
https://github.com/jeetgupta5/data-clinic. Browser dashboard added; private review deployment is available.

## Cleaning studio

Select transformations and click Preview cleaning. Every preview starts from the
original dataset; it never accumulates previous edits. Changing options invalidates
the preview. Original dashboard metrics remain unchanged. Download a separate CSV
or JSON audit with options, before/after profiles, and ordered transformation counts.

Order: trim surrounding cell whitespace, normalize missing tokens, handle missing
values, then deduplicate. Missing treatment can keep values, drop incomplete rows,
or fill numeric columns with median and text columns with the exact mode (first
observed breaks ties). Entirely missing columns are skipped with an explanation.
Statistics are computed before deduplication. Outliers are not removed. Filling
all numeric columns may be inappropriate for IDs or a later ML train/test split;
review choices before export. Fit imputation only on training data for ML evaluation.

CSV export quotes all cells, escapes quotes, uses CRLF and UTF-8 BOM, and prefixes
potential spreadsheet formulas with an apostrophe (including headers, negative
numbers and leading whitespace before =, +, -, @). Preview values do not change;
the audit reports the protection count. Header-only results are explicitly shown.
Run cleaning regressions: `node --test tests/test_clean.cjs`.
