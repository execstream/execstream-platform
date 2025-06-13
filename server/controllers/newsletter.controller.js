import NewsletterSubscriber from "../models/NewsletterSubscribers.js";
import NewsletterIssue from "../models/NewsletterIssue.js";
import Papa from "papaparse";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
// import nodemailer from "nodemailer";
import { sendEmail } from "../configs/sendgrid.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// const transporter = nodemailer.createTransport({
//   service: "Gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });
const { unparse } = Papa;

export const listAllSubscribers = async (req, res) => {
  console.log("Fetching all subscribers");
  try {
    const subscribers = await NewsletterSubscriber.find().sort({
      subscribed_at: -1,
    });
    console.log("Subscribers fetched:", subscribers.length);
    res.json(subscribers);
  } catch (err) {
    console.error("Error fetching subscribers:", err);
    res.status(500).json({ message: "Failed to fetch subscribers." });
  }
};

export const addSubscriber = async (req, res) => {
  console.log("Adding new subscriber");
  try {
    const { email } = req.body;
    const emailNormalized = email.toLowerCase();
    console.log("Received email:", emailNormalized);

    let subscriber = await NewsletterSubscriber.findOne({
      email: emailNormalized,
    });

    if (subscriber) {
      if (!subscriber.unsubscribed) {
        console.log("Subscriber already exists and is active");
        return res
          .status(409)
          .json({ message: "Subscriber already exists and is active." });
      }
      subscriber.unsubscribed = false;
      subscriber.unsubscribed_at = null;
      await subscriber.save();

      console.log("Subscriber reactivated:", subscriber);

      const html = await ejs.renderFile(
        path.join(__dirname, "../views/newsletter/newSubscriber.ejs"),
        { year: new Date().getFullYear() }
      );

      await sendEmail({
        to: emailNormalized,
        subject: "You're Back! Welcome Again to the ExecStream Newsletter",
        html,
      });

      return res.status(200).json({
        message: "You've successfully re-subscribed.",
        subscriber,
      });
    }

    const newSubscriber = new NewsletterSubscriber({ email: emailNormalized });
    await newSubscriber.save();

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/newsletter/newSubscriber.ejs"),
      { year: new Date().getFullYear() }
    );

    await sendEmail({
      to: emailNormalized,
      subject: "You're In! Welcome to the ExecStream Newsletter",
      html,
    });

    console.log("New subscriber added:", newSubscriber);

    res.status(201).json({
      message: "Subscriber added successfully.",
      newSubscriber,
    });
  } catch (err) {
    console.error("Error adding subscriber:", err);
    res.status(400).json({ message: "Error adding subscriber." });
  }
};

export const removeSubscriber = async (req, res) => {
  console.log("Removing subscriber with ID:", req.params.id);
  try {
    await NewsletterSubscriber.findByIdAndDelete(req.params.id);
    console.log("Subscriber removed successfully.");
    res.status(200).json({ message: "Subscriber removed successfully." });
  } catch (err) {
    console.error("Error deleting subscriber:", err);
    res.status(500).json({ message: "Error deleting subscriber." });
  }
};

export const unsubscribe = async (req, res) => {
  console.log("Unsubscribing subscriber with ID:", req.params.id);
  try {
    const subscriber = await NewsletterSubscriber.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found." });
    }
    if (subscriber.unsubscribed) {
      return res
        .status(400)
        .json({ message: "Subscriber already unsubscribed." });
    }

    subscriber.unsubscribed = true;
    subscriber.unsubscribed_at = new Date();
    await subscriber.save();

    console.log("Subscriber unsubscribed successfully:", subscriber);

    res.json({
      message: "Successfully unsubscribed.",
      subscriber,
    });
  } catch (err) {
    console.error("Error unsubscribing:", err);
    res.status(500).json({ message: "Failed to unsubscribe." });
  }
};

export const exportCSV = async (req, res) => {
  console.log("Exporting subscribers to CSV");
  try {
    const subscribers = await NewsletterSubscriber.find().lean();

    if (subscribers.length === 0) {
      return res
        .status(404)
        .json({ message: "No subscribers found to export." });
    }

    const csv = unparse(subscribers, {
      columns: ["email", "subscribed_at", "unsubscribed", "unsubscribed_at"],
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `newsletter_subscribers_${timestamp}.csv`;

    res.header("Content-Type", "text/csv");
    res.attachment(filename);
    res.send(csv);
  } catch (err) {
    console.error("CSV Export Error:", err);
    res.status(500).json({ message: "Failed to export subscribers." });
  }
};

export const createIssue = async (req, res) => {
  console.log("Creating Weekly newsletter: ", req.body);
  try {
    const issue = new NewsletterIssue(req.body);
    await issue.save();
    console.log("Weekly issue created");
    res.status(201).json({ message: "Newsletter issue created", issue });
  } catch (err) {
    console.log("Error occured while creating newsletter issue: ", err);
    res.status(500).json({ message: "Error creating issue" });
  }
};

export const getAllIssues = async (req, res) => {
  console.log("Getting all newsletter issues: ");
  try {
    const issues = await NewsletterIssue.find().sort({ scheduled_for: -1 });
    console.log("All weekly newsletters fetched");
    res.json({
      message: "All weekly newsletters fetched successfully",
      issues,
    });
  } catch (err) {
    console.log("Error occured while fetching all newsletters: ", err);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

export const sendWeeklyNewsletter = async () => {
  console.log("Sending weekly newsletter...");

  try {
    const issue = await NewsletterIssue.findOne({
      scheduled_for: { $lte: new Date() },
      sent: false,
    }).populate("content_blocks.content_id");

    if (!issue) {
      console.log("No newsletter to send this week.");
      return;
    }

    const subscribers = await NewsletterSubscriber.find({
      unsubscribed: false,
    });

    const html = await ejs.renderFile(
      path.join(__dirname, "../views/newsletter/weeklyNewsletter.ejs"),
      { issue }
    );

    const sendToAll = subscribers.map((sub) =>
      sendEmail({
        to: sub.email,
        subject: `ExecStream Weekly: ${issue.title}`,
        html,
      })
    );

    await Promise.all(sendToAll);

    issue.sent = true;
    await issue.save();

    console.log(
      `Newsletter "${issue.title}" sent to ${subscribers.length} subscribers.`
    );
  } catch (err) {
    console.error("Error sending weekly newsletter:", err);
  }
};
