import { AnswerLabel, ModelAnswer, Question } from "@/lib/experiments/types";

export interface ScoredAnswer {
  answer: AnswerLabel;
  confidence: number;
  isCorrect: boolean;
  brierScore: number;
}

export function scoreAnswer(answer: ModelAnswer, correctAnswer: AnswerLabel): ScoredAnswer {
  const isCorrect = answer.answer === correctAnswer;
  return {
    answer: answer.answer,
    confidence: answer.confidence,
    isCorrect,
    brierScore: (answer.confidence - Number(isCorrect)) ** 2,
  };
}

export function confidenceChange(initial: number, reflected: number): number {
  return reflected - initial;
}

export function reflectionTransition(initial: boolean, reflected: boolean): "corrected" | "introduced_error" | "remained_correct" | "remained_incorrect" {
  if (!initial && reflected) return "corrected";
  if (initial && !reflected) return "introduced_error";
  return initial ? "remained_correct" : "remained_incorrect";
}

export function scoreForQuestion(answer: ModelAnswer, question: Question): ScoredAnswer {
  return scoreAnswer(answer, question.correctAnswer);
}
