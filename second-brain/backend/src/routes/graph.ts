import { Router } from "express";
import { AuthenticatedRequest, authenticateJwt } from "../middleware/auth";
import DocumentModel from "../models/Document";

const router = Router();

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

router.get("/graph", authenticateJwt, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const documents = await DocumentModel.find({ userId }).sort({ createdAt: -1 });
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();

    for (const document of documents) {
      const documentId = document._id.toString();

      nodesById.set(documentId, {
        id: documentId,
        label: truncateLabel(document.summary || document.rawContent || "Document"),
        type: document.source
      });

      for (const entity of document.entities ?? []) {
        nodesById.set(entity.name, {
          id: entity.name,
          label: entity.name,
          type: entity.type
        });

        const edgeId = `${entity.name}->${documentId}`;
        edgesById.set(edgeId, {
          source: entity.name,
          target: documentId
        });
      }
    }

    res.json({
      nodes: Array.from(nodesById.values()),
      edges: Array.from(edgesById.values())
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

function truncateLabel(value: string) {
  return value.length > 30 ? `${value.slice(0, 27)}...` : value;
}

export default router;
