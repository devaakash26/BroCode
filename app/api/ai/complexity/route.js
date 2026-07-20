import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { cache } from "@/lib/redis";
import { analyzeComplexity } from "@/lib/ai/complexity";
import { isAiConfigured, AI_RATE_LIMIT, AI_RATE_WINDOW } from "@/lib/ai/config";

// Soft per-user rate limit shared with /api/ai/analyze (same counter key).
async function withinRateLimit(userId) {
  const key = `brocode-ai-rl-${userId}`;
  const current = (await cache.get(key)) || 0;
  if (current >= AI_RATE_LIMIT) return false;
  await cache.set(key, current + 1, AI_RATE_WINDOW);
  return true;
}

export async function POST(request) {
  try {
    if (!isAiConfigured()) {
      return NextResponse.json(
        { available: false, message: "AI analysis is not configured." },
        { status: 200 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { code, language, problemId } = await request.json();
    if (!code || !language || !problemId) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
    }

    if (!(await withinRateLimit(session.user.id))) {
      return NextResponse.json(
        { available: false, message: "Too many AI requests. Please wait a moment." },
        { status: 429 },
      );
    }

    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        constraints: true,
        exampleInput: true,
        exampleOutput: true,
        tags: true,
        timeComplexity: true,
        spaceComplexity: true,
      },
    });
    if (!problem) {
      return NextResponse.json({ message: "Problem not found" }, { status: 404 });
    }

    const result = await analyzeComplexity({ problem, code, language });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("AI complexity error:", error?.message || error);
    return NextResponse.json(
      { available: false, message: "Complexity analysis failed.", error: error?.message },
      { status: 200 },
    );
  }
}
