import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  console.log("Token:", token);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      console.error("Token verification failed or invalid token structure");
      return res.status(401).json({ message: "Invalid token" });
    }
    const user = await Admin.findById(decoded.id).select("-password");
    if (!user) {
      console.error("No user found with the provided token ID: ", decoded.id);
      return res.status(404).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(403).json({ message: "Invalid token" });
  }
};

export default authMiddleware;
