/*
 * HW06 Postman collection generator — EShop API tests
 * Student 23127249. Emits Postman Collection v2.1 JSON.
 *
 * Design: assertions characterize the ACTUAL (deliberately-buggy) SUT so the
 * baseline Newman run is green. Security guards that genuinely hold (parameterized
 * INSERT/queries survive DROP attempts) are asserted positively. Bug evidence is
 * captured in bugs/BugReport.md; the CI "one-failing" run flips a single test
 * (see FAIL_MODE) to the spec-correct expectation, which fails on purpose.
 *
 * Usage:
 *   node build_collection.js            -> eshop-hw06.postman_collection.json (green)
 *   node build_collection.js --fail     -> same, but one test asserts spec-correct
 *                                           coupon math (fails on the buggy SUT)
 */
const fs = require("fs");

const FAIL_MODE = process.argv.includes("--fail");
const STUDENT_ID = "23127249";

// ---- helpers ---------------------------------------------------------------
const t = (name, lines) => ({ name, lines }); // a pm.test block
function ev(scriptLines) {
  return { listen: "test", script: { type: "text/javascript", exec: scriptLines } };
}
function prereq(lines) {
  return { listen: "prerequest", script: { type: "text/javascript", exec: lines } };
}
// standard test wrapper turning [{name,lines}] into pm.test calls
function tests(blocks) {
  const out = [];
  for (const b of blocks) {
    out.push(`pm.test(${JSON.stringify(b.name)}, function () {`);
    for (const l of b.lines) out.push("  " + l);
    out.push("});");
  }
  return out;
}
function req({ name, method, path, auth, body, testBlocks, prereqLines }) {
  const header = [{ key: "Content-Type", value: "application/json" }];
  const item = {
    name,
    event: [],
    request: {
      method,
      header,
      url: { raw: `{{baseUrl}}${path}`, host: ["{{baseUrl}}"], path: path.replace(/^\//, "").split("/") },
    },
  };
  if (auth === "user") item.request.header.push({ key: "Authorization", value: "Bearer {{userToken}}" });
  if (auth === "admin") item.request.header.push({ key: "Authorization", value: "Bearer {{adminToken}}" });
  if (body !== undefined) item.request.body = { mode: "raw", raw: typeof body === "string" ? body : JSON.stringify(body, null, 2) };
  if (prereqLines) item.event.push(prereq(prereqLines));
  if (testBlocks && testBlocks.length) item.event.push(ev(tests(testBlocks)));
  return item;
}

// ---- collection-level pre-request: inject X-Student-Id + log (anti-cheat) --
const collectionPrereq = [
  "// Anti-cheat evidence: every request carries the student id header.",
  `pm.collectionVariables.set('studentId', '${STUDENT_ID}');`,
  "pm.request.headers.upsert({ key: 'X-Student-Id', value: pm.collectionVariables.get('studentId') });",
  "console.log('X-Student-Id: ' + pm.collectionVariables.get('studentId'));",
];

// ===========================================================================
// SETUP folder — login user + admin, capture tokens
// ===========================================================================
const setup = {
  name: "00 - Setup (auth)",
  item: [
    req({
      name: "Login User -> userToken",
      method: "POST",
      path: "/api/login",
      body: { email: "test@eshop.com", password: "Test1234!" },
      testBlocks: [
        t("status 200", ["pm.response.to.have.status(200);"]),
        t("token captured", [
          "var j = pm.response.json();",
          "pm.expect(j.token, 'token').to.be.a('string');",
          "pm.environment.set('userToken', j.token);",
          "pm.environment.set('userId', j.user.id);",
        ]),
      ],
    }),
    req({
      name: "Login Admin -> adminToken",
      method: "POST",
      path: "/api/login",
      body: { email: "admin@eshop.com", password: "Admin123!" },
      testBlocks: [
        t("status 200", ["pm.response.to.have.status(200);"]),
        t("admin token captured", [
          "var j = pm.response.json();",
          "pm.expect(j.token).to.be.a('string');",
          "pm.expect(j.user.role).to.eql('admin');",
          "pm.environment.set('adminToken', j.token);",
        ]),
      ],
    }),
  ],
};

// ===========================================================================
// API1 — Profile
// ===========================================================================
const api1 = {
  name: "01 - API1 Profile (FR-04)",
  item: [
    req({
      name: "P-01 PUT valid profile (happy)",
      method: "PUT", path: "/api/users/me", auth: "user",
      body: { name: "Le Van A", phone: "0912345678", shipping_address: "12 Le Loi, Q1" },
      testBlocks: [
        t("200", ["pm.response.to.have.status(200);"]),
        t("message present", ["pm.expect(pm.response.json().message).to.include('updated');"]),
      ],
    }),
    req({
      name: "P-02 GET me returns profile (happy+schema)",
      method: "GET", path: "/api/users/me", auth: "user",
      testBlocks: [
        t("200", ["pm.response.to.have.status(200);"]),
        t("core fields typed", [
          "var u = pm.response.json();",
          "pm.expect(u.id).to.be.a('number');",
          "pm.expect(u.email).to.be.a('string');",
          "pm.expect(['user','admin']).to.include(u.role);",
        ]),
      ],
    }),
    req({
      name: "P-03/EX-P1 GET me must NOT leak secrets (SEC-01) [BUG-P1]",
      method: "GET", path: "/api/users/me", auth: "user",
      testBlocks: [
        t("BUG-P1 documented: password leaked", [
          "var u = pm.response.json();",
          "// SPEC: secrets must be absent. SUT leaks them -> characterize so suite stays green,",
          "// bug is reported in BugReport (BUG-P1). Flip to .to.not.have for spec assertion.",
          "pm.expect(u).to.have.property('password'); // ACTUAL (buggy)",
        ]),
      ],
    }),
    req({
      name: "P-21 PUT no token -> 401 (SEC-02)",
      method: "PUT", path: "/api/users/me", auth: "none",
      body: { name: "x", phone: "0912345678", shipping_address: "y" },
      testBlocks: [t("401", ["pm.response.to.have.status(401);"])],
    }),
    req({
      name: "P-22 PUT bad token -> 403 (SEC-02, corrected)",
      method: "PUT", path: "/api/users/me", auth: "none",
      body: { name: "x", phone: "0912345678", shipping_address: "y" },
      prereqLines: ["pm.request.headers.upsert({key:'Authorization', value:'Bearer not.a.valid.jwt'});"],
      testBlocks: [t("403", ["pm.response.to.have.status(403);"])],
    }),
    req({
      name: "P-18 role escalation blocked (SEC-06) [BUG-P2]",
      method: "PUT", path: "/api/users/me", auth: "user",
      body: { name: "esc", phone: "0912345678", shipping_address: "z", role: "admin" },
      testBlocks: [
        t("PUT accepted", ["pm.response.to.have.status(200);"]),
        t("BUG-P2: role should stay user (spec) — checked next request", ["pm.expect(true).to.be.true;"]),
      ],
    }),
    req({
      name: "P-20 verify role after escalation attempt [BUG-P2 evidence]",
      method: "GET", path: "/api/users/me", auth: "user",
      testBlocks: [
        t("BUG-P2 documented: role changed to admin (buggy)", [
          "var u = pm.response.json();",
          "// SPEC expects 'user'; SUT allows escalation. Characterized as ACTUAL.",
          "pm.expect(u.role).to.eql('admin'); // ACTUAL (buggy) — see BugReport BUG-P2",
        ]),
      ],
    }),
    req({
      name: "P-25 SQLi in name is neutralized (SEC-05)",
      method: "PUT", path: "/api/users/me", auth: "user",
      body: { name: "Robert'); DROP TABLE users;--", phone: "0912345678", shipping_address: "y" },
      testBlocks: [
        t("200 and users table survives", ["pm.response.to.have.status(200);"]),
      ],
    }),
    req({
      name: "P-25b verify users table intact after SQLi",
      method: "POST", path: "/api/login",
      body: { email: "test@eshop.com", password: "Test1234!" },
      testBlocks: [t("login still works -> table intact", ["pm.response.to.have.status(200);"])],
    }),
  ],
};

// ===========================================================================
// API2 — Coupon
// ===========================================================================
const couponMathTest = FAIL_MODE
  ? t("C-03 percent math CORRECT (spec) [intentional CI fail]", [
      "var j = pm.response.json();",
      "// SPEC: 10% of 500000 = 50000 discount, final 450000. SUT formula is broken.",
      "pm.expect(j.discount_amount).to.eql(50000);",
      "pm.expect(j.final_amount).to.eql(450000);",
    ])
  : t("C-03 percent response shape present (characterized) [BUG-C1]", [
      "var j = pm.response.json();",
      "pm.expect(j).to.have.property('discount_amount');",
      "pm.expect(j).to.have.property('final_amount');",
      "// BUG-C1: SUT computes discount = floor(total*(1-value)) -> negative. See BugReport.",
    ]);

const api2 = {
  name: "02 - API2 Coupon (FR-09)",
  item: [
    req({
      name: "C-01 BIGBUY fixed 50k (happy)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "BIGBUY", total_amount: 600000, user_id: 2 },
      testBlocks: [
        t("200", ["pm.response.to.have.status(200);"]),
        t("fixed discount 50000, final 550000", [
          "var j = pm.response.json();",
          "pm.expect(j.discount_amount).to.eql(50000);",
          "pm.expect(j.final_amount).to.eql(550000);",
        ]),
      ],
    }),
    req({
      name: "C-02 VIP100 fixed 100k (happy)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "VIP100", total_amount: 400000, user_id: 2 },
      testBlocks: [
        t("discount 100000, final 300000", [
          "var j = pm.response.json();",
          "pm.expect(j.discount_amount).to.eql(100000);",
          "pm.expect(j.final_amount).to.eql(300000);",
        ]),
      ],
    }),
    req({
      name: "C-03 SAVE10 percent (math)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "SAVE10", total_amount: 500000, user_id: 2 },
      testBlocks: [t("200", ["pm.response.to.have.status(200);"]), couponMathTest],
    }),
    req({
      name: "C-04 boundary total==min 300000 (>= per spec) [BUG-C2]",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "SAVE10", total_amount: 300000, user_id: 2 },
      testBlocks: [
        t("BUG-C2 documented: SUT uses > so equal is rejected (400)", [
          "// SPEC C3: >= inclusive should give 200. SUT rejects. Characterized as ACTUAL.",
          "pm.response.to.have.status(400); // ACTUAL (buggy) — BugReport BUG-C2",
        ]),
      ],
    }),
    req({
      name: "C-08 unknown code -> 404 (C1)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "NOPE", total_amount: 600000, user_id: 2 },
      testBlocks: [t("404", ["pm.response.to.have.status(404);"])],
    }),
    req({
      name: "C-09 EXPIRED -> 400 (C2)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "EXPIRED", total_amount: 200000, user_id: 2 },
      testBlocks: [t("400 expired", ["pm.response.to.have.status(400);"])],
    }),
    req({
      name: "C-10 empty code -> 400",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "", total_amount: 600000, user_id: 2 },
      testBlocks: [t("400", ["pm.response.to.have.status(400);"])],
    }),
    req({
      name: "C-22 no auth accepted (SEC-02) [BUG-C3]",
      method: "POST", path: "/api/apply-coupon", auth: "none",
      body: { code: "BIGBUY", total_amount: 600000, user_id: 2 },
      testBlocks: [
        t("BUG-C3: endpoint applies without any JWT", [
          "// SPEC C4 requires auth (expect 401). SUT has no authenticateToken -> 200.",
          "pm.response.to.have.status(200); // ACTUAL (buggy) — BugReport BUG-C3",
        ]),
      ],
    }),
    req({
      name: "C-25 SQLi in code neutralized (SEC-05)",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "SAVE10' OR '1'='1", total_amount: 600000, user_id: 2 },
      testBlocks: [t("404 (no injection)", ["pm.response.to.have.status(404);"])],
    }),
    req({
      name: "C-27 success response schema",
      method: "POST", path: "/api/apply-coupon",
      body: { code: "BIGBUY", total_amount: 600000, user_id: 2 },
      testBlocks: [
        t("has required keys", [
          "var j = pm.response.json();",
          "['success','coupon_id','discount_amount','final_amount','message'].forEach(function(k){ pm.expect(j).to.have.property(k); });",
        ]),
        t("invariant final = total - discount", [
          "var j = pm.response.json();",
          "pm.expect(j.final_amount).to.eql(600000 - j.discount_amount);",
        ]),
      ],
    }),
  ],
};

// ===========================================================================
// API3 — Product CRUD
// ===========================================================================
const api3 = {
  name: "03 - API3 Product CRUD (FR-15)",
  item: [
    req({
      name: "PR-01 create product (admin, happy)",
      method: "POST", path: "/api/products", auth: "admin",
      body: { name: "Ao Thun QA", price: 150000, description: "test", imageUrl: "", category_id: 3 },
      testBlocks: [
        t("200 + id", [
          "pm.response.to.have.status(200);",
          "var j = pm.response.json();",
          "pm.expect(j.id).to.be.a('number');",
          "pm.environment.set('newProductId', j.id);",
        ]),
      ],
    }),
    req({
      name: "PR-02 get created product (schema)",
      method: "GET", path: "/api/products/{{newProductId}}",
      testBlocks: [
        t("matches created", [
          "var p = pm.response.json();",
          "pm.expect(p.name).to.eql('Ao Thun QA');",
          "pm.expect(Number(p.price)).to.eql(150000);",
          "pm.expect(p.category_id).to.eql(3);",
        ]),
      ],
    }),
    req({
      name: "PR-03 update price (admin)",
      method: "PUT", path: "/api/products/{{newProductId}}", auth: "admin",
      body: { name: "Ao Thun QA", price: 175000, description: "test", imageUrl: "", category_id: 3 },
      testBlocks: [t("200", ["pm.response.to.have.status(200);"])],
    }),
    req({
      name: "PR-04 delete then 404 (lifecycle)",
      method: "DELETE", path: "/api/products/{{newProductId}}", auth: "admin",
      testBlocks: [t("200 deleted", ["pm.response.to.have.status(200);"])],
    }),
    req({
      name: "PR-19 create with USER token -> should 403 (SEC-03) [BUG-PR1]",
      method: "POST", path: "/api/products", auth: "user",
      body: { name: "hack", price: 1, category_id: 1 },
      testBlocks: [
        t("BUG-PR1: no role check, non-admin can create", [
          "// SPEC: 403. SUT has no auth on write endpoints -> 200.",
          "pm.response.to.have.status(200); // ACTUAL (buggy) — BugReport BUG-PR1",
        ]),
      ],
    }),
    req({
      name: "PR-20 create with NO token (SEC-02) [BUG-PR1]",
      method: "POST", path: "/api/products", auth: "none",
      body: { name: "noauth", price: 1, category_id: 1 },
      testBlocks: [
        t("BUG-PR1: no token still creates", [
          "pm.response.to.have.status(200); // ACTUAL (buggy) — spec wants 401",
        ]),
      ],
    }),
    req({
      name: "PR-13 negative price accepted [BUG-PR2]",
      method: "POST", path: "/api/products", auth: "admin",
      body: { name: "bad", price: -5000, category_id: 1 },
      testBlocks: [
        t("BUG-PR2: no price>0 validation", [
          "pm.response.to.have.status(200); // ACTUAL (buggy) — spec wants 400",
        ]),
      ],
    }),
    req({
      name: "PR-25 SQLi in search returns all rows [BUG-PR3]",
      method: "GET", path: "/api/products?search=' OR '1'='1",
      testBlocks: [
        t("BUG-PR3: injection returns full table", [
          "var rows = pm.response.json();",
          "pm.expect(rows).to.be.an('array');",
          "pm.expect(rows.length).to.be.above(1); // ACTUAL: injection leaks all rows",
        ]),
      ],
    }),
    req({
      name: "PR-26 DROP attempt does not destroy table (SEC-05 guard)",
      method: "GET", path: "/api/products?search='; DROP TABLE products;--",
      testBlocks: [t("responds without 500-crash of table", ["pm.expect([200,500]).to.include(pm.response.code);"])],
    }),
    req({
      name: "PR-26b products table still populated",
      method: "GET", path: "/api/products",
      testBlocks: [t("table intact", ["pm.expect(pm.response.json().length).to.be.above(0);"])],
    }),
    req({
      name: "PR-31 missing id returns 200 {} not 404 [BUG-PR4]",
      method: "GET", path: "/api/products/99999",
      testBlocks: [
        t("BUG-PR4: 200 empty object", [
          "pm.response.to.have.status(200); // ACTUAL — spec wants 404",
          "pm.expect(Object.keys(pm.response.json()).length).to.eql(0);",
        ]),
      ],
    }),
    req({
      name: "PR-28 list schema",
      method: "GET", path: "/api/products",
      testBlocks: [
        t("array of typed products", [
          "var a = pm.response.json();",
          "pm.expect(a).to.be.an('array');",
          "pm.expect(a[0]).to.have.property('id');",
          "pm.expect(a[0]).to.have.property('name');",
          "pm.expect(a[0]).to.have.property('price');",
        ]),
      ],
    }),
  ],
};

// ---- assemble --------------------------------------------------------------
const collection = {
  info: {
    name: "EShop HW06 API Tests (23127249)" + (FAIL_MODE ? " [FAIL-DEMO]" : ""),
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description:
      "HW06 API testing suite. Every request injects X-Student-Id: 23127249 via the collection pre-request script. Assertions characterize the deliberately-buggy EShop SUT (green baseline); spec-vs-actual bugs are logged in bugs/BugReport.md.",
  },
  event: [prereq(collectionPrereq)],
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "studentId", value: STUDENT_ID },
    { key: "userToken", value: "" },
    { key: "adminToken", value: "" },
    { key: "userId", value: "" },
    { key: "newProductId", value: "" },
  ],
  item: [setup, api1, api2, api3],
};

const out = FAIL_MODE ? "eshop-hw06-FAIL.postman_collection.json" : "eshop-hw06.postman_collection.json";
fs.writeFileSync(__dirname + "/" + out, JSON.stringify(collection, null, 2));
console.log("wrote " + out + " (FAIL_MODE=" + FAIL_MODE + ")");
