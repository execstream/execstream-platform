import Content from "../models/Content.js";
import Contributor from "../models/Contributor.js";
import ContributorEmployment from "../models/ContributorEmployment.js";
import {
  deleteCloudinaryImage,
  uploadBase64Image,
} from "../configs/cloudinary.helpers.js";

const allowedSortFields = ["updated_at", "created_at", "publish_date"];
const allowedSortOrders = ["asc", "desc"];
const allowedContentTypes = [
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
    const limitNum = Math.min(Number(limit), 100); //max 100 content items

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
      if (!allowedContentTypes.includes(content_type)) {
        return res.status(400).json({
          message: `Invalid content_type. Allowed values: ${allowedContentTypes.join(
            ", "
          )}`,
        });
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
    if (!allowedSortFields.includes(sortField)) {
      return res.status(400).json({
        message: `Invalid sort field. Allowed fields: ${allowedSortFields.join(
          ", "
        )}`,
      });
    }

    if (!allowedSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        message: `Invalid sort order. Allowed values: ${allowedSortOrders.join(
          ", "
        )}`,
      });
    }
    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const contents = await Content.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

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

    const publishDate = content.publish_date;

    const contributorsWithEmployment = await Promise.all(
      content.contributors.map(async ({ contributor_id, role }) => {
        const contributor = await Contributor.findById(contributor_id).lean();
        if (!contributor) return null;

        const employment = await ContributorEmployment.findOne({
          contributor_id,
          start_date: { $lte: publishDate },
          $or: [{ end_date: null }, { end_date: { $gte: publishDate } }],
        })
          .sort({ start_date: -1 })
          .lean();

        return {
          ...contributor,
          role,
          employment: employment || null,
        };
      })
    );

    content.contributors = contributorsWithEmployment.filter(Boolean);
    console.log("Content fetched successfully");
    res.json({ message: "Content fetched successfully", content });
  } catch (err) {
    console.error("Error in getContentWithContributors:", err);
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

    if (
      !data.title ||
      typeof data.title !== "string" ||
      data.title.trim() === ""
    ) {
      return res
        .status(400)
        .json({ message: "Title is required and must be a non-empty string." });
    }

    if (data.content_type && !allowedContentTypes.includes(data.content_type)) {
      return res.status(400).json({
        message: `Invalid content_type. Allowed values: ${allowedContentTypes.join(
          ", "
        )}`,
      });
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

    // if (Array.isArray(data.contributors)) {
    //   for (const { contributor_id } of data.contributors) {
    //     const exists = await Contributor.exists({ _id: contributor_id });
    //     if (!exists)
    //       return res.status(400).json({ message: "Invalid contributor" });
    //   }
    // }

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

    if (
      data.title &&
      (typeof data.title !== "string" || data.title.trim() === "")
    ) {
      return res
        .status(400)
        .json({ message: "Title must be a non-empty string if provided." });
    }

    if (data.content_type && !allowedContentTypes.includes(data.content_type)) {
      return res.status(400).json({
        message: `Invalid content_type. Allowed values: ${allowedContentTypes.join(
          ", "
        )}`,
      });
    }

    if (data.banner_image_base64) {
      try {
        if (content.banner_image_url) {
          await deleteCloudinaryImage(content.banner_image_url, "Content");
          console.log("Deleted old banner image from Cloudinary.");
        }

        const imageUrl = await uploadBase64Image(
          data.banner_image_base64,
          "content_banners",
          "Content"
        );

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

    // if (Array.isArray(data.contributors)) {
    //   for (const { contributor_id } of data.contributors) {
    //     const exists = await Contributor.exists({ _id: contributor_id });
    //     if (!exists)
    //       return res.status(400).json({ message: "Invalid contributor" });
    //   }
    // }

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
        // Option 1: Let deletion continue anyway [for now done this]
        // Option 2: Return failure if image deletion is critical
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

    content.status = "published";
    content.publish_date = new Date();
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

export const getFlaggedContent = async (req, res) => {
  console.log("Fetching flagged content (featured, popular, hero)");
  try {
    const contents = await Content.find({
      $or: [{ featured: true }, { popular: true }, { hero: true }],
      status: "published",
    }).sort({ updated_at: -1 });

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
