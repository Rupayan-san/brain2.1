import { Router } from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { WebClient } from "@slack/web-api";
import User from "../models/User";
import {
  AuthenticatedRequest,
  authenticateJwt,
  getBearerToken,
  getJwtSecret,
  verifyAuthToken
} from "../middleware/auth";

const router = Router();

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "profile",
  "email"
];

const SLACK_SCOPES = ["channels:history", "im:history", "users:read"];

router.get("/google", (_req, res) => {
  const oauth2Client = createGoogleOAuthClient();
  const consentUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES
  });

  res.redirect(consentUrl);
});

router.get("/google/callback", async (req, res, next) => {
  try {
    const code = getQueryString(req.query.code, "Google authorization code");
    const oauth2Client = createGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2"
    });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      res.status(400).json({ message: "Google profile did not include an email" });
      return;
    }

    const update: Record<string, unknown> = {
      id: profile.id ?? profile.email,
      email: profile.email,
      name: profile.name ?? profile.email,
      profilePicture: profile.picture,
      googleAccessToken: tokens.access_token
    };

    if (tokens.refresh_token) {
      update.googleRefreshToken = tokens.refresh_token;
    }

    const user = await User.findOneAndUpdate(
      { email: profile.email },
      { $set: update },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true
      }
    );

    const token = jwt.sign({ userId: user._id.toString() }, getJwtSecret(), {
      expiresIn: "7d"
    });

    res.redirect(withToken(getFrontendDashboardUrl(), token));
  } catch (error) {
    next(error);
  }
});

router.get("/slack", (req, res) => {
  const clientId = getRequiredEnv("SLACK_CLIENT_ID");
  const redirectUri = getRequiredEnv("SLACK_REDIRECT_URI");
  const state = getBearerToken(req) ?? getOptionalQueryString(req.query.token);
  const consentUrl = new URL("https://slack.com/oauth/v2/authorize");

  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("scope", SLACK_SCOPES.join(","));
  consentUrl.searchParams.set("redirect_uri", redirectUri);

  if (state) {
    consentUrl.searchParams.set("state", state);
  }

  res.redirect(consentUrl.toString());
});

router.get("/slack/callback", async (req, res, next) => {
  try {
    const code = getQueryString(req.query.code, "Slack authorization code");
    const state = getQueryString(req.query.state, "Slack OAuth state");
    const { userId } = verifyAuthToken(state);
    const slackClient = new WebClient();
    const oauthResult = await slackClient.oauth.v2.access({
      client_id: getRequiredEnv("SLACK_CLIENT_ID"),
      client_secret: getRequiredEnv("SLACK_CLIENT_SECRET"),
      code,
      redirect_uri: getRequiredEnv("SLACK_REDIRECT_URI")
    });

    if (!oauthResult.ok || !oauthResult.access_token) {
      res.status(400).json({ message: "Slack OAuth token exchange failed" });
      return;
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        slackAccessToken: oauthResult.access_token,
        slackTeamId: oauthResult.team?.id
      }
    });

    res.redirect(getFrontendDashboardUrl());
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticateJwt, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await User.findById(authReq.user?.userId).select(
      "-googleAccessToken -googleRefreshToken -slackAccessToken"
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    getRequiredEnv("GOOGLE_REDIRECT_URI")
  );
}

function getRequiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}

function getQueryString(value: unknown, label: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is missing`);
  }

  return value;
}

function getOptionalQueryString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function withToken(url: string, token: string) {
  const dashboardUrl = new URL(url);
  dashboardUrl.searchParams.set("token", token);
  return dashboardUrl.toString();
}

function getFrontendDashboardUrl() {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
  return new URL("/dashboard", frontendUrl).toString();
}

export default router;
