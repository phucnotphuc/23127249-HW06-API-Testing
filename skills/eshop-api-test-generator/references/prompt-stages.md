# Copy-paste LLM prompts (stages 1–9)

Feed the spec once, then run these in order. Keep each stage's output; it is the audit trail.

**Stage 1 — Parse.**
> From the attached API specification, list every endpoint as a table:
> `id | method | path | body params | auth required? | admin only?`. Do not invent endpoints.

**Stage 2 — Variables.**
> For endpoint {id}, list each request parameter as `name | type | rule | ordered(yes/no) | source(spec/inferred)`. Flag every inferred rule.

**Stage 3 — Partitions.**
> Partition each parameter into valid and invalid equivalence classes. For ordered params add boundary values (min−1,min,min+1,max−1,max,max+1). Output `param | class-id | kind(valid/invalid) | representative value`.

**Stage 4 — Rule packs.** (load `rule-packs.md`; no prompt needed)

**Stage 5 — Scenarios.**
> Combine the partitions with the Security/State/Schema packs into scenarios for {id}. Categories: happy, boundary, negative, security, schema, state. One representative per valid class; isolate each invalid class. Output Given/When/Then + category. Target ≥35.

**Stage 6 — Oracles (separate).**
> For each scenario, define the oracle WITHOUT changing the scenario: expected status, expected body values, one invariant, and a secret deny-list assertion. Do not weaken to truthiness.

**Stage 7 — Emit.**
> Render each scenario+oracle as a Postman v2.1 request with a `pm.test` block. The collection pre-request must inject header `X-Student-Id: {student_id}` and `console.log` it. Use env vars for tokens.

**Stage 8 — Self-check.**
> Verify: no duplicate scenarios; every parameter has ≥1 valid and ≥1 invalid case; total ≥35. List gaps; if any, return to Stage 5 for those params only.

**Stage 9 — Audit.**
> Label each case VALID / INVALID / INCOMPLETE with one-line reasoning against the live SUT behaviour. Correct INVALID/INCOMPLETE. Then add ≥5 human cases the model missed, each with a "why missed" note.
