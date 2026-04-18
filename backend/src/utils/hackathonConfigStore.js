import { HackathonConfig } from "../models/HackathonConfig.js";
import { getBaseTime } from "./checkpointLogic.js";

const GLOBAL_KEY = "global";

export async function getOrCreateHackathonConfig() {
  let config = await HackathonConfig.findOne({ singletonKey: GLOBAL_KEY });

  if (!config) {
    config = await HackathonConfig.create({
      singletonKey: GLOBAL_KEY,
      baseTime: getBaseTime(),
    });
  }

  return config;
}

export async function getHackathonBaseTime() {
  const config = await getOrCreateHackathonConfig();
  return new Date(config.baseTime);
}

export async function setHackathonBaseTime(startTimeRaw) {
  const baseTime = new Date(startTimeRaw);
  if (Number.isNaN(baseTime.getTime())) {
    throw new Error("Invalid start time. Use a valid ISO datetime.");
  }

  await HackathonConfig.findOneAndUpdate(
    { singletonKey: GLOBAL_KEY },
    {
      $set: {
        baseTime,
      },
      $setOnInsert: {
        singletonKey: GLOBAL_KEY,
      },
    },
    { upsert: true, new: true }
  );

  return baseTime;
}
