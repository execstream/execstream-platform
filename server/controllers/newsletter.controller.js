import axios from "axios";
import { validateEmail, validateRequiredString } from "../utils/validators.js";
import validator from "validator";
import { config } from "../configs/env.js";

const sanitizeName = (name) => {
  if (!name || typeof name !== "string") return "";
  return validator.escape(name.trim());
};

export const addSubscriber = async (req, res) => {
  console.log("Adding subscriber...");
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const emailValidationError = validateEmail(email);
    if (emailValidationError) {
      return res.status(400).json({
        success: false,
        message: emailValidationError,
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    let nameNormalized = "";
    if (name) {
      const nameValidationError = validateRequiredString(name, "Name");
      if (nameValidationError) {
        return res.status(400).json({
          success: false,
          message: nameValidationError,
        });
      }
      nameNormalized = sanitizeName(name);
      if (!nameNormalized || nameNormalized.length < 1) {
        return res.status(400).json({
          success: false,
          message: "Name contains invalid characters.",
        });
      }
    }

    console.log(
      `Newsletter subscription attempt for email: ${emailNormalized}`
    );

    const apiUrl = `https://${config.MAILCHIMP_SERVER}.api.mailchimp.com/3.0/lists/${config.MAILCHIMP_AUDIENCE_ID}/members`;

    const mergeFields = {};

    if (nameNormalized) {
      const nameParts = nameNormalized.split(" ");
      if (nameParts.length > 1) {
        mergeFields.FNAME = nameParts[0];
        mergeFields.LNAME = nameParts.slice(1).join(" ");
      } else {
        mergeFields.FNAME = nameNormalized;
      }
    }

    const requestData = {
      email_address: emailNormalized,
      status: "subscribed",
      merge_fields: mergeFields,
      tags: ["newsletter", "website-signup"],
    };

    const response = await axios.post(apiUrl, requestData, {
      headers: {
        Authorization: `apikey ${config.MAILCHIMP_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log(
      `Newsletter subscription successful for email: ${emailNormalized}`
    );

    res.status(200).json({
      success: true,
      message: nameNormalized
        ? `Successfully subscribed to newsletter! Thank you for subscribing, ${nameNormalized}.`
        : "Successfully subscribed to newsletter! Thank you for subscribing.",
      data: {
        email: emailNormalized,
        name: nameNormalized || null,
        id: response.data?.id || null,
        status: response.data?.status || null,
        timestamp: response.data?.timestamp_signup || null,
        merge_fields: response.data?.merge_fields || {},
      },
    });
  } catch (err) {
    const errorData = err?.response?.data;
    const statusCode = err?.response?.status || 500;

    console.error(
      `Newsletter subscription error for: ${req.body?.email || "unknown"}:`,
      {
        status: statusCode,
        title: errorData?.title,
        detail: errorData?.detail,
        errors: errorData?.errors || err,
      }
    );

    if (errorData?.title === "Member Exists") {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed to our newsletter.",
      });
    }

    if (errorData?.title === "Invalid Resource") {
      return res.status(400).json({
        success: false,
        message: "Invalid email address format.",
      });
    }

    if (errorData?.title === "Forgotten Email Not Subscribed") {
      return res.status(400).json({
        success: false,
        message: "This email cannot be subscribed at this time.",
      });
    }

    if (statusCode === 429) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again in a few minutes.",
      });
    }

    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Request timeout. Please try again.",
      });
    }

    if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
      console.error("Network error connecting to Mailchimp API");
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable. Please try again later.",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Unable to process subscription at this time. Please try again later.",
    });
  }
};
