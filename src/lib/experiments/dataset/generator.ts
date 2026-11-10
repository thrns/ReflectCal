import { Question, QuestionSchema, validateDataset } from "@/lib/experiments/types";

const SOURCE_DATASET = "reflectcal-generated-arithmetic-probability";
const SOURCE_VERSION = "1.0.0";
const SEED = 20261110;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function buildChoices(correct: number, distractors: number[], random: () => number) {
  const values = shuffle([correct, ...distractors].map(String), random);
  return values.map((text, index) => ({ label: String.fromCharCode(65 + index), text }));
}

export function generateFixtureDataset(): Question[] {
  const random = seededRandom(SEED);
  const questions: Question[] = [];

  const arithmetic = [
    { a: 17, op: "+", b: 28 },
    { a: 84, op: "−", b: 39 },
    { a: 12, op: "×", b: 7 },
    { a: 144, op: "÷", b: 12 },
    { a: 26, op: "+", b: 37 },
    { a: 91, op: "−", b: 56 },
    { a: 9, op: "×", b: 8 },
    { a: 132, op: "÷", b: 11 },
  ];

  arithmetic.forEach(({ a, op, b }, index) => {
    const answer = op === "+" ? a + b : op === "−" ? a - b : op === "×" ? a * b : a / b;
    const distractors = [answer + 1 + index, answer - 2 - index, answer + 7 + index];
    const split = index % 2 === 0 ? "playground" : "research";
    const choices = buildChoices(answer, distractors, random);
    questions.push(QuestionSchema.parse({
      questionId: `arith-v1-${String(index + 1).padStart(3, "0")}`,
      sourceDataset: SOURCE_DATASET,
      sourceVersion: SOURCE_VERSION,
      category: "arithmetic",
      subject: "Arithmetic",
      question: `What is ${a} ${op} ${b}?`,
      choices,
      correctAnswer: choices.find((choice) => Number(choice.text) === answer)!.label,
      split,
      validationStatus: "validated",
    }));
  });

  const probability = [
    { prompt: "A fair six-sided die is rolled once. What is the probability of rolling an even number?", numerator: 3, denominator: 6 },
    { prompt: "A fair coin is tossed twice. What is the probability of getting two heads?", numerator: 1, denominator: 4 },
    { prompt: "One card is drawn from a standard 52-card deck. What is the probability it is an ace?", numerator: 4, denominator: 52 },
    { prompt: "A fair six-sided die is rolled once. What is the probability of rolling a number greater than 4?", numerator: 2, denominator: 6 },
    { prompt: "A fair coin is tossed once. What is the probability of getting tails?", numerator: 1, denominator: 2 },
    { prompt: "A bag contains 3 red and 2 blue balls. One ball is selected at random. What is the probability it is blue?", numerator: 2, denominator: 5 },
    { prompt: "A fair six-sided die is rolled once. What is the probability of rolling a 1 or a 2?", numerator: 2, denominator: 6 },
    { prompt: "A fair coin is tossed three times. What is the probability of getting exactly three heads?", numerator: 1, denominator: 8 },
  ];

  probability.forEach(({ prompt, numerator, denominator }, index) => {
    const answer = numerator / denominator;
    const distractors = [answer + 0.1, Math.max(0, answer - 0.15), Math.min(1, answer + 0.25)];
    const options = shuffle([answer, ...distractors], random);
    const choices = options.map((value, choiceIndex) => ({
      label: String.fromCharCode(65 + choiceIndex),
      text: `${Math.round(value * 100)}%`,
    }));
    const split = index % 2 === 0 ? "playground" : "research";
    questions.push(QuestionSchema.parse({
      questionId: `prob-v1-${String(index + 1).padStart(3, "0")}`,
      sourceDataset: SOURCE_DATASET,
      sourceVersion: SOURCE_VERSION,
      category: "probability",
      subject: "Probability",
      question: prompt,
      choices,
      correctAnswer: choices[options.findIndex((value) => Math.abs(value - answer) < 1e-10)].label,
      split,
      validationStatus: "validated",
    }));
  });

  const errors = validateDataset(questions);
  if (errors.length > 0) throw new Error(`Generated dataset failed validation: ${errors.join("; ")}`);
  return questions;
}

export const FIXTURE_SEED = SEED;
