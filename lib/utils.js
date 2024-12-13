import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.SECRET, {
    expiresIn: "7d",
  });

  // Set the token in the cookie
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true, // Prevent XSS attacks (cannot be accessed by JavaScript)
    sameSite: "strict", // Protect against CSRF attacks
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};
