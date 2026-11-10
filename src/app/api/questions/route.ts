import { NextRequest, NextResponse } from "next/server";
import { generateFixtureDataset } from "@/lib/experiments/dataset/generator";
import { toPublicQuestion } from "@/lib/experiments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (category && category !== "arithmetic" && category !== "probability") {
    return NextResponse.json({ message: "Unknown question category." }, { status: 400 });
  }
  const questions = generateFixtureDataset()
    .filter((question) => question.split === "playground" && question.validationStatus === "validated")
    .filter((question) => !category || question.category === category)
    .map(toPublicQuestion);
  return NextResponse.json({ questions }, { headers: { "Cache-Control": "no-store" } });
}
