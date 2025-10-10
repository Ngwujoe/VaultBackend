// Utils/Email.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML message body
 */
export const sendEmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM, // e.g., "Vault App <no-reply@yourdomain.com>"
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email via Resend:", error);
  }
};
