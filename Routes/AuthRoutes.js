import express from "express";
import { requestPasswordReset, resetPassword } from "../Controller/AuthController.js";

const router = express.Router();

router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

export default router;
