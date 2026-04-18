import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server as SocketServer } from "socket.io";
import adminRoutes from "./routes/adminRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import { ensureCheckpointsAroundNow } from "./utils/checkpointStore.js";
import { getHackathonBaseTime } from "./utils/hackathonConfigStore.js";

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
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

io.on("connection", (socket) => {
  socket.emit("connected", { ok: true });
});

async function start() {
  const port = Number(process.env.PORT || 4000);
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI in environment variables");
  }

  await mongoose.connect(mongoUri);
  const baseTime = await getHackathonBaseTime();
  await ensureCheckpointsAroundNow(baseTime);

  server.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
