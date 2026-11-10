import { PublicQuestion } from "@/lib/experiments/types";

export const PROTOCOL_VERSION = "reflectcal-m0-paired-v1.0.0";
export const DIRECT_PROMPT_VERSION = "direct-answer-v1.0.0";
export const REFLECTION_PROMPT_VERSION = "self-reflection-v1.0.0";

function renderChoices(question: PublicQuestion): string {
  return question.choices.map(({ label, text }) => `${label}. ${text}`).join("\n");
}

export function buildDirectPrompt(question: PublicQuestion): string {
  return [
    "Answer the multiple-choice question below.",
    "Choose the best answer using only the question and options. Do not search for or infer an answer key.",
    "Report your own confidence as a number from 0 to 1. This is a subjective self-report, not a guaranteed probability.",
    "Return only the requested JSON object.",
    `Question: ${question.question}`,
    "Options:",
    renderChoices(question),
  ].join("\n\n");
}

export function buildReflectionPrompt(
  question: PublicQuestion,
  previous: { answer: string; confidence: number; explanation: string },
): string {
  return [
    "Independently reconsider the multiple-choice question below.",
    "Check the reasoning from scratch, and revise your answer or confidence only if your reconsideration supports doing so.",
    "You have not been given the ground-truth answer. Do not search for or infer an answer key.",
    "Report confidence as a number from 0 to 1. This is subjective self-report, not a guaranteed probability.",
    "Return only the requested JSON object.",
    `Question: ${question.question}`,
    "Options:",
    renderChoices(question),
    "Your previous response:",
    `Answer: ${previous.answer}`,
    `Confidence: ${previous.confidence}`,
    `Explanation: ${previous.explanation}`,
  ].join("\n\n");
}

export function generationConfig(question: PublicQuestion) {
  return {
    temperature: 0,
    maxOutputTokens: 220,
    responseMimeType: "application/json" as const,
    responseJsonSchema: {
      type: "object",
      properties: {
        answer: { type: "string", enum: question.choices.map(({ label }) => label) },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        explanation: { type: "string" },
      },
      required: ["answer", "confidence", "explanation"],
      propertyOrdering: ["answer", "confidence", "explanation"],
    },
    httpOptions: {
      timeout: 20_000,
      retryOptions: { attempts: 1, httpStatusCodes: [] },
    },
  } as const;
}
