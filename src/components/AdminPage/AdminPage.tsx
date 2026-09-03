import { useEffect, useState } from "react";
import ErrorState from "../ErrorState/ErrorState";
import "./AdminPage.css";

type Stats = {
  totalToday: number;
  totalAllTime: number;
  breakdown: { label: string; count: number }[];
  visitsToday: number;
  visitsAllTime: number;
  uniqueVisitors: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/admin/stats")
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json();
      })
      .then((data) => setStats(data))
      .catch((err) => {
        console.error("Failed to load stats:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="ap-page">
      <h1 className="ap-heading">SkillQuest — Admin</h1>

      {error ? (
        <ErrorState message="Couldn't load analytics." onRetry={load} />
      ) : loading || !stats ? (
        <p className="ap-loading">Loading stats…</p>
      ) : (
        <>
          <h2 className="ap-subheading ap-subheading--first">Site visits</h2>
          <div className="ap-summary">
            <div className="ap-stat">
              <p className="ap-stat__value">{stats.visitsToday}</p>
              <p className="ap-stat__label">Visits today</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__value">{stats.visitsAllTime}</p>
              <p className="ap-stat__label">Visits all-time</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__value">{stats.uniqueVisitors}</p>
              <p className="ap-stat__label">Unique visitors</p>
            </div>
          </div>

          <h2 className="ap-subheading">Note clicks</h2>
          <div className="ap-summary">
            <div className="ap-stat">
              <p className="ap-stat__value">{stats.totalToday}</p>
              <p className="ap-stat__label">Clicks today</p>
            </div>
            <div className="ap-stat">
              <p className="ap-stat__value">{stats.totalAllTime}</p>
              <p className="ap-stat__label">Clicks all-time</p>
            </div>
          </div>

          <h2 className="ap-subheading">By course &amp; level</h2>

          {stats.breakdown.length === 0 ? (
            <p className="ap-empty">No clicks recorded yet.</p>
          ) : (
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Course · Level</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {stats.breakdown.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
