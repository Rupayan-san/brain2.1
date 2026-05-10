import cors from "cors";
import dotenv from "dotenv";
import express, { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { createServer } from "node:http";
import { Server } from "socket.io";
import "./cron/calendarCron";
import "./cron/commitmentCron";
import "./cron/ingestionCron";
import { setSocketServer } from "./lib/socket";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import commitmentRoutes from "./routes/commitments";
import digestRoutes from "./routes/digest";
import documentRoutes from "./routes/documents";
import graphRoutes from "./routes/graph";
import ingestRoutes from "./routes/ingest";
import { verifyAuthToken } from "./middleware/auth";

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
setSocketServer(io);

const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/", chatRoutes);
app.use("/", digestRoutes);
app.use("/", commitmentRoutes);
app.use("/", documentRoutes);
app.use("/", graphRoutes);
app.use("/", ingestRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const normalizedMessage = message.toLowerCase();
  const status =
    normalizedMessage.includes("not configured") || normalizedMessage.includes("missing")
      ? 400
      : 500;

  res.status(status).json({
    message: status === 500 ? "Unexpected server error" : message
  });
};

app.use(errorHandler);

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });

  const authToken = socket.handshake.auth.token ?? socket.handshake.query.token;
  const userId = socket.handshake.auth.userId ?? socket.handshake.query.userId;

  if (typeof authToken === "string") {
    try {
      const verifiedUser = verifyAuthToken(authToken);
      socket.join(`user:${verifiedUser.userId}`);
      socket.emit("authenticated", { userId: verifiedUser.userId });
      return;
    } catch {
      socket.emit("auth_error", { message: "Invalid socket auth token" });
    }
  }

  if (typeof userId === "string") {
    socket.join(`user:${userId}`);
  }
});

async function bootstrap() {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
