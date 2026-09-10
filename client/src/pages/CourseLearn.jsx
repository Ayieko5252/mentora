import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, downloadFile } from "../api/client.js";
import Markdown from "../components/Markdown.jsx";
import { pct } from "../api/format.js";

function DownloadNotes({ slug }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const grab = async (fmt) => {
    setBusy(fmt);
    setError("");
    try {
      await downloadFile(`/learn/courses/${slug}/notes.${fmt}`, `${slug}-notes.${fmt}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const grabOutline = async () => {
    setBusy("outline");
    setError("");
    try {
      await downloadFile(`/learn/courses/${slug}/outline.pdf`, `${slug}-outline.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="download-notes">
      <div className="download-label">Downloads</div>
      <div className="download-btns">
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={grabOutline}>
          {busy === "outline" ? "…" : "⬇ Course outline"}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => grab("pdf")}>
          {busy === "pdf" ? "…" : "All notes (PDF)"}
        </button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => grab("md")}>
          {busy === "md" ? "…" : "Markdown"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function ProgressPanel({ enrollment }) {
  const passOverall = enrollment.overallAverage >= 60;
  const passTests = enrollment.selfAssessmentAverage >= 50;
  return (
    <div className="progress-panel">
      <div className="progress-row">
        <span>Notes completion</span>
        <strong>{pct(enrollment.notesCompletionPercent)}</strong>
      </div>
      <div className="progress-row">
        <span>Self-assessment average {passTests ? "✓" : ""}</span>
        <strong>{pct(enrollment.selfAssessmentAverage)}</strong>
      </div>
      <div className="progress-row">
        <span>Overall average {passOverall ? "✓" : ""}</span>
        <strong>{pct(enrollment.overallAverage)}</strong>
      </div>
      <div className={`status-pill ${enrollment.passed ? "pass" : "in-progress"}`}>
        {enrollment.passed ? "Course passed — certificate issued" : "In progress"}
      </div>
      <p className="hint">Pass needs ≥60% overall and ≥50% on self-assessments.</p>
    </div>
  );
}

function TopicDownloads({ slug, order, hasLabs }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const grab = async (kind) => {
    setBusy(kind);
    setError("");
    try {
      await downloadFile(`/learn/courses/${slug}/topics/${order}/${kind}.pdf`, `${slug}-topic${order}-${kind}.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="topic-downloads">
      <span className="download-label">This topic:</span>
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => grab("notes")}>
        {busy === "notes" ? "…" : "⬇ Notes PDF"}
      </button>
      {hasLabs && (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => grab("labs")}>
          {busy === "labs" ? "…" : "⬇ Lab instructions PDF"}
        </button>
      )}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

function NotesReader({ notes }) {
  const [page, setPage] = useState(0);
  const note = notes[page];
  if (!note) return null;
  return (
    <div className="notes-reader">
      <div className="notes-head">
        <h4>{note.title}</h4>
        <span className="muted">
          Page {page + 1} / {notes.length}
        </span>
      </div>
      <Markdown>{note.contentMarkdown}</Markdown>
      <div className="pager">
        <button className="btn btn-ghost" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
          ← Prev page
        </button>
        <button
          className="btn btn-ghost"
          disabled={page >= notes.length - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page →
        </button>
      </div>
    </div>
  );
}

export default function CourseLearn() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get(`/learn/courses/${slug}/content`)
      .then((res) => {
        setData(res);
        setActiveTopicId((cur) => cur || res.topics[0]?.id);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (error) return <div className="container"><p className="form-error">{error}</p></div>;
  if (!data) return <div className="container">Loading…</div>;

  const topic = data.topics.find((t) => t.id === activeTopicId);

  const markRead = async (read) => {
    const res = await api.post("/learn/courses/notes", { topicId: topic.id, notesRead: read });
    setData((d) => ({
      ...d,
      enrollment: res.enrollment,
      topics: d.topics.map((t) => (t.id === topic.id ? { ...t, notesRead: read } : t)),
    }));
  };

  return (
    <div className="container learn-layout">
      <aside className="learn-sidebar">
        <Link to={`/courses/${slug}`} className="back-link">← Course page</Link>
        <h3>{data.course.title}</h3>
        <ProgressPanel enrollment={data.enrollment} />
        <DownloadNotes slug={slug} />
        <ol className="topic-list">
          {data.topics.map((t) => (
            <li key={t.id}>
              <button
                className={`topic-link ${t.id === activeTopicId ? "active" : ""}`}
                onClick={() => setActiveTopicId(t.id)}
              >
                <span>
                  {t.order}. {t.title}
                </span>
                <span className="topic-flags">
                  {t.notesRead ? "📖" : "•"}{" "}
                  {t.bestAssessmentScore != null ? `${Math.round(t.bestAssessmentScore)}%` : ""}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </aside>

      <section className="learn-main">
        {topic && (
          <>
            <h2>
              Topic {topic.order}: {topic.title}
            </h2>
            <TopicDownloads slug={slug} order={topic.order} hasLabs={topic.labs.length > 0} />

            <div className="tabs-section">
              <h3>Notes</h3>
              <NotesReader notes={topic.notes} />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={topic.notesRead}
                  onChange={(e) => markRead(e.target.checked)}
                />
                Mark this topic's notes as read
              </label>
            </div>

            {topic.labs.length > 0 && (
              <div className="tabs-section">
                <h3>Labs ({topic.labs.length})</h3>
                {topic.labs.map((lab) => (
                  <details key={lab.id} className="lab">
                    <summary>
                      {lab.title} <span className="muted">· ~{lab.estimatedMinutes} min</span>
                    </summary>
                    <p className="muted">{lab.objective}</p>
                    <Markdown>{lab.instructionsMarkdown}</Markdown>
                  </details>
                ))}
              </div>
            )}

            {topic.assessment ? (
              <div className="tabs-section">
                <h3>Self-assessment</h3>
                <div className="assessment-cta">
                  <p>
                    10 questions · pass mark 50%
                    {topic.bestAssessmentScore != null && (
                      <> · best score <strong>{Math.round(topic.bestAssessmentScore)}%</strong></>
                    )}
                  </p>
                  <Link className="btn btn-primary" to={`/learn/assessments/${topic.assessment.id}`}>
                    Take assessment →
                  </Link>
                </div>
              </div>
            ) : (
              topic.order === 11 && (
                <div className="tabs-section">
                  <p className="muted">This topic is not assessed — it's your guide to what comes after the course.</p>
                </div>
              )
            )}
          </>
        )}
      </section>
    </div>
  );
}
