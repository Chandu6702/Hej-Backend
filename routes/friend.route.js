import express from "express";
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  getUsers,
  searchUsers,
} from "../controllers/friendRequest.controller.js";
import { isAuthorized } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", isAuthorized, getFriends);
router.get("/users", isAuthorized, getUsers);
router.get("/requests", isAuthorized, getFriendRequests);
router.post("/request", isAuthorized, sendFriendRequest);
router.put("/respond", isAuthorized, respondToFriendRequest);
router.get("/search", isAuthorized, searchUsers);

export default router;
