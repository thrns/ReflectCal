import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/questions/route";

describe("public question endpoint", () => {
  it("serves only playground questions without ground-truth fields", async () => {
    const response = await GET(new NextRequest("http://localhost/api/questions?category=arithmetic"));
    const data = await response.json() as { questions: Array<Record<string, unknown>> };
    expect(response.status).toBe(200);
    expect(data.questions.length).toBeGreaterThan(0);
    expect(data.questions.every((question) => question.category === "arithmetic")).toBe(true);
    expect(data.questions.every((question) => !("correctAnswer" in question))).toBe(true);
    expect(data.questions.every((question) => !("split" in question))).toBe(true);
  });

  it("rejects unknown categories", async () => {
    const response = await GET(new NextRequest("http://localhost/api/questions?category=unlisted"));
    expect(response.status).toBe(400);
  });
});
