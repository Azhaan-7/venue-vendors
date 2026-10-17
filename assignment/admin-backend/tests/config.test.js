const assert = require("node:assert/strict");
const test = require("node:test");
const { frontendOrigins, positiveInteger, validateStartupEnvironment } = require("../dist/config");
const express = require("express");
const { configureHttp } = require("../dist/security/http");

test("startup errors identify missing variables without their values", () => {
  assert.throws(validateStartupEnvironment, /Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME/);
});
test("proxy trust rejects broad or ambiguous forwarding configurations", () => {
  try {
    for (const invalid of ["true", "1", "loopback", "0.0.0.0/0", "::/00", "0/0", "198.51.100.1/33"]) {
      process.env.TRUSTED_PROXY_CIDRS = invalid;
      assert.throws(() => configureHttp(express()), /TRUSTED_PROXY_CIDRS/);
    }
    delete process.env.TRUSTED_PROXY_CIDRS;
    const app = express(); configureHttp(app); assert.equal(app.get("trust proxy"), false);
  } finally { delete process.env.TRUSTED_PROXY_CIDRS; }
});
test("production requires exact HTTPS origins and bounded numeric settings", () => {
  const old = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    delete process.env.TEST_ORIGINS;
    assert.throws(() => frontendOrigins("TEST_ORIGINS", "http://localhost:3000"), /exact HTTPS/);
    for (const invalid of ["*", "http://example.test", "https://example.test/", "https://example.test/path", "null"]) {
      process.env.TEST_ORIGINS = invalid;
      assert.throws(() => frontendOrigins("TEST_ORIGINS", ""));
    }
    process.env.TEST_ORIGINS = "https://example.test,https://admin.example.test";
    assert.equal(frontendOrigins("TEST_ORIGINS", "").length, 2);
    for (const invalid of ["0", "NaN", "-1", "1.5", "1000001"]) {
      process.env.TEST_NUMBER = invalid;
      assert.throws(() => positiveInteger("TEST_NUMBER", 1));
    }
  } finally { process.env = old; }
});
