import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "fs";
import http from "http";
import mongoose from "mongoose";
import path from "path";
import { Server as SocketServer } from "socket.io";
import { fileURLToPath } from "url";
import adminRoutes from "./routes/adminRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import { ensureCheckpointsAroundNow } from "./utils/checkpointStore.js";
import { getHackathonBaseTime } from "./utils/hackathonConfigStore.js";

const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
const hasFrontendBuild = fs.existsSync(frontendDistPath);

function parseAllowedOrigins() {
  const rawOrigins = String(process.env.CLIENT_ORIGIN || "").trim();
  if (!rawOrigins) {
    return null;
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

function corsOrigin(origin, callback) {
  if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
}

const io = new SocketServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: corsOrigin,
  })
);
app.use(express.json());

app.use((req, _res, next) => {
  req.io = io;
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.use("/api/team", teamRoutes);
app.use("/api/admin", adminRoutes);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
      next();
      return;
    }

    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

async function start() {
  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 4000);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }

  await mongoose.connect(mongoUri);
  const baseTime = await getHackathonBaseTime();
  await ensureCheckpointsAroundNow(baseTime);

  server.listen(port, host, () => {
    const originSummary = allowedOrigins ? allowedOrigins.join(", ") : "all origins";
    console.log(`Backend running on http://${host}:${port}`);
    console.log(`CORS allowed origins: ${originSummary}`);
    if (hasFrontendBuild) {
      console.log(`Serving frontend from ${frontendDistPath}`);
    } else {
      console.log("Frontend build not found. Run `npm run build` in frontend to serve UI from backend.");
    }
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
