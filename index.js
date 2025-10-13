import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import User from "./Models/User.js";
import transactionRoutes from "./Routes/TransactionRoutes.js";
import loanRoutes from "./Routes/LoanRoutes.js";
import { protect } from "./Middleware/AuthMiddleware.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Helper: Log with timestamp
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

// -------------------------
// Nodemailer Setup
// -------------------------


// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send a Welcome Email via NodeMailer
 * @param {string} to - Recipient email
 * @param {string} name - Full name of user
 * @param {string} accountNumber - User's account number
 */
const sendWelcomeEmail = async (to, name, accountNumber) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM, // e.g., "Vault Bank <no-reply@voltabancaditalia.com>"
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

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

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

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // Send welcome email via Resend
    await sendWelcomeEmail(newUser.email, `${newUser.firstName} ${newUser.lastName}`, newUser.accountNumber);

    res.status(201).json({
      _id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: `${newUser.firstName} ${newUser.lastName}`,
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
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: "Invalid email or password" });

    // Record login activity
    user.loginActivities.unshift({ action: "Login into dashboard", timestamp: new Date() });
    if (user.loginActivities.length > 10) user.loginActivities = user.loginActivities.slice(0, 10);
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
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




router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "No account found with that email" });

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // Reset password link
    const resetLink = `https://voltabancaditalia.vercel.app/reset-password/${token}`;

    // Send email using Nodemailer
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Vault Bank" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>Hello ${user.firstName},</h3>
          <p>You requested to reset your password. Click the link below to set a new one:</p>
          <p><a href="${resetLink}" style="color: #007bff; text-decoration: none;">Reset Password</a></p>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn’t request this, please ignore this message.</p>
          <br/>
          <p>— The Vault Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`📧 Password reset email sent to ${user.email}`);
    res.json({ message: "Password reset link sent to your email" });
  } catch (err) {
    console.error("❌ Forgot Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// -------- RESET PASSWORD --------
// Password Reset Route
// -------------------------
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Find user by valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token still valid
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // Clear token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // -------------------------
    // Send confirmation email via NodeMailer
    // -------------------------
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM, // e.g., "Vault Bank <no-reply@voltabancaditalia.com>"
        to: user.email,
        subject: "Your Password Has Been Reset ✅",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h3>Hello ${user.firstName},</h3>
            <p>Your password has been successfully updated.</p>
            <p>If you did not perform this action, please contact support immediately.</p>
            <br/>
            <p style="color: #555;">- The Vault Team</p>
          </div>
        `,
      });

      console.log(`📧 Password reset confirmation email sent to ${user.email}`);
    } catch (emailErr) {
      console.error("❌ Failed to send reset confirmation email:", emailErr.message);
    }

    // Send API response
    res.json({
      message: "Password has been reset successfully. A confirmation email has been sent.",
    });
  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// -------- GET PROFILE --------
router.get("/profile", protect, async (req, res) => {
  if (!req.user) return res.status(404).json({ message: "User not found" });
  res.json({
    _id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    fullName: `${req.user.firstName} ${req.user.lastName}`,
    email: req.user.email,
    phone: req.user.phone,
    role: req.user.role,
    accountNumber: req.user.accountNumber,
    balance: req.user.balance,
    loginActivities: req.user.loginActivities,
  });
});

// -------- ADMIN ONLY: GET ALL USERS --------
router.get("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const users = await User.find({ role: "user" }).select("_id firstName lastName email balance");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------- ADMIN ONLY: INCREASE USER BALANCE --------
router.put("/:id/increase-balance", protect, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    user.balance += amount;
    await user.save();

    res.json({ message: `Balance updated`, balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------
// Mount Routes
// -------------------------
app.use("/users", router);
app.use("/api", transactionRoutes);
app.use("/api/loans", loanRoutes);

// -------------------------
// Global Error Handler
// -------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logWithTime(`✅ Server running on port ${PORT}`));
