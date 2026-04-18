const intervalMinutes = Number(process.env.CHECKPOINT_INTERVAL_MINUTES || 120);
const windowMinutes = Number(process.env.CHECKPOINT_WINDOW_MINUTES || 15);

const intervalMs = intervalMinutes * 60 * 1000;
const windowMs = windowMinutes * 60 * 1000;

export function getBaseTime() {
  const raw = process.env.CHECKPOINT_BASE_TIME || "2026-04-17T08:00:00.000Z";
  const baseTime = new Date(raw);

  if (Number.isNaN(baseTime.getTime())) {
    throw new Error("Invalid CHECKPOINT_BASE_TIME. Use ISO date format.");
  }

  return baseTime;
}

export function checkpointByIndex(index, baseTime = getBaseTime()) {
  const startTime = new Date(baseTime.getTime() + index * intervalMs);
  const endTime = new Date(startTime.getTime() + windowMs);

  return {
    index,
    startTime,
    endTime,
  };
}

export function getCheckpointIndexAt(time = new Date(), baseTime = getBaseTime()) {
  const elapsed = time.getTime() - baseTime.getTime();
  if (elapsed < 0) {
    return -1;
  }

  return Math.floor(elapsed / intervalMs);
}

export function getCheckpointState(now = new Date(), baseTime = getBaseTime()) {
  const currentIndex = getCheckpointIndexAt(now, baseTime);

  if (currentIndex < 0) {
    return {
      isActive: false,
      currentIndex: -1,
      activeCheckpoint: null,
      nextCheckpoint: checkpointByIndex(0, baseTime),
      remainingMs: baseTime.getTime() - now.getTime(),
      intervalMinutes,
      windowMinutes,
    };
  }

  const activeCheckpoint = checkpointByIndex(currentIndex, baseTime);
  const isActive = now >= activeCheckpoint.startTime && now < activeCheckpoint.endTime;

  if (isActive) {
    return {
      isActive,
      currentIndex,
      activeCheckpoint,
      nextCheckpoint: checkpointByIndex(currentIndex + 1, baseTime),
      remainingMs: activeCheckpoint.endTime.getTime() - now.getTime(),
      intervalMinutes,
      windowMinutes,
    };
  }

  const nextCheckpoint = checkpointByIndex(currentIndex + 1, baseTime);

  return {
    isActive,
    currentIndex,
    activeCheckpoint,
    nextCheckpoint,
    remainingMs: nextCheckpoint.startTime.getTime() - now.getTime(),
    intervalMinutes,
    windowMinutes,
  };
}

export function buildCheckpointRange(startIndex, endIndex, baseTime = getBaseTime()) {
  const checkpoints = [];

  for (let i = startIndex; i <= endIndex; i += 1) {
    if (i >= 0) {
      checkpoints.push(checkpointByIndex(i, baseTime));
    }
  }

  return checkpoints;
}
