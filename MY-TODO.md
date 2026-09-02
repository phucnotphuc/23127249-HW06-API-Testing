# What YOU need to do — HW06

Everything below was produced by AI. Per assignment §2 you own correctness. Review, then submit.
Tick each box. Read `TOOL-GUIDE.md` first if any tool is unfamiliar.

Repo: https://github.com/phucnotphuc/23127249-HW06-API-Testing

---

## Part A — Review (do before submitting) ~45 min

### A1. Prove the tests really run (10 min) — do this first
```bash
cd D:/23127249/QA/hw4/eshop-sut/backend
node database.js
node server.js
```
New terminal:
```bash
cd D:/23127249/hw06-submission
newman run collections/eshop-hw06.postman_collection.json -e collections/eshop-hw06.postman_environment.json
```
- [ ] Output shows `41 assertions, 0 failed`.
- [ ] Console shows `X-Student-Id: 23127249` before requests.
- [ ] (optional) `newman run collections/eshop-hw06-FAIL.postman_collection.json -e collections/eshop-hw06.postman_environment.json` → exactly **1 failure** (C-03).

If this matches, the whole submission's evidence is genuine.

### A2. Spot-check 3 bugs yourself (10 min)
Open `bugs/BugReport.md`, run the `curl` for each and confirm with your own eyes:
- [ ] **BUG-P2** — role escalation (user becomes admin).
- [ ] **BUG-C1** — SAVE10 gives negative discount / final 5,000,000.
- [ ] **BUG-PR1** — create product with no token returns 200.

### A3. Read the test cases (15 min) — for the oral defense
`test-cases/API1_Profile_TestCases.md`, `API2_Coupon_TestCases.md`, `API3_Product_TestCases.md`.
- [ ] You can explain any case's purpose.
- [ ] The audit labels (VALID/INVALID/INCOMPLETE) make sense to you.
- [ ] You understand the 5 extension cases per API and *why AI missed them*.

### A4. Read + personalize the AI docs (10 min)
- [ ] `ai-audit/AI_Critique.md` (250 words) — reflects your real experience; edit wording to sound like you.
- [ ] `ai-audit/AI_Audit_Report.md` — tool/date/prompt log looks right.
- [ ] `README.md` — the test-summary numbers + self-assessed grade (currently **90**) are ones you accept.

---

## Part B — Must fix before submit

### B1. Redraw the diagram (anti-cheat §11) — REQUIRED
`diagrams/generator.png` is machine-rendered from AI-written Mermaid. The rule says the diagram
must be **self-drawn**.
- [ ] Redraw it yourself (draw.io, Excalidraw, or pen + photo) using `diagrams/generator-design.md`
      as the reference for the 9 stages. Save over `generator.png`.

### B2. Attach a screenshot to each GitHub Issue
13 Issues exist (#1–#13) but have no image.
- [ ] For at least the 3 Critical (#1, #2, #3): run the bug's `curl`, screenshot the terminal,
      drag the image into the Issue comment. (More is better.)

---

## Part C — Package + submit

### C1. Make PDFs (§14 needs MD **and** PDF)
No pandoc installed. Either install it (`winget install JohnMacFarlane.Pandoc`) then:
```bash
pandoc Main_Report.md -o Main_Report.pdf
pandoc ai-audit/AI_Audit_Report.md -o ai-audit/AI_Audit_Report.pdf
pandoc ai-audit/AI_Critique.md -o ai-audit/AI_Critique.pdf
```
…or just "Print → Save as PDF" from VS Code / a Markdown viewer.
- [ ] `Main_Report.pdf`, `AI_Audit_Report.pdf`, `AI_Critique.pdf` created.

### C2. (optional, +bonus) Record the demo video
- [ ] Follow `VIDEO-SCRIPT.md`, upload to YouTube (unlisted), paste the link into `README.md`.

### C3. Set grade + build the zip
- [ ] Decide your self-assessed grade (3 digits, e.g. 090).
- [ ] Rename folder / zip to `23127249_HW06_AI_API_<grade>.zip`.
- [ ] Zip must contain: Main report (MD+PDF), README, Postman collection + Newman HTML,
      CI/CD report + screenshots, Excel/CSV test cases + summary, generator diagram (self-drawn)
      + pseudocode, agent skill, bug report + issue screenshots, AI critique + audit (MD+PDF),
      git commit log, public repo link.

### C4. Submit to Moodle
- [ ] Upload the zip. Confirm the GitHub repo is **public** (it is) so graders can open it.

---

## Quick status (already done for you)
✅ 127 test cases (42/42/43) · ✅ Postman collection + Newman green (41/41) · ✅ 13 bugs + Issues #1–#13
· ✅ CI green + red runs · ✅ generator design + agent skill · ✅ Main report, AI audit, AI critique, README, git log
· ✅ CI/console/run screenshots.

**Your remaining work = B1 (redraw diagram), B2 (issue screenshots), C1 (PDFs), C3–C4 (zip + submit).**
