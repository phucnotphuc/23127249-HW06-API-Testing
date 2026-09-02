# HW06 — API Testing — 23127249

**SUT:** EShop (https://github.com/ttbhanh/eshop-sut) · **Base:** `http://localhost:3000` · **Header:** `X-Student-Id: 23127249` on every request.
**AI declaration:** *I use AI tools for the following tasks* — see `ai-audit/AI_Audit_Report.md`.

## Selected APIs (one per pool)
| # | Pool | Feature | Endpoint |
|---|------|---------|----------|
| API1 | A | FR-04 Profile | `GET/PUT /api/users/me` |
| API2 | B | FR-09 Apply coupon | `POST /api/apply-coupon` |
| API3 | C | FR-15 Product CRUD | `POST/PUT/DELETE /api/products` |

## Test summary
| Metric | Value |
|--------|-------|
| APIs tested | 3 |
| Test cases **designed** (audited) | 127 (API1 42, API2 42, API3 43) |
| — AI-generated | 113 |
| — human-added (extensions) | 15 |
| Cases **automated** in Postman/Newman | 33 requests / 41 assertions |
| Automated pass (green baseline) | 41 / 41 |
| Automated fail (spec-correctness demo) | 1 (C-03 → BUG-C1) |
| **Bugs found** | **12** (3 Critical, 4 High, 3 Medium, 3 Low) |

> Note: the SUT is intentionally buggy. The automated suite **characterizes** actual
> behaviour (so the CI baseline is green); each spec-vs-actual gap is filed in
> `bugs/BugReport.md`. The `-FAIL` collection flips one assertion to the spec-correct
> value to demonstrate a red CI run.

## How to run
```bash
# 1. SUT
cd sut/backend && npm install && node database.js && node server.js   # :3000
# 2. Tests (from this folder)
newman run collections/eshop-hw06.postman_collection.json \
  -e collections/eshop-hw06.postman_environment.json \
  -r cli,htmlextra --reporter-htmlextra-export reports/newman-report.html
# fail demo:
newman run collections/eshop-hw06-FAIL.postman_collection.json -e collections/eshop-hw06.postman_environment.json
```

## Postman features used
Workspace · collection (4 folders) · collection + environment variables · pre-request
scripts (X-Student-Id injection + console log) · test scripts (status/value/typed-schema/
invariant) · chained requests (token + newProductId) · data-driven CSVs (`collections/data/`) ·
Newman + htmlextra + JUnit reporters. (Monitor / Mock server: documented in Main_Report.)

## Contents
- `test-cases/` — API1/2/3 design + audit + extension (Markdown).
- `collections/` — Postman collection (+FAIL), environment, data CSVs, `build_collection.js`.
- `reports/` — Newman HTML + JSON.
- `ci/` — GitHub Actions workflow + CI/CD report.
- `bugs/` — bug report + `create_issues.sh`.
- `diagrams/` — self-drawn generator design (`generator.mmd` + design doc).
- `skills/eshop-api-test-generator/` — reusable Agent Skill.
- `ai-audit/` — AI Audit Report + AI Critique + prompt logs.
- `Main_Report.md/.pdf`, `git_commit_log.txt`.

## Self-assessment
| No. | Criteria | Grade | Self-Assessed |
|---|---|---|---|
| 1 | API 1 — full pipeline | 30 | 27 |
| 2 | API 2 — full pipeline | 30 | 27 |
| 3 | API 3 — full pipeline | 30 | 27 |
| 4 | Agent Skill (test generator) | 10 | 9 |
| | **Total** | **100** | **90** |

**Public repo:** https://github.com/phucnotphuc/23127249-HW06-API-Testing
**CI runs:** [all-pass](https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599544070) · [one-fail (BUG-C1)](https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599578261) · **Demo video (optional):** _paste YouTube URL_.

## Outstanding human steps
1. ~~Push CI commits + runs~~ — **done**: [green](https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599544070) + [red](https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599578261). Screenshot both for the PDF.
2. `bash bugs/create_issues.sh` (gh already authed); paste issue #s into `bugs/BugReport.md`.
3. Export `diagrams/generator.png` from your own drawing (anti-cheat §11).
4. Screenshot the Postman/Newman console showing `X-Student-Id: 23127249`.
5. Convert `Main_Report.md`, AI audit, AI critique to PDF; set final grade in filename.
