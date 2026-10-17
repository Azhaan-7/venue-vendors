import { NextFunction, Request, Response } from "express";
import { readCookie, SESSION_COOKIE_NAME, verifySessionToken } from "../auth/session";
import { UserRole } from "../entity/UserRole";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = readCookie(request.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) return response.status(401).json({ message: "Authentication required" });
    request.authUser = verifySessionToken(token);
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired session" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser) return response.status(401).json({ message: "Authentication required" });
    if (!roles.includes(request.authUser.role)) return response.status(403).json({ message: "Forbidden" });
    next();
  };
}

export function requireOwnParam(param: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser) return response.status(401).json({ message: "Authentication required" });
    const id = Number(request.params[param]);
    if (!Number.isSafeInteger(id) || id < 1) return response.status(400).json({ message: "Invalid user ID" });
    if (id !== request.authUser.id) {
      return response.status(403).json({ message: "You cannot access another user's data" });
    }
    next();
  };
}
