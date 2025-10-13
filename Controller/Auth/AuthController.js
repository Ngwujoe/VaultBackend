import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import User from "../Models/User.js";

// -----------------------------
// 1️⃣ NodeMailer Transporter
// -----------------------------
const transporter = nodemailer.createTransport({
  service: "gmail", // simpler for Gmail users
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------
// 2️⃣ Request Password Reset
// -----------------------------
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: "User not found" });

    // Generate a token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Frontend reset URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"VoltaBancad'italia" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>Hello ${user.firstName},</h3>
          <p>You requested a password reset.</p>
          <p>Click below to reset your password (valid for 15 minutes):</p>
          <a href="${resetURL}" style="color: #1a73e8;">${resetURL}</a>
          <p>If you didn’t request this, please ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Password reset email sent to ${user.email}`);

    res.status(200).json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("❌ Reset password request error:", error);
    res.status(500).json({ message: "Server error while sending reset link" });
  }
};

// -----------------------------
// 3️⃣ Reset Password Handler
// -----------------------------
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Confirmation email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"VoltaBancad'italia" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Your Password Has Been Reset ✅",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h3>Hello ${user.firstName},</h3>
          <p>Your password has been successfully updated.</p>
          <p>If this wasn’t you, please contact our support immediately.</p>
        </div>
      `,
    });

    console.log(`✅ Password reset confirmation sent to ${user.email}`);
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ message: "Server error while resetting password" });
  }
};
