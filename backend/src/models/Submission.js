import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    checkpointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checkpoint",
      required: true,
      index: true,
    },
    progress: {
      type: String,
      required: true,
      trim: true,
    },
    blockers: {
      type: String,
      default: "",
      trim: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["on_time"],
      default: "on_time",
    },
  },
  { timestamps: true }
);

submissionSchema.index({ teamId: 1, checkpointId: 1 }, { unique: true });

export const Submission = mongoose.model("Submission", submissionSchema);
