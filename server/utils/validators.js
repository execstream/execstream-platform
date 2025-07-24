import validator from "validator";

export const validateRequiredString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim() === "") {
    return `${fieldName} must be a non-empty string.`;
  }
  return null;
};

export const validateEmail = (email) => {
  if (typeof email !== "string" || email.trim() === "") {
    return "Email is required.";
  }

  const emailNormalized = email.trim().toLowerCase();
  return validator.isEmail(emailNormalized) ? null : "Invalid email format.";
};

export const validateStrongPassword = (password) => {
  if (
    !validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
  ) {
    return "Password must be at least 8 characters long and include uppercase, lowercase, number, and symbol.";
  }
  return null;
};

export const validateURL = (
  data,
  fields = ["linkedin_url", "twitter_url", "website_url"]
) => {
  for (const field of fields) {
    if (data[field] && data[field].trim() !== "") {
      const url = data[field].trim();
      if (!validator.isURL(url, { require_protocol: true })) {
        return `Invalid ${field.replace(
          "_",
          " "
        )} format. Must include http(s)://`;
      }
    }
  }
  return null;
};

export const allowedContentTypes = [
  "article",
  "podcast",
  "video",
  "interview",
  "webinar",
  "news",
  "insight",
  "report",
  "webcast",
  "movements",
];

export const validateContentType = (type) => {
  if (!allowedContentTypes.includes(type)) {
    return `Invalid content_type. Allowed values: ${allowedContentTypes.join(
      ", "
    )}`;
  }
  return null;
};

export const allowedSortFields = ["updated_at", "created_at", "publish_date"];
export const allowedSortOrders = ["asc", "desc"];

export const validateSortField = (field) => {
  if (!allowedSortFields.includes(field)) {
    return `Invalid sort field. Allowed fields: ${allowedSortFields.join(
      ", "
    )}`;
  }
  return null;
};

export const validateSortOrder = (order) => {
  if (!allowedSortOrders.includes(order)) {
    return `Invalid sort order. Allowed values: ${allowedSortOrders.join(
      ", "
    )}`;
  }
  return null;
};
