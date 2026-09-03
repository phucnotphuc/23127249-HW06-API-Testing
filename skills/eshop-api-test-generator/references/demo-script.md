# Demo video script (optional G9.5 bonus) — ~4 min

YouTube video link: https://youtu.be/ekSnALQ9E4A
Generated **coupon** suite end-to-end demo walkthrough:

1. **0:00 Intro (15s)** — "HW06, student 23127249. Demonstrating the eshop-api-test-generator skill on `POST /api/apply-coupon`."
2. **0:15 Show spec (20s)** — open `api_specification.md` §5; point at the 5 conditions + formula.
3. **0:35 Stage 1–3 (60s)** — run the parse/variables/partitions prompts; show the equivalence-class table appear (code exists/inactive/unknown/injection; total <min/==min/>min/0/negative).
4. **1:35 Stage 4–6 (50s)** — apply the rule packs; show security cases (SEC-02 no-auth, SEC-05 SQLi, IDOR via user_id) and the invariant oracle `final == total - discount`.
5. **2:25 Stage 7 emit (30s)** — show the generated Postman request + `pm.test`, and the `X-Student-Id` pre-request injection.
6. **2:55 Run Newman (40s)** — `newman run ...` green; then the `--fail` collection showing C-03 catching BUG-C1 (`-4500000` vs `50000`).
7. **3:35 Audit gate (20s)** — show the VALID/INVALID/INCOMPLETE table and the 5 extension cases.
8. **3:55 Close (10s)** — "Same skill re-runs on any EShop endpoint via the reusable rule packs."
