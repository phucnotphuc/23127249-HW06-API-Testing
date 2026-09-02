# API3 — FR-15 Product CRUD (Pool C, Admin)

**Endpoints:** `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id`, `GET /api/products`, `GET /api/products/:id`.
**Auth (spec/FR-12):** create/update/delete require valid JWT with `role=admin` (SEC-02, SEC-03). Every request carries `X-Student-Id: 23127249`.
**Generator model:** claude-opus-4-8. **Spec:** api_specification §3 + HW02 FR-15 + SEC-02/03/04/05.

---

## Step 1 — Requirements & entities

**Entity `product`:** `{id, name, price(INTEGER), description, imageUrl, category_id}`. Seeded ids 1–5. Categories 1=Điện thoại,2=Laptop,3=Phụ kiện.

**Rules (FR-15):**
- [REQ-1] name required, 1–255 chars.
- [REQ-2] price required, number **> 0**.
- [REQ-3] category_id required, must exist in categories.
- [REQ-4] editing one product changes only that product.
- [REQ-5] create/update/delete require admin JWT (SEC-02 token, SEC-03 role).
- [REQ-6] CRUD lifecycle: create→GET returns it→delete→GET returns 404.
- [SEC-04] name/description rendered escaped (no stored XSS execution).
- [SEC-05] search param parameterized (no SQLi).

## Step 2 — Risk & invariants

| Risk | L | I | Source |
|------|---|---|--------|
| Write endpoints missing auth → anyone CRUD (SEC-02/03) | High | Critical | REQ-5 |
| Negative/zero price accepted | High | Med | REQ-2 |
| Empty/too-long name accepted | High | Med | REQ-1 |
| Non-existent category_id accepted (no FK) | Med | Med | REQ-3 |
| SQLi in `?search=` (string concat) | High | High | SEC-05 |
| Stored XSS in name/description | Med | High | SEC-04 |
| GET missing id returns 200 `{}` not 404 | Med | Low | REQ-6 |
| price type drift (returned as string for even id) | Med | Low | schema |

**Invariants:** `price > 0` for any stored product; a mutating call requires admin; deleting id X leaves other rows unchanged; response schema stable across ids.

## Step 3 — Coverage matrix
Partitions over `name` (empty/1/255/256/xss/sqli), `price` (>0 / 0 / negative / non-number / huge / float), `category_id` (valid/nonexistent/missing/injection), `auth` (admin/user/none/bad), `:id` (existing/missing/non-numeric), `search` (normal/injection).

---

## Step 4+5 — Test cases (AI-generated + oracles)

| ID | Cat | Request | Input | Expected (oracle) |
|----|-----|---------|-------|-------------------|
| PR-01 | H | POST /products | admin, `{name:"Áo Thun",price:150000,category_id:3}` | 200 `{message:"Product created",id}` |
| PR-02 | H | GET /products/:id | id from PR-01 | 200, body matches created values |
| PR-03 | H | PUT /products/:id | admin, change price 150000→175000 | 200; GET shows 175000 |
| PR-04 | H | DELETE /products/:id | admin | 200; subsequent GET → 404 |
| PR-05 | ST | full lifecycle | create→get→update→delete→get | last GET 404 (REQ-6) |
| PR-06 | B | POST | name = 255 chars, price 1, category 1 | 200 accepted |
| PR-07 | B | POST | name = 1 char | 200 accepted |
| PR-08 | N | POST | name = `""` | 400 validation |
| PR-09 | N | POST | name = 256 chars | 400 length error |
| PR-10 | N | POST | missing name | 400 |
| PR-11 | B | POST | price = 1 (min positive) | 200 |
| PR-12 | N | POST | price = 0 | 400 (must be >0) |
| PR-13 | N | POST | price = -5000 | 400 (must be >0) |
| PR-14 | N | POST | price = `"abc"` | 400 type error |
| PR-15 | N | POST | missing price | 400 |
| PR-16 | N | POST | price = 99.99 (float; col is INTEGER) | 400 or coerced; document |
| PR-17 | N | POST | category_id = 9999 (nonexistent) | 400 FK/validation error |
| PR-18 | N | POST | missing category_id | 400 |
| PR-19 | S | POST | **user** token (not admin) | 403 (SEC-03) |
| PR-20 | S | POST | **no** Authorization header | 401 (SEC-02) |
| PR-21 | S | POST | bad token `Bearer xyz` | 403 |
| PR-22 | S | PUT /products/1 | no token | 401 |
| PR-23 | S | DELETE /products/1 | user token | 403 (SEC-03) |
| PR-24 | S | DELETE /products/1 | no token | 401 |
| PR-25 | S (SEC-05) | GET /products?search=`' OR '1'='1` | no injection; returns filtered/empty, not all rows |
| PR-26 | S (SEC-05) | GET /products?search=`'; DROP TABLE products;--` | products table intact afterwards |
| PR-27 | S (SEC-04) | POST | name = `<script>alert(1)</script>`, admin | stored; GET returns literal string, flagged for escape at render (SEC-04) |
| PR-28 | SC | GET /products | — | array; each item has id,name,price,category_id |
| PR-29 | SC | GET /products/:id | odd id | `price` is number type |
| PR-30 | SC | GET /products/:id | even id | `price` should be number (SUT returns string → schema bug) |
| PR-31 | N | GET /products/:id | id 99999 (missing) | 404 (SUT returns 200 `{}` → bug) |
| PR-32 | N | GET /products/:id | id = `abc` (non-numeric) | 400/404 |
| PR-33 | REQ-4 | PUT /products/2 | change name | product 3 unchanged (isolation) |
| PR-34 | H | GET /products?search=`iPhone` | — | returns iPhone row only |
| PR-35 | SC | POST response | — | `content-type: application/json`, has numeric `id` |
| PR-36 | N | PUT /products/99999 | admin, valid body | 404 (no such product) — SUT returns 200 message anyway; document |
| PR-37 | N | POST | extra unknown field `{foo:"bar",...valid}` | 200, unknown field ignored |
| PR-38 | S | POST | name SQLi `Robert');DROP TABLE products;--` | table intact (parameterized INSERT) |

**38 AI-generated cases.**

---

## Step 6 — Human Audit

| ID | Label | Reasoning / correction |
|----|-------|------------------------|
| PR-01,02,03,04,05,06,07,11,33,34,35,37 | **VALID** | Happy/boundary/lifecycle correct; pass on SUT. |
| PR-08,09,10,12,13,14,15,17,18 | **VALID, expected-to-fail** | SUT has **no input validation** → all accepted → **BUG-PR2** (negative/zero price, empty name, bad category). Oracles stay spec-correct (400). |
| PR-16 | **INCOMPLETE → corrected** | SQLite INTEGER col stores 99.99 as-is (dynamic typing) → returns 99.99. Oracle: document actual (no coercion, no reject) → minor bug. |
| PR-19,20,21,22,23,24 | **VALID, expected-to-fail** | Write endpoints have **no `authenticateToken`** → **BUG-PR1** (critical SEC-02/03). AI correctly demanded 401/403; SUT returns 200. |
| PR-25,26 | **VALID** | **BUG-PR3**: `?search=` string-concatenated → SQLi; PR-25 `' OR '1'='1'` returns all rows (fails the "no injection" oracle). PR-26 DROP is blocked because `db.all` runs a single statement (SQLite `db.all` won't run 2 stmts) — table survives; kept as regression proof. |
| PR-27 | **VALID** | Stored XSS payload persists; SEC-04 is a render-layer concern — oracle documents storage + flags. |
| PR-28,29,35 | **VALID** | Schema oracles correct. |
| PR-30 | **VALID** | **BUG-PR5**: even-id returns `price` as string (`row.price.toString()`). Correct oracle = number; SUT fails. |
| PR-31 | **VALID** | **BUG-PR4**: missing id returns 200 `{}` not 404. |
| PR-32 | **INCOMPLETE → corrected** | `:id = abc` → `WHERE id = 'abc'` → no row → SUT returns 200 `{}` (same bug path as PR-31). Oracle updated: expected 404, actual 200 `{}`. |
| PR-36 | **INCOMPLETE → corrected** | SUT `UPDATE ... WHERE id=99999` affects 0 rows but still returns `{message:"Product updated"}` 200. Oracle: expected 404, actual 200 → **BUG-PR6** (no affected-row check). |
| PR-38 | **VALID** | Parameterized INSERT → safe; good guard. |

**Net:** 38 cases, 3 corrected.

---

## Step 7 — Human Extension (AI-missed)

| ID | Cat | Input | Expected | Why AI missed |
|----|-----|-------|----------|---------------|
| EX-PR1 | SEC-03 (broken auth model) | POST /products with a **valid user token** carrying `role:user` | Must 403; proves SEC-03 (role, not mere token presence) — distinct from SEC-02 no-token | AI collapsed "auth" into one 401 case; missed the token-present-but-wrong-role dimension the spec explicitly separates. |
| EX-PR2 | SEC-05 blind SQLi | GET /products?search=`x' UNION SELECT password,email,3,4,5,6 FROM users--` | Must NOT leak user data; SUT concat query may expose columns | AI tested tautology injection only; data-exfiltration UNION requires attacker reasoning about column count. |
| EX-PR3 | Data integrity | DELETE /products/1 then GET /products | list length = original-1, other ids intact | AI tested single-object delete, not the collection-level invariant (no orphan/side effect). |
| EX-PR4 | Idempotency | DELETE same id twice | 2nd DELETE should be 404/no-op; SUT returns 200 both times | AI never tests repeat-calls; idempotency is an anti-pattern flagged in api-testing skill, not in spec text. |
| EX-PR5 | Mass-assign / negative-price persistence chain | POST price:-999 then GET /products | negative-priced product visible to buyers → business impact | AI validated the input in isolation; missed that the accepted bad record pollutes the public catalogue (consequence chain). |

**Total API3: 38 audited + 5 extended = 43 test cases.**

## Postman features (this API)
Admin-login pre-request to mint `{{adminToken}}`; CRUD chained requests passing `{{newProductId}}` via `pm.collectionVariables.set`; data-driven price/name partitions from `product_cases.csv`; `ajv` schema validation; negative-auth folder reusing env tokens.

---

## Suite totals
| API | Generated | After audit | Extended | **Total** |
|-----|-----------|-------------|----------|-----------|
| API1 Profile | 38 | 37 | 5 | **42** |
| API2 Coupon | 37 | 37 | 5 | **42** |
| API3 Product | 38 | 38 | 5 | **43** |
| **All** | **113** | **112** | **15** | **127** |
