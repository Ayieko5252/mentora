import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { pct } from "../api/format.js";
import { useAuth } from "../context/AuthContext.jsx";

// The three departments, in display order. Course departments come from the
// server (discipline name); Recipes is assembled from recipe + booklet buys.
const DEPARTMENTS = ["Engineering Tools", "Programming", "Recipes"];

function CourseCard({ c }) {
  return (
    <Link to={`/learn/courses/${c.slug}`} className="dash-card">
      <div className="dash-head">
        <h3>{c.title}</h3>
        <span className={`status-pill ${c.passed ? "pass" : "in-progress"}`}>
          {c.passed ? "Passed" : "In progress"}
        </span>
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${Math.min(100, c.overallAverage)}%` }} />
      </div>
      <div className="dash-stats">
        <span>Overall {pct(c.overallAverage)}</span>
        <span>Tests {pct(c.selfAssessmentAverage)}</span>
        <span>Notes {pct(c.notesCompletionPercent)}</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then(setData);
  }, []);

  if (!data) return <div className="container">Loading…</div>;

  const coursesByDept = {};
  for (const c of data.courses) {
    const dept = c.department || "Courses";
    (coursesByDept[dept] = coursesByDept[dept] || []).push(c);
  }

  const hasRecipes = data.recipes.length > 0 || data.booklets.length > 0;

  const deptStat = (dept) => {
    if (dept === "Recipes") return `${data.recipes.length} recipes · ${data.booklets.length} booklets`;
    const list = coursesByDept[dept] || [];
    const passed = list.filter((c) => c.passed).length;
    return `${list.length} courses · ${passed} passed`;
  };

  return (
    <div className="container">
      <div className="page-head">
        <h1>Welcome back, {user.name}</h1>
        <p className="muted">Your learning, organised by department</p>
      </div>

      {/* Department summary strip */}
      <div className="dept-summary">
        {DEPARTMENTS.map((d) => (
          <div key={d} className="dept-chip">
            <div className="dept-chip-name">{d}</div>
            <div className="dept-chip-stat">{deptStat(d)}</div>
          </div>
        ))}
      </div>

      {/* Engineering Tools + Programming */}
      {DEPARTMENTS.filter((d) => d !== "Recipes").map((dept) => (
        <section key={dept} className="dept-section">
          <h2>{dept}</h2>
          {(coursesByDept[dept] || []).length === 0 ? (
            <p className="muted">
              Nothing here yet. <Link to="/courses">Browse courses →</Link>
            </p>
          ) : (
            <div className="dash-grid">
              {coursesByDept[dept].map((c) => (
                <CourseCard key={c.slug} c={c} />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Recipes department */}
      <section className="dept-section">
        <h2>Recipes</h2>
        {!hasRecipes ? (
          <p className="muted">
            No recipes yet. <Link to="/recipes">Explore recipes →</Link>
          </p>
        ) : (
          <>
            {data.recipes.length > 0 && (
              <ul className="link-list">
                {data.recipes.map((r) => (
                  <li key={r.slug}>
                    <Link to={`/recipes/${r.slug}`}>{r.title}</Link>{" "}
                    <span className="muted">· {r.cuisine}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.booklets.map((b) => (
              <details key={b.slug} className="booklet-detail">
                <summary>
                  {b.title} <span className="muted">· {b.recipes.length} recipes</span>
                </summary>
                <ul className="link-list">
                  {b.recipes.map((r) => (
                    <li key={r.slug}>
                      <Link to={`/recipes/${r.slug}`}>{r.title}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
