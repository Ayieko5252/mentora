# Requirements → Implementation map

Every requirement from the brief mapped to where it lives in the codebase.

## Product / architecture

| Requirement | Where |
|---|---|
| Discipline-agnostic, extensible ("every discipline") | `Discipline` model is first-class — `server/prisma/schema.prisma` (`Discipline`, `DisciplineKind`); courses & recipes both hang off a discipline. |
| Two seeded verticals at launch | `server/prisma/seed.js` → `seedDisciplines()` (Engineering Software, Recipes). |
| Clear frontend / backend / DB separation | `client/` (React), `server/src/` (Express), `server/prisma/` (Postgres via Prisma). |
| Responsive UI | `client/src/styles/app.css` (grid/flex + `@media` breakpoints). |

## Content model 1 — Courses

| Requirement | Where |
|---|---|
| Course = Notes + Labs + Self-Assessment | `schema.prisma`: `Course → Topic → {Note, Lab, SelfAssessment}`. |
| 10 topics per course | Enforced in seed (`TOPICS_PER_COURSE=10`) and admin create (`courseSchema.topics.length(10)` in `admin.controller.js`). |
| ≥15 note pages per topic | `seed-content.js` `NOTES_PER_TOPIC=15`; admin validation `.min(15)`. |
| 3 labs per topic (30 per course) | `seed-content.js` `LABS_PER_TOPIC=3`; admin validation `.length(3)`. |
| 1 self-assessment of 10 MCQs per topic | `seed-content.js` `QUESTIONS_PER_ASSESSMENT=10`; admin validation `.length(10)`. |
| One correct answer per question (flagged) + optional explanation | `Choice.isCorrect`, `Question.explanation` in `schema.prisma`; seed sets exactly one correct; admin enforces exactly-one-correct. |
| Pass: ≥60% overall average AND ≥50% on self-assessments | `server/src/services/grading.service.js` (`PASS_OVERALL_MIN=60`, `PASS_SELF_ASSESSMENT_MIN=50`, `recomputeEnrollment`). |
| Track per-topic progress, per-assessment scores, running overall average | `Enrollment`, `TopicProgress`, `AssessmentAttempt` models; surfaced in `learn.controller.js` + `CourseLearn.jsx` / `Dashboard.jsx`. |
| Course marked passed + certificate/record only when both met | `recomputeEnrollment` sets `passed` + `completedAt`; shown as "certificate issued" pill in `CourseLearn.jsx`. |
| $20 per course | `Course.priceCents` default `2000`; enforced server-side in `payments.service.js`. |

## Content model 2 — Recipes

| Requirement | Where |
|---|---|
| Title, brief history, instructions | `Recipe.title / history / instructionsMarkdown` in `schema.prisma`; rendered in `RecipeDetail.jsx`. |
| $5 per recipe | `Recipe.priceCents` default `500`. |
| 100-recipe booklet = $50, discounted vs individual | `Booklet` + `BookletRecipe`; seed builds 100-recipe booklets at `priceCents=5000` (vs 100×$5=$500). |

## Core features

| Feature | Where |
|---|---|
| Accounts & auth, roles (learner/instructor/admin) | `Role` enum; `auth.service.js`, `auth.controller.js`, `middleware/auth.js` (`requireAuth`, `requireRole`); `AuthContext.jsx`. |
| Secure password handling | bcrypt in `auth.service.js`. |
| Catalog & discovery (browse/search/filter, detail before purchase) | `catalog.controller.js`; `Courses.jsx`, `Recipes.jsx`, `CourseDetail.jsx`. |
| Purchases & payments (courses, recipes, booklets) + gateway + sandbox | `payments.service.js`, `purchase.controller.js`; Stripe test mode + mock fallback. |
| Access control (only purchased content unlocked) | `access.service.js`; gated in `learn.controller.js`. |
| Course learning experience (sequential nav, paginated notes, labs, quiz engine + auto-grading) | `CourseLearn.jsx`, `AssessmentPage.jsx`, `learn.controller.js`. |
| Progress & grading engine | `grading.service.js`. |
| Recipe experience (title/history/instructions) | `RecipeDetail.jsx` + `getRecipeContent`. |
| Admin/content management (create/edit/publish, bulk seed) | `admin.controller.js` (`createDiscipline/createRecipe/createCourse/setPublished`), `seed.js`. |
| Learner dashboard (purchased content, progress, scores, completion) | `dashboard.controller.js`, `Dashboard.jsx`. |

## Technical requirements

| Requirement | Where |
|---|---|
| Normalized schemas for all named entities | `schema.prisma` — User, Discipline, Course, Topic, Note, Lab, SelfAssessment, Question, Choice, Purchase, Enrollment, AssessmentAttempt, Recipe, Booklet, BookletRecipe, TopicProgress. |
| Discipline first-class | `Discipline` / `DisciplineKind`. |
| Seed mechanism generating full valid structure | `seed.js` + `seed-content.js`. |
| Seed generates full, finished-reading content | `seed-content.js` (notes/labs/assessments/recipes) + `pvsyst.js` (real PDF-sourced course). Optional Claude pipeline (`generate-content.js`) for deeper per-tool prose. |
| Never expose correct answers before grading | `getAssessment` omits `isCorrect`/`explanation`; grading server-side in `grading.service.js`. |
| Sanitize inputs | Zod schemas (`validation/schemas.js`, admin) + `helmet` + rate limiting in `app.js`. |
| Migrations | `prisma migrate` (`npm run prisma:migrate`). |

## Acceptance checklist

- [x] Arbitrary disciplines; engineering + recipes as two seeded verticals.
- [x] 10 topics / course; 15+ notes, 3 labs, 1 ten-question assessment / topic (30 labs/course).
- [x] Pass = ≥60% overall AND ≥50% self-assessment.
- [x] Recipes show title, brief history, instructions.
- [x] Pricing: course $20, recipe $5, booklet $50 (discounted).
- [x] Payments unlock only purchased content.
- [x] Dashboard shows progress, scores, completion.
