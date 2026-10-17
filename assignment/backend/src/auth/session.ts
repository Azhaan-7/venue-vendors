import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../entity/UserRole";
import { positiveInteger } from "../config";

export const SESSION_COOKIE_NAME = "vv_session";

export interface SessionUser {
  id: number;
  role: UserRole;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be configured");
  return secret;
}

export function createSessionToken(user: SessionUser, now = Date.now()): string {
  const issuedAt = Math.floor(now / 1000);
  const lifetime = positiveInteger("JWT_EXPIRES_IN_SECONDS", 900, 86400);
  return jwt.sign(
    { id: user.id, role: user.role, iat: issuedAt },
    getSecret(),
    { algorithm: "HS256", expiresIn: lifetime }
  );
}

export function verifySessionToken(token: string, now = Date.now()): SessionUser {
  const payload = jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
    clockTimestamp: Math.floor(now / 1000),
  }) as JwtPayload;
  if (!Number.isSafeInteger(payload.id) || payload.id < 1 || !Number.isInteger(payload.exp) ||
      !Number.isInteger(payload.iat) || payload.exp <= payload.iat ||
      payload.exp - payload.iat > 86400 || payload.iat > Math.floor(now / 1000) + 30 ||
      !Object.values(UserRole).includes(payload.role)) {
    throw new Error("Invalid session");
  }
  return { id: payload.id as number, role: payload.role as UserRole };
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function sameSite(): "Lax" | "Strict" {
  const value = (process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  if (value === "strict") return "Strict";
  return "Lax";
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = positiveInteger("JWT_EXPIRES_IN_SECONDS", 900, 86400);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite()}${secure ? "; Secure" : ""}; Max-Age=${maxAge}`;
}

export function clearedSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=${sameSite()}${secure ? "; Secure" : ""}; Max-Age=0`;
}
