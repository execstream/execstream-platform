import Brevo from "@getbrevo/brevo";
import { config } from "./env.js";

const transactionalApi = new Brevo.TransactionalEmailsApi();
transactionalApi.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  config.BREVO_API_KEY
);

export const sendEmail = async ({ to, subject, html }) => {
  if (!to || !subject) {
    throw new Error("Missing required email parameters: to, subject.");
  }

  const msg = {
    sender: {
      email: config.BREVO_SENDER_EMAIL,
      name: config.BREVO_SENDER_NAME,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    const response = await transactionalApi.sendTransacEmail(msg);

    console.log(`Brevo email sent to ${to}`, {
      messageId: response?.body?.messageId || null,
    });
  } catch (err) {
    console.error(
      "Brevo sendEmail error:",
      err.response?.body || err.message || err
    );
    throw new Error("Email failed to send.");
  }
};
