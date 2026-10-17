const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

const { AppDataSource } = require("../dist/data-source");
const { resolvers } = require("../dist/schema");
const { UserRole } = require("../dist/entity/UserRole");
const { buildGraphQLContext } = require("../dist/auth/context");

process.env.JWT_SECRET = "shared-test-secret";

function mainBackendStyleToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: 60 });
}

test("admin cookie flows through GraphQL context authentication into a protected operation", async () => {
  const token = mainBackendStyleToken(1, UserRole.ADMIN);
  const context = buildGraphQLContext(`vv_session=${token}`);
  const original = AppDataSource.getRepository;
  AppDataSource.getRepository = () => ({ find: async () => [{ id: 1, name: "Venue" }] });
  try {
    const result = await resolvers.Query.venues(null, null, context);
    assert.deepEqual(context.user, { id: 1, role: UserRole.ADMIN });
    assert.deepEqual(result, [{ id: 1, name: "Venue" }]);
  } finally {
    AppDataSource.getRepository = original;
  }
});

test("non-admin cookie is authenticated by context but rejected by a protected operation", async () => {
  const token = mainBackendStyleToken(2, UserRole.HIRER);
  const context = buildGraphQLContext(`vv_session=${token}`);
  assert.deepEqual(context.user, { id: 2, role: UserRole.HIRER });
  await assert.rejects(
    () => resolvers.Query.venues(null, null, context),
    error => error.extensions.code === "FORBIDDEN"
  );
});

test("admin GraphQL data operation rejects unauthenticated and non-admin contexts", async () => {
  await assert.rejects(() => resolvers.Query.venues(null, null, { user: null }), error => error.extensions.code === "UNAUTHENTICATED");
  await assert.rejects(
    () => resolvers.Query.venues(null, null, { user: { id: 2, role: UserRole.HIRER } }),
    error => error.extensions.code === "FORBIDDEN"
  );
  await assert.rejects(
    () => resolvers.Query.venues(null, null, { user: { id: 3, role: UserRole.VENDOR } }),
    error => error.extensions.code === "FORBIDDEN"
  );
});

test("admin GraphQL data operation succeeds for an admin", async () => {
  const original = AppDataSource.getRepository;
  AppDataSource.getRepository = () => ({ find: async () => [{ id: 1, name: "Venue" }] });
  try {
    const result = await resolvers.Query.venues(null, null, { user: { id: 1, role: UserRole.ADMIN } });
    assert.deepEqual(result, [{ id: 1, name: "Venue" }]);
  } finally {
    AppDataSource.getRepository = original;
  }
});
