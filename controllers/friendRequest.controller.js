import User from "../models/user.model.js";

export const sendFriendRequest = async (req, res) => {
  try {
    const { friendId } = req.body;
    const userId = req.user._id;

    if (friendId === userId) {
      return res
        .status(400)
        .json({ message: "You cannot send a request to yourself." });
    }

    const user = await User.findById(friendId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const sender = await User.findById(userId);
    if (user.friends.includes(userId)) {
      return res.status(400).json({ message: "You are already friends." });
    }

    const existingRequest = user.friendRequests.some(
      (req) => req.from.toString() === userId.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent." });
    }

    user.friendRequests.push({ from: userId });
    await user.save();

    res.status(200).json({ message: "Friend request sent successfully." });
  } catch (error) {
    console.error("Error in sendFriendRequest:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: "friendRequests.from",
      select: "-password",
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json(user.friendRequests);
  } catch (error) {
    console.error("Error fetching friend requests:", error.message);
    res.status(500).json({ message: "Failed to fetch friend requests." });
  }
};

export const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId, status } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    const requestIndex = user.friendRequests.findIndex(
      (req) => req._id.toString() === requestId
    );
    if (requestIndex === -1) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    const request = user.friendRequests[requestIndex];
    user.friendRequests.splice(requestIndex, 1);

    if (status === "accepted") {
      if (!user.friends.includes(request.from)) {
        user.friends.push(request.from);
        const friend = await User.findById(request.from);
        friend.friends.push(userId);
        await friend.save();
      }
    }

    await user.save();

    res.status(200).json({ message: `Friend request ${status}.` });
  } catch (error) {
    console.error("Error in respondToFriendRequest:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getFriends = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId)
      .populate("friends")
      .select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json(user.friends);
  } catch (error) {
    console.error("Error in getFriends:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUsers = async (req, res) => {
  try {
    const loggedInUserID = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const loggedInUser = await User.findById(loggedInUserID).select("friends");

    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserID, $nin: loggedInUser.friends },
    })
      .select("-password")
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    const totalUsers = await User.countDocuments({
      _id: { $ne: loggedInUserID, $nin: loggedInUser.friends },
    });

    res.status(200).json({
      filteredUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Error in getUsers controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const loggedInUserID = req.user._id;

    const users = await User.find({
      _id: { $ne: loggedInUserID },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers controller", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
