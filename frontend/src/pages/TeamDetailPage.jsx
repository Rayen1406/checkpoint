import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StatusPill from "../components/StatusPill";
import { api } from "../services/api";

const ADMIN_TOKEN_KEY = "checkpoint_admin_token";

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      navigate("/admin");
      return;
    }

    api
      .getAdminTeamDetails(teamId, token)
      .then(setData)
      .catch((err) => {
        setError(err.message);
      });
  }, [teamId, navigate]);

  if (!data) {
    return <main className="page">Loading...</main>;
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="header-row">
          <div>
            <p className="eyebrow">Team Detail</p>
            <h2>{data.team.name}</h2>
          </div>
          <Link to="/admin/dashboard" className="ghost-btn link-btn-inline">
            Back to Dashboard
          </Link>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="timeline-vertical">
          {data.timeline.map((item) => (
            <article key={item.checkpointId} className="timeline-card">
              <div className="timeline-card-head">
                <h4>Checkpoint #{item.index + 1}</h4>
                <StatusPill status={item.status === "submitted" ? "on_time" : item.status} />
              </div>
              <p>
                <strong>Window:</strong> {new Date(item.startTime).toLocaleString()} -{" "}
                {new Date(item.endTime).toLocaleTimeString()}
              </p>
              <p>
                <strong>Progress:</strong> {item.progress || "-"}
              </p>
              <p>
                <strong>Blockers:</strong> {item.blockers || "-"}
              </p>
              <p>
                <strong>Submitted:</strong>{" "}
                {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "-"}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
