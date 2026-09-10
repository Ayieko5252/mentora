import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().min(1).max(120),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const checkoutSchema = z.object({
  itemType: z.enum(["COURSE", "RECIPE", "BOOKLET"]),
  itemId: z.string().min(1),
});

export const submitAssessmentSchema = z.object({
  // { [questionId]: choiceId }
  answers: z.record(z.string(), z.string()),
});

export const markNotesSchema = z.object({
  topicId: z.string().min(1),
  notesRead: z.boolean().default(true),
});

export const catalogQuerySchema = z.object({
  q: z.string().optional(),
  disciplineId: z.string().optional(),
  disciplineSlug: z.string().optional(),
  level: z.string().optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});
