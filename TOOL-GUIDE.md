# HW06 Tool Guide — understand what you submitted

Read this once. It explains every tool in your submission so you can defend it in the
oral (§13) and answer "what does this do?" for any file.

---

## 0. The big picture

You are testing a **backend REST API** (no browser). The flow:

```
Postman collection (your tests)  --run by-->  Newman (CLI)  -->  HTTP requests  -->  EShop SUT (localhost:3000)
                                                      |                                    |
                                                  reports (HTML/JUnit)              SQLite database
```

GitHub Actions runs the same Newman command in the cloud on every push (CI/CD).

---

## 1. The SUT (System Under Test) — EShop

- A small **Node.js + Express** server (`server.js`) with a **SQLite** database (`database.js` seeds it).
- Runs on `http://localhost:3000`. Start: `node database.js` (seed) then `node server.js`.
- **Deliberately buggy** — the course planted security + logic bugs for you to find.
- **JWT auth:** login returns a token; protected endpoints need header `Authorization: Bearer <token>`. A JWT is a signed string carrying `{id, role}` — the server trusts it after verifying the signature.

**Your 3 tested APIs:** Profile (`/api/users/me`), Coupon (`/api/apply-coupon`), Product CRUD (`/api/products`).

---

## 2. curl — manual API probing

Command-line HTTP client. Used for quick checks + bug repros.
```bash
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eshop.com","password":"Test1234!"}'
```
`-s` silent, `-X` method, `-H` header, `-d` body. Returns JSON.

---

## 3. Postman — the test collection

Postman stores tests as a **collection** (a `.json` file). Key parts you used:

| Concept | What it is | Where in your files |
|---------|-----------|---------------------|
| **Collection** | Folder tree of requests | `collections/eshop-hw06.postman_collection.json` |
| **Environment** | Named variables (e.g. `baseUrl`, tokens) | `collections/eshop-hw06.postman_environment.json` |
| **Variables** | `{{baseUrl}}`, `{{userToken}}` placeholders resolved at run | set in env + by scripts |
| **Pre-request script** | JS that runs *before* a request | injects `X-Student-Id: 23127249` header + logs it |
| **Test script** | JS that runs *after*, makes assertions | the `pm.test(...)` blocks |
| **Chained requests** | one request saves a value the next uses | login saves token; create-product saves `newProductId` |

**The `pm` object** (Postman's API inside scripts):
- `pm.response.to.have.status(200)` — assert status code.
- `pm.response.json()` — parse body.
- `pm.expect(x).to.eql(y)` — value assertion (Chai syntax).
- `pm.environment.set('userToken', t)` — save a variable for later requests.
- `pm.request.headers.upsert({...})` — add/replace a header.

**Your collection is generated** by `collections/build_collection.js` (a Node script). Edit that
script + re-run `node build_collection.js` to regenerate — don't hand-edit the JSON.
`node build_collection.js --fail` makes the one-failing variant for the CI red run.

---

## 4. Newman — run the collection from the CLI

Newman = Postman's collection runner without the GUI. Same tests, scriptable, CI-friendly.
```bash
newman run collections/eshop-hw06.postman_collection.json \
  -e collections/eshop-hw06.postman_environment.json \
  -r cli,htmlextra --reporter-htmlextra-export reports/newman-report.html
```
- `-e` environment file. `-r` reporters (comma list).
- **Reporters:** `cli` (terminal), `htmlextra` (pretty HTML dashboard), `junit` (XML that CI reads), `json` (machine data).
- **Exit code:** 0 if all pass, 1 if any fail — that is what makes a CI job green/red.
- **Data-driven:** `-d file.csv` runs the collection once per CSV row (your `collections/data/*.csv`).

Console shows a boxed block for every `console.log` — that's your `X-Student-Id: 23127249`
anti-cheat evidence.

---

## 5. Characterization vs spec tests (important for your defense)

The SUT is buggy, so there are two kinds of "expected":
- **Spec-correct** = what the requirement says should happen.
- **Actual** = what the buggy server really does.

Your automated suite asserts **actual** behaviour so the baseline stays **green** (a stable
regression net), and every place where actual ≠ spec is written up as a **bug** in
`bugs/BugReport.md`. The `--fail` collection flips one assertion to the *spec-correct* value
to prove a bug fails CI on purpose. Be ready to explain this choice — it is deliberate, not a
cop-out: green CI = "behaviour hasn't drifted"; the bug report = "behaviour is wrong vs spec".

---

## 6. GitHub Actions — CI/CD

A **workflow** (`.github/workflows/hw06-newman.yml`) is YAML describing jobs that run on
GitHub's servers when you push.
- `on: push` / `workflow_dispatch` — triggers.
- Steps: checkout code → install Node → clone the SUT → seed + start it → wait for port 3000 →
  install Newman → run collection → upload the report as an **artifact**.
- The `COLLECTION` env var picks the green or `-FAIL` collection. Two commits = two runs
  (one pass, one fail) — the assignment's requirement.
- A run is **green** if every step exits 0; **red** if Newman exits 1.

---

## 7. gh — GitHub CLI

Command-line GitHub. Used to create the repo and file the 13 bug **Issues**.
```bash
gh repo create <name> --public --source=. --push
gh issue create --title "..." --body "..." --label bug
gh run list          # see CI runs
```

---

## 8. Mermaid — the design diagram

Mermaid turns text into diagrams. `diagrams/generator.mmd` is the source; it was rendered to
`generator.png` with `mmdc` (mermaid CLI). ⚠ Anti-cheat §11 wants this diagram **self-drawn** —
redraw it yourself before submitting.

---

## 9. Testing concepts glossary (defend these)

| Term | Meaning |
|------|---------|
| **Equivalence partition** | Split an input into classes that behave the same; test one value per class |
| **Boundary value** | Test the edges of a range (min−1, min, max, max+1) — bugs cluster there |
| **Oracle** | The rule that decides pass/fail (expected status, value, invariant) |
| **Invariant** | Something that must always hold, e.g. `final = total − discount`, `price > 0` |
| **Schema validation** | Assert response *shape* (keys + types), not just one field |
| **SEC-01..07** | The SUT's 7 security requirements (secret storage, JWT, admin role, escape, parameterized SQL, no role mass-assign, OTP entropy) |
| **SQL injection (SEC-05)** | Malicious input breaking out of a SQL string; fixed by parameterized queries |
| **XSS (SEC-04)** | Script stored + rendered unescaped in a browser |
| **IDOR** | Insecure Direct Object Reference — accessing another user's data by changing an id |
| **Privilege escalation (SEC-06)** | A normal user gaining admin rights (your BUG-P2) |

---

## 10. Command cheat-sheet

```bash
# start SUT
cd hw4/eshop-sut/backend && node database.js && node server.js
# run tests
newman run collections/eshop-hw06.postman_collection.json -e collections/eshop-hw06.postman_environment.json
# regenerate collections
cd collections && node build_collection.js && node build_collection.js --fail
# repro a bug
curl -s -X POST localhost:3000/api/apply-coupon -H Content-Type:application/json \
  -d '{"code":"SAVE10","total_amount":500000,"user_id":2}'
# CI + issues
gh run list
gh issue list
```
