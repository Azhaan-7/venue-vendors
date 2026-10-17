const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const { createApp } = require("../dist/app");
const { AppDataSource } = require("../dist/data-source");
const { ProfileController } = require("../dist/controller/ProfileController");
const { HirerDocumentController } = require("../dist/controller/HirerDocumentController");
const { UserController } = require("../dist/controller/UserController");
const { createSessionToken } = require("../dist/auth/session");
const { inspectDocument } = require("../dist/security/documents");
const { eventInputError, venueInputError } = require("../dist/security/input");
const { rateLimit } = require("../dist/security/http");

process.env.JWT_SECRET = "offline-test-session-secret-at-least-32-bytes";

function recorder() {
  return { statusCode: 200, body: null, headers: {}, status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; },
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; } };
}
async function listen(app, action) {
  const server = await new Promise(resolve => { const listener = app.listen(0, "127.0.0.1", () => resolve(listener)); });
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test("database metadata is safe and both data-source import and app import are offline", async () => {
  assert.equal(AppDataSource.isInitialized, false);
  for (const option of ["synchronize", "migrationsRun", "dropSchema", "logging"]) assert.equal(AppDataSource.options[option], false);
  assert.deepEqual(AppDataSource.options.options, { encrypt: true, trustServerCertificate: false });
  await assert.rejects(() => AppDataSource.initialize(), /forbidden/);
});

test("profile updates preserve server reputation and default it only for a new profile", async () => {
  const controller = new ProfileController();
  for (const existing of [{ userId: 1, creditabilityScore: 1.5 }, null]) {
    controller.profileRepository = { findOne: async () => existing, create: data => ({ creditabilityScore: 0, ...data }), save: async data => data };
    const res = recorder();
    await controller.update({ params: { id: "1" }, body: { name: "Sample", phoneNumber: "0400000000", isBusiness: false, credibilityScore: 5, creditabilityScore: 5 } }, res);
    assert.equal(res.body.creditabilityScore, existing ? 1.5 : 0);
  }
});

test("legacy or malformed stored passwords fail with a generic 401", async () => {
  const controller = new UserController();
  for (const password of ["legacy-format-unknown", "$argon2id$invalid"]) {
    controller.userRepository = { findOne: async () => ({ id: 1, password, role: "hirer" }) };
    const res = recorder();
    await controller.signIn({ body: { email: "sample@example.test", password: "Sample1!" } }, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid email or password");
  }
});

test("strict document inspection rejects spoofed MIME, invalid Base64, empty and oversized content", () => {
  const pdf = { documentType: "businessRegistration", fileName: "sample.pdf", mimeType: "application/pdf", fileData: Buffer.from("%PDF-1.7\nSample\n%%EOF\n").toString("base64") };
  assert.equal(inspectDocument(pdf).mimeType, "application/pdf");
  const jpg = { documentType: "driverLicense", fileName: "sample.jpg", mimeType: "image/jpeg", fileData: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]).toString("base64") };
  assert.equal(inspectDocument(jpg).bytes.length, 6);
  const fullSize = Buffer.alloc(2 * 1024 * 1024);
  fullSize.set([0xff, 0xd8, 0xff]); fullSize.set([0xff, 0xd9], fullSize.length - 2);
  assert.equal(inspectDocument({ ...jpg, fileData: fullSize.toString("base64") }).bytes.length, fullSize.length);
  for (const invalid of [{ ...pdf, fileData: "!!!!" }, { ...pdf, fileData: "" }, { ...pdf, fileData: Buffer.from("<script>sample</script>").toString("base64") },
    { ...pdf, fileData: "a".repeat(3 * 1024 * 1024) }, { ...pdf, mimeType: "text/html" }, { ...pdf, fileName: "../sample.pdf" }, { ...jpg, fileData: pdf.fileData }]) {
    assert.throws(() => inspectDocument(invalid));
  }
});

test("document upload and list responses contain metadata only; downloads are owner-authorized", async () => {
  const controller = new HirerDocumentController();
  const document = { id: 2, documentType: "businessRegistration", fileName: "sample.pdf", mimeType: "application/pdf", fileData: Buffer.from("%PDF-1.7\nSample\n%%EOF\n").toString("base64") };
  controller.userRepository = { findOne: async () => ({ id: 1 }) };
  controller.documentRepository = { findOne: async () => document, find: async options => { assert.equal(options.select.fileData, undefined); return [document]; }, save: async data => data };
  const request = { params: { id: "1", documentType: "businessRegistration" }, authUser: { id: 1, role: "hirer" }, body: document };
  const uploaded = recorder(); await controller.upload(request, uploaded);
  assert.equal(uploaded.body.fileData, undefined);
  const listed = recorder(); await controller.getByHirer(request, listed);
  assert.equal(listed.body[0].fileData, undefined);
  assert.match(listed.body[0].downloadUrl, /\/content$/);
  const denied = recorder(); await controller.download({ ...request, authUser: { id: 3, role: "hirer" } }, denied);
  assert.equal(denied.statusCode, 403);
  const downloaded = recorder(); await controller.download(request, downloaded);
  assert.equal(downloaded.headers["cache-control"], "no-store");
  assert.match(downloaded.headers["content-disposition"], /^attachment/);
  assert.equal(Buffer.isBuffer(downloaded.body), true);
});

test("rate counters expire and capacity exhaustion fails closed without evicting active counters", () => {
  let time = 0;
  const limit = rateLimit({ limit: 1, windowMs: 1000, maxKeys: 1, now: () => time });
  let passed = 0;
  limit({ ip: "one" }, recorder(), () => passed++);
  const blocked = recorder(); limit({ ip: "one" }, blocked, () => assert.fail());
  assert.equal(blocked.statusCode, 429); assert.equal(blocked.headers["retry-after"], "1");
  const full = recorder(); limit({ ip: "two" }, full, () => assert.fail()); assert.equal(full.statusCode, 429);
  time = 1001; limit({ ip: "two" }, recorder(), () => passed++); assert.equal(passed, 2);
});

test("REST rejects CSRF, invalid sessions, oversized bodies and unsafe input; legitimate requests succeed", async () => {
  await listen(createApp(), async url => {
    assert.equal((await fetch(`${url}/healthz`)).status, 200);
    for (const origin of [undefined, "https://untrusted.example"]) {
      const res = await fetch(`${url}/api/auth/signout`, { method: "POST", headers: origin ? { origin } : {} });
      assert.equal(res.status, 403);
    }
    assert.equal((await fetch(`${url}/api/auth/signout`, { method: "POST", headers: { origin: "http://localhost:3000" } })).status, 204);
    for (const cookie of ["vv_session=%E0%A4%A", "vv_session=invalid", `vv_session=${jwt.sign({ id: 1, role: "hirer" }, process.env.JWT_SECRET)}`]) {
      const res = await fetch(`${url}/api/auth/me`, { headers: { cookie } }); assert.equal(res.status, 401);
    }
    const malformed = await fetch(`${url}/api/auth/signin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400);
    const invalid = await fetch(`${url}/api/auth/signin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ email: {}, password: [] }) });
    assert.equal(invalid.status, 400);
    const oversized = await fetch(`${url}/api/auth/signin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: JSON.stringify({ text: "x".repeat(70000) }) });
    assert.equal(oversized.status, 413);
    const noOwner = await fetch(`${url}/api/profile/2`, { method: "PUT", headers: { origin: "http://localhost:3000", cookie: `vv_session=${createSessionToken({ id: 1, role: "hirer" })}` } });
    assert.equal(noOwner.status, 403);
    assert.equal((await fetch(`${url}/api/venues?limit=201`)).status, 400);
  });
});

test("resource routes reject anonymous reads and cross-owner or wrong-role writes", async () => {
  await listen(createApp(), async url => {
    for (const path of ["/hire-history", "/profile/2", "/hirer-documents/2", "/hirer-documents/2/driverLicense/content", "/applications/hirer/2"]) {
      assert.equal((await fetch(`${url}/api${path}`)).status, 401, path);
    }
    const headers = { origin: "http://localhost:3000", cookie: `vv_session=${createSessionToken({ id: 1, role: "hirer" })}` };
    for (const [method, path] of [["POST", "/hirer-documents/2"], ["DELETE", "/hirer-documents/2/driverLicense"],
      ["PUT", "/application-drafts/2"], ["DELETE", "/application-drafts/2"], ["POST", "/venues"], ["POST", "/blocked-periods"]]) {
      assert.equal((await fetch(`${url}/api${path}`, { method, headers })).status, 403, path);
    }
  });
});

test("forged forwarding headers cannot escape REST throttling; auth has a stricter limit", async () => {
  const old = { ...process.env };
  try {
    process.env.RATE_LIMIT_MAX = "2";
    await listen(createApp(), async url => {
      for (let i = 0; i < 3; i++) {
        const res = await fetch(`${url}/api/auth/me`, { headers: { "x-forwarded-for": `198.51.100.${i + 1}` } });
        assert.equal(res.status, i === 2 ? 429 : 401);
        if (i === 2) assert.equal(res.headers.has("retry-after"), true);
      }
    });
    process.env.RATE_LIMIT_MAX = "120"; process.env.AUTH_RATE_LIMIT_MAX = "1";
    await listen(createApp(), async url => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${url}/api/auth/signin`, { method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" }, body: "{}" });
        assert.equal(res.status, i ? 429 : 400);
      }
    });
  } finally { process.env = old; }
});

test("origin-validated logout clears its cookie after public limits are exhausted", async () => {
  process.env.RATE_LIMIT_MAX = "1";
  try {
    await listen(createApp(), async url => {
      await fetch(`${url}/api/auth/me`);
      assert.equal((await fetch(`${url}/api/auth/me`)).status, 429);
      const denied = await fetch(`${url}/api/auth/signout`, { method: "POST", headers: { origin: "https://untrusted.example" } });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.has("set-cookie"), false);
      const signedOut = await fetch(`${url}/api/auth/signout`, { method: "POST", headers: { origin: "http://localhost:3000" } });
      assert.equal(signedOut.status, 204);
      assert.match(signedOut.headers.get("set-cookie"), /Max-Age=0/);
    });
  } finally { delete process.env.RATE_LIMIT_MAX; }
});

test("vendor application responses retain complete preference order and exclude unrelated applications", async () => {
  const { ApplicationController } = require("../dist/controller/ApplicationController");
  const controller = new ApplicationController();
  const own = { id: 11, vendor: { id: 7 } }, other = { id: 22, vendor: { id: 8 } };
  const fixture = { id: 31, hirer: { id: 1, email: "sample@example.test" }, comments: [], applicationVenues: [{ rankOrder: 2, venue: own }, { rankOrder: 1, venue: other }] };
  const eligible = { select() { return this; }, innerJoin() { return this; }, where() { return this; }, getQuery: () => "SELECT eligible.id FROM application eligible", getParameters: () => ({ vendorId: 7 }) };
  const query = { where(sql) { assert.match(sql, /application.id IN/); return this; }, setParameters(params) { assert.equal(params.vendorId, 7); return this; }, setFindOptions(options) { assert.equal(options.where, undefined, "loading must not filter the preference join"); return this; }, getMany: async () => [fixture, { ...fixture, id: 32, applicationVenues: [{ rankOrder: 1, venue: other }] }] };
  controller.applicationRepository = { createQueryBuilder: alias => alias === "eligible" ? eligible : query };
  const res = recorder();
  await controller.getVendorApplications({ params: { vendorId: "7" }, query: {} }, res);
  assert.deepEqual(res.body.map(application => application.id), [31]);
  assert.deepEqual(res.body[0].venues, [22, 11]);
});

test("event and venue validation bounds database work before writes", () => {
  const event = { eventName: "Sample", date: "2026-10-20", time: "12:00", guests: 10, duration: 2 };
  assert.equal(eventInputError(event, [1, 2]), undefined);
  assert.ok(eventInputError({ ...event, date: "2026-02-30" }, [1]));
  assert.ok(eventInputError(event, [1, "1"]));
  assert.ok(eventInputError(event, Array.from({ length: 11 }, (_, i) => i + 1)));
  assert.ok(venueInputError({ name: {}, suitabilities: ["x".repeat(51)] }));
});

test("venue and blocked-period mutations deny other vendors before writing", async () => {
  const { VenueController } = require("../dist/controller/VenueController");
  const { BlockedPeriodController } = require("../dist/controller/BlockedPeriodController");
  const venue = new VenueController();
  venue.venueRepository = { findOne: async () => ({ id: 1, vendor: { id: 2 } }), save: () => assert.fail("unauthorized write") };
  const body = { name: "Sample", location: "Sample", description: "Sample", image: "/images/v1.jpg", capacity: 10, price: 10 };
  const originalTransaction = AppDataSource.transaction;
  AppDataSource.transaction = callback => callback({ getRepository: () => venue.venueRepository });
  try {
  for (const method of ["updateVenue", "deleteVenue"]) {
    const res = recorder();
    await venue[method]({ params: { id: "1" }, authUser: { id: 3, role: "vendor" }, body }, res);
    assert.equal(res.statusCode, 403);
  }
  } finally { AppDataSource.transaction = originalTransaction; }
  const blocked = new BlockedPeriodController();
  blocked.venueRepository = venue.venueRepository;
  blocked.blockedPeriodRepository = { findOne: async () => ({ venue: { vendor: { id: 2 } } }), remove: () => assert.fail("unauthorized write") };
  const created = recorder();
  await blocked.create({ authUser: { id: 3 }, body: { venueId: 1, startDate: "2026-10-20", endDate: "2026-10-21", reason: "Sample" } }, created);
  assert.equal(created.statusCode, 403);
  const removed = recorder();
  await blocked.remove({ params: { id: "1" }, authUser: { id: 3 } }, removed);
  assert.equal(removed.statusCode, 403);
});

test("vendor access requires a related application; existing decisions cannot be overwritten", async () => {
  const { ApplicationController } = require("../dist/controller/ApplicationController");
  const { ProfileController } = require("../dist/controller/ProfileController");
  const original = AppDataSource.getRepository;
  const originalTransaction = AppDataSource.transaction;
  AppDataSource.transaction = callback => callback({ getRepository: entity => AppDataSource.getRepository(entity) });
  let related = false;
  const query = { innerJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getCount: async () => related ? 1 : 0 };
  AppDataSource.getRepository = () => ({ createQueryBuilder: () => query,
    findOne: async () => ({ id: 1, status: "approved" }), update: () => assert.fail("decided application must not be written") });
  try {
    const application = new ApplicationController();
    const profile = new ProfileController();
    const doc = new HirerDocumentController();
    const request = { params: { id: "1" }, authUser: { id: 2, role: "vendor" }, body: { venueId: 1 } };
    for (const method of ["approveApplication", "rejectApplication", "updateComment"]) {
      const res = recorder();
      await application[method]({ ...request, body: { ...request.body, commentText: "Sample" } }, res);
      assert.equal(res.statusCode, 403);
    }
    for (const [controller, method] of [[profile, "getProfile"], [doc, "getByHirer"], [doc, "download"]]) {
      const res = recorder();
      await controller[method]({ ...request, params: { id: "1", documentType: "driverLicense" } }, res);
      assert.equal(res.statusCode, 403);
    }
    related = true;
    const res = recorder();
    await application.rejectApplication(request, res);
    assert.equal(res.statusCode, 409);
  } finally { AppDataSource.getRepository = original; AppDataSource.transaction = originalTransaction; }
});

test("MSSQL metadata compiles scoped, paginated history and vendor queries without a connection", async () => {
  const { HireHistory } = require("../dist/entity/HireHistory");
  const { Application } = require("../dist/entity/Application");
  const { User } = require("../dist/entity/User");
  await AppDataSource.buildMetadatas();
  assert.equal(AppDataSource.getMetadata(User).findColumnWithPropertyName("password").isSelect, false);
  const history = AppDataSource.getRepository(HireHistory).createQueryBuilder("history").setFindOptions({
    where: { hirer: { applications: { applicationVenues: { venue: { vendor: { id: 9 } } } } } },
    relations: ["hirer", "venue"], take: 100, skip: 0, order: { id: "ASC" },
  });
  assert.match(history.getSql(), /WHERE/);
  assert.deepEqual(Object.values(history.getParameters()).map(parameter => parameter.value ?? parameter), [9]);
  // Compile the controller's actual query with MSSQL metadata, without opening a connection.
  const { ApplicationController } = require("../dist/controller/ApplicationController");
  const controller = new ApplicationController();
  const repository = AppDataSource.getRepository(Application);
  let sql;
  controller.applicationRepository = {
    createQueryBuilder(alias) {
      const query = repository.createQueryBuilder(alias);
      if (alias === "application") query.getMany = async () => {
        sql = query.getSql();
        assert.deepEqual(Object.values(query.getParameters()).map(parameter => parameter.value ?? parameter), [9]);
        return [];
      };
      return query;
    },
  };
  const response = recorder();
  await controller.getVendorApplications({ params: { vendorId: "9" }, query: {} }, response);
  assert.equal(response.statusCode, 200);
  assert.match(sql, /WHERE "application"\."id" IN \(SELECT "eligible"\."id"/);
  assert.match(sql, /"ownedVenue"\."vendorId" = @0/);
  assert.doesNotMatch(sql.split("WHERE")[0], /"vendorId" = @0/);
  assert.equal(AppDataSource.isInitialized, false);
});
