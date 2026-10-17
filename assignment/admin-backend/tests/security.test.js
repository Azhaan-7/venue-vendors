const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const { createApp } = require("../dist/app");
const { AppDataSource } = require("../dist/data-source");
const { resolvers } = require("../dist/schema");

process.env.JWT_SECRET = "offline-test-session-secret-at-least-32-bytes";
const token = role => jwt.sign({ id: 1, role }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: 900 });
async function withServer(action) {
  const { app, server } = await createApp();
  const listener = await new Promise(resolve => { const value = app.listen(0, "127.0.0.1", () => resolve(value)); });
  try { await action(`http://127.0.0.1:${listener.address().port}/graphql`); }
  finally { await new Promise(resolve => listener.close(resolve)); await server.stop(); }
}
const post = (url, body, role = "admin", extraHeaders = {}) => fetch(url, { method: "POST", headers: {
  origin: "http://localhost:3002", "content-type": "application/json", cookie: `vv_session=${token(role)}`, ...extraHeaders,
}, body: JSON.stringify(body) });

test("admin data source cannot synchronize, migrate or log SQL automatically", async () => {
  for (const option of ["synchronize", "migrationsRun", "dropSchema", "logging"]) assert.equal(AppDataSource.options[option], false);
  assert.deepEqual(AppDataSource.options.options, { encrypt: true, trustServerCertificate: false });
  await assert.rejects(() => AppDataSource.initialize(), /forbidden/);
});

test("every root GraphQL resolver rejects anonymous and non-admin callers before database work", async () => {
  for (const group of [resolvers.Query, resolvers.Mutation]) {
    for (const resolver of Object.values(group)) {
      for (const user of [null, { id: 2, role: "hirer" }, { id: 3, role: "vendor" }]) {
        await assert.rejects(async () => resolver(null, {}, { user }), error => ["UNAUTHENTICATED", "FORBIDDEN"].includes(error.extensions?.code));
      }
    }
  }
});

test("GraphQL HTTP permits admin requests, blocks role bypasses and CSRF", async () => {
  await withServer(async url => {
    const ok = await post(url, { query: "{ status }" });
    assert.equal(ok.status, 200); assert.equal((await ok.json()).data.status, "Admin GraphQL backend is working");
    assert.equal(ok.headers.get("cache-control"), "no-store");
    for (const role of ["hirer", "vendor"]) {
      const denied = await post(url, { query: "{ status }" }, role);
      assert.equal(denied.status, 403);
      assert.equal((await denied.json()).errors[0].extensions.code, "FORBIDDEN");
    }
    const anonymous = await post(url, { query: "{ status }" }, "admin", { cookie: "" });
    assert.equal(anonymous.status, 401);
    assert.equal((await anonymous.json()).errors[0].extensions.code, "UNAUTHENTICATED");
    for (const origin of ["", "https://untrusted.example"]) {
      assert.equal((await post(url, { query: "mutation { deleteVenue(id: 1) }" }, "admin", { origin })).status, 403);
    }
  });
});

test("GraphQL rejects aliases, fragment expansion, multiple operations, batches, oversized JSON and invalid input", async () => {
  await withServer(async url => {
    for (const query of [
      `{ ${Array.from({ length: 101 }, (_, i) => `a${i}: status`).join(" ")} }`,
      "query A { status } query B { status }",
      `query { ${Array.from({ length: 101 }, () => "...Repeated").join(" ")} } fragment Repeated on Query { status }`,
      "mutation { deleteVenue(id: \"not-an-id\") }",
      "{ venues(limit: 201) { id } }",
    ]) {
      const result = await post(url, { query });
      assert.ok((await result.json()).errors?.length, query);
    }
    const batch = await post(url, [{ query: "{ status }" }, { query: "{ status }" }]);
    assert.equal(batch.status, 400);
    const large = await post(url, { query: "{ status }", variables: { text: "x".repeat(70000) } });
    assert.equal(large.status, 413);
  });
});

test("GraphQL masks database exceptions without SQL, parameters or stack traces", async () => {
  const original = AppDataSource.getRepository;
  AppDataSource.getRepository = () => ({ find: async () => { throw new Error("private database parameter"); } });
  try {
    await withServer(async url => {
      const response = await post(url, { query: "{ venues { id } }" });
      const body = await response.json();
      assert.equal(body.errors[0].message, "An internal error occurred");
      assert.equal(JSON.stringify(body).includes("private database parameter"), false);
      assert.equal(body.errors[0].extensions.stacktrace, undefined);
    });
  } finally { AppDataSource.getRepository = original; }
});

test("GraphQL rate limit returns HTTP 429 and ignores forged IP headers", async () => {
  process.env.RATE_LIMIT_MAX = "1";
  try {
    await withServer(async url => {
      assert.equal((await post(url, { query: "{ status }" })).status, 200);
      const denied = await post(url, { query: "{ status }" }, "admin", { "x-forwarded-for": "198.51.100.99" });
      assert.equal(denied.status, 429); assert.equal(denied.headers.has("retry-after"), true);
    });
  } finally { delete process.env.RATE_LIMIT_MAX; }
});
