// Kept within each backend so either application can deploy from its own root.
export function positiveInteger(name: string, fallback: number, max = 1_000_000): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`${name} must be an integer between 1 and ${max}`);
  }
  return value;
}

export function frontendOrigins(name: string, localDefault: string): string[] {
  const configured = process.env[name];
  if (process.env.NODE_ENV === "production" && !configured?.trim()) {
    throw new Error(`${name} must list the exact HTTPS frontend origins`);
  }
  const origins = (configured || localDefault).split(",").map(value => value.trim());
  if (origins.some(origin => {
    try {
      const url = new URL(origin);
      return url.origin !== origin || url.username !== "" || url.password !== "" ||
        !["http:", "https:"].includes(url.protocol) ||
        (process.env.NODE_ENV === "production" && url.protocol !== "https:");
    } catch { return true; }
  })) throw new Error(`${name} must contain exact origins without paths or wildcards`);
  return origins;
}

export function validateStartupEnvironment(): void {
  const missing = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET"]
    .filter(name => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (Buffer.byteLength(process.env.JWT_SECRET!, "utf8") < 32) {
    throw new Error("JWT_SECRET must contain at least 32 bytes of randomly generated secret material");
  }
  positiveInteger("JWT_EXPIRES_IN_SECONDS", 900, 86400);
  positiveInteger("PORT", 3001, 65535);
  if (process.env.COOKIE_SAME_SITE && !["lax", "strict"].includes(process.env.COOKIE_SAME_SITE.toLowerCase())) {
    throw new Error("COOKIE_SAME_SITE must be lax or strict for the same-origin proxy deployment");
  }
}
