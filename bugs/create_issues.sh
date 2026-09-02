#!/usr/bin/env bash
# Create GitHub Issues for the 3 Critical bugs (extend as needed).
# Prereq: `gh auth login` and run inside the repo that hosts this submission.
# Usage: bash create_issues.sh
set -euo pipefail

mk() { gh issue create --title "$1" --label bug --body "$2"; }

mk "[BUG-P2][Critical][SEC-06] Privilege escalation via PUT /api/users/me" \
'**Severity:** Critical (SEC-06)
**Endpoint:** PUT /api/users/me

**Steps to reproduce**
1. Login as a normal user (test@eshop.com/Test1234!).
2. `PUT /api/users/me` with body `{"name":"e","phone":"0912345678","shipping_address":"z","role":"admin"}` + header `X-Student-Id: 23127249`.
3. `GET /api/users/me` -> `role` is now `admin`.

**Expected:** role is not client-editable; user stays `user`.
**Actual:** caller becomes admin.
**Root cause:** UPDATE appends `role=?` when body.role is truthy (server.js:124-127).
_Attach console screenshot showing X-Student-Id header._'

mk "[BUG-C1][Critical] Percent coupon formula inverted (negative discount)" \
'**Severity:** Critical
**Endpoint:** POST /api/apply-coupon

**Steps to reproduce**
1. `POST /api/apply-coupon` body `{"code":"SAVE10","total_amount":500000,"user_id":2}`.
2. Response: `discount_amount:-4500000, final_amount:5000000`.

**Expected:** 10% of 500000 = discount 50000, final 450000.
**Actual:** final is 10x the price; invariant 0<=discount<=total violated.
**Root cause:** `discount = floor(total*(1-value))` (server.js:399) instead of `total*value/100`.
_Attach Newman failure screenshot (C-03)._'

mk "[BUG-PR1][Critical][SEC-02/03] Product write endpoints lack auth/role check" \
'**Severity:** Critical (SEC-02, SEC-03)
**Endpoints:** POST/PUT/DELETE /api/products

**Steps to reproduce**
1. `POST /api/products` with NO Authorization header, body `{"name":"x","price":1,"category_id":1}` + `X-Student-Id: 23127249`.
2. Response `200 Product created`.

**Expected:** 401 without token, 403 without admin role.
**Actual:** anyone can create/update/delete products.
**Root cause:** handlers omit authenticateToken + role check (server.js:167,179,191).
_Attach screenshot._'

echo "Created Critical issues. Add High/Medium similarly, then paste #numbers into BugReport.md."
