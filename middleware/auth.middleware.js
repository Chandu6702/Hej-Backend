import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const isAuthorized = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Inavalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in isAuthorized middleware: ", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
