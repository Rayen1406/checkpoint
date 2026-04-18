function markerFor(status) {
  if (status === "submitted") return "✔";
  if (status === "missed") return "✖";
  if (status === "current") return "⏳";
  if (status === "upcoming") return " ";
  return " ";
}

function classFor(status) {
  if (status === "submitted") return "timeline-good";
  if (status === "missed") return "timeline-bad";
  if (status === "current") return "timeline-current";
  return "timeline-upcoming";
}

export default function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((item) => (
        <div key={item.index} className={`timeline-item ${classFor(item.status)}`}>
          <span className="timeline-icon">{markerFor(item.status)}</span>
          <span>Checkpoint #{item.index + 1}</span>
          <span className="timeline-meta">{new Date(item.startTime).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
