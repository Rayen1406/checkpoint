import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

const TEAM_STORAGE_KEY = "checkpoint_team";

export default function EntryPage() {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async (event) => {
    event.preventDefault();
    setError("");

    if (!teamName.trim()) {
      setError("Please enter a team name");
      return;
    }

    try {
      setLoading(true);
      const result = await api.startTeam(teamName);
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(result.team));
      navigate("/team");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-entry">
      <section className="panel panel-hero">
        <p className="eyebrow">Hackathon Checkpoints</p>
        <h1>Stay in sync every 2 hours.</h1>
        <p className="subtitle">
          Team leaders submit progress only inside the 15-minute checkpoint window.
        </p>

        <form onSubmit={handleStart} className="stack-form">
          <label htmlFor="teamName">Team Name</label>
          <input
            id="teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Starting..." : "Start"}
          </button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="link-btn" onClick={() => navigate("/admin")}>
          Organizer login
        </button>
      </section>
    </main>
  );
}
