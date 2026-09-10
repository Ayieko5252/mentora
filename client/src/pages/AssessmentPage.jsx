import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function AssessmentPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({}); // questionId -> choiceId
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get(`/learn/assessments/${assessmentId}`)
      .then((res) => setAssessment(res.assessment))
      .catch((e) => setError(e.message));
  }, [assessmentId]);

  if (error) return <div className="container"><p className="form-error">{error}</p></div>;
  if (!assessment) return <div className="container">Loading…</div>;

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === assessment.questions.length;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post(`/learn/assessments/${assessmentId}/submit`, { answers });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reviewFor = (questionId) =>
    result?.review.find((r) => r.questionId === questionId);

  return (
    <div className="container narrow">
      <h1>{assessment.title}</h1>
      <p className="muted">
        {assessment.topicTitle} · {assessment.questions.length} questions · pass mark{" "}
        {assessment.passMark}%
      </p>

      {result && (
        <div className={`result-banner ${result.passed ? "pass" : "fail"}`}>
          <div className="result-score">{Math.round(result.scorePercent)}%</div>
          <div>
            <strong>{result.passed ? "Passed" : "Not passed"}</strong> — {result.correctCount}/
            {result.total} correct.
            <div className="muted">
              Course overall average is now {Math.round(result.enrollment.overallAverage)}%.
            </div>
          </div>
        </div>
      )}

      <ol className="quiz">
        {assessment.questions.map((q) => {
          const review = reviewFor(q.id);
          return (
            <li key={q.id} className="quiz-q">
              <p className="quiz-prompt">{q.prompt}</p>
              <div className="quiz-choices">
                {q.choices.map((c) => {
                  const chosen = answers[q.id] === c.id;
                  let cls = "choice";
                  if (review) {
                    if (c.id === review.correctChoiceId) cls += " correct";
                    else if (chosen && !review.correct) cls += " wrong";
                  } else if (chosen) {
                    cls += " selected";
                  }
                  return (
                    <label key={c.id} className={cls}>
                      <input
                        type="radio"
                        name={q.id}
                        disabled={Boolean(result)}
                        checked={chosen}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                      />
                      {c.text}
                    </label>
                  );
                })}
              </div>
              {review?.explanation && (
                <p className="explanation">Explanation: {review.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      {!result ? (
        <div className="quiz-actions">
          <span className="muted">
            {answeredCount}/{assessment.questions.length} answered
          </span>
          <button className="btn btn-primary" disabled={!allAnswered || submitting} onClick={submit}>
            {submitting ? "Grading…" : "Submit answers"}
          </button>
        </div>
      ) : (
        <div className="quiz-actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            ← Back to course
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
}
