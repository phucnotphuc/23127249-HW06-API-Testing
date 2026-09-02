# Test Summary — HW06

| API | Endpoint | Generated | Audited | Extended | Total | Automated (Newman) | Bugs |
|-----|----------|-----------|---------|----------|-------|--------------------|------|
| API1 Profile | GET/PUT /api/users/me | 38 | 37 | 5 | **42** | 9 requests | 4 |
| API2 Coupon | POST /api/apply-coupon | 37 | 37 | 5 | **42** | 10 requests | 4 |
| API3 Product | POST/PUT/DELETE /api/products | 38 | 38 | 5 | **43** | 12 requests | 5 |
| Setup | login user/admin | — | — | — | — | 2 requests | — |
| **Total** | | **113** | **112** | **15** | **127** | **33 req / 41 assert** | **12 distinct** |

## Newman baseline (green)
```
iterations 1 | requests 33 | assertions 41 | failed 0 | duration ~2.9s
average response 3ms (min 1, max 20)  | host localhost:3000 | X-Student-Id 23127249
```
Report: `reports/newman-report.html` (+ `.json`).

## Newman fail demo (spec-correctness)
```
failed 1 — C-03 "percent math CORRECT (spec)": expected -4500000 to deeply equal 50000  (BUG-C1)
```

## Bug severity rollup
| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | BUG-P2, BUG-C1, BUG-PR1 |
| High | 4 | BUG-P1, BUG-C3, BUG-C4, BUG-PR3 |
| Medium | 3 | BUG-P3, BUG-C2, BUG-PR2 |
| Low | 3 | BUG-P4, BUG-PR4, BUG-PR5 |

## Coverage per required dimension (assignment §6)
| Dimension | Covered by |
|-----------|-----------|
| Domain partitions (every parameter) | P-04..P-16, C-04..C-17, PR-06..PR-18 + CSV data files |
| State transitions | product lifecycle PR-05; coupon active/expired/used-up C-18..C-21,C-31,C-32; profile write-read P-30 |
| Security SEC-01..07 | P-01/03/18/21/25 (01,02,05,06); C-22/25 (02,05); PR-19/25/27 (02,03,04,05) |
| Schema validation | P-28/29/37, C-27/28/30, PR-28/29/30/35 |
