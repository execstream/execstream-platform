export const validateRequiredString = (value, fieldName) => {
  if (typeof value !== "string" || value.trim() === "") {
    return `${fieldName} is required and must be a non-empty string.`;
  }
  return null;
};

export const validateEmail = (email) => {
  if (!email || typeof email !== "string") return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) ? null : "Invalid email format.";
};

export const validateURL = (
  data,
  fields = ["linkedin_url", "twitter_url", "website_url"]
) => {
  for (const field of fields) {
    if (data[field] && data[field].trim() !== "") {
      try {
        new URL(data[field]);
      } catch (error) {
        return `Invalid ${field.replace("_", " ")} format.`;
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
