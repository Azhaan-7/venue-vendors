import { positiveId } from "../security/input";
import { Router } from "express";
import { UserController } from "../controller/UserController";
import { requireAuth } from "../middleware/auth";
import { accountLimit, authConcurrencyLimit } from "../security/http";

const router = Router();
for (const param of ["id", "hirerId", "vendorId"]) router.param(param, (_req, res, next, value) => {
  if (!positiveId(value)) return res.status(400).json({ message: "Invalid resource ID" });
  next();
});
const controller = new UserController();
const authCapacity = authConcurrencyLimit();

router.post("/auth/signup", accountLimit(), authCapacity((req, res) => controller.signUp(req, res)));

router.post("/auth/signin", accountLimit(), authCapacity((req, res) => controller.signIn(req, res)));

router.get("/auth/me", requireAuth, (req, res) => controller.me(req, res));
router.post("/auth/signout", (req, res) => controller.signOut(req, res));

export default router;
