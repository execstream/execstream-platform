import multer from "multer";
import { uploader } from "../configs/cloudinary.js";
import upload from "../middlewares/upload.middleware.js";

const UPLOAD_CONFIGS = {
  contributor: [
    {
      name: "profile_image",
      maxCount: 1,
      folder: "exec_stream/contributors/profile_images",
      resultKey: "profile_image_url",
    },
    {
      name: "company_logo",
      maxCount: 1,
      folder: "exec_stream/contributors/company_logos",
      resultKey: "company_logo_url",
    },
  ],
  content: [
    {
      name: "profile_image",
      maxCount: 1,
      folder: "exec_stream/content/contributor_profile_photos",
      resultKey: "profile_image_url",
    },
    {
      name: "company_logo",
      maxCount: 1,
      folder: "exec_stream/content/contributor_company_logos",
      resultKey: "company_logo_url",
    },
    {
      name: "banner_image",
      maxCount: 1,
      folder: "exec_stream/content/banners",
      resultKey: "banner_image_url",
    },
  ],
  webConfig: [
    {
      name: "event_banner_image",
      maxCount: 1,
      folder: "exec_stream/web_configs/event_banners",
      resultKey: "event_banner_image_url",
    },
    {
      name: "expert_profile_image",
      maxCount: 1,
      folder: "exec_stream/web_configs/featured_experts",
      resultKey: "expert_profile_image_url",
    },
    {
      name: "partner_company_logo_image",
      maxCount: 1,
      folder: "exec_stream/web_configs/partner_companies",
      resultKey: "partner_company_logo_image_url",
    },
  ],
  series: [
    {
      name: "company_logo",
      maxCount: 1,
      folder: "exec_stream/series/company_logos",
      resultKey: "company_logo_url",
    },
  ],
};

const PARSE_CONFIG = {
  stringFields: ["publish_date"],
  jsonFields: ["contributors", "current_employment", "employment"],
  arrayFields: ["theme_ids", "sub_theme_ids", "industry_ids", "exec_role_ids"],
  booleanFields: ["featured", "hero", "popular"],
  nullableFields: ["series_id", "scheduled_for"],
  webConfigBooleanFields: ["is_active"],
  webConfigNumberFields: ["order"],
};

export const parseData = (req, res, next) => {
  try {
    const { body } = req;

    const parseStringField = (field) => {
      if (body[field]) {
        body[field] = body[field].trim();
      }
    };

    const parseJsonField = (field) => {
      if (body[field] && typeof body[field] === "string") {
        body[field] = JSON.parse(body[field]);
      }
    };

    const parseArrayField = (field) => {
      if (body[field]) {
        if (typeof body[field] === "string") {
          body[field] = JSON.parse(body[field]);
        }
        if (!Array.isArray(body[field])) {
          body[field] = [body[field]];
        }
      }
    };

    const parseBooleanField = (field) => {
      if (body[field] && typeof body[field] === "string") {
        body[field] = body[field] === "true";
      }
    };

    const parseNullableField = (field) => {
      if (body[field] === "null" || body[field] === "") {
        body[field] = null;
      }
    };

    const parseNumberField = (field) => {
      if (body[field] && typeof body[field] === "string") {
        const numValue = parseInt(body[field], 10);
        if (!isNaN(numValue)) {
          body[field] = numValue;
        }
      }
    };

    PARSE_CONFIG.stringFields.forEach(parseStringField);
    PARSE_CONFIG.jsonFields.forEach(parseJsonField);
    PARSE_CONFIG.arrayFields.forEach(parseArrayField);
    PARSE_CONFIG.booleanFields.forEach(parseBooleanField);
    PARSE_CONFIG.nullableFields.forEach(parseNullableField);
    PARSE_CONFIG.webConfigBooleanFields.forEach(parseBooleanField);
    PARSE_CONFIG.webConfigNumberFields.forEach(parseNumberField);

    console.log("Parsed data:", body);
    next();
  } catch (error) {
    console.error("Error parsing content data:", error);
    next(error);
  }
};

const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) {
      console.error("Could not find 'upload' in URL:", url);
      return null;
    }

    let pathAfterUpload = parts.slice(uploadIndex + 1);

    if (pathAfterUpload[0] && /^v\d+$/.test(pathAfterUpload[0])) {
      pathAfterUpload = pathAfterUpload.slice(1);
    }

    const publicId = pathAfterUpload.join("/").replace(/\.[^/.]+$/, "");
    console.log(`Extracted public_id: ${publicId} from URL: ${url}`);
    return publicId;
  } catch (err) {
    console.error("Error extracting public ID from URL:", err);
    return null;
  }
};

const uploadToCloudinary = (buffer, folder, resourceType = "image") => {
  return new Promise((resolve, reject) => {
    const uploadStream = uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        quality: "auto:good",
        fetch_format: "auto",
        flags: "progressive",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (imageUrl, label) => {
  try {
    if (!imageUrl) return;

    const publicId = getPublicIdFromUrl(imageUrl);
    await uploader.destroy(publicId);
    console.log(`Deleted ${label} image:`, publicId);
  } catch (error) {
    console.error(`Warning: Failed to delete ${label} image:`, error.message);
  }
};

const createUploadMiddleware = (configKey) => {
  const config = UPLOAD_CONFIGS[configKey];
  return upload.fields(
    config.map(({ name, maxCount }) => ({ name, maxCount }))
  );
};

const createUploadProcessor = (configKey) => {
  return async (req, res, next) => {
    console.log(`Processing ${configKey} uploads...`);
    try {
      const config = UPLOAD_CONFIGS[configKey];
      const uploadPromises = [];

      config.forEach(({ name, folder, resultKey }) => {
        if (req.files?.[name]?.[0]) {
          const file = req.files[name][0];

          uploadPromises.push(
            uploadToCloudinary(file.buffer, folder).then((result) => {
              req.uploadResults = req.uploadResults || {};
              req.uploadResults[resultKey] = result.secure_url;
              console.log(`[${folder}] image uploaded successfully!`);
            })
          );
        }
      });

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
        console.log(`All ${configKey} file uploads completed successfully`);
      } else {
        console.log(`No ${configKey} file uploads to complete`);
      }

      next();
    } catch (error) {
      console.error(`${configKey} file processing error:`, error);
      next(error);
    }
  };
};

export const uploadContributorFiles = createUploadMiddleware("contributor");
export const processContributorUploads = createUploadProcessor("contributor");

export const uploadContentFiles = createUploadMiddleware("content");
export const processContentUploads = createUploadProcessor("content");

export const uploadWebConfigFiles = createUploadMiddleware("webConfig");
export const processWebConfigUploads = createUploadProcessor("webConfig");

export const uploadSeriesFiles = createUploadMiddleware("series");
export const processSeriesUploads = createUploadProcessor("series");

export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const errorMessages = {
      LIMIT_FILE_SIZE: "File too large. Maximum size is 10MB.",
      LIMIT_FILE_COUNT: "Too many files. Maximum 2 files allowed.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };

    const message = errorMessages[error.code];
    if (message) {
      return res.status(400).json({ message });
    }
  }

  if (error.message === "Only image files are allowed") {
    return res.status(400).json({
      message: "Only image files are allowed",
    });
  }

  next(error);
};

export const cleanupOldImages = async (oldImageUrl, newImageUrl, label) => {
  if (oldImageUrl && newImageUrl && oldImageUrl !== newImageUrl) {
    await deleteFromCloudinary(oldImageUrl, label);
  }
};

export const parseWebConfigData = (req, res, next) => {
  try {
    const { body } = req;

    if (body.is_active && typeof body.is_active === "string") {
      body.is_active = body.is_active === "true";
    }

    if (body.order && typeof body.order === "string") {
      const orderNum = parseInt(body.order, 10);
      if (!isNaN(orderNum)) {
        body.order = orderNum;
      }
    }

    next();
  } catch (error) {
    console.error("Error parsing webconfig data:", error);
    next(error);
  }
};
