import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes";
import profileRoutes from "./routes/profileRoutes";
import applicationRoutes from "./routes/applicationRoutes";
import blockedPeriodRoutes from "./routes/blockedPeriodRoutes";
import hireHistoryRoutes from "./routes/hireHistoryRoutes";
import venueRoutes from "./routes/venueRoutes";
import hirerDocumentRoutes from "./routes/HirerDocumentRoutes";
import applicationDraftRoutes from "./routes/applicationDraftRoutes";
import { frontendOrigins } from "./config";
import { configureHttp, originGuard, publicLimits, safeErrorHandler } from "./security/http";
import { requireAuth, requireOwnParam, requireRole } from "./middleware/auth";
import { pagination } from "./security/input";
import { UserRole } from "./entity/UserRole";
import { UserController } from "./controller/UserController";

// Importing the app never connects to a database or opens a listener.
export function createApp() {
  const app = express();
  const origins = frontendOrigins("FRONTEND_ORIGINS", "http://localhost:3000,http://localhost:3002");
  configureHttp(app);
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", originGuard(origins), cors({ credentials: true, origin: origins }));
  // Clearing a browser cookie is cheap and must still work after an API quota is exhausted.
  // The origin guard above continues to protect logout against CSRF.
  app.post("/api/auth/signout", (req, res) => new UserController().signOut(req, res));
  app.use("/api", ...publicLimits());
  // Large JSON is accepted only on the authorized upload route, never before auth.
  app.post("/api/hirer-documents/:id", requireAuth, requireRole(UserRole.HIRER), requireOwnParam("id"),
    express.json({ limit: "3mb", inflate: false }));
  app.use(express.json({ limit: "64kb", inflate: false }));
  app.use((req, _res, next) => { req.body ??= {}; next(); });
  app.use("/api", (req, res, next) => {
    if (req.method === "GET") {
      try { pagination(req); } catch { return res.status(400).json({ message: "Invalid pagination; limit is 1 to 200 and offset is 0 to 100000" }); }
    }
    next();
  });
  for (const routes of [userRoutes, profileRoutes, applicationRoutes, blockedPeriodRoutes,
    hireHistoryRoutes, venueRoutes, hirerDocumentRoutes, applicationDraftRoutes]) app.use("/api", routes);
  app.use((_req, res) => res.status(404).json({ message: "Not found" }));
  app.use(safeErrorHandler);
  return app;
}
