import Theme from "../models/Theme.js";
import Industry from "../models/Industry.js";
import ExecutiveRole from "../models/ExecutiveRole.js";
import SubTheme from "../models/SubTheme.js";
// import Content from "../models/Content.js";

const createTagController = (Model, tagType) => ({
  listAll: async (req, res) => {
    console.log(`Fetching all ${tagType}`);
    try {
      const items = await Model.find().sort({ name: 1 });
      res.json({ message: `All ${tagType} fetched successfully.`, items });
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

      res.status(201).json({
        message: `New ${tagType} '${item.name}' created successfully.`,
        item,
      });
    } catch (err) {
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
      res.json({
        message: `${tagType} updated successfully`,
        item,
      });
    } catch (err) {
      console.error(`Error updating ${tagType}:`, err);
      res.status(400).json({ message: `Failed to update ${tagType}` });
    }
  },

  remove: async (req, res) => {
    console.log(`Deleting ${tagType} with ID: ${req.params.id}`);
    if (!req.params.id) {
      console.error(`Error: ID parameter is missing for ${tagType} deletion`);
      return res.status(400).json({ message: `ID parameter is required` });
    }

    try {
      const tagId = req.params.id;
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

      // const isInUse = await Content.exists({ [contentField]: tagId });
      // if (isInUse) {
      //   return res
      //     .status(400)
      //     .json({ message: `${tagType} is in use and cannot be deleted.` });
      // } //ask if to keep

      await Model.findByIdAndDelete(tagId);
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

//TODO: Confirm what to do about the tag removal if is associated with a content(the isInUse inside remove)