import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import axios from "axios";
import { JUDGE0_URL, getJudge0Headers, isJudge0Configured } from "@/lib/judge0";

// Free-form compiler for the Live Playground: run code against up to 5 stdins.
const LANGUAGE_IDS = {
  c: 50, // C (GCC 9.2.0)
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1) — class must be `Main`
  javascript: 63, // Node.js 12.14.0
  python: 71, // Python 3.8.1
};

const MAX_INPUTS = 5;
const MAX_CODE = 64 * 1024;
const MAX_STDIN = 16 * 1024;
const MAX_OUTPUT = 64 * 1024;
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 25_000;

const b64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8").slice(0, MAX_OUTPUT) : "");

export async function POST(request) {
  try {
    if (!isJudge0Configured()) {
      return NextResponse.json(
        { message: "Code execution service is not configured." },
        { status: 500 },
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { code, language, inputs } = await request.json();
    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
      return NextResponse.json({ message: "Unsupported language" }, { status: 400 });
    }
    if (typeof code !== "string" || !code.trim() || code.length > MAX_CODE) {
      return NextResponse.json({ message: "Code is empty or too large" }, { status: 400 });
    }

    const stdins = (Array.isArray(inputs) && inputs.length ? inputs : [""])
      .slice(0, MAX_INPUTS)
      .map((s) => (typeof s === "string" ? s.slice(0, MAX_STDIN) : ""));

    const { data: created } = await axios.post(
      `${JUDGE0_URL}/submissions/batch?base64_encoded=true`,
      {
        submissions: stdins.map((stdin) => ({
          language_id: languageId,
          source_code: b64(code),
          stdin: b64(stdin),
        })),
      },
      { headers: getJudge0Headers() },
    );
    const tokens = created.map((s) => s.token).filter(Boolean);
    if (tokens.length !== stdins.length) {
      return NextResponse.json({ message: "Failed to queue submission" }, { status: 502 });
    }

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let submissions = [];
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const { data } = await axios.get(
        `${JUDGE0_URL}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=status,stdout,stderr,compile_output,message,time,memory`,
        { headers: getJudge0Headers() },
      );
      submissions = data.submissions || [];
      // 1 = In Queue, 2 = Processing
      if (!submissions.some((s) => !s || s.status?.id <= 2)) break;
    }

    const results = stdins.map((_, i) => {
      const s = submissions[i];
      if (!s || s.status?.id <= 2) {
        return { status: "Timed out waiting for judge", ok: false };
      }
      return {
        status: s.status?.description || "Unknown",
        ok: s.status?.id === 3,
        stdout: unb64(s.stdout),
        stderr: unb64(s.stderr) || unb64(s.message),
        compileOutput: unb64(s.compile_output),
        time: s.time,
        memory: s.memory,
      };
    });

    return NextResponse.json({ language, results });
  } catch (error) {
    console.error(
      "[playground/run] error:",
      error.response ? error.response.data : error.message,
    );
    return NextResponse.json(
      { message: "Code execution failed. Please try again." },
      { status: 500 },
    );
  }
}
