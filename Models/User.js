import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: "user" },
    password: { type: String, required: true },
    accountNumber: { type: String, required: true },
    balance: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },


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

    // ✅ Record login and other activity history
    loginActivities: [
      {
        action: { type: String, default: "Login into dashboard" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// 🔒 Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
