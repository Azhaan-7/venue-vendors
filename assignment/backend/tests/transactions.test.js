const assert = require("node:assert/strict");
const test = require("node:test");
const { AppDataSource } = require("../dist/data-source");
const { ApplicationController } = require("../dist/controller/ApplicationController");
const { ApplicationDraftController } = require("../dist/controller/ApplicationDraftController");
const { VenueController } = require("../dist/controller/VenueController");

const event = { eventName: "Sample event", guests: 10, date: "2099-11-20", time: "12:00", duration: 2 };
const venueBody = { name: "Sample venue", location: "Sample suburb", capacity: 20, price: 100, description: "Sample description", image: "/images/v1.jpg", suitabilities: ["One", "Two"] };
const request = body => ({ body, params: { id: "1", hirerId: "1" }, authUser: { id: 1, role: "vendor" } });

// Models TypeORM's commit/rollback contract. Repositories are transaction-scoped;
// escaping to the data source or sending success before commit fails the test.
async function exercise(controller, method, req, state, repository, failCommit = false) {
  const transaction = AppDataSource.transaction;
  const globalRepository = AppDataSource.getRepository;
  const before = structuredClone(state);
  let active = false, called = false;
  const response = { code: 200, status(code) { this.code = code; return this; }, json(body) { assert.equal(active, false, "response must wait for commit/rollback"); this.body = body; return this; } };
  AppDataSource.getRepository = () => assert.fail("operation escaped the transaction manager");
  AppDataSource.transaction = async callback => {
    called = true; active = true;
    try {
      const result = await callback({ getRepository: entity => repository(entity.name) });
      if (failCommit) throw new Error("Synthetic commit failure");
      return result;
    } catch (error) {
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, before);
      throw error;
    } finally { active = false; }
  };
  try {
    await controller[method](req, response);
    assert.equal(called, true);
    return response;
  } finally { AppDataSource.transaction = transaction; AppDataSource.getRepository = globalRepository; }
}

test("application rankings roll back together; successful response waits for commit", async () => {
  for (const failure of ["ranking", "commit", null]) {
    const state = { applications: [], rankings: [] };
    const response = await exercise(new ApplicationController(), "createApplication", request({ event, venues: [1, 2] }), state, name => ({
      findOne: async options => name === "Profile" ? { name: "Sample", phoneNumber: "0400000000" } : name === "User" ? { id: 1 } : { id: options.where.id, capacity: 20 },
      createQueryBuilder: () => ({ where() { return this; }, andWhere() { return this; }, getCount: async () => 0 }),
      create: value => value,
      save: async value => {
        if (name === "Application") { const row = { ...value, id: 1, status: "pending" }; state.applications.push(row); return row; }
        if (failure === "ranking" && state.rankings.length === 1) throw new Error("Synthetic ranking failure");
        state.rankings.push(value); return value;
      },
    }), failure === "commit");
    assert.equal(response.code, failure ? 500 : 201);
    assert.equal(state.applications.length, failure ? 0 : 1);
    assert.deepEqual(state.rankings.map(row => row.rankOrder), failure ? [] : [1, 2]);
  }
});

test("draft replacement and deletion preserve old rankings on later failure", async () => {
  for (const method of ["saveForHirer", "removeForHirer"]) {
    const state = { drafts: [{ id: 1, eventName: "Original" }], rankings: [{ id: 5 }] };
    const before = structuredClone(state);
    const response = await exercise(new ApplicationDraftController(), method, request({ event, venues: [1] }), state, name => ({
      findOne: async () => name === "ApplicationDraft" ? { ...state.drafts[0], applicationDraftVenues: structuredClone(state.rankings) } : { id: 1, capacity: 20 },
      remove: async () => { if (name === "ApplicationDraft") throw new Error("Synthetic parent delete failure"); state.rankings = []; },
      save: async () => { throw new Error("Synthetic replacement failure"); },
    }));
    assert.equal(response.code, 500); assert.deepEqual(state, before);
  }
});

test("REST venue create, replacement and delete failures do not leave partial changes", async () => {
  for (const method of ["createVenue", "updateVenue", "deleteVenue"]) {
    const state = { venues: method === "createVenue" ? [] : [{ id: 1, name: "Original" }], tags: method === "createVenue" ? [] : ["Original tag"] };
    const before = structuredClone(state);
    const response = await exercise(new VenueController(), method, request(venueBody), state, name => ({
      findOne: async () => name === "User" ? { id: 1 } : { ...state.venues[0], id: 1, vendor: { id: 1 }, venueSuitabilities: [] },
      count: async () => 0,
      create: value => value,
      save: async value => { if (name === "Venue") { state.venues = [{ ...value, id: 1 }]; return state.venues[0]; } throw new Error("Synthetic tag failure"); },
      delete: async () => { if (name === "Venue") throw new Error("Synthetic venue delete failure"); state.tags = []; },
    }));
    assert.equal(response.code, 500); assert.deepEqual(state, before);
  }
});

test("missing venue or vendor responds only after the transaction has rolled back", async () => {
  for (const method of ["createVenue", "updateVenue"]) {
    const response = await exercise(new VenueController(), method, request(venueBody), {}, () => ({ findOne: async () => null }));
    assert.equal(response.code, 404);
  }
});

test("approval rolls back the conditional decision if its comment cannot be saved", async () => {
  const state = { application: { id: 1, status: "pending", eventDate: "2026-11-20", eventTime: "12:00", durationHours: 2, guest: 10 } };
  const query = { innerJoin() { return this; }, where() { return this; }, andWhere() { return this; }, getCount: async () => 0 };
  const response = await exercise(new ApplicationController(), "approveApplication", request({ venueId: 1, commentText: "Sample comment" }), state, name => ({
    createQueryBuilder: alias => ({ ...query, getCount: async () => alias === "application" ? 1 : 0 }),
    findOne: async () => name === "Application" ? { ...state.application } : { id: 1, vendor: { id: 1 } },
    update: async (where, value) => { assert.equal(where.status, "pending"); Object.assign(state.application, value); return { affected: 1 }; },
    create: value => value,
    save: async () => { throw new Error("Synthetic comment failure"); },
  }));
  assert.equal(response.code, 500); assert.deepEqual(state.application, { id: 1, status: "pending", eventDate: "2026-11-20", eventTime: "12:00", durationHours: 2, guest: 10 });
});
