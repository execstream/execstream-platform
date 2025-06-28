import Content from "../models/Content.js";
import Contributor from "../models/Contributor.js";
import {
  deleteCloudinaryImage,
  replaceImage,
  uploadBase64Image,
} from "../helpers/cloudinary.helpers.js";
import mongoose from "mongoose";
import { updateContentContributors } from "../helpers/contributor.helpers.js";
import {
  validateContentType,
  validateRequiredString,
  validateSortField,
  validateSortOrder,
} from "../utils/validators.js";

export const listAll = async (req, res) => {
  console.log("Fetching paginated content list");

  try {
    const {
      page = 1,
      limit = 10,
      content_type,
      sort = "updated_at:desc",
      search,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);

    let warning = null;
    if (Number(limit) > 100) {
      warning = "Limit capped to 100 items max per page.";
    }

    const filter = {};
    const isAdmin =
      req.user?.role === "superAdmin" || req.user?.role === "editor";
    if (!isAdmin) {
      filter.status = "published";
    }
    if (content_type) {
      const typeError = validateContentType(content_type);
      if (typeError) {
        return res.status(400).json({ message: typeError });
      }
      filter.content_type = content_type;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { body: { $regex: search, $options: "i" } },
        { ai_summary: { $regex: search, $options: "i" } },
      ];
    }

    const [sortField, sortOrder] = sort.split(":");
    const sortFieldError = validateSortField(sortField);
    if (sortFieldError) {
      return res.status(400).json({ message: sortFieldError });
    }

    const sortOrderError = validateSortOrder(sortOrder);
    if (sortOrderError) {
      return res.status(400).json({ message: sortOrderError });
    }
    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const contents = await Content.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await Content.countDocuments(filter);

    console.log("Contents fetched successfully");

    res.json({
      message: "Contents fetched successfully",
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      contents,
      ...(warning && { warning }),
    });
  } catch (err) {
    console.error("Error fetching paginated content:", err);
    res.status(500).json({ message: "Error fetching paginated content" });
  }
};

export const getById = async (req, res) => {
  console.log("Fetching content by ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id).lean();

    if (!content) return res.status(404).json({ message: "Content not found" });

    console.log("Content fetched successfully");
    res.json({ message: "Content fetched successfully", content });
  } catch (err) {
    console.error("Error in getById:", err);
    res.status(500).json({ message: "Failed to fetch content" });
  }
};

export const createContent = async (req, res) => {
  console.log("Creating new content");
  try {
    const data = { ...req.body };
    console.log("Received data:", {
      ...data,
      banner_image_base64: data.banner_image_base64
        ? "[BASE64_DATA]"
        : undefined,
    });

    const titleError = validateRequiredString(data.title, "title");
    if (titleError) {
      return res.status(400).json({ message: titleError });
    }

    const typeError = validateContentType(data.content_type);
    if (typeError) {
      return res.status(400).json({ message: typeError });
    }

    if (data.banner_image_base64) {
      try {
        const bannerUrl = await uploadBase64Image(
          data.banner_image_base64,
          "content_banners",
          "Content"
        );

        data.banner_image_url = bannerUrl;
        delete data.banner_image_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    if (Array.isArray(data.contributors)) {
      if (data.status === "published") {
        data.contributors = await updateContentContributors(data.contributors);
      } else {
        data.contributors = data.contributors.map((c) => ({
          contributor_id: c.contributor_id,
          role: c.role || "",
        }));
      }
    }

    const content = new Content({
      ...data,
      created_by: req.user.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await content.save();
    console.log("Content created successfully:", content._id);
    res.status(201).json({
      message: "Content created successfully",
      content,
    });
  } catch (err) {
    console.error("Error creating content:", err);
    res.status(400).json({ message: "Error creating content" });
  }
};

export const updateContent = async (req, res) => {
  console.log("Updating content with ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      console.log("Content not found for update with ID:", req.params.id);
      return res.status(404).json({ message: "Content not found" });
    }

    const data = { ...req.body };
    console.log("Received data for update:", {
      ...data,
      banner_image_base64: data.banner_image_base64
        ? "[BASE64_DATA]"
        : undefined,
    });

    const titleError = validateRequiredString(data.title, "title");
    if (titleError) {
      return res.status(400).json({ message: titleError });
    }

    const typeError = validateContentType(data.content_type);
    if (typeError) {
      return res.status(400).json({ message: typeError });
    }

    if (data.banner_image_base64) {
      try {
        const imageUrl = await replaceImage({
          base64: data.banner_image_base64,
          oldUrl: content.banner_image_url,
          folder: "content_banners",
          label: "Content",
        });

        data.banner_image_url = imageUrl;
        delete data.banner_image_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload image",
          error: uploadError.message,
        });
      }
    }

    if (Array.isArray(data.contributors)) {
      const isCurrentlyPublished = content.status === "published";
      const willBePublished = data.status === "published";

      if (isCurrentlyPublished || willBePublished) {
        data.contributors = await updateContentContributors(data.contributors);
      } else {
        data.contributors = data.contributors.map((c) => ({
          contributor_id: c.contributor_id,
          role: c.role || "",
        }));
      }
    }

    const updated = await Content.findByIdAndUpdate(
      req.params.id,
      {
        ...data,
        updated_by: req.user.id,
        updated_at: new Date(),
      },
      { new: true, runValidators: true }
    );

    console.log("Content updated successfully:", updated._id);
    res.json({
      message: "Content updated successfully",
      content: updated,
    });
  } catch (err) {
    console.error("Error updating content:", err);
    res.status(400).json({ message: "Error updating content" });
  }
};

export const removeContent = async (req, res) => {
  console.log("Deleting content with ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    if (content.banner_image_url) {
      try {
        await deleteCloudinaryImage(content.banner_image_url, "Content");
      } catch (err) {
        console.error("Warning: Failed to delete content image", err.message);
      }
    }

    await content.deleteOne();
    console.log("Content deleted successfully:", req.params.id);
    res.status(200).json({ message: "Content deleted successfully" });
  } catch (err) {
    console.error("Error deleting content:", err);
    res.status(500).json({ message: "Error deleting content" });
  }
};

export const publishContent = async (req, res) => {
  console.log("Publishing content with ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    if (content.status === "published") {
      console.log("Content is already published:", content._id);
      return res.status(400).json({ message: "Content is already published" });
    }

    const publishDate = new Date();

    if (content.contributors && content.contributors.length > 0) {
      const contributorsData = content.contributors.map((c) => ({
        contributor_id: c.contributor_id,
        role: c.role,
      }));

      content.contributors = await updateContentContributors(contributorsData);
    }

    content.status = "published";
    content.publish_date = publishDate;
    content.updated_by = req.user.id;
    content.updated_at = new Date();

    await content.save();
    console.log("Content published successfully:", content._id);
    res.json({
      message: "Content published successfully",
      content: {
        id: content._id,
        title: content.title,
        status: content.status,
        publish_date: content.publish_date,
      },
    });
  } catch (err) {
    console.error("Error publishing content:", err);
    res.status(500).json({ message: "Error publishing content" });
  }
};

export const patchContributorInContent = async (req, res) => {
  const { contentId, contributorSubId } = req.params;
  const updates = { ...req.body };

  console.log("Received data:", {
    ...updates,
    profile_image_base64: updates.profile_image_base64
      ? "[BASE64_DATA]"
      : undefined,
    employment: {
      ...updates.employment,
      company_logo_base64: updates.employment?.company_logo_base64
        ? "[BASE64_DATA]"
        : undefined,
    },
  });

  try {
    const content = await Content.findOne({
      _id: contentId,
      "contributors._id": contributorSubId,
    });

    if (!content) {
      return res
        .status(404)
        .json({ message: "Contributor not found in content" });
    }

    const contributor = content.contributors.id(contributorSubId);
    if (!contributor) {
      return res.status(404).json({ message: "Contributor not found" });
    }

    const editableFields = [
      "role",
      "name",
      "email",
      "bio",
      "profile_image_url",
      "linkedin_url",
      "twitter_url",
      "website_url",
    ];

    for (const key of Object.keys(updates)) {
      if (editableFields.includes(key)) {
        contributor[key] = updates[key];
      }
    }

    if (updates.profile_image_base64) {
      const imageUrl = await replaceImage({
        base64: updates.profile_image_base64,
        oldUrl: contributor.uploaded_by_content
          ? contributor.profile_image_url
          : null,
        folder: "contributors",
        label: "Contributor_image",
      });

      contributor.profile_image_url = imageUrl;
      contributor.uploaded_by_content = true;
      delete updates.profile_image_base64;
    }

    if (updates.employment && typeof updates.employment === "object") {
      if (!contributor.employment) {
        contributor.employment = {};
      }

      const allowedEmploymentFields = [
        "company_name",
        "job_position",
        "description",
        "company_logo_url",
      ];

      for (const field of allowedEmploymentFields) {
        if (updates.employment[field] !== undefined) {
          contributor.employment[field] = updates.employment[field];
        }
      }

      if (updates.employment.company_logo_base64) {
        const imageUrl = await replaceImage({
          base64: updates.employment.company_logo_base64,
          oldUrl: contributor.employment.company_logo_uploaded_by_content
            ? contributor.employment.company_logo_url
            : null,
          folder: "company_logos",
          label: "Contributor_company_logo",
        });

        contributor.employment.company_logo_url = imageUrl;
        contributor.employment.company_logo_uploaded_by_content = true;

        delete updates.employment.company_logo_base64;
      }
    }

    content.updated_at = new Date();
    content.updated_by = req.user.id;

    await content.save();

    console.log("Contributor updated successfully");

    res.json({ message: "Contributor updated in content", contributor });
  } catch (err) {
    console.error("Error updating contributor in content:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteContributorFromContent = async (req, res) => {
  const { contentId, contributorSubId } = req.params;

  console.log(
    "Deleting contributor from content:",
    contentId,
    "contributorSubId:",
    contributorSubId
  );

  try {
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    const contributor = content.contributors.id(contributorSubId);
    if (!contributor) {
      return res
        .status(404)
        .json({ message: "Contributor not found in content" });
    }

    if (contributor.uploaded_by_content && contributor.profile_image_url) {
      try {
        await deleteCloudinaryImage(
          contributor.profile_image_url,
          "Contributor_image"
        );
        // console.log("Deleted content-specific contributor image.");
      } catch (err) {
        console.warn("Failed to delete contributor image:", err.message);
      }
    }

    if (
      contributor.employment?.company_logo_uploaded_by_content &&
      contributor.employment?.company_logo_url
    ) {
      try {
        await deleteCloudinaryImage(
          contributor.employment.company_logo_url,
          "Contributor_company_logo"
        );
        // console.log("Deleted content-specific company logo.");
      } catch (err) {
        console.warn("Failed to delete company logo:", err.message);
      }
    }

    contributor.deleteOne();
    content.updated_at = new Date();
    content.updated_by = req.user.id;

    await content.save();

    console.log("Contributor deleted from content successfully");

    res.json({ message: "Contributor removed from content" });
  } catch (err) {
    console.error("Error removing contributor from content:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addContributorToContent = async (req, res) => {
  const { contentId } = req.params;
  const { contributor_id, role } = req.body;

  if (!contributor_id || !mongoose.Types.ObjectId.isValid(contributor_id)) {
    return res
      .status(400)
      .json({ message: "Valid contributor_id is required." });
  }

  console.log("Adding contributor to content:", contentId, contributor_id);

  try {
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    const isDuplicate = content.contributors.some(
      (c) => c.contributor_id?.toString() === contributor_id
    );
    if (isDuplicate) {
      return res
        .status(400)
        .json({ message: "Contributor already exists in content." });
    }

    let contributorSnapshot;

    if (content.status === "published") {
      const contributor = await Contributor.findById(contributor_id).lean();
      if (!contributor) {
        return res.status(404).json({ message: "Contributor not found." });
      }

      contributorSnapshot = {
        contributor_id: contributor._id,
        name: contributor.name,
        email: contributor.email,
        bio: contributor.bio,
        profile_image_url: contributor.profile_image_url,
        linkedin_url: contributor.linkedin_url,
        twitter_url: contributor.twitter_url,
        website_url: contributor.website_url,
        employment: contributor.current_employment
          ? {
              company_name: contributor.current_employment.company_name,
              job_position: contributor.current_employment.job_position,
              description: contributor.current_employment.description,
              company_logo_url: contributor.current_employment.company_logo_url,
            }
          : null,
        role: role || "",
      };
    } else {
      contributorSnapshot = {
        contributor_id,
        role: role || "",
      };
    }

    content.contributors.push(contributorSnapshot);
    content.updated_at = new Date();
    content.updated_by = req.user.id;

    await content.save();

    console.log("Contributor added to content:", contributorSnapshot);

    res.json({
      message: "Contributor added to content",
      contributor: contributorSnapshot,
    });
  } catch (err) {
    console.error("Error adding contributor to content:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFlaggedContent = async (req, res) => {
  console.log("Fetching flagged content (featured, popular, hero)");
  try {
    const contents = await Content.find({
      $or: [{ featured: true }, { popular: true }, { hero: true }],
      status: "published",
    })
      .sort({ updated_at: -1 })
      .lean();

    console.log(`Found ${contents.length} flagged contents`);
    res.json({
      message: "Flagged content fetched successfully",
      contents,
    });
  } catch (err) {
    console.error("Error fetching flagged content:", err);
    res.status(500).json({ message: "Failed to fetch flagged content." });
  }
};

export const toggleFlag = async (req, res) => {
  const { id, flag } = req.params;
  const validFlags = ["featured", "popular", "hero"];
  console.log(`Toggling ${flag} for content with ID:`, id);

  if (!validFlags.includes(flag)) {
    return res
      .status(400)
      .json({ message: `Invalid flag. Use one of: ${validFlags.join(", ")}` });
  }

  try {
    const content = await Content.findById(id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    content[flag] = !content[flag];
    content.updated_by = req.user.id;
    content.updated_at = new Date();
    await content.save();

    console.log(
      `Toggled ${flag} for content ID:`,
      id,
      "New value:",
      content[flag]
    );

    res.json({
      message: `Toggled ${flag} for content id: ${content._id}`,
      [flag]: content[flag],
    });
  } catch (err) {
    console.error(`Error toggling ${flag}:`, err);
    res.status(500).json({ message: "Error toggling flag" });
  }
};
