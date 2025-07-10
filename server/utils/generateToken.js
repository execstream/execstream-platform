import jwt from "jsonwebtoken";
import { config } from "../configs/env.js";

export const generateToken = async (admin, res) => {
  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    config.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: config.IS_PRODUCTION,
    sameSite: config.IS_PRODUCTION ? "none" : "strict",
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
};
