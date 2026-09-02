# HW06 — Bug Report (EShop API)

**Student:** 23127249 · **SUT:** EShop backend @ `http://localhost:3000` (seed `node database.js`).
All requests below also send `X-Student-Id: 23127249`. Severity: Critical > High > Medium > Low.
Each bug lists the Newman test that evidences it. Screenshots → attach on GitHub Issues (links in table at end).

Seed creds: user `test@eshop.com`/`Test1234!`, admin `admin@eshop.com`/`Admin123!`.
Get a token: `TOK=$(curl -s -X POST localhost:3000/api/login -H Content-Type:application/json -d '{"email":"test@eshop.com","password":"Test1234!"}' | jq -r .token)`

---

## API1 — Profile (`/api/users/me`)

### BUG-P2 — Privilege escalation via profile update (Critical, SEC-06)
- **Endpoint:** `PUT /api/users/me`
- **Expected:** `role` is not client-editable; a normal user stays `role=user`.
- **Actual:** Sending `{"role":"admin", ...}` promotes the caller to admin.
- **Repro:**
  ```bash
  curl -s -X PUT localhost:3000/api/users/me -H "Authorization: Bearer $TOK" \
    -H Content-Type:application/json -H X-Student-Id:23127249 \
    -d '{"name":"e","phone":"0912345678","shipping_address":"z","role":"admin"}'
  curl -s localhost:3000/api/users/me -H "Authorization: Bearer $TOK" | jq .role   # -> "admin"
  ```
- **Root cause:** `server.js` PUT handler appends `role = ?` to the UPDATE whenever `role` is truthy (lines 124–127).
- **Evidence test:** `P-18` / `P-20`.

### BUG-P1 — Secrets leaked in responses (High, SEC-01)
- **Endpoint:** `GET /api/users/me`, also `POST /api/login`.
- **Expected:** response never contains `password` or `reset_token`.
- **Actual:** `SELECT *` returns full row incl. plaintext `password` and `reset_token`.
- **Repro:** `curl -s localhost:3000/api/users/me -H "Authorization: Bearer $TOK" | jq 'has("password")'` → `true`.
- **Root cause:** `SELECT * FROM users` returned verbatim (line 113); login returns `user` object as-is (line 52).
- **Evidence test:** `P-03/EX-P1`.

### BUG-P3 — No input validation on profile fields (Medium)
- **Expected:** `phone` starts `0`, 10–11 digits; `name`/`address` non-empty.
- **Actual:** any value accepted — `phone:"999"`, empty `name`, 10 000-char name all persist.
- **Repro:** `curl -X PUT .../users/me -d '{"name":"","phone":"abc","shipping_address":""}'` → `200 Profile updated`.
- **Evidence tests:** documented cases P-06…P-10, P-13, P-32, P-33, P-38.

### BUG-P4 — PUT is destructive, not partial (Low/usability)
- **Expected (inferred):** omitting a field leaves it unchanged.
- **Actual:** handler always sets `name,shipping_address,phone`; omitted keys become `NULL`, wiping data.
- **Evidence:** EX-P4.

---

## API2 — Coupon (`/api/apply-coupon`)

### BUG-C1 — Percent discount formula inverted (Critical, logic)
- **Expected:** percent → `discount = total * value / 100`. `SAVE10` on 500 000 ⇒ discount 50 000, final 450 000.
- **Actual:** `discount = floor(total * (1 - value))` (line 399) ⇒ `500000*(1-10) = -4 500 000`; final **5 000 000** (10× the price).
- **Repro:**
  ```bash
  curl -s -X POST localhost:3000/api/apply-coupon -H Content-Type:application/json \
    -H X-Student-Id:23127249 -d '{"code":"SAVE10","total_amount":500000,"user_id":2}'
  # {"discount_amount":-4500000,"final_amount":5000000,...}
  ```
- **Impact:** breaks every percent coupon; invariant `0 ≤ discount ≤ total` violated.
- **Evidence test:** `C-03` (FAIL collection asserts spec value and fails).

### BUG-C3 — Coupon apply requires no authentication (High, SEC-02)
- **Expected:** endpoint requires a valid JWT (C4).
- **Actual:** `POST /api/apply-coupon` has no `authenticateToken`; anonymous callers get discounts.
- **Repro:** call with **no** `Authorization` header → `200` success.
- **Evidence test:** `C-22`.

### BUG-C4 — IDOR / usage-limit bypass via body `user_id` (High)
- **Expected:** per-user usage counted against the authenticated identity.
- **Actual:** `user_id` is read from the request body; a caller can pass any/other user's id, or omit it to skip the usage check entirely (`if (user_id)` guard, line 386).
- **Repro:** omit `user_id` → max-uses never enforced; or pass a victim's id to burn their quota.
- **Evidence:** EX-C3 / documented C-23, C-24.

### BUG-C2 — Minimum-order boundary uses `>` instead of `>=` (Medium)
- **Expected (C3):** `total_amount >= min_order_amount` qualifies.
- **Actual:** `if (total_amount > coupon.min_order_amount)` (line 379); an order exactly at the threshold is rejected.
- **Repro:** `SAVE10`, `total_amount:300000` (min 300 000) → `400 chưa đủ giá trị tối thiểu`.
- **Evidence test:** `C-04`.

---

## API3 — Product CRUD (`/api/products`)

### BUG-PR1 — Write endpoints have no auth/role check (Critical, SEC-02/SEC-03)
- **Expected:** create/update/delete require a valid admin JWT.
- **Actual:** `POST/PUT/DELETE /api/products` have no middleware — anonymous or normal-user callers succeed.
- **Repro:** `curl -X POST localhost:3000/api/products -H Content-Type:application/json -H X-Student-Id:23127249 -d '{"name":"x","price":1,"category_id":1}'` (no token) → `200 Product created`.
- **Evidence tests:** `PR-19` (user token), `PR-20` (no token).

### BUG-PR3 — SQL injection in product search (High, SEC-05)
- **Endpoint:** `GET /api/products?search=`
- **Expected:** parameterized query; injection treated as literal.
- **Actual:** `SELECT * FROM products WHERE name LIKE '%${searchQuery}%'` (line 144) — raw string concat.
- **Repro:** `curl "localhost:3000/api/products?search=' OR '1'='1"` → returns **all** rows regardless of name. Error path also reflects raw `err.message` into HTML (info leak).
- **Evidence test:** `PR-25`.

### BUG-PR2 — No field validation (Medium)
- **Expected:** `price > 0`; `name` 1–255; `category_id` must exist.
- **Actual:** negative/zero price, empty name, and non-existent `category_id` all accepted.
- **Repro:** `POST /api/products {"name":"bad","price":-5000,"category_id":9999}` → `200`.
- **Evidence test:** `PR-13`.

### BUG-PR4 — Wrong not-found handling (Low)
- **Actual:** `GET /api/products/99999` → `200 {}` (should be 404); `PUT /api/products/99999` → `200 Product updated` though 0 rows changed (BUG-PR6).
- **Evidence tests:** `PR-31`; documented PR-36.

### BUG-PR5 — Price type drift in response (Low, schema)
- **Actual:** `GET /api/products/:id` returns `price` as a **string** when `id` is even (`row.price.toString()`, line 162); number otherwise. Breaks schema consumers.
- **Evidence:** documented PR-30.

---

## Summary & GitHub Issues

| ID | API | Severity | SEC | Newman test | GitHub Issue |
|----|-----|----------|-----|-------------|--------------|
| BUG-P2 | Profile | Critical | SEC-06 | P-18/P-20 | [#1](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/1) |
| BUG-C1 | Coupon | Critical | — | C-03 | [#2](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/2) |
| BUG-PR1 | Product | Critical | SEC-02/03 | PR-19/PR-20 | [#3](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/3) |
| BUG-P1 | Profile | High | SEC-01 | P-03 | [#4](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/4) |
| BUG-C3 | Coupon | High | SEC-02 | C-22 | [#5](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/5) |
| BUG-C4 | Coupon | High | — | EX-C3 | [#6](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/6) |
| BUG-PR3 | Product | High | SEC-05 | PR-25 | [#7](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/7) |
| BUG-P3 | Profile | Medium | — | P-06.. | [#8](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/8) |
| BUG-C2 | Coupon | Medium | — | C-04 | [#9](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/9) |
| BUG-PR2 | Product | Medium | — | PR-13 | [#10](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/10) |
| BUG-P4 | Profile | Low | — | EX-P4 | [#11](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/11) |
| BUG-PR4 | Product | Low | — | PR-31 | [#12](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/12) |
| BUG-PR5 | Product | Low | schema | PR-30 | [#13](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues/13) |

**13 distinct defects** (3 Critical, 4 High, 3 Medium, 3 Low) — all filed as GitHub Issues [#1–#13](https://github.com/phucnotphuc/23127249-HW06-API-Testing/issues). Attach a screenshot to each issue.
