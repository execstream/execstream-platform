import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const authOptionalMiddleware = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return next(); // Guest user

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      console.warn("Token found but structure is invalid");
      return next();
    }

    const user = await Admin.findById(decoded.id).select("-password");
    if (!user) {
      console.warn("No user found for token ID:", decoded.id);
      return next(); // Guest user
    }

    req.user = user;
  } catch (err) {
    console.warn("Invalid token (optional):", err.message);
    // Guest user
  }

  next();
};

export default authOptionalMiddleware;
