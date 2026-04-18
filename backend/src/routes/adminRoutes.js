import express from "express";
import { Checkpoint } from "../models/Checkpoint.js";
import { Submission } from "../models/Submission.js";
import { Team } from "../models/Team.js";
import { createAdminToken, requireAdmin } from "../utils/auth.js";
import { getCheckpointState } from "../utils/checkpointLogic.js";
import { ensureCheckpointRange, ensureCheckpointsAroundNow } from "../utils/checkpointStore.js";
import {
  getHackathonBaseTime,
  setHackathonBaseTime,
} from "../utils/hackathonConfigStore.js";

const router = express.Router();

router.post("/login", (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (
    username !== process.env.ADMIN_USERNAME ||
    password !== process.env.ADMIN_PASSWORD
  ) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.json({ token: createAdminToken() });
});

router.get("/config", requireAdmin, async (_req, res) => {
  try {
    const baseTime = await getHackathonBaseTime();
    return res.json({
      baseTime: baseTime.toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load config" });
  }
});

router.put("/config/start-time", requireAdmin, async (req, res) => {
  try {
    const startTime = req.body.startTime;

    if (!startTime) {
      return res.status(400).json({ message: "startTime is required" });
    }

    const baseTime = await setHackathonBaseTime(startTime);
    await ensureCheckpointsAroundNow(baseTime);

    req.io.emit("checkpoint:config-updated", {
      baseTime: baseTime.toISOString(),
    });

    return res.json({
      message: "Hackathon start time updated",
      baseTime: baseTime.toISOString(),
    });
  } catch (error) {
    if (error.message?.includes("Invalid start time")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Failed to update start time" });
  }
});

router.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const baseTime = await getHackathonBaseTime();
    await ensureCheckpointsAroundNow(baseTime);

    const now = new Date();
    const state = getCheckpointState(now, baseTime);

    if (state.currentIndex >= 0) {
      await ensureCheckpointRange(state.currentIndex, state.currentIndex + 1, baseTime);
    }

    const [teams, currentCheckpoint, nextCheckpoint] = await Promise.all([
      Team.find({}).sort({ name: 1 }),
      state.currentIndex >= 0 ? Checkpoint.findOne({ index: state.currentIndex }) : null,
      Checkpoint.findOne({ index: Math.max(0, state.currentIndex + 1) }),
    ]);

    const teamIds = teams.map((team) => team._id);
    const submissions = await Submission.find({ teamId: { $in: teamIds } })
      .sort({ submittedAt: -1 })
      .lean();

    const submissionsByTeam = new Map();
    for (const submission of submissions) {
      const key = String(submission.teamId);
      if (!submissionsByTeam.has(key)) {
        submissionsByTeam.set(key, []);
      }
      submissionsByTeam.get(key).push(submission);
    }

    const currentCheckpointId = currentCheckpoint ? String(currentCheckpoint._id) : null;

    const rows = teams.map((team) => {
      const list = submissionsByTeam.get(String(team._id)) || [];
      const latestSubmission = list[0] || null;

      const hasSubmittedCurrent = currentCheckpointId
        ? list.some((item) => String(item.checkpointId) === currentCheckpointId)
        : false;

      let currentStatus = "pending";
      if (hasSubmittedCurrent) {
        currentStatus = "on_time";
      } else if (!state.isActive && state.currentIndex >= 0) {
        currentStatus = "missed";
      }

      return {
        teamId: team._id,
        teamName: team.name,
        lastSubmissionTime: latestSubmission?.submittedAt || null,
        currentStatus,
        totalCheckpointsCompleted: list.length,
      };
    });

    return res.json({
      checkpointStatus: {
        isActive: state.isActive,
        currentIndex: state.currentIndex,
        remainingMs: Math.max(0, state.remainingMs),
        currentWindow: state.activeCheckpoint,
        nextWindow: nextCheckpoint || state.nextCheckpoint,
      },
      config: {
        baseTime: baseTime.toISOString(),
      },
      teams: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load organizer dashboard" });
  }
});

router.get("/team/:teamId", requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const baseTime = await getHackathonBaseTime();
    await ensureCheckpointsAroundNow(baseTime);

    const now = new Date();
    const state = getCheckpointState(now, baseTime);

    const startIndex = 0;
    const endIndex = Math.max(12, state.currentIndex + 4);

    await ensureCheckpointRange(startIndex, endIndex, baseTime);

    const checkpoints = await Checkpoint.find({
      index: { $gte: startIndex, $lte: endIndex },
    }).sort({ index: 1 });

    const submissions = await Submission.find({
      teamId: team._id,
      checkpointId: { $in: checkpoints.map((cp) => cp._id) },
    }).sort({ submittedAt: -1 });

    const submissionsByCheckpoint = new Map(
      submissions.map((submission) => [String(submission.checkpointId), submission])
    );

    const timeline = checkpoints.map((checkpoint) => {
      const submission = submissionsByCheckpoint.get(String(checkpoint._id));
      let status = "upcoming";

      if (submission) {
        status = "submitted";
      } else if (now >= checkpoint.endTime) {
        status = "missed";
      } else if (now >= checkpoint.startTime && now < checkpoint.endTime) {
        status = "current";
      }

      return {
        checkpointId: checkpoint._id,
        index: checkpoint.index,
        startTime: checkpoint.startTime,
        endTime: checkpoint.endTime,
        progress: submission?.progress || "",
        blockers: submission?.blockers || "",
        submittedAt: submission?.submittedAt || null,
        status,
      };
    });

    return res.json({
      team: {
        id: team._id,
        name: team.name,
      },
      timeline,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load team details" });
  }
});

export default router;
