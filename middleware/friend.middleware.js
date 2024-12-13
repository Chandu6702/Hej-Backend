import User from "../models/user.model.js";

export const isFriend = async (req, res, next) => {
  try {
    const { id: chatPartnerId } = req.params;
    const myId = req.user._id;

    const user = await User.findById(myId);
    if (!user.friends.includes(chatPartnerId)) {
      return res
        .status(403)
        .json({ message: "You are not friends with this user." });
    }

    next();
  } catch (error) {
    console.error("Error in isFriend middleware:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
