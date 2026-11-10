import { describe, expect, it } from "vitest";
import { validateModelOutput, ModelCallError } from "@/lib/gemini/contracts";
import { generateFixtureDataset } from "@/lib/experiments/dataset/generator";
import { toPublicQuestion } from "@/lib/experiments/types";

const question = toPublicQuestion(generateFixtureDataset().find((item) => item.split === "playground")!);

describe("Gemini structured response validation", () => {
  it("accepts a valid answer", () => {
    expect(validateModelOutput(JSON.stringify({ answer: "A", confidence: 0.75, explanation: "The values support option A." }), question)).toEqual({ answer: "A", confidence: 0.75, explanation: "The values support option A." });
  });

  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])("rejects confidence outside [0, 1]: %s", (confidence) => {
    expect(() => validateModelOutput(JSON.stringify({ answer: "A", confidence, explanation: "Reason." }), question)).toThrow(ModelCallError);
  });

  it("rejects an answer label outside the selected question choices", () => {
    const narrowed = { ...question, choices: question.choices.filter((choice) => choice.label !== "D") };
    expect(() => validateModelOutput(JSON.stringify({ answer: "D", confidence: 0.5, explanation: "Reason." }), narrowed)).toThrow("not listed");
  });

  it("rejects malformed JSON, extra fields, and long explanations", () => {
    expect(() => validateModelOutput("not-json", question)).toThrow("valid JSON");
    expect(() => validateModelOutput(JSON.stringify({ answer: "A", confidence: 0.5, explanation: "Fine.", extra: true }), question)).toThrow("required answer format");
    expect(() => validateModelOutput(JSON.stringify({ answer: "A", confidence: 0.5, explanation: "x".repeat(501) }), question)).toThrow("required answer format");
  });
});
