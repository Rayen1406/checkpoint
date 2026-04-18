import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Countdown from "../components/Countdown";
import Timeline from "../components/Timeline";
import { api } from "../services/api";

const TEAM_STORAGE_KEY = "checkpoint_team";

export default function TeamDashboardPage() {
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState("");
  const [blockers, setBlockers] = useState("");
  const [timeLeftMs, setTimeLeftMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async (teamId) => {
    const result = await api.getTeamDashboard(teamId);
    setData(result);
    setTimeLeftMs(result.checkpointStatus.remainingMs);
  };

  useEffect(() => {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) {
      navigate("/");
      return;
    }

    const parsed = JSON.parse(raw);
    setTeam(parsed);

    refresh(parsed.id)
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      refresh(parsed.id).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, [navigate]);

  useEffect(() => {
    const tick = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const hasSubmittedCurrent = useMemo(() => {
    if (!data) return false;

    return data.timeline.some(
      (entry) =>
        entry.index === data.checkpointStatus.currentIndex && entry.status === "submitted"
    );
  }, [data]);

  const isActive = Boolean(data?.checkpointStatus?.isActive);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!team) return;

    setError("");
    setNotice("");

    try {
      setSubmitting(true);
      await api.submitCheckpoint(team.id, { progress, blockers });
      setProgress("");
      setBlockers("");
      setNotice("Submission saved for current checkpoint.");
      await refresh(team.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="page">Loading...</main>;
  }

  return (
    <main className="page page-team">
      <section className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Team Dashboard</p>
            <h2>{team?.name}</h2>
          </div>
          <button
            className="ghost-btn"
            onClick={() => {
              localStorage.removeItem(TEAM_STORAGE_KEY);
              navigate("/");
            }}
          >
            Exit
          </button>
        </div>

        <div className={`checkpoint-box ${isActive ? "active" : "closed"}`}>
          <h3>{isActive ? "Checkpoint is LIVE" : "Checkpoint is CLOSED"}</h3>
          <Countdown
            ms={timeLeftMs}
            label={isActive ? "Submission window closes in" : "Next checkpoint in"}
          />
        </div>

        <form onSubmit={handleSubmit} className="stack-form">
          <label htmlFor="progress">Progress</label>
          <input
            id="progress"
            value={progress}
            onChange={(e) => setProgress(e.target.value)}
            placeholder="What did your team complete?"
            disabled={!isActive || hasSubmittedCurrent}
          />

          <label htmlFor="blockers">Blockers (optional)</label>
          <input
            id="blockers"
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="Any blockers?"
            disabled={!isActive || hasSubmittedCurrent}
          />

          <button type="submit" disabled={!isActive || hasSubmittedCurrent || submitting}>
            {hasSubmittedCurrent ? "Already Submitted" : submitting ? "Submitting..." : "Submit"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}
        {notice ? <p className="success-text">{notice}</p> : null}
      </section>

      <section className="panel">
        <h3>Team Timeline</h3>
        <Timeline items={data?.timeline || []} />
      </section>
    </main>
  );
}
