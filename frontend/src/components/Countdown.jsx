function formatMs(ms) {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export default function Countdown({ ms, label }) {
  return (
    <div className="countdown-wrap">
      <p className="countdown-label">{label}</p>
      <div className="countdown">{formatMs(ms)}</div>
    </div>
  );
}
