import { describe, expect, it } from "vitest";
import { confidenceChange, reflectionTransition, scoreAnswer } from "@/lib/experiments/scoring";

describe("experiment scoring", () => {
  it("scores answer correctness and binary Brier loss", () => {
    expect(scoreAnswer({ answer: "B", confidence: 0.8, explanation: "Reason." }, "B")).toMatchObject({ answer: "B", confidence: 0.8, isCorrect: true });
    expect(scoreAnswer({ answer: "B", confidence: 0.8, explanation: "Reason." }, "B").brierScore).toBeCloseTo(0.04);
    expect(scoreAnswer({ answer: "A", confidence: 0.8, explanation: "Reason." }, "B").brierScore).toBeCloseTo(0.64);
  });

  it("reports signed confidence changes", () => {
    expect(confidenceChange(0.65, 0.82)).toBeCloseTo(0.17);
    expect(confidenceChange(0.65, 0.4)).toBeCloseTo(-0.25);
  });

  it("detects corrected and introduced errors", () => {
    expect(reflectionTransition(false, true)).toBe("corrected");
    expect(reflectionTransition(true, false)).toBe("introduced_error");
    expect(reflectionTransition(true, true)).toBe("remained_correct");
    expect(reflectionTransition(false, false)).toBe("remained_incorrect");
  });
});
