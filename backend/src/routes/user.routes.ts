import express from "express";
import { getCurrentUser } from "../controllers/user.controller";
import authenticateJWT from "../middleware/auth.middleware";

const router = express.Router();

router.get("/current-user", authenticateJWT, getCurrentUser);

export default router; 