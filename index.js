import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Resend } from "resend";
import User from "./Models/User.js";
import transactionRoutes from "./Routes/TransactionRoutes.js";
import loanRoutes from "./Routes/LoanRoutes.js";
import { protect } from "./Middleware/AuthMiddleware.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Helper: log with timestamp
const logWithTime = (msg, data = null) => {
  const time = new Date().toISOString();
  console.log(data ? `[${time}] ${msg}` : `[${time}] ${msg}`, data || "");
};

// -------------------------
// MongoDB Connection
// -------------------------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logWithTime("✅ MongoDB Connected"))
  .catch((err) => logWithTime("❌ MongoDB connection error:", err));



  console.log("Resend API key:", process.env.RESEND_API_KEY ? "✅ Loaded" : "❌ Missing");


// -------------------------
// Email Helpers (Resend)
// -------------------------
const sendWelcomeEmail = async (to, name, accountNumber) => {
  try {
    await resend.emails.send({
      from: "VoltaBancaditalia <no-reply@voltabancaditalia.com>", // you can change to verified domain later
      to,
      subject: "Welcome to Volta Banca d’Italia! 💳",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome, ${name}!</h2>
          <p>Your Vault account has been successfully created.</p>
          <p><strong>Account Number:</strong> ${accountNumber}</p>
          <p>You can now log in to manage your account, check your balance, and more.</p>
          <br/>
          <p>Thank you for choosing <strong>Vault Bank</strong>.</p>
          <p style="color: #555;">- The Vault Team</p>
        </div>
      `,
    });

    console.log(`📧 Welcome email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending welcome email:", err.message);
  }
};

const sendPasswordResetEmail = async (to, name, resetLink) => {
  try {
    await resend.emails.send({
      from: "VoltaBancaditalia <no-reply@voltabancaditalia.com>",
      to,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>Hello ${name},</h3>
          <p>You requested to reset your password. Click the link below to set a new one:</p>
          <p><a href="${resetLink}" style="color: #007bff; text-decoration: none;">Reset Password</a></p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn’t request this, please ignore this message.</p>
          <br/>
          <p>— The Vault Team</p>
        </div>
      `,
    });

    console.log(`📧 Password reset email sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending reset email:", err.message);
  }
};

const sendPasswordResetConfirmation = async (to, name) => {
  try {
    await resend.emails.send({
      from: "VoltaBancaditalia <no-reply@voltabancaditalia.com>",
      to,
      subject: "Your Password Has Been Reset ✅",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>Hello ${name},</h3>
          <p>Your password has been successfully updated.</p>
          <p>If you did not perform this action, please contact support immediately.</p>
          <br/>
          <p style="color: #555;">- The Vault Team</p>
        </div>
      `,
    });

    console.log(`📧 Password reset confirmation sent to ${to}`);
  } catch (err) {
    console.error("❌ Error sending confirmation email:", err.message);
  }
};

// -------------------------
// User Routes
// -------------------------
const router = express.Router();

// -------- REGISTER --------
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;
    if (!firstName || !lastName || !phone || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
      role: "user",
      accountNumber: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await sendWelcomeEmail(
      newUser.email,
      `${newUser.firstName} ${newUser.lastName}`,
      newUser.accountNumber
    );

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      accountNumber: newUser.accountNumber,
      balance: newUser.balance,
      loginActivities: newUser.loginActivities,
      token,
    });
  } catch (err) {
    console.error("❌ Register Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- LOGIN --------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(400).json({ message: "Invalid email or password" });

    user.loginActivities.unshift({
      action: "Login into dashboard",
      timestamp: new Date(),
    });
    if (user.loginActivities.length > 10)
      user.loginActivities = user.loginActivities.slice(0, 10);
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      accountNumber: user.accountNumber,
      balance: user.balance,
      loginActivities: user.loginActivities,
      token,
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- FORGOT PASSWORD --------
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "No account found with that email" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    await sendPasswordResetEmail(user.email, user.firstName, resetLink);

    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- RESET PASSWORD --------
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired reset link" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await sendPasswordResetConfirmation(user.email, user.firstName);

    res.json({
      message:
        "Password has been reset successfully. A confirmation email has been sent.",
    });
  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- PROFILE & ADMIN ROUTES --------
router.get("/profile", protect, async (req, res) => {
  if (!req.user) return res.status(404).json({ message: "User not found" });
  res.json(req.user);
});

router.get("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admins only" });
    const users = await User.find({ role: "user" }).select(
      "_id firstName lastName email balance"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id/increase-balance", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admins only" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    user.balance += amount;
    await user.save();
    res.json({ message: `Balance updated`, balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------
app.use("/users", router);
app.use("/api", transactionRoutes);
app.use("/api/loans", loanRoutes);

// -------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logWithTime(`✅ Server running on port ${PORT}`));
