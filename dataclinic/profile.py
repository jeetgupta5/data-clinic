"""Dependency-free profiling core. Input data is never modified."""
import csv
import io
import math
from collections import Counter

MAX_BYTES = 5 * 1024 * 1024
MAX_ROWS = 50000
MAX_COLUMNS = 200
MISSING = {"", "na", "n/a", "null", "none", "nan"}


def number(value):
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else None
    except ValueError:
        return None


def quantile(values, fraction):
    position = (len(values) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(values) - 1)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def inspect_csv(data):
    """Profile UTF-8 CSV bytes; reject malformed shapes instead of dropping data.

    Missing tokens are case-insensitive. Duplicate matching uses exact cell
    strings. Outliers use the 1.5 IQR rule and are review hints, not errors.
    """
    if len(data) > MAX_BYTES:
        raise ValueError("CSV must be at most 5 MiB.")
    try:
        text = data.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("CSV must use UTF-8 encoding.") from exc
    if "\x00" in text:
        raise ValueError("CSV contains null bytes.")
    try:
        reader = csv.reader(io.StringIO(text, newline=""), strict=True)
        headers = next(reader, None)
        if not headers or any(not h.strip() for h in headers):
            raise ValueError("CSV needs non-empty column names.")
        if len(set(h.strip() for h in headers)) != len(headers):
            raise ValueError("Column names must be unique after trimming.")
        if len(headers) > MAX_COLUMNS:
            raise ValueError("CSV may have at most 200 columns.")
        rows = []
        for row in reader:
            if len(row) != len(headers):
                raise ValueError(f"Record {len(rows) + 2} has {len(row)} fields; expected {len(headers)}.")
            rows.append(row)
            if len(rows) > MAX_ROWS:
                raise ValueError("CSV may have at most 50,000 data rows.")
    except csv.Error as exc:
        raise ValueError(f"Invalid CSV: {exc}") from exc
    if not rows:
        raise ValueError("CSV needs at least one data row.")
    columns = []
    for index, name in enumerate(headers):
        raw = [row[index] for row in rows]
        present = [v for v in raw if v.strip().lower() not in MISSING]
        numeric = [number(v.strip()) for v in present]
        is_numeric = bool(present) and all(v is not None for v in numeric)
        profile = {
            "name": name, "type": "numeric" if is_numeric else "text" if present else "empty",
            "missing": len(rows) - len(present),
            "missing_percent": round(100 * (len(rows) - len(present)) / len(rows), 2),
            "unique_nonmissing": len(set(present)),
            "whitespace_cells": sum(v != v.strip() for v in present),
        }
        if is_numeric:
            ordered = sorted(numeric)
            q1, q3 = quantile(ordered, .25), quantile(ordered, .75)
            spread = q3 - q1
            lower, upper = q1 - 1.5 * spread, q3 + 1.5 * spread
            # IQR=0 has no useful scale, so do not invent outliers.
            outliers = sum(v < lower or v > upper for v in ordered) if spread else 0
            profile["statistics"] = {"min": ordered[0], "max": ordered[-1],
                                     "median": quantile(ordered, .5),
                                     "outliers": outliers, "iqr": spread}
        elif present:
            profile["numeric_like_cells"] = sum(v is not None for v in numeric)
        columns.append(profile)
    counts = Counter(tuple(row) for row in rows)
    return {"rows": len(rows), "columns": len(headers),
            "duplicate_rows": sum(count - 1 for count in counts.values()),
            "missing_cells": sum(c["missing"] for c in columns),
            "column_profiles": columns,
            "methodology": {"missing_tokens": sorted(MISSING), "duplicates": "exact cell strings",
                            "outliers": "1.5 IQR; skipped when IQR is zero",
                            "limitations": "Flags require review. No automatic cleaning or leakage detection."}}
