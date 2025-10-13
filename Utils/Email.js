import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using Resend API (Render-safe)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY environment variable.");
    }

    const data = await resend.emails.send({
      from: "Vault App <onboarding@resend.dev>", // no domain verification required
      to,
      subject,
      html,
    });

    console.log("✅ Email sent successfully via Resend:", data.id || data);
    return data;
  } catch (error) {
    console.error("❌ Error sending email via Resend:", error.message);
    if (error.response) {
      console.error("Resend API response:", error.response);
    }
    throw error;
  }
};
