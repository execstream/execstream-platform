import dotenv from "dotenv";
import { createHash } from "crypto";
dotenv.config();

const REQUIRED_ENV_VARS = [
  "PORT",
  "MONGODB_URI",
  "CLIENT_URL",
  "NODE_ENV",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_SERVER",
  "MAILCHIMP_AUDIENCE_ID",
];

const OPTIONAL_ENV_VARS = [
  "LOG_LEVEL",
  "REDIS_URL",
  "REDIS_CACHE_TTL",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX_REQUESTS",
  "HEALTH_CHECK_PATH",
  "REQUEST_TIMEOUT_MS",
];

const SENSITIVE_VARS = [
  "JWT_SECRET",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "BREVO_SENDER_NAME",
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_AUDIENCE_ID",
];

const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^placeholder/i,
  /^change_me/i,
  /^replace_me/i,
  /^example/i,
  /^dummy/i,
  /^test_/i,
  /^<.*>$/,
  /^\[.*\]$/,
  /^xxx/i,
  /^todo/i,
  /^fixme/i,
];

function maskSensitiveValue(key, value) {
  if (!value || typeof value !== "string") return value;

  if (SENSITIVE_VARS.includes(key)) {
    if (value.length <= 8) {
      return "*".repeat(value.length);
    }
    return (
      value.substring(0, 4) +
      "*".repeat(value.length - 8) +
      value.substring(value.length - 4)
    );
  }

  return value;
}

function validateEnvVar(key, value, isRequired = true) {
  if (!value) {
    return isRequired ? `${key} is not set` : null;
  }

  if (typeof value !== "string") {
    return `${key} must be a string`;
  }

  if (value.trim() === "") {
    return `${key} is empty`;
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(value)) {
      return `${key} appears to be a placeholder value: ${maskSensitiveValue(
        key,
        value
      )}`;
    }
  }

  return null;
}

function validateUrlFormat(key, value, requireHttps = false) {
  if (!value) return null;

  try {
    const url = new URL(value);

    if (requireHttps && url.protocol !== "https:") {
      return `${key} must use HTTPS in production environment`;
    }

    return null;
  } catch (e) {
    return `${key} must be a valid URL. Got: ${maskSensitiveValue(key, value)}`;
  }
}

function validateSecretStrength(key, value, minLength = 32) {
  if (!value) return null;

  if (value.length < minLength) {
    return `${key} must be at least ${minLength} characters long for security`;
  }

  if (/^(password|secret|key|token)$/i.test(value)) {
    return `${key} appears to be a weak/default value`;
  }

  if (process.env.NODE_ENV === "production") {
    if (minLength >= 64 && !/^[A-Za-z0-9+/=]{64,}$/.test(value)) {
      return `${key} must be cryptographically secure in production (base64 format recommended)`;
    }
  }

  return null;
}

function validateSpecificVars() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === "production";
  const isStaging = process.env.NODE_ENV === "staging";

  const nodeEnv = process.env.NODE_ENV;
  if (
    nodeEnv &&
    !["development", "production", "test", "staging"].includes(nodeEnv)
  ) {
    errors.push(
      `NODE_ENV must be one of: development, production, test, staging. Got: ${nodeEnv}`
    );
  }

  const port = process.env.PORT;
  if (
    port &&
    (isNaN(Number(port)) || Number(port) <= 0 || Number(port) > 65535)
  ) {
    errors.push(`PORT must be a valid port number (1-65535). Got: ${port}`);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    if (
      !mongoUri.startsWith("mongodb://") &&
      !mongoUri.startsWith("mongodb+srv://")
    ) {
      errors.push(
        `MONGODB_URI must start with 'mongodb://' or 'mongodb+srv://'`
      );
    }

    if (isProduction && mongoUri.includes("localhost")) {
      errors.push("MONGODB_URI should not use localhost in production");
    }
  }

  const urlVars = [
    { key: "CLIENT_URL", requireHttps: isProduction || isStaging },
    { key: "GOOGLE_CALLBACK_URL", requireHttps: isProduction || isStaging },
    { key: "LINKEDIN_CALLBACK_URL", requireHttps: isProduction || isStaging },
  ];

  urlVars.forEach(({ key, requireHttps }) => {
    const error = validateUrlFormat(key, process.env[key], requireHttps);
    if (error) errors.push(error);
  });

  const secretValidations = [
    { key: "JWT_SECRET", minLength: isProduction ? 64 : 32 },
  ];

  secretValidations.forEach(({ key, minLength }) => {
    const error = validateSecretStrength(key, process.env[key], minLength);
    if (error) errors.push(error);
  });

  const numericVars = [
    { key: "RATE_LIMIT_WINDOW_MS", min: 1000, max: 86400000 }, // 1 second to 24 hours
    { key: "RATE_LIMIT_MAX_REQUESTS", min: 1, max: 10000 },
    { key: "REQUEST_TIMEOUT_MS", min: 1000, max: 300000 },
  ];

  numericVars.forEach(({ key, min, max }) => {
    const value = process.env[key];
    if (value) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < min || numValue > max) {
        errors.push(
          `${key} must be a number between ${min} and ${max}. Got: ${value}`
        );
      }
    }
  });

  const logLevel = process.env.LOG_LEVEL;
  if (
    logLevel &&
    !["error", "warn", "info", "debug", "trace"].includes(
      logLevel.toLowerCase()
    )
  ) {
    errors.push(
      `LOG_LEVEL must be one of: error, warn, info, debug, trace. Got: ${logLevel}`
    );
  }

  if (isProduction) {
    REQUIRED_ENV_VARS.forEach((key) => {
      if (!process.env[key]) {
        errors.push(`${key} is required in production environment`);
      }
    });

    if (process.env.LOG_LEVEL === "debug") {
      warnings.push(
        "LOG_LEVEL is set to 'debug' in production - consider using 'info' or 'warn'"
      );
    }

    if (
      process.env.CLIENT_URL &&
      process.env.CLIENT_URL.includes("localhost")
    ) {
      errors.push("CLIENT_URL should not use localhost in production");
    }
  }

  return { errors, warnings };
}

function validateConfiguration() {
  const validationErrors = [];
  const validationWarnings = [];

  REQUIRED_ENV_VARS.forEach((key) => {
    const error = validateEnvVar(key, process.env[key], true);
    if (error) validationErrors.push(error);
  });

  OPTIONAL_ENV_VARS.forEach((key) => {
    const error = validateEnvVar(key, process.env[key], false);
    if (error) validationErrors.push(error);
  });

  const { errors, warnings } = validateSpecificVars();
  validationErrors.push(...errors);
  validationWarnings.push(...warnings);

  const missingOptionalVars = OPTIONAL_ENV_VARS.filter(
    (key) => !process.env[key]
  );

  return {
    errors: validationErrors,
    warnings: validationWarnings,
    missingOptional: missingOptionalVars,
  };
}

function generateConfigHash() {
  const configString = JSON.stringify({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  });
  return createHash("sha256")
    .update(configString)
    .digest("hex")
    .substring(0, 8);
}

const { errors, warnings, missingOptional } = validateConfiguration();

if (errors.length > 0) {
  console.error("❌ Environment Configuration Errors:");
  errors.forEach((error) => console.error(`  • ${error}`));
  console.error(
    "\n💡 Please check your .env file and ensure all required variables are properly set."
  );
  console.error("📖 Refer to .env.example for the correct format.");

  if (process.env.NODE_ENV === "production") {
    console.error("🚨 Production environment configuration failed!");
    process.exit(1);
  } else {
    console.error("🛑 Development environment configuration failed!");
    process.exit(1);
  }
}

if (warnings.length > 0) {
  console.warn("⚠️ Configuration Warnings:");
  warnings.forEach((warning) => console.warn(`  • ${warning}`));
}

if (missingOptional.length > 0) {
  const message = `Optional environment variables not set: ${missingOptional.join(
    ", "
  )}`;
  if (process.env.NODE_ENV === "production") {
    console.warn(`⚠️ ${message}`);
  } else {
    console.info(`ℹ️ ${message}`);
  }
}

if (
  process.env.NODE_ENV !== "production" ||
  process.env.LOG_LEVEL === "debug"
) {
  const configHash = generateConfigHash();
  console.log(
    `✅ Environment configuration validated successfully [${configHash}]`
  );
}

export const config = {
  // Server Configuration
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL,
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS) || 30000,
  HEALTH_CHECK_PATH: process.env.HEALTH_CHECK_PATH || "/health",

  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
  REDIS_CACHE_TTL: process.env.REDIS_CACHE_TTL,

  // Security
  JWT_SECRET: process.env.JWT_SECRET,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Email Services
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,

  // Mailchimp
  MAILCHIMP_API_KEY: process.env.MAILCHIMP_API_KEY,
  MAILCHIMP_SERVER: process.env.MAILCHIMP_SERVER,
  MAILCHIMP_AUDIENCE_ID: process.env.MAILCHIMP_AUDIENCE_ID,

  // Monitoring & Logging
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  // Environment Flags
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV === "development",
  IS_TEST: process.env.NODE_ENV === "test",
  IS_STAGING: process.env.NODE_ENV === "staging",

  // Computed Values
  CONFIG_HASH: generateConfigHash(),
  LOADED_AT: new Date().toISOString(),
};

Object.freeze(config);

export const utils = {
  maskSensitiveValue,
  validateEnvVar,
  validateUrlFormat,
  validateSecretStrength,
  generateConfigHash,
};

export const getConfigStatus = () => ({
  isValid: errors.length === 0,
  errorCount: errors.length,
  warningCount: warnings.length,
  missingOptionalCount: missingOptional.length,
  configHash: config.CONFIG_HASH,
  loadedAt: config.LOADED_AT,
});
