import mongoose from "mongoose";

const checkpointSchema = new mongoose.Schema(
  {
    index: {
      type: Number,
      required: true,
      unique: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

checkpointSchema.index({ startTime: 1 });

export const Checkpoint = mongoose.model("Checkpoint", checkpointSchema);
