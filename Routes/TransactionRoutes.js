// routes/transactionRoutes.js
import express from "express";
import {
  createDeposit,
  createWithdrawal,
  getBalance,
  getTransactions,
} from "../Controller/TransactionController.js";
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/transactions/deposit
 * @desc    Deposit funds (Inflow)
 * @access  Private
 */
router.post("/deposit", protect, createDeposit);

/**
 * @route   POST /api/transactions/withdraw
 * @desc    Withdraw funds (Outflow)
 * @access  Private
 */
router.post("/withdraw", protect, createWithdrawal);

/**
 * @route   GET /api/transactions/balance
 * @desc    Get account balance
 * @access  Private
 */
router.get("/balance", protect, getBalance);

/**
 * @route   GET /api/transactions
 * @desc    Get transaction history (inflow & outflow)
 * @access  Private
 */
router.get("/transactions", protect, getTransactions);


export default router;
