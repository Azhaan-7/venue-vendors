const assert = require("node:assert/strict");
const test = require("node:test");
const { databaseInitializationError } = require("../dist/utils/databaseStartup");

test("TypeORM passes the serverless retry policy and strict TLS into the actual SQL driver", async () => {
  const { AppDataSource } = require("../dist/data-source");
  const mssql = require("mssql");
  const { Connection } = require("tedious");
  const { EventEmitter } = require("node:events");
  const originalPool = AppDataSource.driver.mssql.ConnectionPool;
  let captured;
  // Stop at the pool boundary: no socket or real connection is opened.
  class SyntheticPool extends EventEmitter {
    constructor(config) { super(); captured = config; }
    connect(callback) { queueMicrotask(() => callback(null)); return this; }
  }
  try {
    AppDataSource.driver.mssql.ConnectionPool = SyntheticPool;
    await AppDataSource.driver.createPool(AppDataSource.options, {
      host: "synthetic.invalid", database: "synthetic", username: "synthetic", password: "synthetic",
    });
  } finally { AppDataSource.driver.mssql.ConnectionPool = originalPool; }
  const pool = new mssql.ConnectionPool(captured);
  const connection = new Connection(pool._config());
  const options = connection.config.options;
  assert.equal(options.encrypt, true);
  assert.equal(options.trustServerCertificate, false);
  assert.equal(options.connectTimeout, 60000);
  assert.equal(options.maxRetriesOnTransientErrors, 6);
  assert.equal(options.connectionRetryInterval, 10000);
  assert.equal(connection.transientErrorLookup.isTransientError(40613), true);
  assert.equal(connection.transientErrorLookup.isTransientError(18456), false);
  assert.equal(connection.transientErrorLookup.isTransientError(40615), false);
});

test("database startup reports allowlisted driver codes and SQL numbers without raw details", () => {
  for (const [input, expected] of [
    [{ code: "ETIMEOUT", message: "private database host" }, "driver=ETIMEOUT"],
    [{ code: "ELOGIN", originalError: { info: { number: 40615 }, message: "private username" } }, "driver=ELOGIN, sql=40615"],
    [{ driverError: { code: "ESOCKET", originalError: { code: "ECONNRESET" } } }, "driver=ESOCKET"],
  ]) {
    const result = databaseInitializationError(input);
    assert.match(result.message, new RegExp(expected));
    assert.doesNotMatch(result.message, /private/);
    assert.equal(result.cause, undefined);
  }
});

test("unknown and malformed database failures cannot leak arbitrary fields", () => {
  const secret = "synthetic-secret-must-not-appear";
  for (const input of [undefined, null, secret, { message: secret, code: secret, number: secret,
    originalError: { code: secret, info: { number: secret } }, password: secret }]) {
    const result = databaseInitializationError(input);
    assert.match(result.message, /driver=UNKNOWN/);
    assert.equal(result.message.includes(secret), false);
  }
});

test("actual startup propagates safe diagnostics before opening an HTTP listener", async () => {
  const { AppDataSource } = require("../dist/data-source");
  const { startServer } = require("../dist/index");
  const environment = { ...process.env };
  const initialize = AppDataSource.initialize;
  let attempts = 0;
  try {
    Object.assign(process.env, { NODE_ENV: "test", DB_HOST: "synthetic.invalid", DB_USER: "synthetic",
      DB_PASSWORD: "synthetic-test-password", DB_NAME: "synthetic", JWT_SECRET: "synthetic-startup-secret-at-least-32-bytes" });
    AppDataSource.initialize = async () => { attempts++; throw { code: "ETIMEOUT", message: "synthetic-private-host-and-password" }; };
    await assert.rejects(startServer, error => {
      assert.match(error.message, /driver=ETIMEOUT/);
      assert.doesNotMatch(error.message, /synthetic-private/);
      return true;
    });
    assert.equal(attempts, 1);
  } finally { AppDataSource.initialize = initialize; process.env = environment; }
});
