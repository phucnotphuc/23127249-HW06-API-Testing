# API2 — FR-09 Apply Coupon (Pool B)

**Endpoint:** `POST /api/apply-coupon` (support: `GET /api/coupons`, `POST/DELETE /api/admin/coupons` for state setup).
**Auth:** spec implies logged-in (C4), but SUT endpoint has **no** `authenticateToken`. Every request carries `X-Student-Id: 23127249`.
**Generator model:** claude-opus-4-8. **Spec:** api_specification §5 + HW02 FR-09 rules + SEC-02/05.

---

## Step 1 — Requirements & entities

**Seeded coupons:** `SAVE10` percent 10, min 300000, exp 2099; `BIGBUY` fixed 50000, min 500000; `VIP100` fixed 100000, min 300000, max_uses 2; `EXPIRED` percent 20, min 100000, exp 2020.

**Business rules (5 conditions, all must hold):**
- [C1] code exists and `is_active=1`, else 404.
- [C2] not expired: now < `expired_at`, else 400.
- [C3] `total_amount >= min_order_amount` (**>=**, inclusive), else 400.
- [C4] user authenticated (JWT). *(spec)*
- [C5] user's prior uses `< max_uses_per_user`, else 400.
- **Formula:** percent → `discount = total * value/100`; fixed → `discount = value`; `final = total - discount`.
- Response: `{success, coupon_id, discount_amount, final_amount, message}`.

## Step 2 — Risk & invariants

| Risk | L | I | Source |
|------|---|---|--------|
| Percent formula wrong (`1-value` instead of `value/100`) | High | Critical | formula |
| Boundary `>` vs `>=` at min_order | High | Med | C3 |
| No auth on endpoint (SEC-02) | High | High | C4 |
| IDOR: `user_id` from body lets caller spoof usage of any user | High | High | C4/C5 |
| SQLi in `code` | Med | High | SEC-05 |
| Negative/zero/oversized `total_amount` | Med | Med | domain |
| `discount_amount > total` → negative final | Med | High | formula |

**Invariants:** `0 <= discount_amount <= total_amount`; `final_amount = total_amount - discount_amount`; `final_amount >= 0`; expired/inactive/unknown codes never discount.

## Step 3 — Coverage matrix
Partitions over `code` (exists/inactive/unknown/injection/empty), `total_amount` (<min / ==min / >min / 0 / negative / huge / non-number), `user_id` (valid / other / missing / injection), coupon `type` (percent/fixed), `expired_at`, `max_uses`.

---

## Step 4+5 — Test cases (AI-generated + oracles)

| ID | Cat | Request body | Expected (oracle) |
|----|-----|--------------|-------------------|
| C-01 | H | `{code:"BIGBUY",total_amount:600000,user_id:2}` | 200, discount 50000, final 550000 |
| C-02 | H | `{code:"VIP100",total_amount:400000,user_id:2}` | 200, discount 100000, final 300000 |
| C-03 | H | `{code:"SAVE10",total_amount:500000,user_id:2}` | 200, discount **50000**, final **450000** (percent 10%) |
| C-04 | B (C3) | `{code:"SAVE10",total_amount:300000,user_id:2}` | 200 (== min, inclusive per spec); discount 30000 |
| C-05 | B (C3) | `{code:"SAVE10",total_amount:299999,user_id:2}` | 400 below-min error |
| C-06 | B (C3) | `{code:"SAVE10",total_amount:300001,user_id:2}` | 200 applied |
| C-07 | B (C3) | `{code:"BIGBUY",total_amount:500000,user_id:2}` | 200 (== min 500000, inclusive) |
| C-08 | N (C1) | `{code:"NOPE",total_amount:600000,user_id:2}` | 404 code not found |
| C-09 | N (C2) | `{code:"EXPIRED",total_amount:200000,user_id:2}` | 400 expired |
| C-10 | N (C1) | `{code:"",total_amount:600000,user_id:2}` | 400 "please enter code" |
| C-11 | N (C1) | missing `code` key | 400 |
| C-12 | N | `{code:"save10",...}` lowercase | 404 if case-sensitive; document actual |
| C-13 | B | `{code:"SAVE10",total_amount:0,user_id:2}` | 400 (below min / invalid) |
| C-14 | N | `{code:"SAVE10",total_amount:-100000,user_id:2}` | 400 invalid amount (must be >0) |
| C-15 | N | `{code:"SAVE10",total_amount:"abc",user_id:2}` | 400 type error |
| C-16 | N | missing `total_amount` | 400 |
| C-17 | B | `{code:"SAVE10",total_amount:999999999,user_id:2}` | 200, discount = 10% = 99999999 |
| C-18 | H (C5) | first use `{code:"SAVE10",...,user_id:2}` | 200 (0 prior uses < 1) |
| C-19 | N (C5) | after recording 1 usage of SAVE10 for user 2 | 400 usage-limit reached |
| C-20 | H (C5) | VIP100 second use (max 2) | 200 (1 < 2) |
| C-21 | N (C5) | VIP100 third use | 400 limit reached |
| C-22 | S (SEC-02) | valid body, **no** Authorization header | Per C4 should be 401; document SUT (accepts, no auth) |
| C-23 | S (IDOR) | `{code:"SAVE10",total_amount:600000,user_id:9999}` | should reject/ignore foreign user_id; SUT trusts body → IDOR |
| C-24 | S (IDOR) | omit `user_id` entirely | usage check skipped → unlimited applies (bug path) |
| C-25 | S (SEC-05) | `{code:"SAVE10' OR '1'='1",total_amount:600000,user_id:2}` | 404 (no injection); coupons table safe |
| C-26 | S (SEC-05) | `{code:"'; DROP TABLE coupons;--",...}` | 404; table intact |
| C-27 | SC | C-01 response | keys exactly `{success,coupon_id,discount_amount,final_amount,message}` |
| C-28 | SC | C-01 response | `discount_amount` is number, `final_amount` number, `final_amount = total - discount` |
| C-29 | SC | C-03 (percent) | invariant `0 <= discount <= total` holds |
| C-30 | SC | any success | `content-type: application/json`, status 200 |
| C-31 | ST | admin creates inactive coupon then apply | is_active=0 → 404 (C1) |
| C-32 | ST | admin creates coupon exp yesterday, apply | 400 expired (C2) |
| C-33 | N | `{code:"BIGBUY",total_amount:400000,user_id:2}` (below its 500k min) | 400 below-min |
| C-34 | B | `{code:"VIP100",total_amount:300000,user_id:2}` (==min 300k) | 200 inclusive |
| C-35 | N | `{code:123,total_amount:600000,user_id:2}` (code wrong type) | 404/400 |
| C-36 | S | `{code:"SAVE10",total_amount:600000,user_id:"2 OR 1=1"}` | no injection in usage query; safe |
| C-37 | SC | fixed coupon BIGBUY | `discount_amount == 50000` exactly (no percent math) |

**37 AI-generated cases.**

---

## Step 6 — Human Audit

| ID | Label | Reasoning / correction |
|----|-------|------------------------|
| C-01,02,07,18,20,33,37 | **VALID** | Match spec + SUT (fixed coupons compute correctly). |
| C-03,17,29 | **VALID, expected-to-fail** | Percent formula on SUT is `floor(total*(1-value))` → **BUG-C1** (huge negative discount). Correct oracle keeps spec value (10% ⇒ 50000). |
| C-04,34 | **VALID, expected-to-fail** | Spec C3 is `>=`; SUT uses `>` → equal-to-min rejected → **BUG-C2**. Oracle stays spec-correct (200). |
| C-05,06,33 | **VALID** | Below/above min behave per SUT `>`; pass. |
| C-08,09,10,11 | **VALID** | 404/400 confirmed on SUT. |
| C-12 | **INCOMPLETE → corrected** | "document actual": SUT `code = ?` is case-sensitive in SQLite default → lowercase yields 404. Oracle fixed to 404. |
| C-13,14,15,16 | **VALID, expected-to-fail** | No amount validation on SUT; `total_amount:0` → below-min path gives 400 anyway (0 < 300000), so C-13 passes; C-14 negative: `-100000 > 300000` false → 400 (passes by luck); C-15 `"abc" > n` → NaN comparison false → 400. Reasoning documented; kept. |
| C-19,21 | **INCOMPLETE → corrected** | Depend on `POST /api/coupon-usage` seeding a usage row first (requires user token). Added explicit precondition step; without it they don't isolate C5. |
| C-22 | **VALID (SEC finding)** | Spec C4 requires auth; SUT omits `authenticateToken` on apply-coupon → **BUG-C3** (SEC-02). Oracle: expected 401, actual 200. |
| C-23,24 | **VALID (SEC finding)** | `user_id` trusted from body → IDOR / usage-bypass **BUG-C4**. |
| C-25,26,36 | **VALID** | Parameterized queries → injections safe; good regression guards. |
| C-27,28,30 | **VALID** | Schema oracles correct. |
| C-31,32 | **VALID** | Need admin token to create coupons; precondition noted. |
| C-35 | **INCOMPLETE → corrected** | `code:123` — SQLite compares int to text column → 404. Oracle set to 404. |

**Net:** 37 cases, 4 corrected, 0 removed.

---

## Step 7 — Human Extension (AI-missed)

| ID | Cat | Input | Expected | Why AI missed |
|----|-----|-------|----------|---------------|
| EX-C1 | Invariant | `{code:"SAVE10",total_amount:100,user_id:2}` but forcing past min via BIGBUY-like | Assert `final_amount >= 0` and `discount <= total` as a **cross-case invariant** | AI wrote per-case value checks, never a universal invariant guard that catches the negative-discount class of bugs generically. |
| EX-C2 | SEC-02 chain | Apply coupon with no token, then compare to spec C4 | Prove the missing-auth is exploitable (anonymous discount) | AI asserted status only; missed that *absence* of a required control is itself a test. |
| EX-C3 | IDOR usage-drain | user A repeatedly applies passing `user_id` of user B | B's usage limit consumed / A bypasses own limit | Requires reasoning about *who owns the counter* — multi-actor logic outside single-request prompt. |
| EX-C4 | Rounding/precision | percent on `total_amount:333333` | discount = floor(33333.3)=33333; assert integer, no float leak | AI ignored rounding semantics of `Math.floor`; precision edge cases need explicit prompting. |
| EX-C5 | State: reactivate | admin deletes then recreates same code | old `coupon_usage` rows may still bind old id → limit inconsistency | Lifecycle/state coupling across admin CRUD + usage table; AI stayed within apply endpoint. |

**Total API2: 37 audited + 5 extended = 42 test cases.**

## Postman features (this API)
Data-driven Collection Runner over `coupon_cases.csv` (code,total_amount,user_id,expectedStatus,expectedDiscount); env `{{userToken}}` for usage seeding; `pm.test` invariant block reused across requests (`0<=discount<=total`, `final=total-discount`).
