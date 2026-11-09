import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../entity/UserRole";

export interface AuthenticatedUser {
  id: number;
  role: UserRole;
}

function secret(): string {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be configured");
  return process.env.JWT_SECRET;
}

function verifySessionToken(token: string, now = Date.now()): AuthenticatedUser {
  const payload = jwt.verify(token, secret(), {
    algorithms: ["HS256"],
    clockTimestamp: Math.floor(now / 1000),
  }) as JwtPayload;
  if (!Number.isSafeInteger(payload.id) || payload.id < 1 || !Number.isInteger(payload.exp) ||
      !Number.isInteger(payload.iat) || payload.exp <= payload.iat ||
      payload.exp - payload.iat > 86400 || payload.iat > Math.floor(now / 1000) + 30 ||
      !Object.values(UserRole).includes(payload.role)) throw new Error("Invalid session");
  return { id: payload.id as number, role: payload.role as UserRole };
}

export function userFromCookie(cookieHeader: string | undefined): AuthenticatedUser | null {
  const cookie = cookieHeader?.split(";").map(part => part.trim()).find(part => part.startsWith("vv_session="));
  if (!cookie) return null;
  try {
    return verifySessionToken(decodeURIComponent(cookie.slice("vv_session=".length)));
  } catch {
    return null;
  }
}
