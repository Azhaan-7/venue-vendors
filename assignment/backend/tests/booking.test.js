const assert = require("node:assert/strict");
const test = require("node:test");
const { AppDataSource } = require("../dist/data-source");
const { ApplicationController } = require("../dist/controller/ApplicationController");
const { BlockedPeriodController } = require("../dist/controller/BlockedPeriodController");
const { bookingInterval, assertVenueAvailable } = require("../dist/security/booking");
const response = () => ({ code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } });

test("booking intervals include overnight hours without depending on server timezone", () => {
  const { start, end } = bookingInterval("2026-11-20", "23:00:00", 2);
  assert.equal(start.toISOString(), "2026-11-20T23:00:00.000Z");
  assert.equal(end.toISOString(), "2026-11-21T01:00:00.000Z");
});

test("approval refuses blocks, overlaps and reduced capacity before changing status", async () => {
  const old = AppDataSource.transaction;
  try {
    for (const reason of ["blocked", "booked", "capacity", "available"]) {
      let writes = 0, locked = false;
      AppDataSource.transaction = callback => callback({ getRepository: entity => ({
        createQueryBuilder: alias => ({
          where() { return this; }, andWhere() { return this; }, innerJoin() { return this; },
          getCount: async () => {
            if (alias === "application") return 1;
            assert.equal(locked, true, "availability queries must follow venue lock");
            return Number(alias === "block" ? reason === "blocked" : reason === "booked");
          },
        }),
        findOne: async options => {
          if (entity.name === "Application") return { id: 1, status: "pending", guest: 10, eventDate: "2026-11-20", eventTime: "23:00", durationHours: 2 };
          if (entity.name === "Venue") { assert.equal(options.lock.mode, "pessimistic_write"); locked = true; return { id: 7, vendor: { id: 9 }, capacity: reason === "capacity" ? 5 : 20 }; }
          return { id: 1 };
        },
        update: async () => { writes++; return { affected: 1 }; },
      }) });
      const res = response();
      await new ApplicationController().approveApplication({ params: { id: "1" }, body: { venueId: 7 }, authUser: { id: 9 } }, res);
      assert.equal(res.code, reason === "available" ? 200 : 409, reason);
      assert.equal(writes, reason === "available" ? 1 : 0);
    }
  } finally { AppDataSource.transaction = old; }
});

test("SQL overlap predicates permit adjacent bookings and cover overnight blocked dates", async () => {
  await AppDataSource.buildMetadatas();
  const manager = { getRepository(entity) {
    const repository = AppDataSource.getRepository(entity);
    return { createQueryBuilder(alias) {
      const query = repository.createQueryBuilder(alias);
      query.getCount = async () => {
        const sql = query.getSql();
        if (alias === "block") {
          assert.equal(query.getParameters().firstDay, "2026-11-20");
          assert.equal(query.getParameters().lastDay, "2026-11-21");
        } else {
          assert.match(sql, /DATEADD\(hour/);
          assert.match(sql, / < CAST/); assert.match(sql, / > CAST/);
        }
        return 0;
      };
      return query;
    } };
  } };
  const { start, end } = bookingInterval("2026-11-20", "23:00", 2);
  await assertVenueAvailable(manager, 7, start, end);
  const sql = AppDataSource.getRepository(require("../dist/entity/Venue").Venue).createQueryBuilder("venue").setLock("pessimistic_write").getSql();
  assert.match(sql, /UPDLOCK/);
  assert.equal(AppDataSource.isInitialized, false);
});

test("blocking a date with an approved booking returns conflict using the venue lock", async () => {
  const old = AppDataSource.transaction;
  try {
    AppDataSource.transaction = callback => callback({ getRepository: entity => ({
      findOne: async options => { assert.equal(options.lock.mode, "pessimistic_write"); return { id: 7, vendor: { id: 9 } }; },
      createQueryBuilder: () => ({ where() { return this; }, andWhere() { return this; }, getCount: async () => 1 }),
      save: () => assert.fail("conflicting block must not be saved"),
    }) });
    const res = response();
    await new BlockedPeriodController().create({ body: { venueId: 7, startDate: "2026-11-20", endDate: "2026-11-20", reason: "Unavailable" }, authUser: { id: 9 } }, res);
    assert.equal(res.code, 409);
  } finally { AppDataSource.transaction = old; }
});

test("concurrent approvals serialize through the venue lock; only one booking succeeds", async () => {
  const old = AppDataSource.transaction;
  let tail = Promise.resolve(), bookings = 0;
  try {
    AppDataSource.transaction = async callback => {
      let release;
      try { return await callback({ getRepository: entity => ({
        findOne: async options => {
          if (entity.name === "Application") return { id: options.where.id, status: "pending", guest: 10, eventDate: "2099-11-20", eventTime: "12:00", durationHours: 2 };
          if (entity.name === "Venue") {
            assert.equal(options.lock.mode, "pessimistic_write");
            const previous = tail; tail = new Promise(resolve => { release = resolve; });
            await previous;
            return { id: 7, vendor: { id: 9 }, capacity: 20 };
          }
          return { id: 7 };
        },
        createQueryBuilder: alias => ({ where() { return this; }, andWhere() { return this; }, innerJoin() { return this; }, getCount: async () => alias === "application" ? 1 : alias === "booking" ? bookings : 0 }),
        update: async () => { bookings++; return { affected: 1 }; },
      }) }); } finally { if (release) release(); }
    };
    const controller = new ApplicationController();
    const first = response(), second = response();
    await Promise.all([first, second].map((res, index) => controller.approveApplication({ params: { id: String(index + 1) }, body: { venueId: 7 }, authUser: { id: 9 } }, res)));
    assert.deepEqual([first.code, second.code].sort(), [200, 409]);
    assert.equal(bookings, 1);
  } finally { AppDataSource.transaction = old; }
});

test("future-event checks use Sydney time consistently, including daylight saving", () => {
  const { assertFutureEvent } = require("../dist/security/booking");
  const now = new Date("2026-11-09T00:00:00Z");
  assert.throws(() => assertFutureEvent(new Date("2026-11-09T10:59:00Z"), now), /future/);
  assert.doesNotThrow(() => assertFutureEvent(new Date("2026-11-09T11:01:00Z"), now));
});

test("direct submissions cannot bypass saved-profile, future-date or blocked-period rules", async () => {
  const old = AppDataSource.transaction;
  try {
    for (const failure of ["profile", "past", "blocked"]) {
      AppDataSource.transaction = callback => callback({ getRepository: entity => ({
        findOne: async options => entity.name === "Profile" ? { name: "Sample", phoneNumber: failure === "profile" ? "" : "0400000000" } : { id: options.where.id, capacity: 20 },
        createQueryBuilder: () => ({ where() { return this; }, andWhere() { return this; }, getCount: async () => failure === "blocked" ? 1 : 0 }),
        save: () => assert.fail("invalid application must not be persisted"),
      }) });
      const res = response();
      await new ApplicationController().createApplication({ authUser: { id: 1 }, body: { event: { eventName: "Sample", guests: 10, date: failure === "past" ? "2000-01-01" : "2099-11-20", time: "12:00", duration: 2 }, venues: [7] } }, res);
      assert.equal(res.code, failure === "blocked" ? 409 : 400, failure);
    }
  } finally { AppDataSource.transaction = old; }
});
