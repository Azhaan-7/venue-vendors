import { ErrorRequestHandler, Express, NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { positiveInteger } from "../config";

export function configureHttp(app: Express): void {
  app.disable("x-powered-by");
  // Never trust an arbitrary forwarding header or a guessed hop count.
  const proxies = process.env.TRUSTED_PROXY_CIDRS?.split(",").map(value => value.trim()).filter(Boolean);
  if (proxies?.some(value => {
    const [address, prefix, ...extra] = value.split("/");
    const family = isIP(address);
    return !family || extra.length > 0 || (prefix !== undefined &&
      (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128)));
  })) {
    throw new Error("TRUSTED_PROXY_CIDRS must contain only verified proxy IP addresses or CIDRs");
  }
  try { app.set("trust proxy", proxies?.length ? proxies : false); }
  catch { throw new Error("TRUSTED_PROXY_CIDRS contains an invalid IP address or CIDR"); }
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox");
    if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000");
    next();
  });
}

export function originGuard(allowedOrigins: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const changesState = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if ((origin && !allowedOrigins.includes(origin)) || (changesState && !origin)) {
      return res.status(403).json({ message: "An allowed frontend Origin is required" });
    }
    next();
  };
}

// Bounded fixed-window counters. No timers, raw email addresses, or request bodies are retained.
export function rateLimit(options: {
  limit: number; windowMs: number; key?: (req: Request) => string; now?: () => number; maxKeys?: number;
}) {
  const counters = new Map<string, { count: number; reset: number }>();
  const now = options.now || Date.now;
  const maxKeys = options.maxKeys || 10000;
  return (req: Request, res: Response, next: NextFunction) => {
    const time = now();
    const key = options.key ? options.key(req) : (req.ip || req.socket.remoteAddress || "unknown");
    let counter = counters.get(key);
    if (!counter || counter.reset <= time) {
      if (counters.size >= maxKeys) {
        for (const [entry, value] of counters) if (value.reset <= time) counters.delete(entry);
      }
      if (!counter && counters.size >= maxKeys) {
        res.setHeader("Retry-After", String(Math.ceil(options.windowMs / 1000)));
        return res.status(429).json({ message: "Too many requests. Please try again later." });
      }
      counter = { count: 0, reset: time + options.windowMs };
      counters.set(key, counter);
    }
    counter.count++;
    if (counter.count > options.limit) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((counter.reset - time) / 1000))));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }
    next();
  };
}

export function publicLimits() {
  const windowMs = positiveInteger("RATE_LIMIT_WINDOW_SECONDS", 60, 3600) * 1000;
  return [
    rateLimit({ limit: positiveInteger("RATE_LIMIT_GLOBAL_MAX", 600), windowMs, key: () => "global" }),
    rateLimit({ limit: positiveInteger("RATE_LIMIT_MAX", 120), windowMs }),
  ];
}

export function authLimits() {
  const windowMs = positiveInteger("AUTH_RATE_LIMIT_WINDOW_SECONDS", 900, 86400) * 1000;
  return [
    rateLimit({ limit: positiveInteger("AUTH_RATE_LIMIT_GLOBAL_MAX", 60), windowMs, key: () => "global" }),
    rateLimit({ limit: positiveInteger("AUTH_RATE_LIMIT_MAX", 10), windowMs }),
  ];
}

export function accountLimit() {
  return rateLimit({
    limit: positiveInteger("AUTH_RATE_LIMIT_ACCOUNT_MAX", 10),
    windowMs: positiveInteger("AUTH_RATE_LIMIT_WINDOW_SECONDS", 900, 86400) * 1000,
    key: req => createHash("sha256").update(typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "invalid").digest("hex"),
  });
}

export const safeErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  // SQL/driver errors can include parameters, credentials, and uploaded contents.
  if (error.type === "entity.too.large") return void res.status(413).json({ message: "Request body is too large" });
  if (error.type === "entity.parse.failed") return void res.status(400).json({ message: "Invalid JSON request" });
  if (error.status === 415 || error.status === 400) return void res.status(error.status).json({ message: "Invalid request body" });
  console.error("Request failed; internal details suppressed");
  res.status(500).json({ message: "An internal error occurred" });
};
