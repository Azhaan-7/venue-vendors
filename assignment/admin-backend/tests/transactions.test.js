const assert = require("node:assert/strict");
const test = require("node:test");
const { AppDataSource } = require("../dist/data-source");
const { resolvers } = require("../dist/schema");

const args = { name: "Sample venue", location: "Sample suburb", capacity: 20, price: 100, description: "Sample description", image: "/images/v1.jpg", vendorId: "7", suitabilities: ["One", "Two"] };
const context = { user: { id: 1, role: "admin" } };

for (const method of ["createVenue", "updateVenue"]) test(`GraphQL ${method} uses one transaction and restores venue/tags on failure`, async () => {
  const originalTransaction = AppDataSource.transaction;
  const originalRepository = AppDataSource.getRepository;
  for (const fail of [true, false]) {
    const state = { venues: method === "createVenue" ? [] : [{ id: 11, name: "Original" }], tags: method === "createVenue" ? [] : ["Original tag"] };
    const before = structuredClone(state);
    const query = { where() { return this; }, andWhere() { return this; }, getOne: async () => null };
    let called = false;
    AppDataSource.getRepository = () => assert.fail("resolver escaped the transaction manager");
    AppDataSource.transaction = async callback => {
      called = true;
      try {
        return await callback({ getRepository: entity => ({
          createQueryBuilder: () => query,
          findOne: async () => entity.name === "User" ? { id: 7, role: "vendor" } : { ...state.venues[0], id: 11, venueSuitabilities: state.tags },
          save: async value => {
            if (entity.name === "Venue") { state.venues = [{ ...value, id: 11 }]; return state.venues[0]; }
            if (fail) throw new Error("Synthetic tag save failure");
            state.tags.push(value.keyword); return value;
          },
          delete: async () => { state.tags = []; },
        }) });
      } catch (error) { Object.assign(state, before); throw error; }
    };
    try {
      const operation = () => resolvers.Mutation[method](null, { ...args, ...(method === "updateVenue" ? { id: "11" } : {}) }, context);
      if (fail) { await assert.rejects(operation, /Synthetic/); assert.deepEqual(state, before); }
      else { const result = await operation(); assert.equal(result.name, args.name); assert.deepEqual(state.tags, ["One", "Two"]); }
      assert.equal(called, true);
    } finally { AppDataSource.transaction = originalTransaction; AppDataSource.getRepository = originalRepository; }
  }
});
