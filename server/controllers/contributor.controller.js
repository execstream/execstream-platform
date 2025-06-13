import {
  deleteCloudinaryImage,
  uploadBase64Image,
} from "../configs/cloudinary.helpers.js";
import Contributor from "../models/Contributor.js";
import ContributorEmployment from "../models/ContributorEmployment.js";

export const getAll = async (req, res) => {
  console.log("Fetching all contributors...");
  try {
    const contributors = await Contributor.find().sort({ created_at: -1 });
    console.log("All contributors fetched");
    res.json({
      message: "Fetched all contributors successfully",
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
    const contributor = await Contributor.findById(req.params.id);
    if (!contributor)
      return res.status(404).json({ message: "Contributor not found" });
    console.log("Contributor fetched by ID", contributor);
    res.json({ message: "Fetched required Contributor", contributor });
  } catch (err) {
    console.error("Error fetching contributor:", err);
    res.status(500).json({ message: "Error fetching contributor" });
  }
};

export const create = async (req, res) => {
  console.log("Creating new contributor");
  try {
    const data = { ...req.body };
    console.log("Received data for update:", {
      ...data,
      photo_base64: data.photo_base64 ? "[BASE64_DATA]" : undefined,
    });
    if (
      !data.name ||
      typeof data.name !== "string" ||
      data.name.trim() === ""
    ) {
      return res
        .status(400)
        .json({ message: "Name is required and must be a non-empty string." });
    }

    if (data.photo_base64) {
      try {
        const photoUrl = await uploadBase64Image(
          data.photo_base64,
          "contributors",
          "Contributor"
        );

        data.photo_url = photoUrl;
        delete data.photo_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          message: "Failed to upload contributor photo",
          error: uploadError.message,
        });
      }
    }

    const contributor = new Contributor({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await contributor.save();
    console.log("Created new contributor");
    res.status(201).json({ message: "Contributor created", contributor });
  } catch (err) {
    console.error("Error creating contributor:", err);
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
      photo_base64: data.photo_base64 ? "[BASE64_DATA]" : undefined,
    });

    if (data.photo_base64) {
      try {
        if (contributor.photo_url) {
          await deleteCloudinaryImage(contributor.photo_url, "Contributor");
          console.log("Deleted old contributor image from Cloudinary.");
        }

        const photoUrl = await uploadBase64Image(
          data.photo_base64,
          "contributors",
          "Contributor"
        );

        data.photo_url = photoUrl;

        delete data.photo_base64;
      } catch (uploadError) {
        console.error("Cloudinary upload error during update:", uploadError);
        return res.status(400).json({
          message: "Failed to upload contributor photo",
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

    if (contributor.photo_url) {
      try {
        await deleteCloudinaryImage(contributor.photo_url, "Contributor");
      } catch (err) {
        console.error(
          "Warning: Failed to delete contributor image",
          err.message
        );
        // Option 1: Let deletion continue anyway [for now done this]
        // Option 2: Return failure if image deletion is critical
      }
    }

    await ContributorEmployment.deleteMany({ contributor_id: req.params.id });
    console.log("Deleted contributor");
    res.json({ message: "Contributor and related employment removed" });
  } catch (err) {
    console.error("Error deleting contributor:", err);
    res.status(500).json({ message: "Error deleting contributor" });
  }
};
