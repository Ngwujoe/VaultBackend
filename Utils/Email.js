// Utils/Email.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Create reusable transporter using SMTP.
 * For Gmail: enable "Less Secure App Access" or use an App Password.
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,        // e.g. "smtp.gmail.com"
  port: process.env.SMTP_PORT || 587, // 465 for SSL, 587 for TLS
  secure: false,                      // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,      // e.g. your email address
    pass: process.env.SMTP_PASS,      // e.g. your app password
  },
});

/**
 * Send an email via NodeMailer
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML message body
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Vault App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
