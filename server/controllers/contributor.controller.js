import {
  deleteCloudinaryImage,
  replaceImage,
  uploadBase64Image,
} from "../helpers/cloudinary.helpers.js";
import Contributor from "../models/Contributor.js";
import {
  validateEmail,
  validateRequiredString,
  validateURL,
} from "../utils/validators.js";

export const getAll = async (req, res) => {
  console.log("Fetching all contributors");
  try {
    const contributors = await Contributor.find({})
      .sort({ created_at: -1 })
      .lean();

    console.log(`Found ${contributors.length} contributors`);
    res.json({
      message: "Contributors fetched successfully",
      contributors,
    });
  } catch (err) {
    console.error("Error fetching contributors:", err);
    res.status(500).json({ message: "Error fetching contributors" });
  }
};

export const getById = async (req, res) => {
  console.log("Fetching contributor by ID:", req.params.id);
  try {
    const contributor = await Contributor.findById(req.params.id).lean();

    if (!contributor) {
      return res.status(404).json({ message: "Contributor not found" });
    }

    console.log("Contributor fetched successfully");
    res.json({
      message: "Contributor fetched successfully",
      contributor,
    });
  } catch (err) {
    console.error("Error fetching contributor:", err);
    res.status(500).json({ message: "Error fetching contributor" });
  }
};

export const create = async (req, res) => {
  console.log("Creating new contributor");
  try {
    const data = { ...req.body };
    console.log("Received data for creation:", {
      ...data,
      profile_image_base64: data.profile_image_base64
        ? "[BASE64_DATA]"
        : undefined,
      current_employment: {
        ...data.current_employment,
        company_logo_base64: data.current_employment?.company_logo_base64
          ? "[BASE64_DATA]"
          : undefined,
      },
    });

    const nameError = validateRequiredString(data.name, "name");
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    const emailError = validateEmail(data.email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const urlError = validateURL(data);
    if (urlError) {
      return res.status(400).json({ message: urlError });
    }

    if (data.profile_image_base64) {
      try {
        const photoUrl = await uploadBase64Image(
          data.profile_image_base64,
          "contributors",
          "Contributor"
        );

        data.profile_image_url = photoUrl;
        delete data.profile_image_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload contributor photo",
          error: uploadError.message,
        });
      }
    }

    if (data.current_employment?.company_logo_base64) {
      try {
        const logoUrl = await uploadBase64Image(
          data.current_employment.company_logo_base64,
          "company_logos",
          "Contributor_company"
        );
        data.current_employment.company_logo_url = logoUrl;
        delete data.current_employment.company_logo_base64;
      } catch (uploadError) {
        console.error("Company logo upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload company logo",
          error: uploadError.message,
        });
      }
    }

    const contributor = new Contributor({
      ...data,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await contributor.save();
    console.log("Created new contributor: ", contributor._id);
    res.status(201).json({ message: "Contributor created", contributor });
  } catch (err) {
    console.error("Error creating contributor:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A contributor with this email already exists",
      });
    }
    res.status(400).json({ message: "Error creating contributor" });
  }
};

export const update = async (req, res) => {
  console.log("Updating contributor:", req.params.id);
  try {
    const contributor = await Contributor.findById(req.params.id);
    if (!contributor) {
      console.log("Contributor not found");
      return res.status(404).json({ message: "Contributor not found" });
    }

    const data = { ...req.body };
    console.log("Received data for update:", {
      ...data,
      profile_image_base64: data.profile_image_base64
        ? "[BASE64_DATA]"
        : undefined,
      current_employment: {
        ...data.current_employment,
        company_logo_base64: data.current_employment?.company_logo_base64
          ? "[BASE64_DATA]"
          : undefined,
      },
    });

    const emailError = validateEmail(data.email);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    const urlError = validateURL(data);
    if (urlError) {
      return res.status(400).json({ message: urlError });
    }

    if (data.profile_image_base64) {
      try {
        const imageUrl = await replaceImage({
          base64: data.profile_image_base64,
          oldUrl: contributor.profile_image_url,
          folder: "contributors",
          label: "Contributor",
        });

        data.profile_image_url = imageUrl;
        delete data.profile_image_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error during update:", uploadError);
        return res.status(400).json({
          message: "Failed to upload contributor photo",
          error: uploadError.message,
        });
      }
    }

    if (data.current_employment?.company_logo_base64) {
      try {
        const imageUrl = await replaceImage({
          base64: data.current_employment.company_logo_base64,
          oldUrl: contributor.current_employment?.company_logo_url,
          folder: "company_logos",
          label: "Contributor_company_logo",
        });
        data.current_employment.company_logo_url = imageUrl;
        delete data.current_employment.company_logo_base64;
      } catch (uploadError) {
        console.error("Company logo upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload company logo",
          error: uploadError.message,
        });
      }
    }

    const updated = await Contributor.findByIdAndUpdate(
      req.params.id,
      {
        ...data,
        updated_at: new Date(),
      },
      { new: true, runValidators: true }
    );

    console.log("Updated contributor:", updated);
    res.json({ message: "Contributor updated", updated });
  } catch (err) {
    console.error("Error updating contributor:", err);
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A contributor with this email already exists",
      });
    }
    res.status(400).json({ message: "Error updating contributor" });
  }
};

export const remove = async (req, res) => {
  console.log("Deleting contributor:", req.params.id);
  try {
    const contributor = await Contributor.findByIdAndDelete(req.params.id);
    if (!contributor) {
      console.error("Contributor not found:", req.params.id);
      return res.status(404).json({ message: "Contributor not found" });
    }

    if (contributor.profile_image_url) {
      try {
        await deleteCloudinaryImage(
          contributor.profile_image_url,
          "Contributor"
        );
      } catch (err) {
        console.error(
          "Warning: Failed to delete contributor image",
          err.message
        );
      }
    }

    if (contributor.current_employment?.company_logo_url) {
      try {
        await deleteCloudinaryImage(
          contributor.current_employment.company_logo_url,
          "Contributor_company"
        );
      } catch (err) {
        console.error("Warning: Failed to delete company logo", err.message);
      }
    }

    console.log("Deleted contributor");
    res.json({ message: "Contributor removed successfully" });
  } catch (err) {
    console.error("Error deleting contributor:", err);
    res.status(500).json({ message: "Error deleting contributor" });
  }
};
