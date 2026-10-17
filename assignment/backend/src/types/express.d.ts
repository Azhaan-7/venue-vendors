import { SessionUser } from "../auth/session";

declare global {
  namespace Express {
    interface Request {
      authUser?: SessionUser;
    }
  }
}

export {};
