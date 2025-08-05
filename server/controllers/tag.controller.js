import Theme from "../models/Theme.js";
import Industry from "../models/Industry.js";
import ExecutiveRole from "../models/ExecutiveRole.js";
import SubTheme from "../models/SubTheme.js";
import mongoose from "mongoose";
import Content from "../models/Content.js";
import { clearCacheByPrefix } from "../helpers/cache.helpers.js";

const tagRoutePrefixMap = {
  Theme: "/api/v1/tags/themes/all",
  SubTheme: "/api/v1/tags/sub-themes/all",
  Industry: "/api/v1/tags/industries/all",
  "Executive Role": "/api/v1/tags/roles/all",
};

const createTagController = (Model, tagType) => ({
  listAll: async (req, res) => {
    console.log(`Fetching all ${tagType}`);
    try {
      const items = await Model.find().sort({ name: 1 });
      res
        .status(200)
        .json({ message: `All ${tagType} fetched successfully.`, items });
    } catch (err) {
      console.error(`Error fetching ${tagType}:`, err);
      res.status(500).json({ message: `Failed to fetch ${tagType}` });
    }
  },

  create: async (req, res) => {
    console.log(`Creating new ${tagType}`, req.body);
    try {
      if (!req.body.name) {
        console.error("No name field provided.");
        return res.status(400).json({ message: "Name field is required" });
      }
      req.body.name = req.body.name.toLowerCase();
      console.log(`${tagType} name:`, req.body.name);

      const item = new Model(req.body);
      await item.save();

      await clearCacheByPrefix(tagRoutePrefixMap[tagType]);

      res.status(201).json({
        message: `New ${tagType} '${item.name}' created successfully.`,
        item,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          message: `${tagType} with name '${req.body.name}' already exists.`,
        });
      }
      console.error(`Error creating ${tagType}:`, err);
      res.status(400).json({ message: `Failed to create ${tagType}` });
    }
  },

  update: async (req, res) => {
    console.log(`Updating ${tagType} with ID: ${req.params.id}`);
    if (!req.params.id) {
      console.error(`Error: ID parameter is missing for ${tagType} update`);
      return res.status(400).json({ message: `ID parameter is required` });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error(`Error: No data provided for ${tagType} update`);
      return res.status(400).json({ message: `No data provided for update` });
    }
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!item) {
        console.error(`Error: ${tagType} with ID: ${req.params.id} not found`);
        return res.status(404).json({ message: `${tagType} not found` });
      }

      await clearCacheByPrefix(tagRoutePrefixMap[tagType]);

      res.status(200).json({
        message: `${tagType} updated successfully`,
        item,
      });
    } catch (err) {
      console.error(`Error updating ${tagType}:`, err);
      res.status(400).json({ message: `Failed to update ${tagType}` });
    }
  },

  getUsageCount: async (req, res) => {
    console.log(`Getting usage count for ${tagType} with ID: ${req.params.id}`);
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ message: `Invalid ${tagType} ID format.` });
      }

      const fieldMap = {
        Theme: "theme_ids",
        SubTheme: "sub_theme_ids",
        Industry: "industry_ids",
        "Executive Role": "exec_role_ids",
      };

      const contentField = fieldMap[tagType];
      if (!contentField) {
        return res
          .status(500)
          .json({ message: `Unsupported tag type: ${tagType}` });
      }

      const count = await Content.countDocuments({ [contentField]: id });
      console.log("Usage count:", count);

      res.status(200).json({
        message: "Usage count fetched successfully.",
        count: count,
      });
    } catch (error) {
      console.error(`Error fetching ${tagType} usage count:`, error);
      res.status(500).json({ message: "Failed to fetch usage count" });
    }
  },

  remove: async (req, res) => {
    console.log(`Deleting ${tagType} with ID: ${req.params.id}`);
    const tagId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      return res.status(400).json({ message: `Invalid ${tagType} ID format.` });
    }

    try {
      const fieldMap = {
        Theme: "theme_ids",
        SubTheme: "sub_theme_ids",
        Industry: "industry_ids",
        "Executive Role": "exec_role_ids",
      };

      const contentField = fieldMap[tagType];
      if (!contentField) {
        return res
          .status(500)
          .json({ message: `Unsupported tag type: ${tagType}` });
      }

      await Content.updateMany(
        { [contentField]: tagId },
        { $pull: { [contentField]: tagId } }
      );
      console.log(`Removed tag ${tagId} from all associated content.`);

      const deletedTag = await Model.findByIdAndDelete(tagId);
      if (!deletedTag) {
        return res.status(404).json({ message: `${tagType} not found.` });
      }

      await clearCacheByPrefix(tagRoutePrefixMap[tagType]);

      console.log(`${tagType} with ID: ${tagId} deleted successfully`);
      res.status(200).json({ message: `${tagType} deleted successfully.` });
    } catch (err) {
      console.error(`Error deleting ${tagType}:`, err);
      res.status(500).json({ message: `Failed to delete ${tagType}` });
    }
  },
});

export const ThemeController = createTagController(Theme, "Theme");
export const SubThemeController = createTagController(SubTheme, "SubTheme");
export const IndustryController = createTagController(Industry, "Industry");
export const ExecRoleController = createTagController(
  ExecutiveRole,
  "Executive Role"
);
