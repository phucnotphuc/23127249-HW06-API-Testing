# HW06 — CI/CD Report

**Student:** 23127249 · **Pipeline:** GitHub Actions · **Workflow:** `.github/workflows/hw06-newman.yml` (copy in `ci/`).

## Pipeline design

| Stage | What it does |
|-------|--------------|
| Checkout | Pulls the submission repo (collections + environment). |
| Setup Node 20 | Runtime for backend + Newman. |
| Clone SUT | `git clone https://github.com/ttbhanh/eshop-sut` — reproducible, no vendored copy. |
| Install + seed | `npm install`, `node database.js` (fresh deterministic data each run). |
| Start backend | `node server.js &` on `localhost:3000`. |
| Wait for :3000 | Polls `GET /api/products` up to 30s before testing (no race). |
| Install Newman | `newman` + `newman-reporter-htmlextra`. |
| Run Newman | Executes the collection with the local environment; every request injects `X-Student-Id: 23127249`. Emits CLI + HTML + JUnit. |
| Upload artifact | HTML + JUnit report uploaded (`if: !cancelled()`, 14-day retention). |

Trigger: push touching `collections/**` or the workflow, plus manual `workflow_dispatch`.
The `hostname` in the Newman output is the GitHub runner / `localhost:3000`, matching the deployment (anti-cheat §11 — `localhost` is accepted).

## The two required runs

The only difference is the `COLLECTION` env var at the top of the workflow.

### Run A — all tests pass (green commit)
- `COLLECTION: eshop-hw06.postman_collection.json`
- Local proof:
  ```
  requests: 33   assertions: 41   failed: 0     -> job PASSES (exit 0)
  ```
- Commit message: `hw6(ci): newman all-pass run`.
- **Screenshot:** `ci/screenshots/run-a-pass.png` (green check on Actions).
- **Run link:** https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599544070 (status: success).

### Run B — one test fails (red commit)
- Change one line: `COLLECTION: eshop-hw06-FAIL.postman_collection.json`.
- That collection flips a single assertion (`C-03`) to the **spec-correct** coupon math, which the buggy SUT fails:
  ```
  1. AssertionError  C-03 percent math CORRECT (spec) [intentional CI fail]
     expected -4500000 to deeply equal 50000
  failed: 1   -> job FAILS (newman exit 1)
  ```
- Commit message: `hw6(ci): demonstrate failing test (BUG-C1)`.
- **Screenshot:** `ci/screenshots/run-b-fail.png` (red X on Actions).
- **Run link:** https://github.com/phucnotphuc/23127249-HW06-API-Testing/actions/runs/33599578261 (status: failure — C-03 assertion `expected -4500000 to deeply equal 50000`).

## Steps for you to execute (human)

```bash
# from repo root D:/23127249/QA
git add .github/workflows/hw06-newman.yml hw6/23127249_HW06_AI_API_XXX
git commit -m "hw6(ci): newman all-pass run"
git push                       # -> Actions Run A (green). Screenshot it.

# flip to the failing collection
#   edit COLLECTION: eshop-hw06-FAIL.postman_collection.json  in the workflow
git commit -am "hw6(ci): demonstrate failing test (BUG-C1)"
git push                       # -> Actions Run B (red). Screenshot it.
```

Paste the two run URLs + screenshots back here (or into this file) to finish this section.

## Postman features exercised (assignment §6 list)

- **Workspace / Collection** — single collection, 4 folders (Setup, API1, API2, API3).
- **Variables** — collection vars (`baseUrl`, `studentId`) + environment vars (`userToken`, `adminToken`, `userId`, `newProductId`).
- **Environment** — `eshop-hw06.postman_environment.json` (Local).
- **Pre-request scripts** — collection-level injects `X-Student-Id` header + `console.log` (anti-cheat evidence); request-level overrides Authorization for the bad-token case.
- **Test scripts** — `pm.test` assertions: status, body values, typed schema checks, cross-field invariants (`final = total − discount`).
- **Chained requests** — token capture in Setup; `newProductId` passed across the CRUD lifecycle.
- **Data-driven runs** — CSV data files (`collections/data/*.csv`) for domain-partition iterations via the Collection Runner / `newman -d`.
- **Newman + htmlextra + JUnit reporters** — CLI, HTML dashboard, and CI-consumable JUnit XML.
- _(Documented but optional: Monitor for scheduled health checks, Mock Server for contract stubs — see Main_Report.)_
