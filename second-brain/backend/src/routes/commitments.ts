import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import Commitment from "../models/Commitment";

const router = Router();

router.get("/commitments", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const commitments = await Commitment.find({ userId }).sort({ createdAt: -1 });

    res.json({ commitments });
  } catch (error) {
    next(error);
  }
});

router.patch("/commitments/:id", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const commitment = await Commitment.findOne({
      _id: req.params.id,
      userId
    });

    if (!commitment) {
      res.status(404).json({ message: "Commitment not found" });
      return;
    }

    commitment.fulfilled = !commitment.fulfilled;
    commitment.fulfilledAt = commitment.fulfilled ? new Date() : undefined;
    await commitment.save();

    res.json({ commitment });
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
