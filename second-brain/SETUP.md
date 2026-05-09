# Second Brain Setup Guide

This guide explains how to run the `second-brain` monorepo locally and how to collect every API key or OAuth credential needed by the backend.

## 1. Project Layout

```text
second-brain/
  frontend/   React + Vite app
  backend/    Node.js + TypeScript API
```

The backend runs on `http://localhost:5000` by default.

The frontend runs on `http://localhost:5173` by default.

## 2. Install Dependencies

From the project root:

```powershell
cd C:\Users\sayan\OneDrive\Desktop\projects\brain2.0\second-brain
npm install
```

## 3. Create Backend Environment File

Copy the example file:

```powershell
Copy-Item backend\.env.example backend\.env
```

Then edit `backend\.env`:

```env
MONGODB_URI=
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/auth/slack/callback
JWT_SECRET=
CHROMA_URL=http://localhost:8000
PORT=5000
```

Create a strong local JWT secret:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Paste the output into `JWT_SECRET`.

## 4. Optional Frontend Environment File

The frontend defaults to `http://localhost:5000` for API calls. If you want to override it:

```powershell
New-Item frontend\.env -ItemType File
```

Add:

```env
VITE_API_URL=http://localhost:5000
```

## 5. Start ChromaDB

The backend stores embeddings in ChromaDB. For local development, run Chroma on port `8000`.

Option A, with Docker:

```powershell
docker run -v ${PWD}\chroma-data:/data -p 8000:8000 chromadb/chroma
```

Option B, with the Chroma CLI:

```powershell
npx chroma run --path ./chroma-data
```

Use this value in `backend\.env`:

```env
CHROMA_URL=http://localhost:8000
```

## 6. Start Backend

In one terminal:

```powershell
cd C:\Users\sayan\OneDrive\Desktop\projects\brain2.0\second-brain
npm run dev:backend
```

Health check:

```powershell
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing
```

Expected response:

```json
{"status":"ok"}
```

## 7. Start Frontend

In another terminal:

```powershell
cd C:\Users\sayan\OneDrive\Desktop\projects\brain2.0\second-brain
npm run dev:frontend
```

Open:

```text
http://localhost:5173
```

## 8. Run Both Apps Together

You can also run both workspaces from the root:

```powershell
npm run dev
```

For debugging, two separate terminals are easier because backend and frontend logs stay separate.

## 9. Gemini API Key

Used for:

- Gemini enrichment
- RAG chat
- digests
- conflict detection
- meeting briefs
- embeddings with `embedding-001`

Steps:

1. Go to Google AI Studio: <https://aistudio.google.com/app/apikey>
2. Create or select a Google Cloud project.
3. Create a new Gemini API key.
4. Copy it immediately.
5. Paste it into `backend\.env`:

```env
GEMINI_API_KEY=...
```

Keep this key server-side only. Never put it in the frontend.

Official docs: <https://ai.google.dev/gemini-api/docs/api-key>

## 10. MongoDB URI

Used for:

- users
- documents
- digests
- chat messages
- commitments
- meeting briefs

Fast local option:

```env
MONGODB_URI=mongodb://localhost:27017/second-brain
```

MongoDB Atlas option:

1. Go to MongoDB Atlas: <https://cloud.mongodb.com>
2. Create a project.
3. Create a free cluster.
4. Create a database user.
5. Add your current IP address in Network Access.
6. Open the cluster and click `Connect`.
7. Choose `Drivers`.
8. Copy the connection string.
9. Replace `<username>`, `<password>`, and database name.
10. Paste into `backend\.env`:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.example.mongodb.net/second-brain?retryWrites=true&w=majority
```

Official docs: <https://www.mongodb.com/docs/current/reference/connection-string/>

## 11. Google OAuth Credentials

Used for:

- Gmail ingestion
- Calendar meeting brief checks
- Google profile login

Required backend env keys:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
```

Steps:

1. Go to Google Cloud Console: <https://console.cloud.google.com>
2. Create a project or select an existing project.
3. Go to `APIs & Services` → `Library`.
4. Enable these APIs:
   - Gmail API
   - Google Calendar API
5. Go to `APIs & Services` → `OAuth consent screen`.
6. Choose `External` for local testing unless you are using a Google Workspace internal app.
7. Fill in app name, support email, and developer contact email.
8. Add yourself as a test user if the app is in testing mode.
9. Go to `APIs & Services` → `Credentials`.
10. Click `Create credentials` → `OAuth client ID`.
11. Choose `Web application`.
12. Add this Authorized JavaScript origin:

```text
http://localhost:5173
```

13. Add this Authorized redirect URI:

```text
http://localhost:5000/auth/google/callback
```

14. Copy the client ID and client secret into `backend\.env`.

The backend currently requests these scopes:

```text
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/calendar.readonly
profile
email
```

Official docs: <https://developers.google.com/identity/protocols/oauth2/web-server>

## 12. Slack OAuth Credentials

Used for:

- Slack OAuth connect
- channel and direct message ingestion

Required backend env keys:

```env
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:5000/auth/slack/callback
```

Steps:

1. Go to Slack API Apps: <https://api.slack.com/apps>
2. Click `Create New App`.
3. Choose `From scratch`.
4. Pick a workspace for local testing.
5. Go to `OAuth & Permissions`.
6. Add this Redirect URL:

```text
http://localhost:5000/auth/slack/callback
```

7. Add these bot token scopes:

```text
channels:history
im:history
users:read
```

8. If your Slack workspace requires channel listing for ingestion, also add:

```text
channels:read
im:read
```

9. Go to `Basic Information`.
10. Copy `Client ID` into `SLACK_CLIENT_ID`.
11. Copy `Client Secret` into `SLACK_CLIENT_SECRET`.
12. Install or reinstall the app to your workspace after changing scopes.

Official docs:

- OAuth install flow: <https://docs.slack.dev/authentication/installing-with-oauth/>
- Token exchange: <https://docs.slack.dev/reference/methods/oauth.v2.access>
- Message history API: <https://docs.slack.dev/reference/methods/conversations.history/>

## 13. Login Flow

Start backend and frontend first.

Then open:

```text
http://localhost:5173/login
```

Click `Connect Gmail`.

After Google login succeeds, the backend redirects to:

```text
http://localhost:5173/dashboard?token=JWT_TOKEN
```

The frontend stores the token in `localStorage` as:

```text
second_brain_token
```

Then click `Connect Slack`.

Slack OAuth uses the existing JWT token to attach Slack tokens to the same user.

## 14. Useful Local URLs

Frontend:

```text
http://localhost:5173
http://localhost:5173/login
http://localhost:5173/chat
http://localhost:5173/graph
http://localhost:5173/timeline
http://localhost:5173/commitments
http://localhost:5173/digest
```

Backend:

```text
http://localhost:5000/health
http://localhost:5000/auth/google
http://localhost:5000/auth/slack
http://localhost:5000/auth/me
http://localhost:5000/chat/history
http://localhost:5000/search?q=test
```

## 15. Build Checks

Backend:

```powershell
npm run build --workspace backend
```

Frontend:

```powershell
npm run build --workspace frontend
```

Both:

```powershell
npm run build
```

## 16. Common Issues

### `redirect_uri_mismatch`

The redirect URI in Google or Slack must exactly match the value in `backend\.env`.

Use:

```text
http://localhost:5000/auth/google/callback
http://localhost:5000/auth/slack/callback
```

### Google does not return a refresh token

Google usually returns a refresh token on the first consent. If you need a new one, remove the app from your Google account permissions and reconnect. The backend already requests offline access and prompt consent.

### Slack message ingestion returns missing scope errors

Add the required scopes in Slack `OAuth & Permissions`, then reinstall the app to the workspace.

### Chroma connection fails

Make sure Chroma is running:

```powershell
Invoke-WebRequest http://localhost:8000/api/v2/heartbeat -UseBasicParsing
```

If using Docker, confirm the container exposes port `8000`.

### Frontend cannot reach backend

Make sure backend is running on port `5000`, then set:

```env
VITE_API_URL=http://localhost:5000
```

Restart the frontend after changing `frontend\.env`.
