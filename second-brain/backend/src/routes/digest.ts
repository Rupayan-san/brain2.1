import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import Digest from "../models/Digest";
import { dailyDigest, weeklyDigest } from "../services/digestService";

const router = Router();

type DigestType = "daily" | "weekly";

router.get("/digest", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const type = getDigestType(req.query.type);
    const digest = await Digest.findOne({ userId, type }).sort({ createdAt: -1 });

    res.json({ digest: digest ?? null });
  } catch (error) {
    next(error);
  }
});

router.post("/digest/generate", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const type = getDigestType(isRecord(req.body) ? req.body.type : undefined);
    const digest = type === "weekly" ? await weeklyDigest(userId) : await dailyDigest(userId);

    res.json({ digest });
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

function getDigestType(value: unknown): DigestType {
  return value === "weekly" ? "weekly" : "daily";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default router;
