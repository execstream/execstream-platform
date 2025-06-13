import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  const msg = {
    to,
    from: process.env.EMAIL_USER,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent to", to);
  } catch (err) {
    console.error("SendGrid error:", err.response?.body || err);
    throw new Error("Email failed to send.");
  }
};
