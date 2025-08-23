import Content from "../models/Content.js";
import Contributor from "../models/Contributor.js";
import {
  deleteFromCloudinary,
  cleanupOldImages,
} from "../helpers/cloudinary.helpers.js";
import mongoose from "mongoose";
import { updateContentContributors } from "../helpers/contributor.helpers.js";
import {
  validateContentType,
  validateRequiredString,
  validateSortField,
  validateSortOrder,
} from "../utils/validators.js";
import {
  clearCacheByKey,
  clearCacheByPrefix,
} from "../helpers/cache.helpers.js";

export const listAll = async (req, res) => {
  console.log("Fetching paginated content list");

  try {
    const {
      page = 1,
      limit = 10,
      content_type,
      sort = "updated_at:desc",
      search,
      exec_role_id,
      series_id,
      theme_id,
      sub_theme_id,
      industry_id,
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);

    const addTagFilter = (queryParam, fieldName, filterObj) => {
      if (!queryParam) return;
      const ids = queryParam.split(",").map((id) => id.trim());
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error(`Invalid ID format provided for ${fieldName}.`);
        }
      }
      filterObj[fieldName] = { $in: ids };
    };

    const filter = {};
    const isAdmin =
      req.user?.role === "superAdmin" || req.user?.role === "editor";
    if (!isAdmin) {
      filter.status = "published";
    }
    if (content_type) {
      const typeError = validateContentType(content_type);
      if (typeError) {
        throw new Error(typeError);
      }
      filter.content_type = content_type;
    }

    addTagFilter(theme_id, "theme_ids", filter);
    addTagFilter(sub_theme_id, "sub_theme_ids", filter);
    addTagFilter(industry_id, "industry_ids", filter);
    addTagFilter(exec_role_id, "exec_role_ids", filter);

    if (series_id) {
      if (!mongoose.Types.ObjectId.isValid(series_id)) {
        throw new Error("Invalid series_id format.");
      }
      filter.series_id = series_id;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const [sortField, sortOrder] = sort.split(":");
    const sortFieldError = validateSortField(sortField);
    if (sortFieldError) {
      throw new Error(sortFieldError);
    }

    const sortOrderError = validateSortOrder(sortOrder);
    if (sortOrderError) {
      throw new Error(sortOrderError);
    }
    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const projection = `
  title 
  slug 
  content_type 
  series_id, 
  banner_image_url 
  banner_credit_url 
  banner_credit_name 
  ai_summary 
  meta_description 
  meta_keywords 
  publish_date 
  featured 
  popular 
  hero 
  media_url 
  pdf_url 
  theme_ids 
  sub_theme_ids 
  industry_ids 
  exec_role_ids 
  contributors.name 
  contributors.role 
  contributors.profile_image_url 
  contributors.employment.company_name 
  contributors.employment.job_position 
`;

    const [contents, total] = await Promise.all([
      Content.find(filter)
        .sort(sortOptions)
        .select(projection)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Content.countDocuments(filter),
    ]);

    console.log("Contents fetched successfully");

    const response = {
      message: "Contents fetched successfully",
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      contents,
    };

    if (Number(limit) > 100) {
      response.warning = "Limit capped to 100 items max per page.";
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("Error fetching paginated content:", err);
    res
      .status(400)
      .json({ message: err.message || "Error fetching paginated content" });
  }
};

export const getBySlug = async (req, res) => {
  console.log("Fetching content by Slug:", req.params.slug);
  try {
    const content = await Content.findOne({
      slug: req.params.slug,
      status: "published",
    }).lean();

    if (!content) return res.status(404).json({ message: "Content not found" });

    console.log("Content fetched successfully by slug");
    res.status(200).json({ message: "Content fetched successfully", content });
  } catch (err) {
    console.error("Error in getBySlug:", err);
    res.status(500).json({ message: "Failed to fetch content" });
  }
};

export const getById = async (req, res) => {
  console.log("Fetching content by ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id).lean();

    if (!content) return res.status(404).json({ message: "Content not found" });

    console.log("Content fetched successfully");
    res.status(200).json({ message: "Content fetched successfully", content });
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
      body: data.body ? `[BODY CONTENT: ${data.body.length} chars]` : undefined,
    });

    const titleError = validateRequiredString(data.title, "title");
    if (titleError) {
      throw new Error(titleError);
    }

    const typeError = validateContentType(data.content_type);
    if (typeError) {
      throw new Error(typeError);
    }

    if (data.status === "scheduled") {
      if (!data.scheduled_for || new Date(data.scheduled_for) <= new Date()) {
        throw new Error(
          "A valid future date for 'scheduled_for' is required when status is 'scheduled'."
        );
      }
    }

    if (req.uploadResults?.banner_image_url) {
      data.banner_image_url = req.uploadResults.banner_image_url;
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
    });

    await content.save();
    await clearCacheByPrefix("/api/v1/content");
    console.log("Content created successfully:", content._id);
    res.status(201).json({
      message: "Content created successfully",
      content,
    });
  } catch (err) {
    console.error("Error creating content:", err);

    if (req.uploadResults?.banner_image_url) {
      await deleteFromCloudinary(req.uploadResults.banner_image_url, "Content");
    }
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
    console.log("Received data:", {
      ...data,
      body: data.body ? `[BODY CONTENT: ${data.body.length} chars]` : undefined,
    });

    const forbiddenFields = ["_id", "created_by", "slug"];
    for (const field of forbiddenFields) {
      if (field in req.body) {
        delete req.body[field];
      }
    }

    if (data.title) {
      const titleError = validateRequiredString(data.title, "title");
      if (titleError) {
        throw new Error(titleError);
      }
    }

    if (data.content_type) {
      const typeError = validateContentType(data.content_type);
      if (typeError) {
        throw new Error(typeError);
      }
    }

    if (data.status === "scheduled") {
      const scheduleDate = data.scheduled_for || content.scheduled_for;
      if (!scheduleDate || new Date(scheduleDate) <= new Date()) {
        throw new Error(
          "A valid future date for 'scheduled_for' is required when status is 'scheduled'."
        );
      }
    }

    if (data.title && data.title !== content.title) {
      content.title = data.title;
    }

    if (req.uploadResults?.banner_image_url) {
      await cleanupOldImages(
        content.banner_image_url,
        req.uploadResults.banner_image_url,
        "Banner"
      );
      content.banner_image_url = req.uploadResults.banner_image_url;
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

    content.set({ ...data, updated_by: req.user.id });

    await content.save();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

    console.log("Content updated successfully:", content._id);
    res.status(200).json({
      message: "Content updated successfully",
      content,
    });
  } catch (err) {
    console.error("Error updating content:", err);

    if (req.uploadResults?.banner_image_url) {
      await deleteFromCloudinary(req.uploadResults.banner_image_url, "Content");
    }

    res.status(400).json({ message: "Error updating content" });
  }
};

export const removeContent = async (req, res) => {
  console.log("Deleting content with ID:", req.params.id);
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: "Content not found" });

    const imagesToCleanup = [];
    if (content.banner_image_url) {
      imagesToCleanup.push({
        url: content.banner_image_url,
        label: "Banner",
      });
    }

    if (Array.isArray(content.contributors)) {
      for (const contributor of content.contributors) {
        if (contributor.uploaded_by_content && contributor.profile_image_url) {
          imagesToCleanup.push({
            url: contributor.profile_image_url,
            label: `Contributor_Profile (${contributor.name})`,
          });
        }

        if (
          contributor.employment &&
          contributor.employment.company_logo_uploaded_by_content &&
          contributor.employment.company_logo_url
        ) {
          imagesToCleanup.push({
            url: contributor.employment.company_logo_url,
            label: `Company_Logo (${contributor.name})`,
          });
        }
      }
    }

    for (const { url, label } of imagesToCleanup) {
      try {
        await deleteFromCloudinary(url, label);
      } catch (err) {
        console.error(`Warning: Failed to delete ${label} image`, err.message);
      }
    }

    await content.deleteOne();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

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

    await content.save();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

    console.log("Content published successfully:", content._id);
    res.status(200).json({
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

  console.log("Received data:", updates);

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

    if (req.uploadResults?.profile_image_url) {
      if (contributor.uploaded_by_content && contributor.profile_image_url) {
        await deleteFromCloudinary(
          contributor.profile_image_url,
          "Contributor"
        );
      }

      contributor.profile_image_url = req.uploadResults.profile_image_url;
      contributor.uploaded_by_content = true;
    }

    if (updates.employment && typeof updates.employment === "object") {
      if (!contributor.employment) {
        contributor.employment = {};
      }
      const allowedEmploymentFields = [
        "company_name",
        "job_position",
        "description",
      ];
      for (const field of allowedEmploymentFields) {
        if (updates.employment[field] !== undefined) {
          contributor.employment[field] = updates.employment[field];
        }
      }
    }

    if (req.uploadResults?.company_logo_url) {
      if (!contributor.employment) {
        contributor.employment = {};
      }

      if (
        contributor.employment.company_logo_uploaded_by_content &&
        contributor.employment.company_logo_url
      ) {
        await deleteFromCloudinary(
          contributor.employment.company_logo_url,
          "Company Logo"
        );
      }

      contributor.employment.company_logo_url =
        req.uploadResults.company_logo_url;
      contributor.employment.company_logo_uploaded_by_content = true;
    }

    content.updated_by = req.user.id;

    await content.save();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

    console.log("Contributor updated successfully");

    res
      .status(200)
      .json({ message: "Contributor updated in content", contributor });
  } catch (err) {
    console.error("Error updating content contributor:", err);

    if (req.uploadResults?.profile_image_url) {
      await deleteFromCloudinary(
        req.uploadResults.profile_image_url,
        "Content_Contributor"
      );
    }

    if (req.uploadResults?.company_logo_url) {
      await deleteFromCloudinary(
        req.uploadResults.company_logo_url,
        "Content_Contributor_company"
      );
    }

    res.status(400).json({ message: "Error updating content contributor" });
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
        await deleteFromCloudinary(
          contributor.profile_image_url,
          "Contributor"
        );
      } catch (err) {
        console.warn("Failed to delete contributor image:", err.message);
      }
    }

    if (
      contributor.employment?.company_logo_uploaded_by_content &&
      contributor.employment?.company_logo_url
    ) {
      try {
        await deleteFromCloudinary(
          contributor.employment.company_logo_url,
          "Company Logo"
        );
      } catch (err) {
        console.warn("Failed to delete company logo:", err.message);
      }
    }

    contributor.deleteOne();
    content.updated_by = req.user.id;

    await content.save();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

    console.log("Contributor deleted from content successfully");

    res.status(200).json({ message: "Contributor removed from content" });
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

  console.log(`Adding contributor: ${contributor_id} to content: ${contentId}`);

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
    content.updated_by = req.user.id;

    await content.save();

    await clearCacheByKey(`/api/v1/content/slug/${content.slug}`);
    await clearCacheByPrefix("/api/v1/content");

    console.log("Contributor added to content:", contributorSnapshot);

    res.status(201).json({
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
    const fieldsToSelect =
      "title slug content_type banner_image_url theme_ids sub_theme_ids exec_role_ids industry_ids meta_description meta_keywords featured popular hero publish_date";

    const contents = await Content.find({
      $or: [{ featured: true }, { popular: true }, { hero: true }],
      status: "published",
    })
      .select(fieldsToSelect)
      .sort({ updated_at: -1 })
      .lean();

    console.log(`Found ${contents.length} flagged contents`);
    res.status(200).json({
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
    await content.save();

    await clearCacheByPrefix("/api/v1/content");

    console.log(
      `Toggled ${flag} for content ID:`,
      id,
      "New value:",
      content[flag]
    );

    res.status(200).json({
      message: `Toggled ${flag} for content id: ${content._id}`,
      [flag]: content[flag],
    });
  } catch (err) {
    console.error(`Error toggling ${flag}:`, err);
    res.status(500).json({ message: "Error toggling flag" });
  }
};
