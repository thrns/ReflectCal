import { describe, expect, it } from "vitest";
import { generateFixtureDataset } from "@/lib/experiments/dataset/generator";
import { buildDirectPrompt, buildReflectionPrompt, DIRECT_PROMPT_VERSION, generationConfig, PROTOCOL_VERSION, REFLECTION_PROMPT_VERSION } from "@/lib/experiments/protocol";
import { toPublicQuestion } from "@/lib/experiments/types";

describe("versioned prompts", () => {
  const question = toPublicQuestion(generateFixtureDataset().find((item) => item.split === "playground")!);

  it("uses distinct stable protocol and prompt versions", () => {
    expect(PROTOCOL_VERSION).toMatch(/^reflectcal-m0-paired-v1\.0\.0$/);
    expect(DIRECT_PROMPT_VERSION).not.toBe(REFLECTION_PROMPT_VERSION);
    expect(DIRECT_PROMPT_VERSION).toBe("direct-answer-v1.0.0");
  });

  it("does not expose ground truth in either model prompt", () => {
    const direct = buildDirectPrompt(question);
    const reflection = buildReflectionPrompt(question, { answer: "A", confidence: 0.6, explanation: "A short explanation." });
    expect(direct).not.toContain("correctAnswer");
    expect(reflection).not.toContain("correctAnswer");
    expect(reflection).not.toContain(generateFixtureDataset().find((item) => item.questionId === question.questionId)!.correctAnswer + " is correct");
  });

  it("configures structured JSON output with temperature zero and question-specific choices", () => {
    const config = generationConfig(question);
    expect(config.temperature).toBe(0);
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseJsonSchema.properties.answer.enum).toEqual(question.choices.map((choice) => choice.label));
  });
});
