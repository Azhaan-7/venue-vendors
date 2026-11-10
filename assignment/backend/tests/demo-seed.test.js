const assert = require("node:assert/strict");
const test = require("node:test");
const argon2 = require("argon2");
const { seedDemoData, demoUsers, demoVenues } = require("../dist/demo-seed");
const { venueInputError } = require("../dist/security/input");
const { validatePassword } = require("../dist/utils/validation");

function database() {
  const rows = { User: [], Venue: [], VenueSuitability: [] };
  let writes = 0;
  return {
    rows,
    get writes() { return writes; },
    async transaction(isolation, callback) {
      assert.equal(isolation, "SERIALIZABLE");
      return callback({ getRepository(entity) {
        const table = rows[entity.name];
        return {
          async findOne({ where }) { return table.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null; },
          create(value) { return value; },
          async save(value) { writes++; const saved = { id: table.length + 1, ...value }; table.push(saved); return saved; },
        };
      } });
    },
  };
}

test("demo dry run plans records without writing", async () => {
  const source = database();
  assert.deepEqual(await seedDemoData(source), { mode: "dry-run", usersToCreate: 4, venuesToCreate: 8 });
  assert.equal(source.writes, 0);
});

test("demo seed hashes logins, associates vendors and can be rerun without changes", async () => {
  const source = database();
  await seedDemoData(source, true);
  for (const fixture of demoUsers) {
    const saved = source.rows.User.find(user => user.email === fixture.email);
    assert.notEqual(saved.password, fixture.password);
    assert.equal(await argon2.verify(saved.password, fixture.password), true);
    assert.deepEqual(validatePassword(fixture.password), []);
    assert.notEqual(saved.role, "admin");
  }
  for (const fixture of demoVenues) {
    assert.equal(venueInputError(fixture), undefined);
    const saved = source.rows.Venue.find(venue => venue.name === fixture.name);
    assert.equal(saved.vendor.email, fixture.vendorEmail);
    assert.equal(saved.vendor.role, "vendor");
    assert.equal(source.rows.VenueSuitability.filter(tag => tag.venue.id === saved.id).length, fixture.suitabilities.length);
  }
  source.rows.Venue[0].description = "Edited by a demo visitor";
  const writes = source.writes;
  assert.deepEqual(await seedDemoData(source, true), { mode: "apply", usersToCreate: 0, venuesToCreate: 0 });
  assert.equal(source.writes, writes);
  assert.equal(source.rows.Venue[0].description, "Edited by a demo visitor");
});

test("demo seed refuses to overwrite an existing account before any writes", async () => {
  const source = database();
  source.rows.User.push({ id: 99, email: demoUsers[0].email, role: "admin", password: "existing" });
  await assert.rejects(seedDemoData(source, true), /different account/);
  assert.equal(source.writes, 0);
  assert.equal(source.rows.User[0].password, "existing");
});

test("demo seed refuses to take a venue from an unrelated vendor", async () => {
  const source = database();
  source.rows.Venue.push({ ...demoVenues[0], vendor: { id: 99 } });
  await assert.rejects(seedDemoData(source, true), /different vendor/);
  assert.equal(source.writes, 0);
});
