import { z } from "zod";

export const ANSWER_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
export const AnswerLabelSchema = z.enum(ANSWER_LABELS);
export type AnswerLabel = z.infer<typeof AnswerLabelSchema>;

export const QuestionChoiceSchema = z.object({
  label: z.string().regex(/^[A-J]$/),
  text: z.string().trim().min(1).max(240),
});

export const QuestionSchema = z.object({
  questionId: z.string().regex(/^[a-z0-9][a-z0-9._-]{2,79}$/),
  sourceDataset: z.string().trim().min(1).max(80),
  sourceVersion: z.string().trim().min(1).max(40),
  category: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(100),
  question: z.string().trim().min(10).max(1200),
  choices: z.array(QuestionChoiceSchema).min(2).max(10),
  correctAnswer: AnswerLabelSchema,
  split: z.enum(["research", "playground"]),
  validationStatus: z.enum(["validated", "unreviewed", "rejected"]),
}).superRefine((question, ctx) => {
  const labels = question.choices.map((choice) => choice.label);
  if (new Set(labels).size !== labels.length) {
    ctx.addIssue({ code: "custom", message: "Choice labels must be unique.", path: ["choices"] });
  }
  if (!labels.includes(question.correctAnswer)) {
    ctx.addIssue({ code: "custom", message: "Correct answer must refer to a listed choice.", path: ["correctAnswer"] });
  }
});

export const ModelAnswerSchema = z.object({
  answer: AnswerLabelSchema,
  confidence: z.number().finite().min(0).max(1),
  explanation: z.string().trim().min(1).max(500),
}).strict();

export type ModelAnswer = z.infer<typeof ModelAnswerSchema>;
export type Question = z.infer<typeof QuestionSchema>;

export type PublicQuestion = Omit<Question, "correctAnswer" | "split" | "validationStatus">;

export function toPublicQuestion(question: Question): PublicQuestion {
  return {
    questionId: question.questionId,
    sourceDataset: question.sourceDataset,
    sourceVersion: question.sourceVersion,
    category: question.category,
    subject: question.subject,
    question: question.question,
    choices: question.choices.map(({ label, text }) => ({ label, text })),
  };
}

export function validateDataset(dataset: readonly Question[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const splits = new Map<string, string>();

  for (const [index, value] of dataset.entries()) {
    const parsed = QuestionSchema.safeParse(value);
    if (!parsed.success) {
      errors.push(`Question at index ${index} is invalid: ${parsed.error.issues.map((issue) => issue.message).join(" ")}`);
      continue;
    }
    if (ids.has(parsed.data.questionId)) errors.push(`Duplicate question ID: ${parsed.data.questionId}`);
    ids.add(parsed.data.questionId);
    const previousSplit = splits.get(parsed.data.questionId);
    if (previousSplit && previousSplit !== parsed.data.split) {
      errors.push(`Question ID overlaps the ${previousSplit} and ${parsed.data.split} splits: ${parsed.data.questionId}`);
    }
    splits.set(parsed.data.questionId, parsed.data.split);
  }
  return errors;
}
