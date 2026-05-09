import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
  };
}

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return secret;
}

export function getBearerToken(req: Request) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function verifyAuthToken(token: string) {
  const payload = jwt.verify(token, getJwtSecret());

  if (typeof payload === "string" || !isAuthPayload(payload)) {
    throw new Error("Invalid authentication token");
  }

  return {
    userId: payload.userId
  };
}

export const authenticateJwt: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ message: "Missing authorization token" });
    return;
  }

  try {
    (req as AuthenticatedRequest).user = verifyAuthToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid authorization token" });
  }
};

function isAuthPayload(payload: JwtPayload): payload is JwtPayload & { userId: string } {
  return typeof payload.userId === "string" && payload.userId.length > 0;
}
