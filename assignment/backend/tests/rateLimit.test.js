const assert = require("node:assert/strict");
const test = require("node:test");
const { EventEmitter } = require("node:events");
const { accountLimit, publicLimits } = require("../dist/security/http");
const response = () => Object.assign(new EventEmitter(), { statusCode: 200, status(n) { this.statusCode = n; return this; }, json() { return this; }, setHeader() {} });
function hit(limits, ip, email, status = 400) {
  const res = response();
  const next = i => { if (i < limits.length) limits[i]({ ip, socket: {}, body: { email } }, res, () => next(i + 1)); else res.statusCode = status; };
  next(0); res.emit("finish"); return res.statusCode;
}
test("successful authentication does not exhaust an account, and proxy-sharing accounts are independent", () => {
  const limits = [accountLimit()];
  for (let i = 0; i < 20; i++) assert.equal(hit(limits, "proxy", "one@example.test", 200), 200);
  for (let i = 0; i < 10; i++) assert.equal(hit(limits, "proxy", "one@example.test"), 400);
  assert.equal(hit(limits, "other-ip", " ONE@example.test "), 429);
  assert.equal(hit(limits, "proxy", "two@example.test"), 400);
});
test("IP-blocked requests cannot consume the public global quota", () => {
  const old = { ...process.env };
  try {
    process.env.RATE_LIMIT_MAX = "2"; process.env.RATE_LIMIT_GLOBAL_MAX = "4";
    const limits = publicLimits();
    for (let i = 0; i < 20; i++) hit(limits, "abuser", "");
    assert.equal(hit(limits, "fresh-client", "", 200), 200);
  } finally { process.env = old; }
});

test("auth capacity recovers after work finishes, even if a client disconnects early", async () => {
  const { authConcurrencyLimit } = require("../dist/security/http");
  const old = process.env.AUTH_MAX_CONCURRENT;
  process.env.AUTH_MAX_CONCURRENT = "1";
  try {
    const capacity = authConcurrencyLimit();
    let release;
    const first = response();
    const pending = capacity(() => new Promise(resolve => { release = resolve; }))({}, first, assert.fail);
    first.emit("close");
    const denied = response();
    await capacity(async () => assert.fail("must not enter while work is active"))({}, denied, assert.fail);
    assert.equal(denied.statusCode, 503);
    release(); await pending;
    let entered = false;
    await capacity(async () => { entered = true; })({}, response(), assert.fail);
    assert.equal(entered, true);
    await capacity(async () => { throw new Error("Synthetic failure"); })({}, response(), () => {});
    await capacity(async () => {})({}, response(), assert.fail);
  } finally { if (old === undefined) delete process.env.AUTH_MAX_CONCURRENT; else process.env.AUTH_MAX_CONCURRENT = old; }
});
