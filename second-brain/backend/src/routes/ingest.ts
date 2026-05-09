import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import { fetchGmailMessages, fetchSlackMessages } from "../services/ingestionService";

const router = Router();

router.post("/ingest/trigger", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const [gmailDocs, slackDocs] = await Promise.all([
      fetchGmailMessages(userId),
      fetchSlackMessages(userId)
    ]);

    res.json({
      message: "Ingestion complete",
      gmail: gmailDocs.length,
      slack: slackDocs.length
    });
  } catch (error) {
    next(error);
  }
});

function getAuthenticatedUserId(req: AuthenticatedRequest) {
  if (!req.user?.userId) {
    throw new Error("Authenticated user is missing");
  }

  return req.user.userId;
}

export default router;
