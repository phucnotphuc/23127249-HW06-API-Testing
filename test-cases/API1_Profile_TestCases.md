# API1 — FR-04 Personal Profile (Pool A)

**Endpoints:** `GET /api/users/me`, `PUT /api/users/me`
**Auth:** `Authorization: Bearer <JWT>` (SEC-02). Every request also carries `X-Student-Id: 23127249`.
**Method:** AI-driven staged generation (`ai-test-generation` skill: extract → risk → matrix → scenarios → oracles), then human audit + extension.
**Generator model:** claude-opus-4-8. **Spec source:** `api_specification.md` §2 + README FR-04 + SEC-01/02/05/06.

---

## Step 1 — Requirements & entity extraction

**Entity `user`:** `{id, name, email, password, role, login_attempts, locked_until, reset_token, shipping_address, phone}`.

**Business rules (from spec + README FR-04):**
- [REQ-1] Authenticated user may update **name**, **phone**, **shipping_address** of their **own** profile.
- [REQ-2] **phone** valid = starts with `0`, 10–11 digits, digits only.
- [REQ-3] **name** required, non-empty; **shipping_address** required, non-empty.
- [REQ-4] **email** is not editable via this endpoint.
- [REQ-5] User cannot change their own **role** (SEC-06).
- [REQ-6] Endpoint requires a valid JWT; else 401/403 (SEC-02).
- [REQ-7] `GET /api/users/me` returns the caller's profile; response must **not** expose `password` or `reset_token` (SEC-01).
- [IMP-1] Update should be partial-safe: omitting a field should not null out existing data. *(inferred — flag)*
- [IMP-2] Response shape of PUT is `{message}`; GET is the user object minus secrets. *(inferred from spec)*

## Step 2 — Risk analysis & invariants

| Risk | Likelihood | Impact | Source |
|------|-----------|--------|--------|
| Client sets `role:admin` in body → privilege escalation | High | Critical | SEC-06/REQ-5 |
| Secrets (`password`,`reset_token`) returned by GET | High | Critical | SEC-01/REQ-7 |
| No input validation → junk phone/empty name persisted | High | Medium | REQ-2/3 |
| SQL injection via string fields | Med | High | SEC-05 |
| Missing/invalid/expired token accepted | Med | Critical | SEC-02 |
| IDOR — editing another user's profile | Med | High | REQ-1 |

**Invariants:** a user's `role` never changes through this endpoint; `email` never changes here; secrets never leave the API; only the token's own row is mutated.

## Step 3 — Coverage matrix (requirement → scenario → priority → oracle)

Domain partitions taken over `name`, `phone`, `shipping_address`, `role`, `token`. Categories: Happy(H), Boundary(B), Negative(N), Security(S), Schema(SC), State(ST).

---

## Step 4+5 — Test cases (AI-generated, with oracles)

> Column **Expected** = correct behaviour per spec. Against the deliberately-buggy SUT some will fail — a failing case that maps to a real defect is a **found bug** (cross-ref `bugs/BugReport.md`).

| ID | Category | Precondition | Request | Input | Expected (oracle) |
|----|----------|--------------|---------|-------|-------------------|
| P-01 | H | user token | PUT /users/me | `{name:"Le Van A", phone:"0912345678", shipping_address:"12 Le Loi, Q1"}` | 200, `{message:"Profile updated"}`; GET reflects new values |
| P-02 | H | user token | GET /users/me | — | 200, body has id/name/email/role/phone/shipping_address |
| P-03 | SC | user token | GET /users/me | — | Response **excludes** `password` and `reset_token` (SEC-01) |
| P-04 | B | user token | PUT /users/me | phone `"0123456789"` (10 digits, min valid) | 200 accepted |
| P-05 | B | user token | PUT /users/me | phone `"01234567890"` (11 digits, max valid) | 200 accepted |
| P-06 | B | user token | PUT /users/me | phone `"012345678"` (9 digits, below min) | 400 validation error |
| P-07 | B | user token | PUT /users/me | phone `"012345678901"` (12 digits, above max) | 400 validation error |
| P-08 | N | user token | PUT /users/me | phone `"0912a45678"` (non-digit) | 400 validation error |
| P-09 | N | user token | PUT /users/me | phone `"9912345678"` (not starting 0) | 400 validation error |
| P-10 | N | user token | PUT /users/me | phone `""` (empty) | 400 or unchanged (not persisted as blank) |
| P-11 | B | user token | PUT /users/me | name = 1 char `"A"` | 200 accepted (min valid) |
| P-12 | B | user token | PUT /users/me | name = 255 chars | 200 accepted |
| P-13 | N | user token | PUT /users/me | name = `""` empty | 400 validation error |
| P-14 | N | user token | PUT /users/me | name missing key | 400 or partial-safe (IMP-1) |
| P-15 | N | user token | PUT /users/me | shipping_address = `""` | 400 validation error |
| P-16 | N | user token | PUT /users/me | shipping_address missing | partial-safe: prior address retained (IMP-1) |
| P-17 | H | user token | PUT /users/me | address with unicode `"Số 5, Ngõ 12, Hà Nội"` | 200 accepted, value preserved |
| P-18 | S | user token | PUT /users/me | `{role:"admin", name:"x", shipping_address:"y", phone:"0912345678"}` | 200 but role **unchanged** = "user" (SEC-06) |
| P-19 | S | user token | PUT /users/me | `{role:"admin"}` only | role stays "user"; GET confirms |
| P-20 | S | user token | GET /users/me after P-18 | — | `role == "user"` |
| P-21 | S | no header | PUT /users/me | valid body, no Authorization | 401 Unauthorized (SEC-02) |
| P-22 | S | bad token | PUT /users/me | `Authorization: Bearer xxx.yyy.zzz` | 403 Forbidden (SEC-02) |
| P-23 | S | expired/garbled token | GET /users/me | malformed JWT | 403 |
| P-24 | S | no header | GET /users/me | — | 401 |
| P-25 | S | user token | PUT /users/me | name = `Robert'); DROP TABLE users;--` | 200, no SQL executed; users table intact (SEC-05) |
| P-26 | S | user token | PUT /users/me | phone = `0' OR '1'='1` | rejected or stored literally; no injection (SEC-05) |
| P-27 | S | user token | PUT /users/me | name = `<script>alert(1)</script>` | stored escaped; GET returns literal, not executable (SEC-04) |
| P-28 | SC | user token | PUT /users/me | valid body | Response is JSON object, `content-type: application/json`, has `message` |
| P-29 | SC | user token | GET /users/me | — | `id` is number, `role` is string in enum {user,admin} |
| P-30 | ST | user token | PUT then GET | update phone to `0900000000` | GET shows exactly `0900000000` (write-read consistency) |
| P-31 | N | user token | PUT /users/me | body `{}` empty | 400 or partial-safe; existing data not wiped |
| P-32 | N | user token | PUT /users/me | phone as number `912345678` (wrong type) | 400 type validation |
| P-33 | N | user token | PUT /users/me | name as number `12345` | 400 type validation |
| P-34 | S | user A token | PUT /users/me | attempt to include `{id: 1}` (other user's id) | own row only updated; user 1 untouched (IDOR guard) |
| P-35 | H | user token | PUT /users/me | all three fields valid together | 200; GET reflects all three |
| P-36 | N | user token | PUT /users/me | phone `"00000000000"` (11 zeros) | accepted by format rule (edge) OR business-reject — document actual |
| P-37 | SC | user token | GET /users/me | — | `email` present and equals login email (not editable, REQ-4) |
| P-38 | N | user token | PUT /users/me | oversized name 10 000 chars | 400/413 (length guard) |

**38 AI-generated cases.**

---

## Step 6 — Human Audit (VALID / INVALID / INCOMPLETE)

Labelled after reviewing against the real spec **and** live SUT behaviour.

| ID | Label | Reasoning / correction |
|----|-------|------------------------|
| P-01,02,04,05,11,12,17,35 | **VALID** | Correct happy/boundary; oracle matches spec. |
| P-03 | **VALID** | Critical SEC-01 check; SUT fails it (leaks password) → real bug BUG-P1. |
| P-06–P-10, P-13, P-15, P-32, P-33, P-38 | **VALID but expected-to-fail** | Spec mandates validation; SUT has none → all surface BUG-P3 (no input validation). Kept as-is; they are correct negative tests. |
| P-18,19,20 | **VALID** | Core SEC-06 escalation test; SUT fails → BUG-P2 (critical). |
| P-21,24 | **VALID** | 401 confirmed on SUT (`authenticateToken` returns 401 when token null). |
| P-22,23 | **INCOMPLETE → corrected** | AI wrote "401"; SUT returns **403** for a present-but-invalid token (jwt.verify error path). Corrected expected to 403. |
| P-25,26,27 | **VALID** | SUT uses parameterized queries here so SQLi stored literally — good; P-27 XSS storage still worth asserting for SEC-04 at render layer. |
| P-14,16,31 | **INCOMPLETE → corrected** | IMP-1 (partial update) is inferred, not specified. SUT actually **nulls** omitted fields (query always sets name/address/phone). Corrected oracle to document actual destructive behaviour and flag as usability bug candidate BUG-P4. |
| P-28,29,37 | **VALID** | Schema oracles align with spec. |
| P-30 | **VALID** | Write-read consistency; passes on SUT. |
| P-34 | **INVALID → removed/reworked** | `PUT /users/me` derives id from token, never from body — body `id` is ignored, so the case as written can't demonstrate IDOR. Reworked into extension EX-P3 (true IDOR needs a second endpoint). |
| P-36 | **INCOMPLETE** | Ambiguous oracle ("document actual"). Split: format rule accepts 11 zeros; no business rule exists → mark expected 200, note weak spec. |

**Net after audit:** 37 effective cases (P-34 removed), 4 corrected.

---

## Step 7 — Human Extension (AI-missed cases)

Five cases the AI did not generate, with *why missed*.

| ID | Category | Request | Input | Expected | Why AI missed |
|----|----------|---------|-------|----------|---------------|
| EX-P1 | S (SEC-01) | GET /users/me | — | Assert response **JSON keys** contain no `password`/`reset_token`/`login_attempts` | AI wrote a positive schema check (P-03) but not a strict *deny-list* key assertion; models default to asserting presence, not absence. |
| EX-P2 | S (SEC-06) | PUT /users/me then login-less GET | escalate role, then hit an admin-only endpoint `GET /api/admin/users` with the *same* token | If escalation worked, admin route returns 200 → proves real privilege gain, not just a DB field flip | AI tested the field value, not the *exploit consequence*. End-to-end attack chains require domain reasoning the single-endpoint prompt lacked. |
| EX-P3 | S (IDOR) | GET /api/orders/:id with another user's order id | user B reads user A's order | 403/404 expected; SUT returns 200 (no ownership check) | The profile prompt was scoped to `/users/me`; IDOR lives on sibling endpoints. AI stayed inside the prompt's endpoint boundary. |
| EX-P4 | ST (destructive partial update) | PUT /users/me with only `{name:"X"}` after setting phone | phone should survive | SUT nulls phone+address → data loss | AI treated PUT as PATCH (common bias); missed that this server rebuilds the whole row. |
| EX-P5 | S (token reuse after role change) | Use an **old** token minted before a role change | old token still carries stale `role` claim (JWT not invalidated) | Document stateless-JWT staleness risk | Requires understanding JWT statelessness; beyond literal spec text. |

**Total API1: 37 audited + 5 extended = 42 test cases.**

## Postman feature mapping (this API)
Environment vars `{{baseUrl}}`,`{{userToken}}`,`{{studentId}}`; pre-request script injects `X-Student-Id` + refreshes token; `pm.test` schema check via `ajv`; data-driven run for phone partitions P-04..P-09 (CSV `profile_phone.csv`).
