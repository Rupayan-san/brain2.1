import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import DocumentModel from "../models/Document";

const router = Router();
type DocumentSource = "gmail" | "slack";

router.get("/documents", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const source = getSourceFilter(req.query.source);
    const limit = getLimit(req.query.limit);
    const filter = source ? { userId, source } : { userId };
    const documents = await DocumentModel.find(filter).sort({ createdAt: -1 }).limit(limit);

    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

router.get("/documents/:id", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const document = await DocumentModel.findOne({
      _id: req.params.id,
      userId
    });

    if (!document) {
      res.status(404).json({ message: "Document not found" });
      return;
    }

    res.json({ document });
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

function getSourceFilter(value: unknown): DocumentSource | undefined {
  return value === "gmail" || value === "slack" ? value : undefined;
}

function getLimit(value: unknown) {
  if (typeof value !== "string") {
    return 50;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 50;
  }

  return Math.min(parsed, 200);
}

export default router;
