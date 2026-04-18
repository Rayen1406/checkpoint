import express from "express";
import { Checkpoint } from "../models/Checkpoint.js";
import { Submission } from "../models/Submission.js";
import { Team } from "../models/Team.js";
import { getCheckpointState } from "../utils/checkpointLogic.js";
import { ensureCheckpointRange, ensureCheckpointsAroundNow } from "../utils/checkpointStore.js";
import { getHackathonBaseTime } from "../utils/hackathonConfigStore.js";

const router = express.Router();

function normalizeTeamName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

router.post("/start", async (req, res) => {
  try {
    const teamName = normalizeTeamName(req.body.teamName);

    if (!teamName) {
      return res.status(400).json({ message: "Team Name is required" });
    }

    const team = await Team.findOneAndUpdate(
      { name: teamName },
      { $setOnInsert: { name: teamName } },
      { upsert: true, new: true }
    );

    return res.json({
      team: {
        id: team._id,
        name: team.name,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to start team session" });
  }
});

router.get("/:teamId/dashboard", async (req, res) => {
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

    const timelineStart = Math.max(0, state.currentIndex - 4);
    const timelineEnd = Math.max(8, state.currentIndex + 4);

    await ensureCheckpointRange(timelineStart, timelineEnd, baseTime);

    const checkpoints = await Checkpoint.find({
      index: { $gte: timelineStart, $lte: timelineEnd },
    }).sort({ index: 1 });

    const submissions = await Submission.find({
      teamId: team._id,
      checkpointId: { $in: checkpoints.map((cp) => cp._id) },
    });

    const submissionByCheckpointId = new Map(
      submissions.map((submission) => [String(submission.checkpointId), submission])
    );

    const timeline = checkpoints.map((checkpoint) => {
      const submission = submissionByCheckpointId.get(String(checkpoint._id));
      const isCurrent = checkpoint.index === state.currentIndex;

      let status = "upcoming";

      if (submission) {
        status = "submitted";
      } else if (checkpoint.index < state.currentIndex) {
        status = "missed";
      } else if (isCurrent && state.isActive) {
        status = "current";
      } else if (isCurrent && !state.isActive && now >= checkpoint.endTime) {
        status = "missed";
      }

      return {
        checkpointId: checkpoint._id,
        index: checkpoint.index,
        startTime: checkpoint.startTime,
        endTime: checkpoint.endTime,
        status,
        submittedAt: submission?.submittedAt || null,
      };
    });

    return res.json({
      team: {
        id: team._id,
        name: team.name,
      },
      checkpointStatus: {
        isActive: state.isActive,
        currentIndex: state.currentIndex,
        remainingMs: Math.max(0, state.remainingMs),
        currentWindow: state.activeCheckpoint,
        nextWindow: state.nextCheckpoint,
      },
      timeline,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard" });
  }
});

router.post("/:teamId/submit", async (req, res) => {
  try {
    const { teamId } = req.params;
    const progress = String(req.body.progress || "").trim();
    const blockers = String(req.body.blockers || "").trim();

    if (!progress) {
      return res.status(400).json({ message: "Progress is required" });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const baseTime = await getHackathonBaseTime();
    await ensureCheckpointsAroundNow(baseTime);

    const now = new Date();
    const state = getCheckpointState(now, baseTime);

    if (!state.isActive || state.currentIndex < 0) {
      return res.status(400).json({ message: "Checkpoint is closed" });
    }

    await ensureCheckpointRange(state.currentIndex, state.currentIndex, baseTime);
    const checkpoint = await Checkpoint.findOne({ index: state.currentIndex });

    if (!checkpoint) {
      return res.status(500).json({ message: "Checkpoint not available" });
    }

    let submission;

    try {
      submission = await Submission.create({
        teamId: team._id,
        checkpointId: checkpoint._id,
        progress,
        blockers,
        submittedAt: now,
        status: "on_time",
      });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ message: "Already submitted for this checkpoint" });
      }
      throw error;
    }

    req.io.emit("submission:created", {
      teamId: String(team._id),
      teamName: team.name,
      checkpointIndex: checkpoint.index,
      submittedAt: submission.submittedAt,
    });

    return res.status(201).json({
      submission: {
        id: submission._id,
        teamId: submission.teamId,
        checkpointId: submission.checkpointId,
        progress: submission.progress,
        blockers: submission.blockers,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit checkpoint" });
  }
});

export default router;
