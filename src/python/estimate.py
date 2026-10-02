#!/usr/bin/env python3
"""Pure-Python ridge-style multiple linear regression for BUY listings.
Features explicitly include area, locality and amenity count.
RENT rows are kept in the CSV for the rent workflow but are excluded from price estimation.
"""
import csv
import sys
from pathlib import Path


def solve_linear_system(a, b):
    n = len(b)
    a = [row[:] + [b[i]] for i, row in enumerate(a)]
    for col in range(n):
        pivot = max(range(col, n), key=lambda r: abs(a[r][col]))
        if abs(a[pivot][col]) < 1e-12:
            a[pivot][col] += 1e-6
        a[col], a[pivot] = a[pivot], a[col]
        div = a[col][col]
        for j in range(col, n + 1):
            a[col][j] /= div
        for r in range(n):
            if r == col:
                continue
            factor = a[r][col]
            if factor == 0:
                continue
            for j in range(col, n + 1):
                a[r][j] -= factor * a[col][j]
    return [a[i][n] for i in range(n)]


def fit_model(rows, locality_names):
    def features(row):
        amenities = row["amenities"]
        amenity_count = len(amenities.split("|")) if amenities else 0
        return [1.0, float(row["area_sqft"]) / 1000.0, float(amenity_count)] + [1.0 if row["locality"] == loc else 0.0 for loc in locality_names]

    x = [features(r) for r in rows]
    y = [float(r["price"]) / 1_000_000.0 for r in rows]
    p = len(x[0])
    lam = 0.08
    xtx = [[0.0 for _ in range(p)] for _ in range(p)]
    xty = [0.0 for _ in range(p)]
    for row, target in zip(x, y):
        for i in range(p):
            xty[i] += row[i] * target
            for j in range(p):
                xtx[i][j] += row[i] * row[j]
    for i in range(1, p):
        xtx[i][i] += lam
    beta = solve_linear_system(xtx, xty)
    return beta, features


def main(input_csv, output_csv):
    with open(input_csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    rows = [r for r in rows if r.get("listing_mode", "BUY").upper() == "BUY"]
    if not rows:
        raise ValueError("No BUY listings found for estimation")
    localities = sorted({r["locality"] for r in rows})
    beta, features = fit_model(rows, localities)
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "estimated_price"])
        for row in rows:
            pred = sum(a * b for a, b in zip(beta, features(row))) * 1_000_000.0
            pred = max(1_000_000.0, pred)
            w.writerow([row["id"], f"{pred:.2f}"])
    print(f"trained on {len(rows)} BUY listings; features=area/locality/amenities; output={output_csv}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: estimate.py <input.csv> <output.csv>", file=sys.stderr)
        sys.exit(2)
    Path(sys.argv[2]).parent.mkdir(parents=True, exist_ok=True)
    main(sys.argv[1], sys.argv[2])
