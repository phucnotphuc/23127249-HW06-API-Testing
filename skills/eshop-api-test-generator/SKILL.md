---
name: eshop-api-test-generator
description: >-
  Generate a reviewable API test suite from an EShop-style API specification.
  Drives an LLM through a staged pipeline (parse -> variables -> partitions ->
  rule packs -> scenarios -> oracles -> Postman emit -> self-check -> human audit)
  producing >=35 cases per endpoint covering domain partitions, state transitions,
  security (SEC-01..07), and schema validation, as a Postman collection + traceable
  Markdown. Use when: "generate API tests from this spec", "make a Postman suite for
  EShop", "test cases for endpoint X". Not for: browser UI flows; LLM-feature evals.
  Related: ai-test-generation, api-testing, ci-cd-integration, ai-bug-triage.
license: MIT
metadata:
  author: 23127249
  version: "1.0"
  category: ai-qa
---

## Objective
One generic prompt produces shallow, happy-path-biased tests. This skill forces the
structured intermediates (variable inventory, equivalence partitions, oracle
definitions) out of the model BEFORE any request/assertion is written, so the output
is traceable to the spec, covers negatives/security/state, and survives human audit.

## Inputs
- `spec` — the API specification (`api_specification.md` and/or OpenAPI YAML).
- `student_id` — injected as `X-Student-Id` on every request (course requirement).
- `endpoints` — subset to target (default: all mutating + all secured endpoints).
- `min_cases` — floor per endpoint (default 35).

## Pipeline (run in order — do not skip to emit)

1. **Parse endpoints.** For each: method, path, request body schema, auth requirement.
2. **Variable inventory.** Per parameter: `{type, rule, ordered?}`. Mark inferred rules.
3. **Partition.** Valid/invalid equivalence classes; for ordered vars add boundaries
   (min−1,min,min+1,max−1,max,max+1).
4. **Load rule packs** (`references/rule-packs.md`): Security (SEC-01..07 + IDOR),
   State (FR-10 machine + CRUD lifecycle + idempotency), Schema (required keys, types,
   secret deny-list, cross-field invariants).
5. **Synthesize scenarios.** happy × boundary × negative × security × schema × state.
   One representative per valid class; every invalid class isolated.
6. **Bind oracles SEPARATELY.** status + body value + invariant + secret-deny-list.
7. **Emit.** Postman request + `pm.test`; collection pre-request injects `X-Student-Id`.
8. **Self-check.** No duplicates; every parameter ≥1 valid + ≥1 invalid; ≥`min_cases`;
   loop to 5 on gaps.
9. **Human audit gate.** Label VALID / INVALID / INCOMPLETE, correct, extend ≥5. Never
   ship unreviewed.

## Guardrails
- Emit forbidden before stages 1–3 exist. If you jump to code, STOP and go back.
- Assert business outcomes, not implementation. Prefer specific values over truthiness.
- Every security pack item is a test even when the spec is silent about it.
- Verify against a live SUT: characterize actual behaviour; log spec-vs-actual gaps as bugs.

## Outputs
- `*.postman_collection.json` (+ environment), `*_TestCases.md` (spec-traceable),
  coverage summary, and an audit table.

## Done when
- Every targeted endpoint has ≥`min_cases` cases with ≥1 valid and ≥1 invalid per param.
- Security pack fully applied; schema deny-list asserted; state/lifecycle covered.
- Newman runs the collection green against the live SUT; spec-vs-actual gaps filed as bugs.
- Each case carries a human audit label.

## Reference files
- `references/rule-packs.md` — the reusable Security / State / Schema packs.
- `references/prompt-stages.md` — copy-paste LLM prompts for stages 1–9.
- `references/demo-script.md` — YouTube demo walkthrough (optional G9.5 bonus).
