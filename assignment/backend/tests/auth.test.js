const assert = require("node:assert/strict");
const test = require("node:test");
const argon2 = require("argon2");
const express = require("express");

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-tests";
process.env.JWT_EXPIRES_IN_SECONDS = "900";

const { UserController } = require("../dist/controller/UserController");
const { UserRole } = require("../dist/entity/UserRole");
const { createSessionToken, verifySessionToken } = require("../dist/auth/session");
const { requireAuth, requireOwnParam } = require("../dist/middleware/auth");

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
  };
}

test("public signup rejects admin and never exposes a password hash", async () => {
  const controller = new UserController();
  controller.userRepository = {
    findOne: async () => null,
    create: value => ({ id: 7, ...value }),
    save: async value => value,
  };

  const rejected = responseRecorder();
  await controller.signUp({ body: { name: "Admin", email: "a@example.com", password: "Strong1!", role: "admin" } }, rejected);
  assert.equal(rejected.statusCode, 400);

  const accepted = responseRecorder();
  await controller.signUp({ body: { name: "Hirer", email: "h@example.com", password: "Strong1!", role: "hirer" } }, accepted);
  assert.equal(accepted.statusCode, 201);
  assert.equal(accepted.body.user.password, undefined);
});

test("signin returns sanitized data and establishes a valid HttpOnly session", async () => {
  const password = await argon2.hash("Strong1!");
  const user = { id: 9, email: "h@example.com", password, role: UserRole.HIRER, profile: { name: "Hirer" } };
  const controller = new UserController();
  controller.userRepository = { findOne: async () => user };
  const response = responseRecorder();
  await controller.signIn({ body: { email: user.email, password: "Strong1!" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.password, undefined);
  assert.match(response.headers["set-cookie"], /HttpOnly/);
  const token = response.headers["set-cookie"].match(/^vv_session=([^;]+)/)[1];
  assert.deepEqual(verifySessionToken(decodeURIComponent(token)), { id: 9, role: UserRole.HIRER });
});

test("signin verifies an existing short password's hash without applying signup strength rules", async () => {
  const password = "abc";
  const user = { id: 9, email: "h@example.test", password: await argon2.hash(password), role: UserRole.HIRER };
  const controller = new UserController();
  controller.userRepository = { findOne: async options => { assert.equal(options.where.email, user.email); return user; } };
  const accepted = responseRecorder();
  await controller.signIn({ body: { email: user.email, password } }, accepted);
  assert.equal(accepted.statusCode, 200);
  assert.match(accepted.headers["set-cookie"], /HttpOnly/);
  for (const wrong of ["abd", "  abc  "]) {
    const rejected = responseRecorder();
    await controller.signIn({ body: { email: user.email, password: wrong } }, rejected);
    assert.equal(rejected.statusCode, 401);
    assert.equal(rejected.headers["set-cookie"], undefined);
  }
});

test("signin rejects missing and oversized passwords before database work", async () => {
  const controller = new UserController();
  controller.userRepository = { findOne: () => assert.fail("invalid input must not reach the database") };
  for (const password of [undefined, "", "a".repeat(129)]) {
    const rejected = responseRecorder();
    await controller.signIn({ body: { email: "h@example.test", password } }, rejected);
    assert.equal(rejected.statusCode, 400);
  }
});

test("signup still enforces password strength before database work", async () => {
  const controller = new UserController();
  controller.userRepository = { findOne: () => assert.fail("weak signup password must not reach the database") };
  const rejected = responseRecorder();
  await controller.signUp({ body: { name: "Sample", email: "h@example.test", password: "abc", role: "hirer" } }, rejected);
  assert.equal(rejected.statusCode, 400);
  assert.ok(rejected.body.errors.includes("At least 6 characters"));
});

test("auth/me succeeds for a valid cookie; missing, invalid, and expired sessions fail", async () => {
  const controller = new UserController();
  controller.userRepository = { findOne: async () => ({ id: 3, email: "v@example.com", role: UserRole.VENDOR, profile: { name: "Vendor" }, password: "hidden" }) };
  const token = createSessionToken({ id: 3, role: UserRole.VENDOR });
  const request = { headers: { cookie: `vv_session=${token}` } };
  const response = responseRecorder();
  let nextCalled = false;
  requireAuth(request, response, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  await controller.me(request, response);
  assert.equal(response.body.email, "v@example.com");
  assert.equal(response.body.password, undefined);

  for (const cookie of [undefined, "vv_session=invalid", `vv_session=${createSessionToken({ id: 3, role: UserRole.VENDOR }, Date.now() - 1_000_000)}`]) {
    const denied = responseRecorder();
    requireAuth({ headers: { cookie } }, denied, () => assert.fail("must not authenticate"));
    assert.equal(denied.statusCode, 401);
  }
});

test("signout clears the browser session cookie", () => {
  const response = responseRecorder();
  new UserController().signOut({}, response);
  assert.equal(response.statusCode, 204);
  assert.match(response.headers["set-cookie"], /Max-Age=0/);
});

test("owner middleware rejects cross-user access and permits the owner", () => {
  const check = requireOwnParam("hirerId");
  const denied = responseRecorder();
  check({ authUser: { id: 1, role: UserRole.HIRER }, params: { hirerId: "2" } }, denied, () => assert.fail());
  assert.equal(denied.statusCode, 403);

  let allowed = false;
  check({ authUser: { id: 1, role: UserRole.HIRER }, params: { hirerId: "1" } }, responseRecorder(), () => { allowed = true; });
  assert.equal(allowed, true);
});

test("an authenticated hirer can access their draft route but not another hirer's route", async () => {
  const { ApplicationDraftController } = require("../dist/controller/ApplicationDraftController");
  const originalHandler = ApplicationDraftController.prototype.getByHirer;
  ApplicationDraftController.prototype.getByHirer = async (request, response) => {
    return response.json({ hirerId: Number(request.params.hirerId) });
  };

  delete require.cache[require.resolve("../dist/routes/applicationDraftRoutes")];
  const applicationDraftRoutes = require("../dist/routes/applicationDraftRoutes").default;
  const app = express();
  app.use("/api", applicationDraftRoutes);
  const server = await new Promise(resolve => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });

  try {
    const { port } = server.address();
    const token = createSessionToken({ id: 11, role: UserRole.HIRER });
    const headers = { cookie: `vv_session=${token}` };

    const ownResponse = await fetch(`http://127.0.0.1:${port}/api/application-drafts/11`, { headers });
    assert.equal(ownResponse.status, 200);
    assert.deepEqual(await ownResponse.json(), { hirerId: 11 });

    const crossUserResponse = await fetch(`http://127.0.0.1:${port}/api/application-drafts/12`, { headers });
    assert.equal(crossUserResponse.status, 403);
  } finally {
    ApplicationDraftController.prototype.getByHirer = originalHandler;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
