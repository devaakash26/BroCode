import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

const MAX_SAMPLES = 10;

// Only visible (sample) cases are sent to the room. Hidden ones stay on the
// server and are run by /api/playground/check, which reports pass/fail only.
const visible = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((t) => t && !t.isHidden && typeof t.input === "string")
    .map((t) => ({ input: t.input, expectedOutput: t.expectedOutput ?? "", explanation: t.explanation ?? null }));

/**
 * GET /api/playground/problems?q=two        → public problems matching q (title)
 * GET /api/playground/problems?id=<id>      → one public problem with starter code
 * Only public problems are offered, so a host can't leak a group's private set.
 */
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const q = (searchParams.get("q") || "").trim().slice(0, 80);

  try {
    if (id) {
      const p = await prisma.problem.findFirst({
        where: { id, isPublic: true },
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          constraints: true,
          exampleInput: true,
          exampleOutput: true,
          templateCode: true,
          testCases: true,
          tags: true,
          testCasesRel: {
            where: { isHidden: false },
            orderBy: [{ isExample: "desc" }, { id: "asc" }],
            take: MAX_SAMPLES,
            select: { input: true, expectedOutput: true, explanation: true, isHidden: true },
          },
        },
      });
      if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

      let samples = visible(p.testCasesRel);
      if (!samples.length) samples = visible(p.testCases);
      const hiddenCount = await prisma.testCase.count({ where: { problemId: p.id, isHidden: true } });
      if (!samples.length && p.exampleInput) {
        samples = [{ input: p.exampleInput, expectedOutput: p.exampleOutput || "", explanation: null }];
      }

      return NextResponse.json({
        problem: {
          id: p.id,
          title: p.title,
          description: p.description,
          difficulty: p.difficulty,
          constraints: p.constraints,
          tags: p.tags,
          templateCode: p.templateCode && typeof p.templateCode === "object" ? p.templateCode : {},
          samples: samples.slice(0, MAX_SAMPLES),
          hiddenCount,
        },
      });
    }

    const problems = await prisma.problem.findMany({
      where: {
        isPublic: true,
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { title: "asc" }],
      take: 30,
      select: { id: true, title: true, difficulty: true, tags: true },
    });
    return NextResponse.json({ problems });
  } catch (err) {
    console.error("[playground] problems:", err);
    return NextResponse.json({ error: "Could not load problems" }, { status: 500 });
  }
}
