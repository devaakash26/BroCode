import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { JUDGE0_URL, getJudge0Headers, isJudge0Configured } from "@/lib/judge0";

// Language ID mapping for Judge0
const LANGUAGE_MAP = {
  c: 50, // C (GCC 9.2.0)
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
  python: 71, // Python (3.8.1)
  javascript: 63, // JavaScript (Node.js 12.14.0)
};

/**
 * Optimized code submission endpoint with Judge0
 * POST /api/problems/[id]/submit-optimized
 */
export async function POST(request, { params }) {
  try {
    // Check Judge0 configuration
    if (!isJudge0Configured()) {
      return NextResponse.json(
        {
          error:
            "Judge0 is not configured. Please check environment variables.",
        },
        { status: 500 },
      );
    }

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: problemId } = params;
    const { code, language, challengeId } = await request.json();

    // Validate input
    if (!code || !language) {
      return NextResponse.json(
        { error: "Code and language are required" },
        { status: 400 },
      );
    }

    if (!LANGUAGE_MAP[language]) {
      return NextResponse.json(
        { error: "Unsupported language" },
        { status: 400 },
      );
    }

    // Fetch problem with test cases in parallel
    const [problem, testCases] = await Promise.all([
      prisma.problem.findUnique({
        where: { id: problemId },
        select: {
          id: true,
          title: true,
          difficulty: true,
          cPreDriverCode: true,
          cppPreDriverCode: true,
          pythonPreDriverCode: true,
          javaPreDriverCode: true,
          jsPreDriverCode: true,
          javaTimeLimit: true,
          memoryLimit: true,
          javaMemoryLimit: true,
          testCases: true,
        },
      }),
      prisma.testCase.findMany({
        where: { problemId, isHidden: false },
        select: {
          id: true,
          input: true,
          expectedOutput: true,
          isExample: true,
        },
        take: 3, // Limit to first 3 test cases for quick feedback
      }),
    ]);

    if (!problem) {
      return NextResponse.json({ error: "Problem not found" }, { status: 404 });
    }

    // Create initial submission record
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        challengeId: challengeId || null,
        code,
        language,
        status: "PENDING",
      },
    });

    // Prepare code with pre-driver code
    let finalCode = code;
    const driverCodeMap = {
      c: problem.cPreDriverCode,
      cpp: problem.cppPreDriverCode,
      java: problem.javaPreDriverCode,
      python: problem.pythonPreDriverCode,
      javascript: problem.jsPreDriverCode?.driver_code,
    };

    if (driverCodeMap[language]) {
      finalCode = driverCodeMap[language] + "\n" + code;
    }

    // Use test cases from JSON if available, otherwise from database
    const testCasesToRun =
      testCases.length > 0
        ? testCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          }))
        : (problem.testCases || []).slice(0, 3);

    if (testCasesToRun.length === 0) {
      return NextResponse.json(
        { error: "No test cases available for this problem" },
        { status: 400 },
      );
    }

    // Submit to Judge0 in batch mode for faster execution
    const judge0Submissions = testCasesToRun.map((testCase) => ({
      language_id: LANGUAGE_MAP[language],
      source_code: Buffer.from(finalCode).toString("base64"),
      stdin: Buffer.from(testCase.input).toString("base64"),
      expected_output: Buffer.from(testCase.expectedOutput.trim()).toString(
        "base64",
      ),
      cpu_time_limit: (problem.javaTimeLimit || 3000) / 1000, // Convert ms to seconds
      memory_limit: problem.memoryLimit || problem.javaMemoryLimit || 200000,
    }));

    // Submit batch to Judge0 with base64 encoding
    const headers = getJudge0Headers();
    const batchResponse = await fetch(
      `${JUDGE0_URL}/submissions/batch?base64_encoded=true`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ submissions: judge0Submissions }),
      },
    );

    if (!batchResponse.ok) {
      throw new Error(
        `Judge0 batch submission failed: ${batchResponse.statusText}`,
      );
    }

    const batchData = await batchResponse.json();
    const tokens = batchData.map((item) => item.token);

    // Poll for results efficiently
    const results = await pollBatchResults(tokens, headers);

    // Evaluate results
    const passedCount = results.filter((r) => r.status.id === 3).length; // Status 3 = Accepted
    const allPassed = passedCount === results.length;

    let finalStatus = "WRONG_ANSWER";
    if (allPassed) {
      finalStatus = "ACCEPTED";
    } else if (results.some((r) => r.status.id === 6)) {
      finalStatus = "COMPILATION_ERROR";
    } else if (results.some((r) => r.status.id === 5)) {
      finalStatus = "TIME_LIMIT_EXCEEDED";
    } else if (results.some((r) => [11, 12].includes(r.status.id))) {
      finalStatus = "RUNTIME_ERROR";
    }

    // Calculate score and execution time
    const avgTime =
      results.reduce((sum, r) => sum + (parseFloat(r.time) || 0), 0) /
      results.length;
    const maxMemory = Math.max(...results.map((r) => parseInt(r.memory) || 0));
    const score = allPassed
      ? 100
      : Math.round((passedCount / results.length) * 100);

    // Update submission with results
    const updatedSubmission = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        results: {
          testResults: results.map((r, idx) => ({
            testCase: idx + 1,
            passed: r.status.id === 3,
            status: r.status.description,
            time: r.time,
            memory: r.memory,
            stdout: r.stdout
              ? Buffer.from(r.stdout, "base64").toString()
              : null,
            stderr: r.stderr
              ? Buffer.from(r.stderr, "base64").toString()
              : null,
            compileOutput: r.compile_output
              ? Buffer.from(r.compile_output, "base64").toString()
              : null,
          })),
          passedCount,
          totalCount: results.length,
        },
        score,
        executionTime: Math.round(avgTime * 1000), // Convert to ms
        memoryUsed: maxMemory,
        pointsEarned: allPassed ? 10 : 0,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update problem stats if accepted
    if (allPassed) {
      await prisma.problem.update({
        where: { id: problemId },
        data: {
          acceptedCount: { increment: 1 },
        },
      });
    }

    await prisma.problem.update({
      where: { id: problemId },
      data: {
        submitCount: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      submission: updatedSubmission,
      message: allPassed ? "All test cases passed!" : "Some test cases failed",
    });
  } catch (error) {
    console.error("Optimized submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit code", details: error.message },
      { status: 500 },
    );
  }
}

/**
 * Efficient polling for batch results
 * @param {string[]} tokens - Array of Judge0 submission tokens
 * @param {Object} headers - Judge0 headers
 * @returns {Promise<Array>} Results array
 */
async function pollBatchResults(tokens, headers, maxAttempts = 10) {
  const tokensString = tokens.join(",");
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(
      `${JUDGE0_URL}/submissions/batch?tokens=${tokensString}&base64_encoded=true&fields=status,time,memory,stdout,stderr,compile_output`,
      { headers },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch batch results");
    }

    const data = await response.json();
    const submissions = data.submissions;

    // Check if all submissions are done (status id > 2)
    const allDone = submissions.every((sub) => sub.status.id > 2);

    if (allDone) {
      return submissions;
    }

    // Wait before next poll (exponential backoff)
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(500 * Math.pow(1.5, attempts), 3000)),
    );
    attempts++;
  }

  throw new Error("Submission timed out");
}
