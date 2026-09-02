# AI-Driven API Test Generator — Design (G9.5 Create)

> **Anti-AI-cheat note (§11):** the *design decisions* below (stage boundaries, the rule
> packs, the self-check loop, the human-audit gate) are the student's. `generator.mmd`
> is a Mermaid rendering of that design — a diagramming tool, not an AI-authored picture.
> Before submission, **redraw or verify** this diagram yourself and export `generator.png`
> so it is demonstrably self-drawn.

## Goal
Given the EShop API specification, automatically produce a reviewable test suite
(≥35 cases/endpoint) covering domain partitions, state transitions, security
(SEC-01–07), and schema validation — as Postman requests with `pm.test` oracles —
then hand off to a mandatory human audit.

## Why staged (not one prompt)
A single "generate all tests" prompt yields plausible-but-shallow cases: happy-path
bias, missing negative/security classes, hallucinated endpoints, and assertions that
assert nothing. Forcing structured intermediates (variables → partitions → scenarios →
oracles) makes each stage checkable and keeps generation grounded in the spec. This
mirrors the `ai-test-generation` skill's seven-step pipeline.

## Pipeline (matches `generator.mmd`)

1. **Parse endpoints** — from the spec: method, path, body schema, auth requirement.
2. **Extract variables** — per parameter: type, constraint rule, and whether the domain
   is ordered (enables boundary analysis) or unordered (enables class analysis).
3. **Partition domains** — split each variable into valid / invalid equivalence classes
   and derive boundary values for ordered domains (min−1, min, min+1, max−1, max, max+1).
4. **Load rule packs** — reusable, spec-independent knowledge:
   - **Security pack:** SEC-01 secret leakage, SEC-02 missing JWT, SEC-03 role check,
     SEC-04 stored XSS, SEC-05 SQLi payloads, SEC-06 mass-assignment (`role`), IDOR.
   - **State pack:** the FR-10 order machine + generic CRUD lifecycle (create→read→
     update→delete→404), idempotency.
   - **Schema pack:** required keys present, types correct, deny-list of secret keys,
     cross-field invariants.
5. **Scenario synthesis** — Cartesian-combine partitions with the rule packs into
   candidate scenarios across categories {happy, boundary, negative, security, schema,
   state}. One valid representative per class; every invalid class gets its own case.
6. **Oracle binding** — *separately* attach oracles to each scenario: expected status,
   expected body value, an invariant (e.g. `0 ≤ discount ≤ total`), and a deny-list
   assertion for secrets. Separating "what" (5) from "how to verify" (6) prevents
   assertion-biased scenarios.
7. **Emit cases** — render each scenario+oracle as a Postman request + `pm.test` block,
   injecting the `X-Student-Id` header.
8. **Self-check** — reject duplicates, assert every parameter has ≥1 valid + ≥1 invalid
   case, and enforce the ≥35 floor; loop back to 5 on gaps.
9. **Human audit gate** — label each case VALID / INVALID / INCOMPLETE, correct, extend.
   The generator never ships unreviewed output.

## Pseudocode

```python
def generate_suite(spec_path, student_id, min_cases=35):
    spec       = parse_spec(spec_path)              # (1)
    rule_packs = load_rule_packs()                  # (4) SEC + state + schema
    suite = {}

    for ep in spec.endpoints:                       # (1) per endpoint
        vars_ = extract_variables(ep)               # (2) type, rule, ordered?
        partitions = {v.name: partition(v) for v in vars_}   # (3) classes + boundaries

        scenarios = []
        # positive: one representative from each valid class
        scenarios += happy_and_boundary(ep, partitions)      # (5)
        # negative: each invalid class in isolation
        scenarios += negative(ep, partitions)                # (5)
        # security + state: driven by reusable packs, not the spec text
        scenarios += apply_pack(ep, rule_packs.security)     # (5) SEC-01..07, IDOR
        scenarios += apply_pack(ep, rule_packs.state)        # (5) lifecycle/transitions
        scenarios += schema_cases(ep, rule_packs.schema)     # (5)

        cases = []
        for sc in scenarios:
            oracle = bind_oracle(sc, rule_packs.schema)      # (6) status+value+invariant+denylist
            cases.append(to_postman(ep, sc, oracle, student_id))  # (7) inject X-Student-Id

        cases = self_check(cases, partitions, min_cases)     # (8) dedup, coverage, >=35 (loops to 5)
        suite[ep.id] = cases

    return audit_gate(suite)                         # (9) VALID/INVALID/INCOMPLETE -> human

def bind_oracle(sc, schema_pack):
    o = Oracle(status=sc.expected_status)
    o.body      = sc.expected_body_values
    o.invariant = schema_pack.invariants_for(sc.endpoint)   # e.g. final == total - discount
    o.denylist  = schema_pack.secret_keys                   # password, reset_token
    return o
```

## Inputs / outputs
- **In:** `api_specification.md` (+ optional OpenAPI YAML), `student_id`, `min_cases`.
- **Out:** `*.postman_collection.json`, `*_TestCases.md` (traceable to spec), coverage report.

## Reuse as an Agent Skill
Implemented under `skills/eshop-api-test-generator/`. The rule packs are the reusable
core — point the skill at any EShop-style spec and it re-runs stages 1–9.

## Demo video (optional, G9.5 bonus)
Script in `skills/eshop-api-test-generator/references/demo-script.md`; record it
generating the coupon suite end-to-end, upload to YouTube, paste link in README.
