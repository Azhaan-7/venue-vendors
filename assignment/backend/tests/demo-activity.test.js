const assert = require("node:assert/strict");
const test = require("node:test");
const { seedDemoData } = require("../dist/demo-seed");
const { seedDemoActivity, demoApplications, demoEventDate } = require("../dist/demo-activity");
const now = new Date("2026-11-10T00:00:00Z");

async function database() {
  const rows = Object.fromEntries(["User", "Venue", "VenueSuitability", "Application", "ApplicationVenue", "Comment", "HireHistory", "Review", "BlockedPeriod"].map(name => [name, []]));
  const matches = (row, where) => Object.entries(where).every(([key, value]) => value && typeof value === "object" ? row[key] && matches(row[key], value) : row[key] === value);
  const source = {
    rows, writes: 0, conflict: false,
    async transaction(isolation, callback) {
      assert.equal(isolation, "SERIALIZABLE");
      const lengths = Object.fromEntries(Object.entries(rows).map(([name, values]) => [name, values.length]));
      try { return await callback({ getRepository(entity) {
        const table = rows[entity.name];
        return {
          async findOne({ where }) { return table.find(row => matches(row, where)) || null; },
          create(value) { return value; },
          async save(value) { source.writes++; const saved = { id: table.length + 1, ...value }; table.push(saved); return saved; },
          createQueryBuilder(alias) { return { where() { return this; }, andWhere() { return this; }, async getCount() { return alias === "booking" && source.conflict ? 1 : 0; } }; },
        };
      } }); } catch (error) { for (const [name, length] of Object.entries(lengths)) rows[name].length = length; throw error; }
    },
  };
  await seedDemoData(source, true);
  source.writes = 0;
  return source;
}

test("activity dry run plans applications, bookings and histories without writes", async () => {
  const source = await database();
  assert.deepEqual(await seedDemoActivity(source, false, now), { mode: "dry-run", applicationsToCreate: 8, bookingsToCreate: 4, historiesToCreate: 2 });
  assert.equal(source.writes, 0);
});

test("demo activity populates both roles with valid rankings and past booking history", async () => {
  const source = await database();
  await seedDemoActivity(source, true, now);
  const { Application: apps, ApplicationVenue: preferences, HireHistory: history, Review: reviews } = source.rows;
  assert.equal(apps.length, 8);
  assert.equal(history.length, 2);
  assert.equal(reviews.length, 2);
  for (const email of ["hirer.demo@example.com", "hirer.events@example.com"]) {
    const owned = apps.filter(app => app.hirer.email === email);
    assert.equal(owned.length, 4);
    assert.deepEqual(owned.map(app => app.status).sort(), ["approved", "approved", "pending", "rejected"]);
    assert.equal(history.filter(row => row.hirer.email === email).length, 1);
  }
  for (const email of ["vendor.demo@example.com", "vendor.spaces@example.com"]) {
    const related = preferences.filter(pref => pref.venue.vendor.email === email);
    assert(related.some(pref => pref.application.status === "pending"));
    assert(related.some(pref => pref.application.status === "rejected"));
    assert(related.some(pref => pref.application.status === "approved" && pref.application.eventDate > now));
    assert(related.some(pref => pref.application.status === "approved" && pref.application.eventDate < now));
  }
  for (const app of apps) {
    const ranked = preferences.filter(pref => pref.application.id === app.id);
    assert.deepEqual(ranked.map(pref => pref.rankOrder), ranked.map((_, index) => index + 1));
    assert(ranked.every(pref => pref.venue.capacity >= app.guest));
    assert(app.dateApplied < app.eventDate);
    if (app.status === "approved") assert(ranked.some(pref => pref.venue.id === app.approvedVenue.id));
    if (app.status === "rejected") assert(app.rejectReason);
  }
  assert(history.every(row => row.eventDate < now && row.documents.length === 0));
});

test("activity reruns preserve visitor decisions and do not duplicate records", async () => {
  const source = await database();
  await seedDemoActivity(source, true, now);
  source.rows.Application[0].status = "rejected";
  const writes = source.writes;
  assert.deepEqual(await seedDemoActivity(source, true, new Date("2026-11-11T00:00:00Z")), { mode: "apply", applicationsToCreate: 0, bookingsToCreate: 0, historiesToCreate: 0 });
  assert.equal(source.writes, writes);
  assert.equal(source.rows.Application[0].status, "rejected");
});

test("activity seed rejects foreign owners and missing demo accounts", async () => {
  const source = await database();
  source.rows.Venue[0].vendor = { id: 999 };
  await assert.rejects(seedDemoActivity(source, true, now), /missing or reassigned/);
  assert.equal(source.writes, 0);
  source.rows.User.length = 0;
  await assert.rejects(seedDemoActivity(source, true, now), /account missing or changed/);
});

test("activity seed respects conflicting approved bookings and rolls back earlier inserts", async () => {
  const source = await database();
  source.conflict = true;
  await assert.rejects(seedDemoActivity(source, true, now), /already has a booking/);
  assert.equal(source.rows.Application.length, 0);
  assert.equal(source.rows.ApplicationVenue.length, 0);
});

test("demo dates use Sydney's day across UTC midnight and daylight saving", () => {
  assert.equal(demoEventDate(new Date("2026-11-09T14:00:00Z"), 0).toISOString(), "2026-11-10T00:00:00.000Z");
  assert.equal(demoEventDate(new Date("2026-10-03T15:00:00Z"), 1).toISOString(), "2026-10-05T00:00:00.000Z");
  assert.equal(demoApplications.length, 8);
});
