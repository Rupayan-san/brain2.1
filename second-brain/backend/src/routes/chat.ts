import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import ChatMessage from "../models/ChatMessage";
import { ragChat, semanticSearch, ChatHistoryMessage } from "../services/ragService";

const router = Router();

router.post("/chat/message", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const query = getQueryFromBody(req.body);
    const chatHistory = getChatHistory(req.body.chatHistory);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    await ragChat(query, userId, chatHistory, {
      onToken: (token) => {
        res.write(token);
      }
    });

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
      return;
    }

    res.end();
  }
});

router.get("/chat/history", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const history = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .populate("sources")
      .limit(100);

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

router.get("/search", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const query = typeof req.query.q === "string" ? req.query.q : "";

    if (!query) {
      res.status(400).json({ message: "Missing search query" });
      return;
    }

    const documents = await semanticSearch(query, userId);
    res.json({ documents });
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

function getQueryFromBody(body: unknown) {
  if (!isRecord(body) || typeof body.query !== "string" || body.query.length === 0) {
    throw new Error("Missing chat query");
  }

  return body.query;
}

function getChatHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is ChatHistoryMessage => {
      return (
        isRecord(message) &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      );
    })
    .slice(-10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default router;
