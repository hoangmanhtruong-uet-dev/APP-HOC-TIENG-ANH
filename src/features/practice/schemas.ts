import { z } from "@/lib/validation/zod";

import { learningSlugSchema } from "@/features/learning/schemas";

const optionalTextAnswer = z
  .string()
  .max(2000)
  .transform((value) => value.trim())
  .optional();

export const startPracticeSchema = z.object({
  exerciseSlug: learningSlugSchema,
});

export const savePracticeAnswerSchema = z.object({
  attemptId: z.uuid(),
  questionId: z.uuid(),
  exerciseSlug: learningSlugSchema,
  selectedOptionIds: z.array(z.uuid()).max(20),
  answerText: optionalTextAnswer,
  clientRevision: z.coerce.number().int().min(0).max(2_147_483_647),
  nextPosition: z.coerce.number().int().min(1).max(1000),
  currentPosition: z.coerce.number().int().min(1).max(1000).optional(),
  checkAnswer: z.coerce.boolean().optional(),
});

export const submitPracticeSchema = z.object({
  attemptId: z.uuid(),
  exerciseSlug: learningSlugSchema,
});

export const attemptRouteSchema = z.object({
  exerciseSlug: learningSlugSchema,
  attemptId: z.uuid(),
});
