import express from "express";

import {
  getGmailMessagesController,
  getGmailEmailOverview,
  generateGmailDraft,
  toggleStarController,
  archiveGmailMessage,
  moveGmailToInbox,
  trashGmailMessage,
  getGmailDashboardStatsController,
  markGmailAsRead,
  sendGmailMessageController
} from "../controllers/gmailController.js";

const router = express.Router();


router.get(
  "/messages",
  getGmailMessagesController
);

router.get(
  "/dashboard-stats",
  getGmailDashboardStatsController
);

router.post(
  "/:id/overview",
  getGmailEmailOverview
);
router.post("/ai-write", generateGmailDraft);
router.post("/send", sendGmailMessageController);
router.patch(
  "/:id/star",
  toggleStarController
);

router.patch(
  "/:id/archive",
  archiveGmailMessage
);

router.patch(
  "/:id/inbox",
  moveGmailToInbox
);

router.patch(
  "/:id/read",
  markGmailAsRead
);

router.delete(
  "/:id/trash",
  trashGmailMessage
);

export default router;