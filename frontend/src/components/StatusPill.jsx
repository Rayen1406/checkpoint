const colorMap = {
  on_time: "status-green",
  submitted: "status-green",
  pending: "status-yellow",
  current: "status-yellow",
  missed: "status-red",
  upcoming: "status-muted",
};

const labelMap = {
  on_time: "On Time",
  submitted: "Submitted",
  pending: "Pending",
  current: "Current",
  missed: "Missed",
  upcoming: "Upcoming",
};

export default function StatusPill({ status }) {
  return (
    <span className={`status-pill ${colorMap[status] || "status-muted"}`}>
      {labelMap[status] || status}
    </span>
  );
}
