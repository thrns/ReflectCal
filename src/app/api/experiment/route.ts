import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateFixtureDataset } from "@/lib/experiments/dataset/generator";
import { runExperiment } from "@/lib/experiments/run-experiment";
import { readLiveConfiguration, LiveConfiguration } from "@/lib/rate-limit/config";
import { liveConfigurationError, SupabaseQuotaManager } from "@/lib/rate-limit/quota";
import { SupabaseExperimentRepository } from "@/lib/experiments/repository";
import { GeminiAdapter } from "@/lib/gemini/gemini-adapter";
import { Question } from "@/lib/experiments/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExperimentRequestSchema = z.object({ questionId: z.string().min(1).max(80) }).strict();
const VISITOR_COOKIE = "reflectcal-visitor";
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseStatus(result: Awaited<ReturnType<typeof runExperiment>>): number {
  if (result.status === "quota_rejected") return 429;
  if (result.status === "failed" && result.failure.code === "quota_storage_unavailable") return 503;
  if (result.status === "failed") return 502;
  return 200;
}

function disabledResponse(config: LiveConfiguration): NextResponse {
  return NextResponse.json({
    status: "configuration_unavailable",
    message: liveConfigurationError(config),
  }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const config = readLiveConfiguration();
  if (!config.enabled) return disabledResponse(config);

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2_000) return NextResponse.json({ message: "Request body is too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ExperimentRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "A valid question ID is required." }, { status: 400 });

  const question = generateFixtureDataset().find((item) =>
    item.questionId === parsed.data.questionId && item.split === "playground" && item.validationStatus === "validated"
  );
  if (!question) return NextResponse.json({ message: "Question not found." }, { status: 404 });

  const cookieStore = await cookies();
  const existingId = cookieStore.get(VISITOR_COOKIE)?.value;
  const visitorId = existingId && VISITOR_ID_PATTERN.test(existingId) ? existingId : randomUUID();
  const visitorKeyHash = createHash("sha256").update(visitorId).digest("hex");

  try {
    const dependencies = {
      model: new GeminiAdapter(process.env.GEMINI_API_KEY, config.modelId),
      quota: new SupabaseQuotaManager(config.quota),
      repository: new SupabaseExperimentRepository(),
    };
    const result = await runExperiment(question as Question, visitorKeyHash, dependencies);
    const response = NextResponse.json(result, { status: responseStatus(result), headers: { "Cache-Control": "no-store" } });
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  } catch {
    return NextResponse.json({
      status: "service_unavailable",
      message: "The experiment service is unavailable. No answer key was returned.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
