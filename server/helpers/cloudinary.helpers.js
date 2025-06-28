import { uploader } from "../configs/cloudinary.js";

export const isBase64Image = (str) =>
  typeof str === "string" &&
  str.startsWith("data:image/") &&
  str.includes(";base64,");

export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const fileWithExt = parts[parts.length - 1];
    const publicId = fileWithExt.split(".")[0];
    const folder = parts.slice(-2, -1)[0];
    return `${folder}/${publicId}`;
  } catch (err) {
    console.error("Error extracting public ID from URL:", err);
    return null;
  }
};

export const uploadBase64Image = async (base64String, folder, context = "") => {
  console.log("Uploading base64 image to Cloudinary");
  try {
    if (!base64String || !isBase64Image(base64String)) {
      console.warn(`[${context}] Invalid base64 image provided`);
      throw new Error(`Invalid base64 format for ${context} image`);
    }

    const result = await uploader.upload(base64String, {
      folder,
      resource_type: "image",
    });

    console.log(
      `[${context}] Uploaded image to Cloudinary: ${result.secure_url}`
    );
    return result.secure_url;
  } catch (err) {
    console.error(`[${context}] Cloudinary upload error:`, err.message);
    throw new Error(`Failed to upload ${context} image`);
  }
};

export const deleteCloudinaryImage = async (imageUrl, context = "") => {
  console.log("Deleting image from Cloudinary...");
  try {
    if (!imageUrl) return;

    const publicId = getPublicIdFromUrl(imageUrl);
    if (!publicId) {
      console.warn(`[${context}] No valid publicId found in URL:`, imageUrl);
      return;
    }

    const result = await uploader.destroy(publicId);
    console.log(`[${context}] Deleted Cloudinary image:`, publicId);
    return result;
  } catch (err) {
    console.error(`[${context}] Failed to delete Cloudinary image:`, err);
    throw new Error(`Failed to delete ${context} image`);
  }
};

export const replaceImage = async ({
  base64,
  oldUrl,
  folder,
  label,
  skipDelete = false,
}) => {
  try {
    const imageUrl = await uploadBase64Image(base64, folder, label);
    // console.log(`Image uploaded successfully: ${imageUrl}`);

    if (!skipDelete && oldUrl) {
      try {
        await deleteCloudinaryImage(oldUrl, label);
        // console.log(`Old image deleted successfully: ${oldUrl}`);
      } catch (err) {
        console.warn(`Failed to delete old image: ${err.message}`);
      }
    }

    return imageUrl;
  } catch (err) {
    throw new Error("Failed to replace image: " + err.message);
  }
};