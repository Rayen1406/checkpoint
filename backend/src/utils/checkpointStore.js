import { Checkpoint } from "../models/Checkpoint.js";
import {
  buildCheckpointRange,
  getCheckpointState,
  getBaseTime,
} from "./checkpointLogic.js";

export async function ensureCheckpointRange(startIndex, endIndex, baseTime = getBaseTime()) {
  const range = buildCheckpointRange(startIndex, endIndex, baseTime);

  if (range.length === 0) {
    return;
  }

  const operations = range.map((checkpoint) => ({
    updateOne: {
      filter: { index: checkpoint.index },
      update: {
        $set: {
          index: checkpoint.index,
          startTime: checkpoint.startTime,
          endTime: checkpoint.endTime,
        },
      },
      upsert: true,
    },
  }));

  await Checkpoint.bulkWrite(operations);
}

export async function ensureCheckpointsAroundNow(baseTime = getBaseTime()) {
  const checkpointState = getCheckpointState(new Date(), baseTime);
  const center = Math.max(0, checkpointState.currentIndex);

  await ensureCheckpointRange(Math.max(0, center - 24), center + 72, baseTime);
}
