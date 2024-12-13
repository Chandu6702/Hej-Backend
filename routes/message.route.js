import express from "express";
import { isAuthorized } from "../middleware/auth.middleware.js";
import { isFriend } from "../middleware/friend.middleware.js";

import {
  deleteMessagesForUser,
  getMessages,
  sendMessage,
} from "../controllers/message.controller.js";

const router = express.Router();

router.get("/:id", isAuthorized, isFriend, getMessages);
router.post("/send/:id", isAuthorized, isFriend, sendMessage);
router.put("/delete-for-me/:id", isAuthorized, deleteMessagesForUser);

export default router;
