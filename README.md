# DataClinic

Explainable dataset quality inspection, with opt-in cleaning previews and safe CSV exports.

## DataClinic Studio

The dashboard in `web/` runs entirely in the browser. It supports CSV selection
and drag-and-drop, sample mode, quality summary cards, searchable column details,
a first-five-rows preview, and JSON report download. No dataset is uploaded.

The studio adds per-column cleaning and validation rules, row-level edit review,
original record tracking, recipe import/export, undo, missingness charts and
numeric histograms. See [Architecture](docs/ARCHITECTURE.md) and the
[demo walkthrough](docs/DEMO.md).
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

1. Select a CSV or the sample dataset.
2. Configure each column independently: meaning, whitespace trim, missing-token
   normalization, keep/drop/median/mode/custom filling, required, unique and ranges.
3. Optionally remove exact transformed duplicate rows.
4. Preview before/after counts and validation violations. Inspect paginated cell
   edits, removed source records and remaining validation issues.
5. Download cleaned CSV, audit JSON or a versioned recipe. The original stays intact.

`Identifier` blocks inferred filling; it does not coerce the data. Dates validate
YYYY-MM-DD calendar dates. Entirely missing columns need a custom replacement.
Recipes require exact column names/order and contain custom values, not rows.
Changing rules invalidates the preview. Undo restores up to 30 prior rule edits.

Run all JavaScript tests: `node --test tests/*.cjs`.
Run Python tests: `python -m unittest discover -s tests -v`.
GitHub Actions runs these checks for pushes and pull requests.

### Export and limits

CSV exports quote every field and protect potential spreadsheet formulas with an
apostrophe, including negative numeric strings and headers. This can change
exported values relative to the preview. Detailed changes and validation findings
are capped at 2,000 each; aggregate counts cover the full dataset. Source record
numbers include the header and are not physical line numbers. See the architecture
notes for all transformation and validation semantics.

The current hosted review site requires the owner's ChatGPT sign-in:
https://dataclinic-jeet-gupta.placidalgae.chatgpt.site
It is not a public recruiter demo. Anyone can clone this repository and serve
`web/` locally without an account. No paid API or environment secrets are needed.

ML train/test splitting, train-only imputation, configurable missing-token sets,
Excel support and background-worker processing remain future work.
