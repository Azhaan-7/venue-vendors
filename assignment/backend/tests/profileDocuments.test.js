const assert = require("node:assert/strict");
const test = require("node:test");
const { AppDataSource } = require("../dist/data-source");
const { completenessScore, savedCompleteness } = require("../dist/security/completeness");
const { HirerDocumentController } = require("../dist/controller/HirerDocumentController");
const { ApplicationController } = require("../dist/controller/ApplicationController");

test("profile completeness counts each saved contribution once and never exceeds five", async () => {
  assert.equal(completenessScore(undefined, []), 0);
  assert.equal(completenessScore({ name: "Sample", phoneNumber: "bad" }, []), 1);
  const profile = { name: "Sample", phoneNumber: "0400000000" };
  assert.equal(completenessScore(profile, ["driverLicense", "driverLicense", "unknown"]), 3);
  const original = AppDataSource.getRepository;
  let types = ["driverLicense", "publicLiabilityInsurance", "businessRegistration"];
  AppDataSource.getRepository = () => ({ find: async options => {
    assert.deepEqual(options.select, { documentType: true });
    return types.map(documentType => ({ documentType }));
  } });
  try {
    assert.equal(await savedCompleteness(1, profile), 5);
    types = types.slice(1);
    assert.equal(await savedCompleteness(1, profile), 4);
  } finally { AppDataSource.getRepository = original; }
});

test("deleting an already removed document succeeds for safe retries", async () => {
  const controller = new HirerDocumentController();
  controller.documentRepository = { findOne: async () => null };
  const res = { code: 200, status(n) { this.code = n; return this; }, json(body) { this.body = body; return this; } };
  await controller.deleteDocument({ params: { id: "1", documentType: "driverLicense" } }, res);
  assert.equal(res.code, 200);
});

test("punctuation-only and misplaced plus signs do not earn phone completeness", () => {
  for (const phoneNumber of ["++++++++", "1234+5678", "++12345678"]) {
    assert.equal(completenessScore({ name: "Sample", phoneNumber }, []), 1);
  }
  assert.equal(completenessScore({ name: "Sample", phoneNumber: "+61 400 000 000" }, []), 2);
});


test("admin REST application lists use current completeness rather than historical stored scores", async () => {
  const controller = new ApplicationController();
  controller.applicationRepository = { find: async () => [{
    id: 1, hirer: { id: 4, email: "sample@example.test", profile: { name: "Sample", phoneNumber: "0400000000", creditabilityScore: 0 } },
    applicationVenues: [], comments: [], status: "pending",
  }] };
  const original = AppDataSource.getRepository;
  AppDataSource.getRepository = () => ({ find: async () => [{ documentType: "driverLicense" }, { documentType: "publicLiabilityInsurance" }] });
  try {
    const res = { json(body) { this.body = body; return this; } };
    await controller.getAll({ query: {} }, res);
    assert.equal(res.body[0].reputationScore, 4);
  } finally { AppDataSource.getRepository = original; }
});
