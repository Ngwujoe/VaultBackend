// Models/Loan.js
import mongoose from "mongoose";

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    account: { type: String, required: true },
    type: { type: String, required: true },
    duration: { type: String, required: true },
    repayment: { type: String, required: true },
    details: { type: String, required: true },
    pincode: { type: String, required: true },
    status: { type: String, default: "Pending" }, // Pending, Approved, Rejected
  },
  { timestamps: true }
);

export default mongoose.model("Loan", loanSchema);
