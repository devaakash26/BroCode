import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import axios from 'axios';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const languageToJudge0Id = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
};

const calculatePoints = (difficulty) => {
  switch (difficulty) {
    case 'EASY': return 20;
    case 'MEDIUM': return 50;
    case 'HARD': return 100;
    default: return 10;
  }
};

async function getLeaderboard(challengeId) {
  const participants = await prisma.challengeParticipant.findMany({
    where: { challengeId },
    orderBy: [
      { score: 'desc' },
      { completedProblems: 'desc' }
    ],
    include: {
      user: {
        select: { 
          id: true, 
          name: true, 
          image: true 
        },
      },
    },
  });
  return participants;
}

export async function POST(request) {
  try {
    if (!JUDGE0_API_URL || !JUDGE0_API_KEY) {
      return NextResponse.json(
        { message: 'Code execution service is not configured.' },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { code, language, problemId, challengeId = null } = await request.json();
    
    if (!code || !language || !problemId) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const languageId = languageToJudge0Id[language];
    if (!languageId) {
      return NextResponse.json(
        { message: `Language '${language}' is not supported.` },
        { status: 400 }
      );
    }

    // Get problem with test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { testCasesRel: true },
    });

    if (!problem) {
      return NextResponse.json(
        { message: 'Problem not found' },
        { status: 404 }
      );
    }

    // Prepare submissions for each test case
    const submissions = problem.testCasesRel.map(testCase => ({
      language_id: languageId,
      source_code: code,
      stdin: testCase.input,
      expected_output: testCase.expectedOutput || testCase.output,
    }));

    // Submit code to Judge0
    const createSubmissionsResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
      { submissions },
      {
        headers: {
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': new URL(JUDGE0_API_URL).host,
          'Content-Type': 'application/json',
        }
      }
    );

    const submissionTokens = createSubmissionsResponse.data.map(s => s.token);

    // Poll for results
    let finalResults = [];
    let processing = true;
    while (processing) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const getSubmissionsResponse = await axios.get(
        `${JUDGE0_API_URL}/submissions/batch?tokens=${submissionTokens.join(',')}&base64_encoded=false&fields=*`,
        {
          headers: {
            'X-RapidAPI-Key': JUDGE0_API_KEY,
            'X-RapidAPI-Host': new URL(JUDGE0_API_URL).host,
          }
        }
      );
      
      const results = getSubmissionsResponse.data.submissions;
      if (!results.some(r => r.status.id === 1 || r.status.id === 2)) {
        processing = false;
        finalResults = results;
      }
    }

    // Process test results
    const testResults = finalResults.map((result, index) => ({
      testCaseNumber: index + 1,
      input: problem.testCasesRel[index].input,
      expectedOutput: problem.testCasesRel[index].expectedOutput || problem.testCasesRel[index].output,
      output: result.stdout ? result.stdout.trim() : (result.stderr || result.compile_output || '').trim(),
      passed: result.status.id === 3,
      status: result.status.description,
      executionTime: parseFloat(result.time),
      memoryUsed: result.memory,
    }));

    const allPassed = testResults.every(r => r.passed);
    let status = 'WRONG_ANSWER';
    if (allPassed) {
      status = 'ACCEPTED';
    } else if (testResults.some(r => r.status === 'Compilation Error')) {
      status = 'COMPILE_ERROR';
    }

    // Create submission record
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        language,
        code,
        status,
        executionTime: Math.round((Math.max(...testResults.map(r => r.executionTime || 0))) * 1000),
        memoryUsed: Math.round(Math.max(...testResults.map(r => r.memoryUsed || 0))),
        challengeId,
        results: testResults,
        pointsEarned: allPassed ? calculatePoints(problem.difficulty) : 0,
        score: allPassed ? calculatePoints(problem.difficulty) : 0,
      },
    });

    let pointsAwarded = 0;
    if (status === 'ACCEPTED') {
      pointsAwarded = calculatePoints(problem.difficulty);
      
      // Update challenge participant score if in a challenge
      if (challengeId) {
        await prisma.challengeParticipant.upsert({
          where: {
            userId_challengeId: {
              userId: session.user.id,
              challengeId
            }
          },
          update: {
            score: { increment: pointsAwarded },
            completedProblems: { increment: 1 }
          },
          create: {
            userId: session.user.id,
            challengeId,
            score: pointsAwarded,
            completedProblems: 1
          }
        });

        // Emit leaderboard update through socket.io
        const newLeaderboard = await getLeaderboard(challengeId);
        if (global.io) {
          global.io.to(`challenge:${challengeId}`).emit('leaderboardUpdate', {
            leaderboard: newLeaderboard,
            lastSubmission: {
              userId: session.user.id,
              problemId,
              points: pointsAwarded,
              timestamp: new Date()
            }
          });
        }
      }

      // This part seems to be causing issues with a non-existent model.
      // I will comment it out as it seems to be from a previous schema.
      /*
      // Mark problem as solved for the user
      await prisma.userProblem.upsert({
        where: {
          userId_problemId: {
            userId: session.user.id,
            problemId
          }
        },
        update: {
          solved: true,
          lastSolved: new Date()
        },
        create: {
          userId: session.user.id,
          problemId,
          solved: true,
          lastSolved: new Date()
        }
      });
      */
    }

    return NextResponse.json({
      status,
      statusMessage: allPassed ? 'All test cases passed!' : 'One or more test cases failed.',
      testResults,
      pointsAwarded,
    });

  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: error.message },
      { status: 500 }
    );
  }
}
