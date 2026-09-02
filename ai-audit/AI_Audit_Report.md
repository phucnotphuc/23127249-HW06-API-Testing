# AI Audit Report — HW06

**Declaration:** *I use AI tools for the following tasks.*
**Primary tool:** Claude Code (model `claude-opus-4-8`), Anthropic. **Date:** 2026-08-30.
**Skills applied:** `ai-test-generation`, `api-testing`, `ci-cd-integration`, `ai-bug-triage`
(from `.skills/qa-skills`), plus the custom `eshop-api-test-generator` built this session.
All AI output was reviewed by the student and corrected where noted (see `test-cases/*` audit tables).

Reproducibility: SUT commit = `ttbhanh/eshop-sut@main`; spec = `api_specification.md`;
generator model id `claude-opus-4-8`.

---

## Interaction log

### I-01 — Environment & spec grounding
- **Tool/model:** Claude Code / claude-opus-4-8 · **Time:** 2026-08-30
- **Prompt (summary):** "Read `2026.HW06.API Testing_En.md`, the HW02 test-cases, the qa-skills, the EShop `api_specification.md` and `server.js`/`database.js`; confirm the 3 chosen APIs and the real SUT behaviour."
- **Output:** Endpoint inventory, seed data (users/coupons/products), and identification of built-in bugs from source (role escalation, no-auth writes, SQLi in search, inverted percent formula, `>` vs `>=`).
- **Human review:** Verified each finding with live `curl` before trusting it.

### I-02 — Staged generation, API1 Profile
- **Prompt (summary):** Stages 1–6 of `eshop-api-test-generator` for `PUT/GET /api/users/me`: variable inventory → equivalence partitions → rule packs → scenarios → oracles.
- **Output:** 38 candidate cases (happy/boundary/negative/security/schema).
- **Human review:** Labelled VALID/INVALID/INCOMPLETE; corrected bad-token 401→403; removed invalid IDOR-by-body-id case; added 5 extensions. Result: 42 cases.

### I-03 — Staged generation, API2 Coupon
- **Prompt (summary):** same pipeline for `POST /api/apply-coupon`, emphasising C1–C5, formula, IDOR via `user_id`, SEC-05.
- **Output:** 37 candidate cases + invariant oracle `final = total − discount`.
- **Human review:** Corrected case-sensitivity/type-coercion edges; added usage-seeding preconditions; 5 extensions incl. universal negative-discount invariant. Result: 42.

### I-04 — Staged generation, API3 Product CRUD
- **Prompt (summary):** same pipeline for product write/read endpoints; lifecycle + admin auth + SQLi + XSS.
- **Output:** 38 candidate cases.
- **Human review:** Documented 200-echo not-found bugs; added UNION-exfil, idempotency, data-integrity extensions. Result: 43.

### I-05 — Postman collection + Newman
- **Prompt (summary):** "Emit a Postman v2.1 collection from the audited cases; collection pre-request injects `X-Student-Id: 23127249`; characterize actual SUT so baseline is green; provide a `--fail` variant flipping one assertion to spec-correct coupon math."
- **Output:** `build_collection.js` generator + green/FAIL collections + environment.
- **Human review:** Ran Newman: 41/41 pass (green), 1 fail (FAIL variant, BUG-C1). Fixed an env-vs-collection variable precedence bug (tokens must be set in the environment scope).

### I-06 — Bug report + triage
- **Prompt (summary):** "Classify the spec-vs-actual gaps into a severity-ranked bug report with repro + root-cause line + SEC mapping." (`ai-bug-triage`)
- **Output:** 12 bugs (3 Critical/4 High/3 Medium/3 Low) + `create_issues.sh`.
- **Human review:** Re-ran each repro `curl` to confirm before filing.

### I-07 — CI/CD + generator design + skill + reports
- **Prompt (summary):** "GitHub Actions Newman pipeline with a green and a red run; self-drawn generator design + pseudocode; package a reusable Agent Skill; draft Main Report, README, this audit, and the critique."
- **Output:** workflow, `generator-design.md` + `generator.mmd`, skill files, reports.
- **Human review:** Student owns the design decisions in the diagram and must export `generator.png` themselves (anti-cheat §11); CI commits/screenshots and GitHub issues are executed by the student.

---

## Tools declared
| Tool | Purpose |
|------|---------|
| Claude Code (`claude-opus-4-8`) | Staged test generation, collection scaffolding, reports |
| Newman + newman-reporter-htmlextra | Test execution + HTML/JUnit reports |
| Postman collection format v2.1 | Test asset format |
| GitHub Actions | CI/CD pipeline |
| qa-skills + custom eshop-api-test-generator | Method + reusable rule packs |

## Anti-cheat attestations
- `X-Student-Id: 23127249` printed by the pre-request script (console screenshot to attach).
- Newman hostname = `localhost:3000` (accepted).
- Generator diagram is student-designed; `generator.png` to be self-exported, not AI-generated.
