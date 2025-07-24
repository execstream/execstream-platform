import Series from "../models/Series.js";
import Content from "../models/Content.js";
import mongoose from "mongoose";
import {
  deleteFromCloudinary,
  cleanupOldImages,
} from "../helpers/cloudinary.helpers.js";

// --- CREATE ---
export const create = async (req, res) => {
  console.log("Creating new series...");
  try {
    const data = { ...req.body };

    if (!data.title) {
      throw new Error("Series title is required.");
    }

    if (req.uploadResults?.company_logo_url) {
      data.company_logo_url = req.uploadResults.company_logo_url;
    }

    const series = new Series({
      ...data,
      created_by: req.user.id,
    });

    await series.save();
    console.log("Series created successfully:", series._id);
    res.status(201).json({
      message: "Series created successfully",
      series,
    });
  } catch (error) {
    console.error("Error creating series:", error.message);

    if (req.uploadResults?.company_logo_url) {
      await deleteFromCloudinary(
        req.uploadResults.company_logo_url,
        "SeriesLogo"
      );
    }
    res.status(400).json({ message: error.message || "Error creating series" });
  }
};

// --- READ (Public) ---
export const listAll = async (req, res) => {
  try {
    const { sort = "title:asc" } = req.query;
    const [sortField, sortOrder] = sort.split(":");

    const allowedSortFields = ["title", "updated_at", "created_at"];
    if (!allowedSortFields.includes(sortField)) {
      return res.status(400).json({ message: "Invalid sort field." });
    }

    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    const series = await Series.find({}).sort(sortOptions).lean();

    res.json({ message: "Series fetched successfully", series });
  } catch (error) {
    console.error("Error fetching all series:", error);
    res.status(500).json({ message: "Failed to fetch series" });
  }
};

export const getBySlug = async (req, res) => {
  try {
    const series = await Series.findOne({
      slug: req.params.slug,
    }).lean();

    if (!series) {
      return res.status(404).json({ message: "Series not found" });
    }
    res.json({ message: "Series fetched successfully", series });
  } catch (error) {
    console.error("Error fetching series by slug:", error);
    res.status(500).json({ message: "Failed to fetch series" });
  }
};

// --- READ (Protected) ---
export const getById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid Series ID format." });
    }
    const series = await Series.findById(req.params.id).lean();
    if (!series) {
      return res.status(404).json({ message: "Series not found" });
    }
    res.json({ message: "Series fetched successfully", series });
  } catch (error) {
    console.error("Error fetching series by ID:", error);
    res.status(500).json({ message: "Failed to fetch series" });
  }
};

// --- UPDATE ---
export const update = async (req, res) => {
  const { id } = req.params;
  console.log("Updating series with ID:", id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Series ID format." });
  }

  try {
    const existingSeries = await Series.findById(id);
    if (!existingSeries) {
      throw new Error("Series not found.");
    }

    const forbiddenFields = ["_id", "created_by", "slug"];
    for (const field of forbiddenFields) {
      if (field in req.body) {
        delete req.body[field];
      }
    }

    if (req.body.title && req.body.title !== existingSeries.title) {
      existingSeries.title = req.body.title;
    }

    if (req.uploadResults?.company_logo_url) {
      await cleanupOldImages(
        existingSeries.company_logo_url,
        req.uploadResults.company_logo_url,
        "SeriesLogo"
      );
      existingSeries.company_logo_url = req.uploadResults.company_logo_url;
    }

    existingSeries.set({ ...req.body, updated_by: req.user.id });
    await existingSeries.save(); // This triggers pre('save')

    res.json({
      message: "Series updated successfully",
      series: existingSeries,
    });
  } catch (error) {
    console.error("Error updating series:", error.message);

    if (req.uploadResults?.company_logo_url) {
      await deleteFromCloudinary(
        req.uploadResults.company_logo_url,
        "SeriesLogo"
      );
    }
    res.status(400).json({ message: error.message || "Error updating series" });
  }
};

// --- DELETE ---
export const remove = async (req, res) => {
  const { id } = req.params;
  console.log("Deleting series with ID:", id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Series ID format." });
  }

  try {
    //Prevent deletion if content is associated with this series
    const associatedContentCount = await Content.countDocuments({
      series_id: id,
    });
    if (associatedContentCount > 0) {
      throw new Error(
        `Cannot delete this series. It is associated with ${associatedContentCount} piece(s) of content.`
      );
    }

    const series = await Series.findById(id);
    if (!series) {
      throw new Error("Series not found.");
    }

    if (series.company_logo_url) {
      await deleteFromCloudinary(series.company_logo_url, "SeriesLogo");
    }

    await Series.deleteOne({ _id: id });

    res.status(200).json({ message: "Series deleted successfully" });
  } catch (error) {
    console.error("Error deleting series:", error.message);
    res.status(400).json({ message: error.message || "Error deleting series" });
  }
};
