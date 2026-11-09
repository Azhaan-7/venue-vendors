// Opt-in: a new disposable SQL Server container, never an existing database.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const sql = require("mssql");

process.env.DOTENV_CONFIG_PATH = path.join(__dirname, ".no-database-env");
for (const key of Object.keys(process.env)) if (key.startsWith("DB_")) delete process.env[key];
process.env.NODE_ENV = "test";
const { AppDataSource } = require("../../dist/data-source");
const { ApplicationController } = require("../../dist/controller/ApplicationController");
const { BlockedPeriodController } = require("../../dist/controller/BlockedPeriodController");
const { User } = require("../../dist/entity/User");
const { Venue } = require("../../dist/entity/Venue");
const { Application } = require("../../dist/entity/Application");
const { ApplicationVenue } = require("../../dist/entity/ApplicationVenue");
const { BlockedPeriod } = require("../../dist/entity/BlockedPeriod");
const { Comment } = require("../../dist/entity/Comment");

const suffix = randomBytes(6).toString("hex");
const container = `venue-vendors-sql-test-${suffix}`;
const password = `Synthetic!7${randomBytes(24).toString("hex")}`;
const label = "venue-vendors.disposable-sql-test";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let created = false;
let contextName;
let master;
let checks = 0;
function docker(args, env) {
  return execFileSync("docker", contextName ? ["--context", contextName, ...args] : args, { encoding: "utf8", windowsHide: true,
    timeout: 180_000, stdio: ["ignore", "pipe", "pipe"], env: env || process.env }).trim();
}
function response() {
  return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
async function check(name, run) {
  await run(); checks++;
  console.log(`PASS ${name}`);
}

// Both controllers reach their venue-lock query before either can proceed.
// SQL Server itself arbitrates the locks; no in-memory lock substitutes for it.
async function race(operations) {
  const original = AppDataSource.transaction;
  let arrived = 0, first = true, release;
  const barrier = new Promise(resolve => { release = resolve; });
  const timer = setTimeout(() => release(), 8_000);
  AppDataSource.transaction = callback => original.call(AppDataSource, manager => {
    const wrapped = new Proxy(manager, { get(target, key) {
      if (key === "getRepository") return entity => {
        const repository = target.getRepository(entity);
        if (entity !== Venue) return repository;
        return new Proxy(repository, { get(repo, method) {
          if (method === "findOne") return async options => {
            if (options.lock?.mode !== "pessimistic_write") return repo.findOne(options);
            arrived++;
            if (arrived === operations.length) release();
            await barrier;
            const value = await repo.findOne(options);
            if (first) { first = false; await pause(100); }
            return value;
          };
          const value = repo[method];
          return typeof value === "function" ? value.bind(repo) : value;
        } });
      };
      const value = target[key];
      return typeof value === "function" ? value.bind(target) : value;
    } });
    return callback(wrapped);
  });
  try {
    const result = await Promise.all(operations.map(run => run()));
    assert.equal(arrived, operations.length, "both transactions must reach a real venue lock");
    return result;
  } finally { clearTimeout(timer); AppDataSource.transaction = original; }
}

async function exercise(snapshot) {
  const database = `venue_vendors_test_${suffix}_${snapshot ? "rcsi" : "locking"}`;
  assert.match(database, /^venue_vendors_test_[a-f0-9]{12}_(rcsi|locking)$/);
  await master.request().query(`CREATE DATABASE [${database}]`);
  await master.request().query(`ALTER DATABASE [${database}] SET READ_COMMITTED_SNAPSHOT ${snapshot ? "ON" : "OFF"}`);
  AppDataSource.setOptions({ host: "127.0.0.1", port: master.config.port, username: "sa", password, database,
    options: { encrypt: true, trustServerCertificate: true }, synchronize: true, migrationsRun: false,
    dropSchema: false, logging: false, pool: { max: 10, min: 0, idleTimeoutMillis: 1000 } });
  assert.equal(AppDataSource.options.host, "127.0.0.1");
  await AppDataSource.initialize();
  try {
    const mode = snapshot ? "RCSI ON" : "RCSI OFF";
    const option = await AppDataSource.query("SELECT is_read_committed_snapshot_on AS enabled FROM sys.databases WHERE name = DB_NAME()");
    assert.equal(Boolean(option[0].enabled), snapshot);
    const users = AppDataSource.getRepository(User);
    const vendor = await users.save(users.create({ email: "vendor@example.test", password: "unused-synthetic-value", role: "vendor" }));
    const otherVendor = await users.save(users.create({ email: "other@example.test", password: "unused-synthetic-value", role: "vendor" }));
    const hirer = await users.save(users.create({ email: "hirer@example.test", password: "unused-synthetic-value", role: "hirer" }));
    const controller = new ApplicationController();
    const blocks = new BlockedPeriodController();
    const venues = AppDataSource.getRepository(Venue);
    const apps = AppDataSource.getRepository(Application);
    const ranks = AppDataSource.getRepository(ApplicationVenue);
    const venue = (owner = vendor) => venues.save(venues.create({ vendor: owner, name: "Synthetic venue", location: "Test", capacity: 50, price: 100, description: "Synthetic", image: "/images/v1.jpg" }));
    async function application(selected, time = "12:00", date = "2099-11-20", hours = 2) {
      const row = await apps.save(apps.create({ hirer, eventName: "Synthetic booking", guest: 10, eventDate: date, eventTime: time, durationHours: hours }));
      for (let i = 0; i < selected.length; i++) await ranks.save(ranks.create({ application: row, venue: selected[i], rankOrder: i + 1 }));
      return row;
    }
    async function approve(app, selected, owner = vendor, commentText) {
      const res = response();
      await controller.approveApplication({ params: { id: String(app.id) }, body: { venueId: selected.id, commentText }, authUser: { id: owner.id, role: "vendor" } }, res);
      return res;
    }
    async function block(selected) {
      const res = response();
      await blocks.create({ body: { venueId: selected.id, startDate: "2099-11-20", endDate: "2099-11-20", reason: "Synthetic block" }, authUser: { id: vendor.id, role: "vendor" } }, res);
      return res;
    }
    for (let i = 1; i <= 5; i++) await check(`${mode}: simultaneous overlapping approvals ${i}/5`, async () => {
      const v = await venue(), a = await application([v]), b = await application([v]);
      const results = await race([() => approve(a, v), () => approve(b, v)]);
      assert.deepEqual(results.map(r => r.code).sort(), [200, 409], JSON.stringify(results));
      assert.equal(await apps.countBy({ approvedVenue: { id: v.id }, status: "approved" }), 1);
      assert.equal(await apps.countBy({ id: results[0].code === 200 ? b.id : a.id, status: "pending" }), 1);
    });
    await check(`${mode}: adjacent bookings both succeed`, async () => {
      const v = await venue(), a = await application([v]), b = await application([v], "14:00");
      assert.deepEqual((await race([() => approve(a, v), () => approve(b, v)])).map(r => r.code), [200, 200]);
    });
    await check(`${mode}: overnight overlap permits only one approval`, async () => {
      const v = await venue(), a = await application([v], "23:00"), b = await application([v], "00:30", "2099-11-21");
      assert.deepEqual((await race([() => approve(a, v), () => approve(b, v)])).map(r => r.code).sort(), [200, 409]);
    });
    await check(`${mode}: approval races blocked-period creation`, async () => {
      const v = await venue(), a = await application([v]);
      const results = await race([() => approve(a, v), () => block(v)]);
      assert.equal(results.filter(r => [200, 201].includes(r.code)).length, 1, JSON.stringify(results));
      assert.equal(results.filter(r => r.code === 409).length, 1, JSON.stringify(results));
      assert.equal(await apps.countBy({ approvedVenue: { id: v.id }, status: "approved" }) +
        await AppDataSource.getRepository(BlockedPeriod).countBy({ venue: { id: v.id } }), 1);
    });
    await check(`${mode}: two vendors cannot decide the same application twice`, async () => {
      const v = await venue(), w = await venue(otherVendor), a = await application([v, w]);
      const results = await race([() => approve(a, v), () => approve(a, w, otherVendor)]);
      assert.deepEqual(results.map(r => r.code).sort(), [200, 409], JSON.stringify(results));
      assert.equal(await apps.countBy({ id: a.id, status: "approved" }), 1);
    });
    await check(`${mode}: blocking the next day rejects an overnight approval`, async () => {
      const v = await venue(), a = await application([v], "23:00");
      const repo = AppDataSource.getRepository(BlockedPeriod);
      await repo.save(repo.create({ venue: v, startDate: "2099-11-21", endDate: "2099-11-21", reason: "Synthetic" }));
      assert.equal((await approve(a, v)).code, 409);
    });
    await check(`${mode}: SQL comment failure rolls back approval`, async () => {
      const v = await venue(), a = await application([v]);
      await AppDataSource.query("CREATE TRIGGER vv_test_comment_failure ON [comment] AFTER INSERT AS THROW 51000, 'Synthetic comment failure', 1;");
      try {
        assert.equal((await approve(a, v, vendor, "Synthetic comment")).code, 500);
        assert.equal((await apps.findOneByOrFail({ id: a.id })).status, "pending");
        assert.equal(await AppDataSource.getRepository(Comment).countBy({ application: { id: a.id } }), 0);
      } finally { await AppDataSource.query("DROP TRIGGER vv_test_comment_failure"); }
    });
  } finally { await AppDataSource.destroy(); }
}

async function main() {
  const context = JSON.parse(docker(["context", "inspect"]));
  const endpoint = context[0]?.Endpoints?.docker?.Host || "";
  assert.ok(endpoint.startsWith("npipe://") || endpoint.startsWith("unix://"), "Only a local Docker socket is allowed");
  contextName = context[0].Name; // Pin the checked context; ignore any DOCKER_HOST override.
  assert.equal(docker(["info", "--format", "{{.OSType}}"]), "linux", "Start Docker's Linux engine first");
  console.log("Starting disposable local SQL Server; synthetic data only, no host mounts.");
  docker(["run", "--rm", "--detach", "--name", container, "--label", `${label}=${suffix}`,
    "--publish", "127.0.0.1::1433", "--memory", "3g", "--cpus", "2", "--env", "ACCEPT_EULA=Y", "--env", "MSSQL_PID=Developer",
    "--env", "MSSQL_SA_PASSWORD", "mcr.microsoft.com/mssql/server:2022-latest"], { ...process.env, MSSQL_SA_PASSWORD: password });
  created = true;
  const inspect = JSON.parse(docker(["inspect", container]))[0];
  assert.equal(inspect.Config.Labels[label], suffix);
  const binding = inspect.NetworkSettings.Ports["1433/tcp"][0];
  assert.equal(binding.HostIp, "127.0.0.1");
  const config = { server: "127.0.0.1", port: Number(binding.HostPort), user: "sa", password,
    database: "master", options: { encrypt: true, trustServerCertificate: true }, connectionTimeout: 2000,
    requestTimeout: 15000, pool: { max: 1, min: 0, idleTimeoutMillis: 1000 } };
  for (let i = 0; i < 60; i++) {
    const candidate = new sql.ConnectionPool(config);
    try { master = await candidate.connect(); break; }
    catch { await candidate.close(); if (i === 59) throw new Error("Local SQL Server did not become ready"); await pause(1000); }
  }
  await exercise(false);
  await exercise(true);
  console.log(`${checks} real SQL integration checks passed.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
  if (master) await master.close();
  if (created) {
    // Never remove a pre-existing or unrelated container, even if names collide.
    assert.equal(docker(["inspect", "--format", `{{index .Config.Labels "${label}"}}`, container]), suffix);
    docker(["rm", "--force", container]);
    console.log("Removed disposable SQL container and its test databases.");
  }
});
