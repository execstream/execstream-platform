import ContributorEmployment from "../models/ContributorEmployment.js";
import mongoose from "mongoose";

export const getByContributor = async (req, res) => {
  console.log("Fetching employment for contributor:", req.params.id);
  try {
    const records = await ContributorEmployment.find({
      contributor_id: req.params.id,
    }).sort({ start_date: -1 });
    console.log("Found employment records:", records);
    res.json({ message: "Found employment records", employment: records });
  } catch (err) {
    console.error("Error fetching employment records:", err);
    res.status(500).json({ message: "Error fetching employment records" });
  }
};

export const create = async (req, res) => {
  const contributorId = req.params.id;
  const { company, job_title, start_date, end_date } = req.body;
  console.log(
    "Creating employment for contributor:",
    contributorId,
    "\n",
    req.body
  );
  try {
    if (!mongoose.Types.ObjectId.isValid(contributorId)) {
      console.log("Invalid contributor ID");
      return res.status(400).json({ message: "Invalid contributor ID." });
    }
    if (!company || typeof company !== "string" || company.trim() === "") {
      console.log("Invalid company name");
      return res.status(400).json({
        message: "Company name is required and must be a non-empty string.",
      });
    }

    if (
      !job_title ||
      typeof job_title !== "string" ||
      job_title.trim() === ""
    ) {
      console.log("Invalid job title");
      return res.status(400).json({
        message: "Job title is required and must be a non-empty string.",
      });
    }

    if (!start_date || isNaN(Date.parse(start_date))) {
      console.log("Invalid start date");
      return res
        .status(400)
        .json({ message: "Start date is required and must be a valid date." });
    }

    if (end_date && isNaN(Date.parse(end_date))) {
      console.log("Invalid end date");
      return res
        .status(400)
        .json({ message: "End date must be a valid date if provided." });
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      console.log("Invalid date range");
      return res
        .status(400)
        .json({ message: "End date must be after start date." });
    }
    const record = new ContributorEmployment({
      contributor_id: contributorId,
      company: company.trim(),
      job_title: job_title.trim(),
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : undefined,
    });
    await record.save();
    console.log("Created employment record:", record);
    res.status(201).json({ message: "Employment added", employment: record });
  } catch (err) {
    console.error("Error creating employment record:", err);
    res.status(400).json({ message: "Error creating employment record" });
  }
};

export const update = async (req, res) => {
  console.log("Updating employment:", req.params.employmentId, "\n", req.body);
  try {
    const record = await ContributorEmployment.findByIdAndUpdate(
      req.params.employmentId,
      req.body,
      { new: true }
    );
    if (!record)
      return res.status(404).json({ message: "Employment record not found" });
    console.log("Updated employment record:", record);
    res.json({ message: "Employment updated", employment: record });
  } catch (err) {
    console.error("Error updating employment record:", err);
    res.status(400).json({ message: "Error updating employment record" });
  }
};

export const remove = async (req, res) => {
  console.log("Deleting employment:", req.params.employmentId);
  try {
    const record = await ContributorEmployment.findByIdAndDelete(
      req.params.employmentId
    );
    if (!record)
      return res.status(404).json({ message: "Employment record not found" });
    console.log("Deleted employment record:", record);
    res.json({ message: "Employment deleted" });
  } catch (err) {
    console.error("Error deleting employment record:", err);
    res.status(500).json({ message: "Error deleting employment record" });
  }
};
