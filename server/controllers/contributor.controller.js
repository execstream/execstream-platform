import {
  cleanupOldImages,
  deleteFromCloudinary,
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

    const total_contributors = contributors.length;

    console.log(`Found ${total_contributors} contributors`);
    res.json({
      message: "Contributors fetched successfully",
      total_contributors,
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
      files: req.files ? Object.keys(req.files) : "none",
    });

    const nameError = validateRequiredString(data.name, "name");
    if (nameError) {
      return res.status(400).json({ message: nameError });
    }

    if (data.email) {
      const emailError = validateEmail(data.email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
    }

    if (data.linkedin_url || data.twitter_url || data.website_url) {
      const urlError = validateURL(data);
      if (urlError) {
        return res.status(400).json({ message: urlError });
      }
    }

    if (req.uploadResults?.profile_image_url) {
      data.profile_image_url = req.uploadResults.profile_image_url;
    }

    if (req.uploadResults?.company_logo_url) {
      if (!data.current_employment) {
        data.current_employment = {};
      }
      data.current_employment.company_logo_url =
        req.uploadResults.company_logo_url;
    }

    const contributor = new Contributor({
      ...data,
      created_by: req.user.id,
    });
    await contributor.save();
    console.log("Created new contributor: ", contributor._id);
    res.status(201).json({ message: "Contributor created", contributor });
  } catch (err) {
    console.error("Error creating contributor:", err);

    if (req.uploadResults?.profile_image_url) {
      await deleteFromCloudinary(
        req.uploadResults.profile_image_url,
        "Contributor"
      );
    }
    if (req.uploadResults?.company_logo_url) {
      await deleteFromCloudinary(
        req.uploadResults.company_logo_url,
        "Contributor_company"
      );
    }

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
      files: req.files ? Object.keys(req.files) : "none",
    });

    if (data.current_employment) {
      data.current_employment = {
        ...contributor.toObject().current_employment,
        ...data.current_employment,
      };
    }

    if (data.email) {
      const emailError = validateEmail(data.email);
      if (emailError) {
        return res.status(400).json({ message: emailError });
      }
    }

    if (data.linkedin_url || data.twitter_url || data.website_url) {
      const urlError = validateURL(data);
      if (urlError) {
        return res.status(400).json({ message: urlError });
      }
    }

    if (req.uploadResults?.profile_image_url) {
      await cleanupOldImages(
        contributor.profile_image_url,
        req.uploadResults.profile_image_url,
        "Contributor"
      );
      data.profile_image_url = req.uploadResults.profile_image_url;
    }

    if (req.uploadResults?.company_logo_url) {
      await cleanupOldImages(
        contributor.current_employment?.company_logo_url,
        req.uploadResults.company_logo_url,
        "Contributor_company"
      );

      if (!data.current_employment) {
        data.current_employment = contributor.current_employment || {};
      }
      data.current_employment.company_logo_url =
        req.uploadResults.company_logo_url;
    }

    const updated = await Contributor.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });

    console.log("Updated contributor:", updated);
    res.json({ message: "Contributor updated", updated });
  } catch (err) {
    console.error("Error updating contributor:", err);

    if (req.uploadResults?.profile_image_url) {
      await deleteFromCloudinary(
        req.uploadResults.profile_image_url,
        "Contributor"
      );
    }
    if (req.uploadResults?.company_logo_url) {
      await deleteFromCloudinary(
        req.uploadResults.company_logo_url,
        "Contributor_company"
      );
    }

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
      await deleteFromCloudinary(contributor.profile_image_url, "Contributor");
    }

    if (contributor.current_employment?.company_logo_url) {
      await deleteFromCloudinary(
        contributor.current_employment.company_logo_url,
        "Contributor_company"
      );
    }

    console.log("Deleted contributor");
    res.json({ message: "Contributor removed successfully" });
  } catch (err) {
    console.error("Error deleting contributor:", err);
    res.status(500).json({ message: "Error deleting contributor" });
  }
};
