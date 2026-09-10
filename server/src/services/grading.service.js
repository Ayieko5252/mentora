import { prisma } from "../lib/prisma.js";

// ---------------------------------------------------------------------------
// Grading engine
//
// Pass criteria (both must be true):
//   1. overallAverage        >= 60   ("overall average of at least 60%")
//   2. selfAssessmentAverage >= 50   ("at least 50% on the self-assessment tests")
//
// Metric definitions:
//   - selfAssessmentAverage = mean over the course's 10 topics of the learner's
//     BEST attempt on each topic self-assessment (topics never attempted = 0).
//   - notesCompletionPercent = % of the 10 topics the learner marked notes-read.
//   - overallAverage = 50% notes completion + 50% self-assessment average.
//
// Keeping notes and assessments as two distinct inputs makes the two pass
// gates genuinely independent: a learner can ace quizzes yet still not reach a
// 60% overall average without also working through the notes, and vice versa.
// ---------------------------------------------------------------------------

export const PASS_OVERALL_MIN = 60;
export const PASS_SELF_ASSESSMENT_MIN = 50;
const NOTES_WEIGHT = 0.5;
const ASSESSMENT_WEIGHT = 0.5;

const round2 = (n) => Math.round(n * 100) / 100;

// Recomputes the cached grading snapshot on an enrollment and returns it.
export async function recomputeEnrollment(enrollmentId) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: {
        include: {
          topics: {
            include: { assessment: { select: { id: true } } },
          },
        },
      },
      topicProgress: true,
      attempts: true,
    },
  });
  if (!enrollment) return null;

  const topics = enrollment.course.topics;
  // Only ASSESSED topics count toward grades. Non-assessed topics (e.g. the
  // "Opportunities" topic) are excluded from both metrics so they don't dilute.
  const assessedTopics = topics.filter((t) => t.assessment);
  const gradedCount = assessedTopics.length || 1;

  // Notes completion (over assessed topics)
  const assessedTopicIds = new Set(assessedTopics.map((t) => t.id));
  const readTopicIds = new Set(
    enrollment.topicProgress
      .filter((tp) => tp.notesRead && assessedTopicIds.has(tp.topicId))
      .map((tp) => tp.topicId)
  );
  const notesCompletionPercent = round2((readTopicIds.size / gradedCount) * 100);

  // Best attempt per topic assessment
  const bestByAssessment = new Map();
  for (const attempt of enrollment.attempts) {
    const prev = bestByAssessment.get(attempt.assessmentId) ?? 0;
    if (attempt.scorePercent > prev) {
      bestByAssessment.set(attempt.assessmentId, attempt.scorePercent);
    }
  }

  let scoreSum = 0;
  for (const topic of assessedTopics) {
    scoreSum += bestByAssessment.get(topic.assessment.id) ?? 0;
  }
  const selfAssessmentAverage = round2(scoreSum / gradedCount);

  const overallAverage = round2(
    NOTES_WEIGHT * notesCompletionPercent + ASSESSMENT_WEIGHT * selfAssessmentAverage
  );

  const passed =
    overallAverage >= PASS_OVERALL_MIN &&
    selfAssessmentAverage >= PASS_SELF_ASSESSMENT_MIN;

  const updated = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      notesCompletionPercent,
      selfAssessmentAverage,
      overallAverage,
      passed,
      // Stamp completion the first time it passes; keep the original date after.
      completedAt: passed ? enrollment.completedAt ?? new Date() : null,
    },
  });
  return updated;
}

// Grades a submitted set of answers against the stored correct choices.
// answers: { [questionId]: choiceId }. Returns { scorePercent, correctCount,
// total, results:[{questionId, correctChoiceId, chosenChoiceId, correct, explanation}] }.
export async function gradeAssessment(assessmentId, answers) {
  const questions = await prisma.question.findMany({
    where: { assessmentId },
    include: { choices: { select: { id: true, isCorrect: true } } },
    orderBy: { order: "asc" },
  });

  let correctCount = 0;
  const results = questions.map((q) => {
    const correctChoice = q.choices.find((c) => c.isCorrect);
    const chosenChoiceId = answers[q.id] ?? null;
    const correct = chosenChoiceId != null && chosenChoiceId === correctChoice?.id;
    if (correct) correctCount += 1;
    return {
      questionId: q.id,
      correctChoiceId: correctChoice?.id ?? null,
      chosenChoiceId,
      correct,
    };
  });

  const total = questions.length || 1;
  const scorePercent = round2((correctCount / total) * 100);
  return { scorePercent, correctCount, total, results };
}
