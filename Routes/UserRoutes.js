import express from "express";
import { registerUser, loginUser, getUserProfile } from "../Controller/UserController.js";
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route – only logged-in users can access their profile
router.get("/profile", protect, getUserProfile);

export default router;
