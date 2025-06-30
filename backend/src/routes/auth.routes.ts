import express from "express";
import authenticateJWT from "../middleware/auth.middleware";
import { login, register, logout, getCurrentUser } from '../controllers/auth.controller';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = express.Router();

router.post("/register", handleValidationErrors, register);
router.post("/login", handleValidationErrors, login);
router.post("/logout", authenticateJWT, logout);
router.get("/current-user", authenticateJWT, getCurrentUser);

export default router; 