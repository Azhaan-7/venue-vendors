// Log only known driver codes and SQL error numbers, never raw messages or config.
const driverCodes = new Set([
  "ETIMEOUT", "ESOCKET", "ELOGIN", "EINSTLOOKUP", "ECONNRESET", "ECONNREFUSED",
  "ENOTFOUND", "EAI_AGAIN", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
]);
const sqlNumbers = new Set([18456, 4060, 40613, 40615, 40197, 40501, 10928, 10929, 49918, 49919, 49920]);

function fields(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function databaseInitializationError(error: unknown): Error {
  const outer = fields(error);
  const driver = fields(outer.driverError || error);
  const original = fields(driver.originalError);
  const code = [driver.code, original.code].find(value => typeof value === "string" && driverCodes.has(value));
  const number = [driver.number, fields(driver.info).number, original.number, fields(original.info).number]
    .find(value => typeof value === "number" && sqlNumbers.has(value));
  const diagnostic = `driver=${code || "UNKNOWN"}${number === undefined ? "" : `, sql=${number}`}`;
  return new Error(`Database initialization failed (${diagnostic}). Check connectivity, TLS, firewall and credentials; details suppressed.`);
}
