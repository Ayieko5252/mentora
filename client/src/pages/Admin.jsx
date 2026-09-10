import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="container"><p className="form-error">{error}</p></div>;
  if (!stats) return <div className="container">Loading…</div>;

  const tiles = [
    ["Disciplines", stats.disciplines],
    ["Courses", stats.courses],
    ["Topics", stats.topics],
    ["Recipes", stats.recipes],
    ["Booklets", stats.booklets],
    ["Users", stats.users],
    ["Paid purchases", stats.paidPurchases],
  ];

  return (
    <div className="container">
      <div className="page-head">
        <h1>Admin overview</h1>
        <p className="muted">Platform content &amp; commerce at a glance</p>
      </div>
      <div className="stat-grid">
        {tiles.map(([label, value]) => (
          <div key={label} className="stat-tile">
            <div className="stat-value">{value.toLocaleString()}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>
      <p className="hint">
        Content-management endpoints (create discipline / recipe / full course, publish toggle) are
        available under <code>/api/admin</code> and enforced for ADMIN/INSTRUCTOR roles. The seed
        script uses the same structural rules.
      </p>
    </div>
  );
}
