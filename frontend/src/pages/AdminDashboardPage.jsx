import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Countdown from "../components/Countdown";
import StatusPill from "../components/StatusPill";
import { api } from "../services/api";
import { getSocket } from "../services/socket";

const ADMIN_TOKEN_KEY = "checkpoint_admin_token";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [startTimeInput, setStartTimeInput] = useState("");
  const [savingStartTime, setSavingStartTime] = useState(false);
  const [isEditingStartTime, setIsEditingStartTime] = useState(false);

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  const toLocalDateTimeValue = (isoOrDate) => {
    const date = new Date(isoOrDate);
    if (Number.isNaN(date.getTime())) return "";

    const pad = (value) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const refresh = async () => {
    if (!token) {
      navigate("/admin");
      return;
    }

    const [dashboardResult, configResult] = await Promise.all([
      api.getAdminDashboard(token),
      api.getAdminConfig(token),
    ]);

    setDashboard(dashboardResult);
    setTimeLeftMs(dashboardResult.checkpointStatus.remainingMs);
    if (!isEditingStartTime) {
      setStartTimeInput(toLocalDateTimeValue(configResult.baseTime));
    }
  };

  const handleStartTimeSave = async (event) => {
    event.preventDefault();
    if (!startTimeInput) {
      setError("Please choose a valid start time");
      return;
    }

    setError("");
    setNotice("");

    try {
      setSavingStartTime(true);
      const startTimeIso = new Date(startTimeInput).toISOString();
      await api.updateAdminStartTime(startTimeIso, token);
      setNotice("Hackathon start time updated.");
      setIsEditingStartTime(false);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingStartTime(false);
    }
  };

  useEffect(() => {
    refresh()
      .catch((err) => {
        if (err.message === "Unauthorized") {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          navigate("/admin");
          return;
        }
        setError(err.message);
      })
      .finally(() => setLoading(false));

    const poll = setInterval(() => {
      refresh().catch(() => {});
    }, 5000);

    const timer = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    const socket = getSocket();
    socket.on("submission:created", refresh);
    socket.on("checkpoint:config-updated", refresh);

    return () => {
      clearInterval(poll);
      clearInterval(timer);
      socket.off("submission:created", refresh);
      socket.off("checkpoint:config-updated", refresh);
    };
  }, []);

  if (loading) return <main className="page">Loading...</main>;

  return (
    <main className="page">
      <section className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Organizer Dashboard</p>
            <h2>Live Team Overview</h2>
          </div>
          <button
            className="ghost-btn"
            onClick={() => {
              localStorage.removeItem(ADMIN_TOKEN_KEY);
              navigate("/admin");
            }}
          >
            Logout
          </button>
        </div>

        <div className={`checkpoint-box ${dashboard?.checkpointStatus?.isActive ? "active" : "closed"}`}>
          <h3>
            {dashboard?.checkpointStatus?.isActive
              ? "Checkpoint is LIVE"
              : "Checkpoint is CLOSED"}
          </h3>
          <Countdown
            ms={timeLeftMs}
            label={dashboard?.checkpointStatus?.isActive ? "Window closes in" : "Next window in"}
          />
        </div>

        <section className="config-card">
          <h3>Hackathon Start Time</h3>
          <p className="subtitle">Organizer can adjust the global base time for all checkpoints.</p>
          <form className="inline-form" onSubmit={handleStartTimeSave}>
            <input
              type="datetime-local"
              value={startTimeInput}
              onChange={(event) => {
                setIsEditingStartTime(true);
                setStartTimeInput(event.target.value);
              }}
              onBlur={() => setIsEditingStartTime(false)}
              aria-label="Hackathon start time"
            />
            <button type="submit" disabled={savingStartTime}>
              {savingStartTime ? "Saving..." : "Save Start Time"}
            </button>
          </form>
        </section>

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="success-text">{notice}</p> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team Name</th>
                <th>Last Submission Time</th>
                <th>Current Status</th>
                <th>Total Checkpoints Completed</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.teams || []).map((row) => (
                <tr
                  key={row.teamId}
                  onClick={() => navigate(`/admin/team/${row.teamId}`)}
                  className="clickable"
                >
                  <td>
                    <Link to={`/admin/team/${row.teamId}`}>{row.teamName}</Link>
                  </td>
                  <td>
                    {row.lastSubmissionTime
                      ? new Date(row.lastSubmissionTime).toLocaleString()
                      : "-"}
                  </td>
                  <td>
                    <StatusPill status={row.currentStatus} />
                  </td>
                  <td>{row.totalCheckpointsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
