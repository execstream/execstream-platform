import EventBanner from "../models/EventBanner.js";
import HomeExpert from "../models/HomeExpert.js";
import PartnerCompany from "../models/PartnerCompany.js";
import { deleteFromCloudinary } from "../helpers/cloudinary.helpers.js";

// PUBLIC CONTROLLERS
// ===================================

/**
 * Factory function to create a "get active items" controller for public-facing routes.
 * @param {mongoose.Model} Model - The Mongoose model to query.
 * @param {string} resourceName - The plural name of the resource (e.g., "banners").
 * @returns {Function} An Express controller function.
 */
const getActiveItemsFactory = (Model, resourceName) => async (req, res) => {
  try {
    const items = await Model.find({ is_active: true })
      .sort({ order: "asc" })
      .lean();
    res.json({
      message: `${
        resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
      } fetched successfully`,
      [resourceName]: items,
    });
  } catch (err) {
    console.error(`Error fetching ${resourceName}:`, err);
    res.status(500).json({ message: `Error fetching ${resourceName}` });
  }
};

// ADMIN CONTROLLERS
// ===================================

// --- Event Banners ---

/**
 * @desc    Add a new event banner
 */
export const addBanner = async (req, res) => {
  const { caption, link, is_active, order } = req.body;
  const imageUrl = req.uploadResults?.event_banner_image_url;

  if (!imageUrl) {
    return res.status(400).json({ message: "Banner image is required." });
  }

  try {
    const newBanner = new EventBanner({
      event_banner_image_url: imageUrl,
      caption,
      link,
      is_active,
      order,
    });
    await newBanner.save();
    res
      .status(201)
      .json({ message: "Banner added successfully", banner: newBanner });
  } catch (err) {
    console.error("Error adding banner:", err);
    // Cleanup the uploaded file if DB save fails
    await deleteFromCloudinary(imageUrl, "Failed Banner Upload");
    res.status(500).json({ message: "Error adding banner" });
  }
};

// --- Home Experts ---

/**
 * @desc    Add a new expert
 */
export const addExpert = async (req, res) => {
  const { name, job_position, company_name, is_active, order } = req.body;
  const profileImageUrl = req.uploadResults?.expert_profile_image_url;

  if (!name || !profileImageUrl) {
    return res
      .status(400)
      .json({ message: "Name and profile image are required." });
  }

  try {
    const newExpert = new HomeExpert({
      name,
      expert_profile_image_url: profileImageUrl,
      job_position,
      company_name,
      is_active,
      order,
    });
    await newExpert.save();
    res
      .status(201)
      .json({ message: "Expert added successfully", expert: newExpert });
  } catch (err) {
    console.error("Error adding expert:", err);
    await deleteFromCloudinary(profileImageUrl, "Failed Expert Upload");
    res.status(500).json({ message: "Error adding expert" });
  }
};

/**
 * @desc    Update an expert
 */
export const updateExpert = async (req, res) => {
  try {
    const expert = await HomeExpert.findById(req.params.id);
    if (!expert) {
      return res.status(404).json({ message: "Expert not found" });
    }

    const oldImageUrl = expert.expert_profile_image_url;
    const newImageUrl = req.uploadResults?.expert_profile_image_url;

    // Update fields from body
    expert.name = req.body.name || expert.name;
    expert.job_position = req.body.job_position || expert.job_position;
    expert.company_name = req.body.company_name || expert.company_name;
    expert.order = req.body.order ?? expert.order;
    if (req.body.is_active !== undefined) {
      expert.is_active = req.body.is_active;
    }

    if (newImageUrl) {
      expert.expert_profile_image_url = newImageUrl;
    }

    const updatedExpert = await expert.save();

    // After successful save, delete old image if a new one was uploaded
    if (newImageUrl && oldImageUrl) {
      await deleteFromCloudinary(oldImageUrl, "Old Expert Profile Image");
    }

    res.json({
      message: "Expert updated successfully",
      expert: updatedExpert,
    });
  } catch (err) {
    console.error("Error updating expert:", err);
    // If update fails, delete the newly uploaded image to prevent orphans
    if (req.uploadResults?.expert_profile_image_url) {
      await deleteFromCloudinary(
        req.uploadResults.expert_profile_image_url,
        "Failed Expert Update"
      );
    }
    res.status(500).json({ message: "Error updating expert" });
  }
};

// --- Partner Companies ---

/**
 * @desc    Add a new partner
 */
export const addPartner = async (req, res) => {
  const { company_name, link, order, is_active } = req.body;
  const logoUrl = req.uploadResults?.partner_company_logo_image_url;

  if (!logoUrl) {
    return res.status(400).json({ message: "Partner logo is required." });
  }

  try {
    const newPartner = new PartnerCompany({
      company_name,
      partner_company_logo_image_url: logoUrl,
      link,
      order,
      is_active,
    });
    await newPartner.save();
    res
      .status(201)
      .json({ message: "Partner added successfully", partner: newPartner });
  } catch (err) {
    console.error("Error adding partner:", err);
    await deleteFromCloudinary(logoUrl, "Failed Partner Upload");
    res.status(500).json({ message: "Error adding partner" });
  }
};

/**
 * Factory function to create a "delete" controller.
 * @param {mongoose.Model} Model - The Mongoose model to delete from.
 * @param {string} resourceName - The singular name of the resource (e.g., "banner").
 * @param {string} imageUrlField - The name of the field holding the image URL (e.g., "image_url").
 * @returns {Function} An Express controller function.
 */
const deleteItemFactory =
  (Model, resourceName, imageUrlField) => async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) {
        return res.status(404).json({
          message: `${
            resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
          } not found`,
        });
      }

      // Check if the item has an image URL before trying to delete
      if (item[imageUrlField]) {
        await deleteFromCloudinary(item[imageUrlField], resourceName);
      }

      res.json({
        message: `${
          resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
        } deleted successfully`,
      });
    } catch (err) {
      console.error(`Error deleting ${resourceName}:`, err);
      res.status(500).json({ message: `Error deleting ${resourceName}` });
    }
  };

/**
 * Factory function to create a "getAll" controller for admin panels.
 * @param {mongoose.Model} Model - The Mongoose model to query.
 * @param {string} resourceName - The plural name of the resource (e.g., "banners").
 * @returns {Function} An Express controller function.
 */
const getAllForAdminFactory = (Model, resourceName) => async (req, res) => {
  try {
    const items = await Model.find({})
      .sort({ is_active: -1, order: "asc" })
      .lean();
    res.json({
      message: `All ${resourceName} fetched successfully for admin`,
      [`total_${resourceName}`]: items.length,
      [resourceName]: items,
    });
  } catch (err) {
    console.error(`Error fetching all ${resourceName}:`, err);
    res.status(500).json({ message: `Error fetching all ${resourceName}` });
  }
};

/**
 * Factory function to create a "toggleStatus" controller.
 * @param {mongoose.Model} Model - The Mongoose model to update.
 * @param {string} resourceName - The singular name of the resource (e.g., "banner").
 * @returns {Function} An Express controller function.
 */
const toggleStatusFactory = (Model, resourceName) => async (req, res) => {
  try {
    const item = await Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        message: `${
          resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
        } not found`,
      });
    }
    item.is_active = !item.is_active;
    await item.save();
    res.json({
      message: `${
        resourceName.charAt(0).toUpperCase() + resourceName.slice(1)
      } status toggled to ${item.is_active ? "active" : "inactive"}`,
      [resourceName]: item,
    });
  } catch (err) {
    console.error(`Error toggling ${resourceName} status:`, err);
    res.status(500).json({ message: `Error toggling ${resourceName} status` });
  }
};

export const getBanners = getActiveItemsFactory(EventBanner, "banners");
export const getExperts = getActiveItemsFactory(HomeExpert, "experts");
export const getPartners = getActiveItemsFactory(PartnerCompany, "partners");

export const deleteBanner = deleteItemFactory(
  EventBanner,
  "banner",
  "event_banner_image_url"
);
export const deleteExpert = deleteItemFactory(
  HomeExpert,
  "expert",
  "expert_profile_image_url"
);
export const deletePartner = deleteItemFactory(
  PartnerCompany,
  "partner",
  "partner_company_logo_image_url"
);

export const getAllBannersForAdmin = getAllForAdminFactory(
  EventBanner,
  "banners"
);
export const toggleBannerStatus = toggleStatusFactory(EventBanner, "banner");

export const getAllExpertsForAdmin = getAllForAdminFactory(
  HomeExpert,
  "experts"
);
export const toggleExpertStatus = toggleStatusFactory(HomeExpert, "expert");

export const getAllPartnersForAdmin = getAllForAdminFactory(
  PartnerCompany,
  "partners"
);
export const togglePartnerStatus = toggleStatusFactory(
  PartnerCompany,
  "partner"
);
