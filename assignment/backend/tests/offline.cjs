// Loaded before test files. No test may initialize a database, including from an accidental import.
process.env.DOTENV_CONFIG_PATH = require("node:path").join(__dirname, ".no-database-env");
for (const key of Object.keys(process.env)) if (key.startsWith("DB_")) delete process.env[key];
process.env.NODE_ENV = "test";
const { DataSource } = require("typeorm");
for (const method of ["initialize", "synchronize", "runMigrations", "undoLastMigration", "dropDatabase", "query"]) {
  DataSource.prototype[method] = async () => { throw new Error("Database access is forbidden in offline tests"); };
}
