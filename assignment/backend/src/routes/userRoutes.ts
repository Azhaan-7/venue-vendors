import { Router } from "express";
import { UserController } from "../controller/UserController";

const router = Router();
const controller = new UserController();

router.post("/auth/signup", (req, res) =>
  controller.signUp(req, res)
);

router.post("/auth/signin", (req, res) =>
  controller.signIn(req, res)
);

export default router;