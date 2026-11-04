import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import axios from "axios";
import { JUDGE0_URL, getJudge0Headers, isJudge0Configured } from "@/lib/judge0";
import { redisHelpers } from "@/lib/redis";

export const dynamic = "force-dynamic";

/*
 * POST /api/playground/check { problemId, code, language, scope? }
 * Submit: runs the room's code against ALL of a problem's test cases (samples
 * first, then hidden) on the server. scope: "hidden" runs only the hidden ones.
 * Inputs and expected outputs never leave the server: the reply only says
 * which cases passed and why the others didn't.
 */

const LANGUAGE_IDS = { c: 50, cpp: 54, java: 62, javascript: 63, python: 71 };
const MAX_CODE = 64 * 1024;
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 30_000;
const PER_MINUTE = 8;
const recent = new Map(); // userId → timestamps

// Same scoring as /api/submit-code so playground solves count the same everywhere.
const POINTS = { EASY: 20, MEDIUM: 50, HARD: 100 };
function overallStatus(subs, results) {
  if (results.every((r) => r.passed)) return "ACCEPTED";
  const ids = subs.map((s) => s?.status?.id);
  if (ids.includes(6)) return "COMPILATION_ERROR";
  if (ids.includes(5)) return "TIME_LIMIT_EXCEEDED";
  if (ids.some((id) => id >= 7 && id <= 12)) return "RUNTIME_ERROR";
  return "WRONG_ANSWER";
}

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
// Compare like a judge: ignore trailing spaces on lines and trailing blank lines.
const norm = (s) => String(s ?? "").replace(/\r/g, "").split("\n").map((l) => l.trimEnd()).join("\n").trim();

function allowed(userId) {
  const now = Date.now();
  const list = (recent.get(userId) || []).filter((t) => now - t < 60_000);
  if (list.length >= PER_MINUTE) return false;
  list.push(now);
  recent.set(userId, list);
  return true;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isJudge0Configured()) return NextResponse.json({ message: "Code execution service is not configured." }, { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  const { problemId, code, language } = body || {};
  const onlyHidden = body?.scope === "hidden";
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) return NextResponse.json({ message: "Unsupported language" }, { status: 400 });
  if (typeof code !== "string" || !code.trim() || code.length > MAX_CODE) {
    return NextResponse.json({ message: "Code is empty or too large" }, { status: 400 });
  }
  if (typeof problemId !== "string") return NextResponse.json({ message: "Missing problem" }, { status: 400 });
  if (!allowed(session.user.id)) {
    return NextResponse.json({ message: "Too many checks — wait a few seconds" }, { status: 429 });
  }

  const problem = await prisma.problem.findFirst({
    where: { id: problemId, isPublic: true },
    select: {
      difficulty: true,
      testCasesRel: {
        where: onlyHidden ? { isHidden: true } : {},
        orderBy: [{ isHidden: "asc" }, { id: "asc" }], // samples first
        take: 10,
        select: { input: true, expectedOutput: true, isHidden: true },
      },
    },
  });
  if (!problem) return NextResponse.json({ message: "Problem not found" }, { status: 404 });
  const tests = problem.testCasesRel;
  if (!tests.length) return NextResponse.json({ total: 0, passed: 0, results: [] });

  try {
    const { data: created } = await axios.post(
      `${JUDGE0_URL}/submissions/batch?base64_encoded=true`,
      { submissions: tests.map((t) => ({ language_id: languageId, source_code: b64(code), stdin: b64(t.input) })) },
      { headers: getJudge0Headers() },
    );
    const tokens = created.map((s) => s.token).filter(Boolean);
    if (tokens.length !== tests.length) return NextResponse.json({ message: "Failed to queue the tests" }, { status: 502 });

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let subs = [];
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const { data } = await axios.get(
        `${JUDGE0_URL}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=status,stdout,time,memory`,
        { headers: getJudge0Headers() },
      );
      subs = data.submissions || [];
      if (!subs.some((s) => !s || s.status?.id <= 2)) break;
    }

    const results = tests.map((t, i) => {
      const s = subs[i];
      const hidden = !!t.isHidden;
      if (!s || s.status?.id <= 2) return { hidden, passed: false, verdict: "Timed out" };
      // 3 = ran cleanly; anything else is a compile/runtime/time-limit problem.
      if (s.status.id !== 3) return { hidden, passed: false, verdict: s.status.description || "Error" };
      const passed = norm(unb64(s.stdout)) === norm(t.expectedOutput);
      return { hidden, passed, verdict: passed ? "Passed" : "Wrong answer", time: s.time };
    });

    const passed = results.filter((r) => r.passed).length;
    if (onlyHidden) return NextResponse.json({ total: results.length, passed, results });

    // A full Submit is a real submission: it shows in Submissions, the profile
    // and the leaderboard, exactly like solving on the problem page.
    const status = overallStatus(subs, results);
    const points = status === "ACCEPTED" ? POINTS[problem.difficulty] || 10 : 0;
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        language,
        code,
        status,
        executionTime: Math.round(Math.max(0, ...subs.map((s) => parseFloat(s?.time) || 0)) * 1000),
        memoryUsed: Math.round(Math.max(0, ...subs.map((s) => s?.memory || 0))),
        // Verdicts only: hidden inputs/expected outputs are not stored with the attempt.
        results: results.map((r, i) => ({ testCaseNumber: i + 1, hidden: r.hidden, passed: r.passed, status: r.verdict })),
        pointsEarned: points,
        score: points,
      },
      select: { id: true, submittedAt: true },
    });
    if (status === "ACCEPTED") {
      try {
        await redisHelpers.invalidateUserProfile(session.user.id);
        await redisHelpers.invalidateLeaderboard();
      } catch (err) {
        console.error("[playground/check] cache invalidation failed:", err.message);
      }
    }

    return NextResponse.json({
      total: results.length,
      passed,
      results,
      submission: { id: submission.id, status, pointsAwarded: points, at: submission.submittedAt },
    });
  } catch (error) {
    console.error("[playground/check] error:", error.response ? error.response.data : error.message);
    return NextResponse.json({ message: "Couldn't run the hidden tests. Please try again." }, { status: 500 });
  }
}
