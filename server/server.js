import express from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./configs/db.js";
import contentRoutes from "./routes/content.routes.js";
import newsletterRoutes from "./routes/newsletter.routes.js";
import tagRoutes from "./routes/tags.routes.js";
import authRoutes from "./routes/auth.routes.js";
import contributorRoutes from "./routes/contributor.routes.js";
import passport from "passport";
import "./configs/passport.js";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cookieParser());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));
app.use(passport.initialize());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/content", contentRoutes);
app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/contributors", contributorRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
