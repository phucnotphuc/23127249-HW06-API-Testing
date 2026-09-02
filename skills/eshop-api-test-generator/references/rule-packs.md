# Reusable Rule Packs

Spec-independent knowledge the generator combines with each endpoint's partitions.
These are the reusable core — the same packs apply to any EShop-style API.

## Security pack (SEC-01–07 + IDOR)

| Rule | Test template | Oracle |
|------|---------------|--------|
| SEC-01 | GET a resource that carries secrets | response keys ∌ {password, reset_token} |
| SEC-02 | call a secured endpoint with **no** `Authorization` | 401 |
| SEC-02 | call with a malformed/garbage token | 403 |
| SEC-03 | call an admin endpoint with a valid **non-admin** token | 403 (role, not mere presence) |
| SEC-04 | store `<script>alert(1)</script>` in a text field | persisted literal; render escaped |
| SEC-05 | inject `' OR '1'='1` and `'; DROP TABLE x;--` in each string param | no extra rows; table intact |
| SEC-05 | UNION-based exfil `x' UNION SELECT ... --` | no foreign columns leaked |
| SEC-06 | include `role`/privileged field in an update body (mass-assignment) | field unchanged |
| IDOR | pass another user's id/owner in path or body | 403/404, not another user's data |

## State pack

- **CRUD lifecycle:** create → GET (present) → update → GET (changed) → delete → GET (404).
- **Idempotency:** repeat DELETE/PUT → same terminal state; 2nd delete not 200-success.
- **FR-10 order machine:** pending→confirmed→shipping→delivered; cancel allowed only
  before delivered; assert invalid transitions are rejected (400).
- **Not-found:** operations on a non-existent id → 404 (not 200 with empty/echo body).

## Schema pack

- **Required keys present** exactly as spec'd (e.g. coupon success:
  `{success,coupon_id,discount_amount,final_amount,message}`).
- **Types correct** — numbers are numbers across all ids (guards price-as-string drift).
- **Secret deny-list** — `password`, `reset_token`, raw SQL errors never in a 2xx body.
- **Cross-field invariants** — `final_amount == total_amount - discount_amount`;
  `0 <= discount_amount <= total_amount`; `price > 0` for any stored product.
- **Headers** — `content-type: application/json` on JSON endpoints.

## Domain-partition heuristics (per parameter type)

| Type | Valid classes | Invalid classes / boundaries |
|------|---------------|------------------------------|
| string(len 1..N) | 1 char, N chars, typical | empty, N+1 chars, wrong type |
| phone (0 + 10–11 digits) | 10, 11 digits starting 0 | 9, 12 digits; not-0 start; non-digit |
| money (>0 integer) | 1, typical, large | 0, negative, float, non-number, missing |
| enum | each allowed value | value outside set, empty, injection |
| id reference | existing id | non-existent id, non-numeric, missing |
