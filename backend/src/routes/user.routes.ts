import express from "express";
import { 
    getUsersList,
    getCurrentUser,
    updateUserDetails,
    checkAtLeastOneField,
    validateProfileUpdate,
    handleValidationErrors,
    deleteUser,
    hasUsers
} from "../controllers/user.controller";
import authenticateJWT from "../middleware/auth.middleware";

const router = express.Router();

router.get("/current-user", authenticateJWT, getCurrentUser);

export default router; 