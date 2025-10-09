import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../Models/User.js";

// If you already have a transporter configured, reuse it
const transporter = nodemailer.createTransport({
  service: "gmail", // or "outlook", "yahoo", etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------
// 1️⃣ Request password reset
// -----------------------------
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a reset token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Create reset link
    const resetURL = `http://localhost:5173/reset-password/${token}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h3>Hello ${user.firstName},</h3>
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password (valid for 15 minutes):</p>
        <a href="${resetURL}">${resetURL}</a>
        <p>If you didn’t request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Reset password request error:", error);
    res.status(500).json({ message: "Server error while sending reset link" });
  }
};

// -----------------------------
// 2️⃣ Reset password (after clicking link)
// -----------------------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Token must still be valid
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error while resetting password" });
  }
};
