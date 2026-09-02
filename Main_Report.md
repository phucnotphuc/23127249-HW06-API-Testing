# HW06 — API Testing — Main Report

**Student:** 23127249 · **Course:** CSC15003 Software Testing · **SUT:** EShop backend.
**AI policy:** Open. AI used; full log in `ai-audit/AI_Audit_Report.md`, critique in `ai-audit/AI_Critique.md`.

---

## 1. Scope & API selection

Three APIs, one per pool, continuing the FR-04/FR-09/FR-15 features designed in HW02:

| # | Pool | Feature | Endpoint(s) | Key spec rules |
|---|------|---------|-------------|----------------|
| API1 | A | FR-04 Profile | `GET/PUT /api/users/me` | phone `0`+10–11 digits; name/address required; role not editable (SEC-06); JWT (SEC-02); no secret leak (SEC-01) |
| API2 | B | FR-09 Apply coupon | `POST /api/apply-coupon` | 5 conditions C1–C5; percent/fixed formula; `>=` min-order; auth (SEC-02) |
| API3 | C | FR-15 Product CRUD | `POST/PUT/DELETE /api/products` | price>0; name 1–255; category exists; admin-only (SEC-02/03); no SQLi (SEC-05) |

Selection is not duplicated within the group (profile+coupon+product CRUD set).

## 2. Method — AI-driven staged pipeline

Per the `ai-test-generation` skill, each API ran the pipeline **parse → variables →
partitions → rule packs → scenarios → oracles → emit → self-check → audit** rather
than a single generic prompt. The reusable rule packs (Security SEC-01–07 + IDOR,
State/lifecycle, Schema) are the reusable core captured as the Agent Skill
`skills/eshop-api-test-generator/`. Every request injects `X-Student-Id: 23127249` via
the collection pre-request script (anti-cheat §11).

Generation model: `claude-opus-4-8`. Spec source: `api_specification.md` + README
FR-tables + SEC-01–07. Tests were validated against a **live local SUT**, so oracles
reflect real behaviour and every spec-vs-actual gap became a logged bug.

## 3. Per-API results

Full case tables, audit labels (VALID/INVALID/INCOMPLETE), and the ≥5 extensions live in
`test-cases/API{1,2,3}_*.md`. Highlights:

### API1 Profile — 42 cases (38 generated → 37 audited + 5 extended)
- Coverage: phone/name/address domain partitions & boundaries; SEC-02 (401/403), SEC-06
  role escalation, SEC-05 SQLi, SEC-01 secret deny-list, schema, write-read consistency.
- Audit corrections: bad-token expectation 401→**403** (SUT `jwt.verify` path); partial-
  update cases re-scoped after finding PUT is destructive; one IDOR case (`body.id`) was
  **INVALID** (id derives from token) and reworked into extension EX-P3.
- Bugs surfaced: **BUG-P2** role escalation (Critical, SEC-06), **BUG-P1** secret leak
  (High, SEC-01), BUG-P3 no validation, BUG-P4 destructive PUT.

### API2 Coupon — 42 cases (37 generated → 37 audited + 5 extended)
- Coverage: C1–C5 conditions, percent/fixed formula, min-order boundary, expiry,
  max-uses, SEC-02 no-auth, SEC-05 SQLi, IDOR via `user_id`, schema + invariant
  `final = total − discount`.
- Audit corrections: case-sensitivity of `code` (→404), int/text comparison edges,
  usage-limit cases given explicit precondition seeding.
- Bugs: **BUG-C1** inverted percent formula (Critical), **BUG-C3** no auth (High, SEC-02),
  **BUG-C4** IDOR/usage bypass (High), BUG-C2 `>` vs `>=` boundary (Medium).

### API3 Product CRUD — 43 cases (38 generated → 38 audited + 5 extended)
- Coverage: name/price/category partitions, CRUD lifecycle create→delete→404, SEC-02/03
  auth+role, SEC-05 SQLi (tautology + UNION exfil), SEC-04 stored XSS, schema, idempotency.
- Audit corrections: not-found cases (`:id=abc`, PUT 99999) documented as 200-echo bugs;
  float-price storage documented.
- Bugs: **BUG-PR1** no auth on writes (Critical, SEC-02/03), **BUG-PR3** SQLi in search
  (High, SEC-05), BUG-PR2 no validation (Medium), BUG-PR4 wrong 404 handling, BUG-PR5
  price-as-string schema drift.

## 4. Execution — Postman + Newman

- Collection: `collections/eshop-hw06.postman_collection.json` (Setup + 3 API folders),
  environment `eshop-hw06.postman_environment.json`, data files `collections/data/*.csv`.
- Baseline run (characterization): **33 requests, 41 assertions, 0 failed** (`reports/newman-report.html`).
- Fail demo: `eshop-hw06-FAIL...json` flips C-03 to the spec-correct coupon math → **1
  failure** (`expected -4500000 to deeply equal 50000`), proving BUG-C1 and giving CI a red run.
- Anti-cheat evidence: console prints `X-Student-Id: 23127249` before every request;
  hostname is `localhost:3000` (accepted per §11).

**Postman features exercised:** workspace, collection, collection+environment variables,
pre-request scripts, test scripts, chained requests (token + `newProductId`), data-driven
CSV runs, Newman + htmlextra + JUnit reporters. *Monitor* (scheduled health ping) and
*Mock server* (contract stub for the coupon success shape) are described here as optional
extensions not wired into the graded run.

## 5. CI/CD

GitHub Actions (`.github/workflows/hw06-newman.yml`): checkout → clone SUT → install+seed
→ start backend → wait for `:3000` → Newman (CLI+HTML+JUnit) → upload artifact. Two sample
commits differ only by the `COLLECTION` env var: the green collection (all pass) and the
`-FAIL` collection (one fail). Details, screenshots, and run links in `ci/CI-CD-Report.md`.

## 6. Bugs

12 defects, `bugs/BugReport.md`, each with severity, SEC mapping, exact repro, root-cause
line in `server.js`, and the Newman test that evidences it. The 3 Critical bugs have ready
GitHub-issue bodies in `bugs/create_issues.sh`.

## 7. AI-driven generator (G9.5)

Design + pseudocode: `diagrams/generator-design.md`; self-drawn diagram source
`diagrams/generator.mmd` (render/redraw to `generator.png` before submission). Reusable
implementation: the Agent Skill in `skills/eshop-api-test-generator/` with Security/State/
Schema rule packs and stage prompts. Optional demo-video script included.

## 8. What AI got wrong (summary; full critique in appendix)

The AI defaulted to positive/presence assertions (it checked a secret key was *present*
rather than writing a deny-list for its *absence*), stayed inside each prompt's endpoint
boundary (missing cross-endpoint IDOR and privilege-escalation *consequences*), assumed
PUT was a partial update, and mis-stated the invalid-token status (401 vs 403). Every one
was caught by human audit against the live SUT — the core lesson: AI accelerates breadth,
humans supply the adversarial and cross-cutting reasoning and must verify against a
running system.

## Appendices
- A — `ai-audit/AI_Audit_Report.md` (mandatory).
- B — `ai-audit/AI_Critique.md` (200–300 words).
- C — `test-cases/` full case tables.
- D — `git_commit_log.txt`.
