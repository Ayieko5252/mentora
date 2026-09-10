// End-to-end smoke test of the learner journey against a running API.
// Run the server first (npm run dev), then: node scripts/smoke.mjs
//
// Verifies: auth, access control, notes progress, server-side quiz grading,
// the 60%/50% pass gates, completion stamping, and gated PDF downloads.
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

const BASE = process.env.SMOKE_BASE || "http://localhost:4000";
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓", msg); } else { fail++; console.log("  ✗", msg); } };

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function main() {
  console.log(`Smoke test → ${BASE}\n`);

  // 1. Auth
  console.log("Auth");
  const login = await api("/auth/login", { method: "POST", body: { email: "learner@mentora.dev", password: "Learner123!" } });
  ok(login.status === 200 && login.data.token, "learner can log in");
  const token = login.data.token;
  const bad = await api("/auth/login", { method: "POST", body: { email: "learner@mentora.dev", password: "wrong" } });
  ok(bad.status === 401, "wrong password rejected (401)");

  // 2. Find an owned course + a not-owned course
  console.log("\nAccess control");
  const dash = await api("/dashboard", { token });
  const ownedSlug = dash.data.courses[0]?.slug;
  ok(!!ownedSlug, `learner owns a course (${ownedSlug})`);
  const someOther = await prisma.course.findFirst({ where: { slug: { not: ownedSlug } }, select: { slug: true } });
  const denied = await api(`/learn/courses/${someOther.slug}/content`, { token });
  ok(denied.status === 403, "content of a non-owned course is blocked (403)");

  // 3. Load owned course content
  console.log("\nLearning flow");
  const content = await api(`/learn/courses/${ownedSlug}/content`, { token });
  const topics = content.data.topics;
  // Only assessed topics are graded; the non-assessed "Opportunities" topic (order 11) has no assessment.
  const assessed = topics.filter((t) => t.assessment);
  ok(content.status === 200 && assessed.length === 10, `owned course returns 10 assessed topics (${topics.length} total)`);

  // assessment payloads must never leak the correct flag
  const firstAssess = await api(`/learn/assessments/${assessed[0].assessment.id}`, { token });
  const leaks = JSON.stringify(firstAssess.data).toLowerCase().includes("iscorrect");
  ok(!leaks, "assessment payload does not expose correct answers");

  // 4. Mark all notes read
  for (const t of topics) {
    await api("/learn/courses/notes", { method: "POST", token, body: { topicId: t.id, notesRead: true } });
  }
  const afterNotes = await api(`/learn/courses/${ownedSlug}/content`, { token });
  ok(afterNotes.data.enrollment.notesCompletionPercent === 100, "notes completion reaches 100%");

  // 5. Answer every assessment CORRECTLY (read correct choices from DB)
  let lastEnrollment = null;
  for (const t of assessed) {
    const questions = await prisma.question.findMany({
      where: { assessmentId: t.assessment.id },
      select: { id: true, choices: { where: { isCorrect: true }, select: { id: true } } },
    });
    const answers = {};
    for (const q of questions) answers[q.id] = q.choices[0].id;
    const sub = await api(`/learn/assessments/${t.assessment.id}/submit`, { method: "POST", token, body: { answers } });
    lastEnrollment = sub.data.enrollment;
    if (t.order === 1) ok(sub.data.scorePercent === 100, "a fully-correct submission scores 100%");
  }
  ok(lastEnrollment.selfAssessmentAverage >= 50, `self-assessment average ≥ 50% (${lastEnrollment.selfAssessmentAverage})`);
  ok(lastEnrollment.overallAverage >= 60, `overall average ≥ 60% (${lastEnrollment.overallAverage})`);
  ok(lastEnrollment.passed === true, "course marked PASSED when both gates met");
  ok(!!lastEnrollment.completedAt, "completion timestamp is set");

  // 6. A wrong submission should score 0 and not by itself pass
  const q0 = await prisma.question.findMany({
    where: { assessmentId: assessed[0].assessment.id },
    select: { id: true, choices: { where: { isCorrect: false }, select: { id: true }, take: 1 } },
  });
  const wrong = {}; for (const q of q0) wrong[q.id] = q.choices[0].id;
  const wsub = await api(`/learn/assessments/${assessed[0].assessment.id}/submit`, { method: "POST", token, body: { answers: wrong } });
  ok(wsub.data.scorePercent === 0, "an all-wrong submission scores 0%");

  // 7. Gated downloads
  console.log("\nDownloads");
  const notesPdf = await fetch(`${BASE}/api/learn/courses/${ownedSlug}/notes.pdf`, { headers: { Authorization: `Bearer ${token}` } });
  ok(notesPdf.status === 200 && notesPdf.headers.get("content-type") === "application/pdf", "owner can download course notes PDF");
  const recSlug = dash.data.recipes[0]?.slug;
  if (recSlug) {
    const recPdf = await fetch(`${BASE}/api/learn/recipes/${recSlug}/booklet.pdf`, { headers: { Authorization: `Bearer ${token}` } });
    ok(recPdf.status === 200 && recPdf.headers.get("content-type") === "application/pdf", "owner can download recipe booklet PDF");
  }

  console.log(`\n${fail === 0 ? "✔ ALL PASSED" : "✗ FAILURES"} — ${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
