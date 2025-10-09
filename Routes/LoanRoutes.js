// Routes/LoanRoutes.js
import express from "express";
import { createLoanRequest, getAllLoans } from "../Controller/LoanController.js";
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// User submits a loan request
router.post("/loan-request", protect, createLoanRequest);

// Admin / Dashboard: Get all loan requests
router.get("/loans", protect, getAllLoans);

export default router;
;
