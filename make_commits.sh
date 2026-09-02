#!/usr/bin/env bash
# Create the per-step HW06 commits on a dedicated branch. Run from repo root (D:/23127249/QA).
# Review each step, then `git push -u origin hw06`.
set -euo pipefail
D=hw6/23127249_HW06_AI_API_XXX
git checkout -b hw06 2>/dev/null || git checkout hw06

c() { git add -A "$@"; shift; git commit -m "$1"; }  # not used; explicit below

git add "$D/collections/build_collection.js" "$D/README.md" ".github/workflows/hw06-newman.yml"
git commit -m "hw6: scaffold submission structure + newman tooling"

git add "$D/test-cases/API1_Profile_TestCases.md"
git commit -m "hw6(api1): profile test cases — generate + audit + 5 extensions"

git add "$D/test-cases/API2_Coupon_TestCases.md"
git commit -m "hw6(api2): coupon test cases — generate + audit + 5 extensions"

git add "$D/test-cases/API3_Product_TestCases.md" "$D/test-cases/testcases_index.csv"
git commit -m "hw6(api3): product CRUD test cases — generate + audit + 5 extensions"

git add "$D/collections"
git commit -m "hw6(exec): Postman collection + environment + data files"

git add "$D/reports"
git commit -m "hw6(exec): Newman green run + HTML report + test summary"

git add "$D/bugs"
git commit -m "hw6(bugs): 12-defect bug report + GitHub issue script"

git add "$D/diagrams" "$D/skills"
git commit -m "hw6(gen): AI test-generator design + reusable agent skill"

git add "$D/ci"
git commit -m "hw6(ci): newman all-pass run"
# NOTE: the failing run is the SECOND push after flipping COLLECTION in the workflow.

git add "$D/Main_Report.md" "$D/ai-audit" "$D/git_commit_log.txt"
git commit -m "hw6(docs): main report + AI audit + AI critique + git log"

echo "Done. Review with: git log --oneline -10"
