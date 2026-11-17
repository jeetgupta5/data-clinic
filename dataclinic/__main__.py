import argparse
import json
import sys
from pathlib import Path
from .profile import MAX_BYTES, inspect_csv


def main():
    parser = argparse.ArgumentParser(description="Inspect CSV data quality without changing the input.")
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()
    try:
        with args.csv.open("rb") as source:
            result = inspect_csv(source.read(MAX_BYTES + 1))
        print(json.dumps(result, indent=2, allow_nan=False))
    except (ValueError, OSError) as exc:
        print(f"DataClinic: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
