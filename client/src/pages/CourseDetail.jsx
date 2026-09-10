import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { money } from "../api/format.js";
import BuyButton from "../components/BuyButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function CourseDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [owned, setOwned] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/catalog/courses/${slug}`, { auth: false })
      .then((res) => setCourse(res.course))
      .catch((e) => setError(e.message));
  }, [slug]);

  // Detect ownership by trying to load protected content (only if logged in).
  useEffect(() => {
    if (!user) return;
    api
      .get(`/learn/courses/${slug}/content`)
      .then(() => setOwned(true))
      .catch(() => setOwned(false));
  }, [user, slug]);

  if (error) return <div className="container"><p className="form-error">{error}</p></div>;
  if (!course) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <Link to="/courses" className="back-link">← All courses</Link>
      <div className="detail-head">
        <div>
          <div className="card-badge">{course.level}</div>
          <h1>{course.title}</h1>
          <p className="muted">
            {course.discipline.name}
            {course.category ? ` · ${course.category}` : ""}
          </p>
          <p>{course.summary}</p>
        </div>
        <div className="detail-buy">
          <div className="price-big">{money(course.priceCents)}</div>
          {owned ? (
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/learn/courses/${slug}`)}>
              Go to course →
            </button>
          ) : (
            <BuyButton
              itemType="COURSE"
              itemId={course.id}
              priceCents={course.priceCents}
              label="Enroll"
              onOwned={() => navigate(`/learn/courses/${slug}`)}
            />
          )}
          <ul className="detail-facts">
            <li>{course.topics.length} topics</li>
            <li>30 hands-on labs</li>
            <li>10 self-assessments</li>
            <li>Pass: 60% overall &amp; 50% on tests</li>
          </ul>
        </div>
      </div>

      <h2>Course outline</h2>
      <ol className="outline">
        {course.topics.map((t) => (
          <li key={t.id} className="outline-item">
            <div className="outline-title">
              <strong>Topic {t.order}:</strong> {t.title}
            </div>
            <div className="outline-meta">
              {t._count.notes} note pages · {t._count.labs} labs ·{" "}
              {t.assessment ? "1 self-assessment" : "—"}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
