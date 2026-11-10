
import mongoose from "mongoose";
import User from "../models/user.model.js";

// ========================================
// SEND FRIEND REQUEST
// ========================================

export const sendFriendRequest = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user._id;

        if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
            return res.status(400).json({
                message: "Invalid friend ID.",
            });
        }

        if (friendId.toString() === userId.toString()) {
            return res.status(400).json({
                message: "You cannot send a request to yourself.",
            });
        }

        const [sender, receiver] = await Promise.all([
            User.findById(userId),
            User.findById(friendId),
        ]);

        if (!sender || !receiver) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        const alreadyFriends = sender.friends.some(
            (id) => id.toString() === friendId.toString()
        );

        if (alreadyFriends) {
            return res.status(400).json({
                message: "You are already friends.",
            });
        }

        // Check outgoing request.
        const outgoingRequest = receiver.friendRequests.some(
            (request) =>
                request.from.toString() === userId.toString()
        );

        // Check incoming request.
        const incomingRequest = sender.friendRequests.some(
            (request) =>
                request.from.toString() === friendId.toString()
        );

        if (outgoingRequest || incomingRequest) {
            return res.status(400).json({
                message: "A friend request already exists.",
            });
        }

        receiver.friendRequests.push({
            from: userId,
        });

        await receiver.save();

        return res.status(200).json({
            message: "Friend request sent successfully.",
        });

    } catch (error) {
        console.error("Error in sendFriendRequest:", error);

        return res.status(500).json({
            message: "Internal Server Error.",
        });
    }
};


// ========================================
// GET FRIEND REQUESTS
// ========================================

export const getFriendRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: "friendRequests.from",
                select: "fullName profilePic",
            })
            .select("friendRequests");

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        return res.status(200).json(user.friendRequests);

    } catch (error) {
        console.error("Error in getFriendRequests:", error);

        return res.status(500).json({
            message: "Failed to fetch friend requests.",
        });
    }
};


// ========================================
// RESPOND TO FRIEND REQUEST
// ========================================

export const respondToFriendRequest = async (req, res) => {
    const { requestId, status } = req.body;
    const userId = req.user._id;

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({
            message: "Invalid request ID.",
        });
    }

    if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
            message: "Invalid request status.",
        });
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);

            if (!user) {
                throw new Error("USER_NOT_FOUND");
            }

            const requestIndex = user.friendRequests.findIndex(
                (request) =>
                    request._id.toString() === requestId.toString()
            );

            if (requestIndex === -1) {
                throw new Error("REQUEST_NOT_FOUND");
            }

            const request = user.friendRequests[requestIndex];

            if (status === "accepted") {
                const friend = await User.findById(
                    request.from
                ).session(session);

                if (!friend) {
                    throw new Error("SENDER_NOT_FOUND");
                }

                const alreadyFriends = user.friends.some(
                    (id) =>
                        id.toString() === friend._id.toString()
                );

                if (!alreadyFriends) {
                    user.friends.push(friend._id);
                }

                const friendAlreadyHasUser = friend.friends.some(
                    (id) =>
                        id.toString() === userId.toString()
                );

                if (!friendAlreadyHasUser) {
                    friend.friends.push(userId);
                }

                await friend.save({ session });
            }

            user.friendRequests.splice(requestIndex, 1);

            await user.save({ session });
        });

        return res.status(200).json({
            message: `Friend request ${status} successfully.`,
        });

    } catch (error) {
        console.error("Error in respondToFriendRequest:", error);

        const errors = {
            USER_NOT_FOUND: [404, "User not found."],
            REQUEST_NOT_FOUND: [404, "Friend request not found."],
            SENDER_NOT_FOUND: [404, "Sender no longer exists."],
        };

        const knownError = errors[error.message];

        return res.status(knownError?.[0] || 500).json({
            message: knownError?.[1] || "Internal Server Error.",
        });

    } finally {
        await session.endSession();
    }
};


// ========================================
// GET FRIENDS
// ========================================

export const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate({
                path: "friends",
                select: "fullName profilePic email",
            })
            .select("friends");

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        return res.status(200).json(user.friends);

    } catch (error) {
        console.error("Error in getFriends:", error);

        return res.status(500).json({
            message: "Internal Server Error.",
        });
    }
};


// ========================================
// GET USERS WITH PAGINATION
// ========================================

export const getUsers = async (req, res) => {
    try {
        const userId = req.user._id;

        const page = Math.max(
            1,
            parseInt(req.query.page, 10) || 1
        );

        const limit = Math.min(
            50,
            Math.max(
                1,
                parseInt(req.query.limit, 10) || 10
            )
        );

        const loggedInUser = await User.findById(userId);

        if (!loggedInUser) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        // Exclude yourself, existing friends,
        // incoming requests and outgoing requests.

        const outgoingRequests = await User.find({
            "friendRequests.from": userId,
        }).distinct("_id");

        const excludedIds = [
            userId,
            ...loggedInUser.friends,
            ...loggedInUser.friendRequests.map(
                (request) => request.from
            ),
            ...outgoingRequests,
        ];

        const filter = {
            _id: {
                $nin: excludedIds,
            },
        };

        const skip = (page - 1) * limit;

        const [filteredUsers, totalUsers] = await Promise.all([
            User.find(filter)
                .select("fullName profilePic email")
                .sort({ _id: 1 })
                .skip(skip)
                .limit(limit),

            User.countDocuments(filter),
        ]);

        return res.status(200).json({
            filteredUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            hasMore: skip + filteredUsers.length < totalUsers,
        });

    } catch (error) {
        console.error("Error in getUsers:", error);

        return res.status(500).json({
            message: "Internal Server Error.",
        });
    }
};


// ========================================
// SEARCH USERS
// ========================================

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.query?.trim();
        const userId = req.user._id;

        if (!query) {
            return res.status(200).json([]);
        }

        const escapedQuery = query.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const users = await User.find({
            _id: {
                $ne: userId,
            },

            $or: [
                {
                    fullName: {
                        $regex: escapedQuery,
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: escapedQuery,
                        $options: "i",
                    },
                },
            ],
        })
            .select("fullName profilePic email")
            .limit(20);

        return res.status(200).json(users);

    } catch (error) {
        console.error("Error in searchUsers:", error);

        return res.status(500).json({
            message: "Internal Server Error.",
        });
    }
};
