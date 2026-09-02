# HW06 Demo / Oral-Defense Video Script

Two uses: (1) the optional YouTube demo (§7 bonus), (2) rehearsal for the 5–7 min oral
defense (§13). Target ~6 min. Format: **[SCREEN]** = what to show · **"say"** = what to say.
Speak in your own words — this is a skeleton, not a read-aloud.

---

## 0:00 — Intro (20s)
**[SCREEN]** Repo homepage: https://github.com/phucnotphuc/23127249-HW06-API-Testing
> "HW06 API Testing, student 23127249. System under test is EShop, a deliberately-buggy
> Node/Express backend. I tested three APIs — one per pool: Profile, Coupon, and Product CRUD —
> with a Postman/Newman suite, ran it in GitHub Actions CI, and found 13 bugs."

## 0:20 — Method: staged AI, not one prompt (40s)
**[SCREEN]** `diagrams/generator.png` (your self-drawn version).
> "I didn't ask AI to 'generate all tests'. I drove it through nine stages: parse the spec,
> inventory variables, partition each into equivalence classes and boundaries, apply reusable
> rule packs for security and state, synthesize scenarios, then bind oracles separately, emit
> Postman requests, self-check for coverage, and finally a human audit. The audit is where I
> labelled each case VALID, INVALID, or INCOMPLETE and fixed the AI's mistakes."

## 1:00 — The test cases + audit (50s)
**[SCREEN]** `test-cases/API1_Profile_TestCases.md` — scroll the case table, then the audit table.
> "127 cases total, over 35 per API. Coverage is domain partitions on every parameter, state
> transitions, security SEC-01 through 07, and schema validation. Example of the audit catching
> AI: for the invalid-token case the AI expected 401, but the server actually returns 403 — I
> corrected it. And the AI wrote an IDOR case using a body `id` that the endpoint ignores, so I
> marked it INVALID and reworked it into an extension."
**[SCREEN]** scroll to the 5 extension cases.
> "These five per API are bugs the AI missed — mostly cross-endpoint attacks and negative-space
> assertions the single-endpoint prompt couldn't see."

## 1:50 — Live run: Newman green (50s)
**[SCREEN]** terminal.
```bash
cd hw4/eshop-sut/backend && node database.js && node server.js   # (already running)
newman run collections/eshop-hw06.postman_collection.json -e collections/eshop-hw06.postman_environment.json
```
> "Here's the suite running against the live server. Notice the boxed `X-Student-Id: 23127249`
> before every request — that's my pre-request script, the anti-cheat evidence. Result: 41
> assertions, zero failed. The suite characterizes the server's real behaviour, so it's a stable
> green baseline."

## 2:40 — Live bug repro (60s)
**[SCREEN]** terminal, run 2–3 curls from `bugs/BugReport.md`.
> "Now the bugs. BUG-P2, privilege escalation:"
```bash
curl -s -X PUT localhost:3000/api/users/me -H "Authorization: Bearer $TOK" \
  -H Content-Type:application/json -d '{"name":"e","phone":"0912345678","shipping_address":"z","role":"admin"}'
curl -s localhost:3000/api/users/me -H "Authorization: Bearer $TOK" | jq .role   # "admin"
```
> "A normal user set their own role to admin. Critical. BUG-C1, the coupon math:"
```bash
curl -s -X POST localhost:3000/api/apply-coupon -H Content-Type:application/json \
  -d '{"code":"SAVE10","total_amount":500000,"user_id":2}'
```
> "10% off 500,000 should be a 50,000 discount. The server returns minus 4.5 million — the
> formula uses `1 minus value` instead of `value over 100`. And BUG-PR1: I can create a product
> with no token at all — the write endpoints have no auth."

## 3:40 — CI/CD: green + red (50s)
**[SCREEN]** Actions tab → the two runs.
> "The same Newman command runs in GitHub Actions. This green run is all-passing. For the
> required failing run, I flipped one assertion to the spec-correct coupon value — it fails,
> proving BUG-C1 in CI, and the job goes red with exit code 1. Both runs are public with
> uploaded HTML report artifacts."

## 4:30 — The agent skill / generator (40s)
**[SCREEN]** `skills/eshop-api-test-generator/SKILL.md` + `rule-packs.md`.
> "For the Create level I packaged the generator as a reusable Agent Skill. The reusable core is
> the rule packs — Security, State, Schema. Point it at any EShop endpoint and it re-runs the
> nine stages. The pseudocode and my self-drawn diagram are in the diagrams folder."

## 5:10 — What I learned about AI (40s)
**[SCREEN]** `ai-audit/AI_Critique.md`.
> "The AI was fast but literal. It asserted secrets were *present* instead of proving they were
> *absent*; it stayed inside each prompt's endpoint so it missed cross-endpoint IDOR; and it
> assumed PUT was a partial update. It fails like this because it reasons from patterns, not from
> the running system. The lesson: AI multiplies breadth, but the adversarial and cross-cutting
> thinking — and verification against a live server — has to come from me."

## 5:50 — Close (10s)
> "Repo, collection, reports, CI, 13 issues, and the skill are all in the public repo. Thanks."

---

## Oral-defense Q&A prep (likely questions)
- **Why is CI green if the app is buggy?** Suite characterizes actual behaviour (regression net);
  bugs are documented separately; the `-FAIL` run asserts spec-correctness and fails on purpose.
- **How did you pick test values?** Equivalence partitioning + boundary values per parameter
  (see the partition tables in each test-case doc).
- **Show me a bug you found that the AI missed.** Any extension case, e.g. EX-C3 IDOR usage-drain,
  or EX-PR2 UNION-based SQLi exfiltration.
- **What is `X-Student-Id` for and where is it set?** Attribution/anti-cheat; set in the
  collection pre-request script via `pm.request.headers.upsert`.
- **Which SEC requirements did you break?** SEC-01 (secret leak), SEC-02/03 (missing auth/role),
  SEC-05 (SQLi), SEC-06 (role escalation).
