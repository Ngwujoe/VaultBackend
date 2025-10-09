import mongoose from "mongoose";

const transactionSchema = mongoose.Schema(
  {
    reference: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["deposit", "withdrawal", "transfer"], required: true },
    account: { type: String },
    status: { type: String, enum: ["Pending", "Processing", "Successful", "Failed"], default: "Pending" },
    description: { type: String },

      // ✅ Track inflow and outflow totals
    inflow: { type: Number, default: 0 },
    outflow: { type: Number, default: 0 },

    // ✅ Record inflow transactions (deposits, transfers, etc.)
    inflowHistory: [
      {
        source: { type: String, default: "Deposit" },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // ✅ Record outflow transactions (withdrawals, bills, etc.)
    outflowHistory: [
      {
        reason: { type: String, default: "Withdrawal" },
        amount: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
