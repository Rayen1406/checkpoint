import mongoose from "mongoose";

const hackathonConfigSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      unique: true,
      default: "global",
    },
    baseTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const HackathonConfig = mongoose.model("HackathonConfig", hackathonConfigSchema);
