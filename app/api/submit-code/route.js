import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import axios from 'axios';

const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const languageToJudge0Id = {
  javascript: 63, // Node.js 12.14.0
  python: 71,     // Python 3.8.1
  java: 62,       // Java OpenJDK 13.0.1
  cpp: 54,        // C++ GCC 9.2.0
};

// Helper to wrap user code in proper boilerplate
function wrapCodeWithBoilerplate(userCode, language, problem) {
  const functionName = extractMainFunctionName(problem.title, language);
  
  // Check if code contains locked sections
  const hasLockedSections = userCode.includes('BEGIN LOCKED') && userCode.includes('END LOCKED');
  if (hasLockedSections) {
    return userCode; // Keep the locked sections intact
  }
  
  // Otherwise use the original wrapping logic for backward compatibility
  switch (language) {
    case 'javascript':
      // Check if the code already has module.exports
      if (!userCode.includes('module.exports')) {
        return `${userCode.trim()}\n\n// Auto-added for testing\nmodule.exports = ${functionName};`;
      }
      return userCode;
      
    case 'python':
      // Check if the code already has main block
      if (!userCode.includes('if __name__ == "__main__"')) {
        return `${userCode.trim()}\n\n# Auto-added for testing\nif __name__ == "__main__":\n    import json\n    import sys\n    # Example test\n    print(${functionName}(*json.loads(sys.argv[1])))`;
      }
      return userCode;
      
    case 'java':
      // If the code doesn't have a main method, add one
      if (!userCode.includes('public static void main')) {
        // Check if the code has the Solution class
        if (!userCode.includes('class Solution')) {
          return `import java.util.*;\n\nclass Solution {\n    ${userCode.trim()}\n    \n    // Auto-added for testing\n    public static void main(String[] args) {\n        Solution solution = new Solution();\n        // Example test will be run\n    }\n}`;
        } else {
          // Find the end of the Solution class and add main method there
          const lastBraceIndex = userCode.lastIndexOf('}');
          if (lastBraceIndex !== -1) {
            return userCode.substring(0, lastBraceIndex) + 
                   '\n    // Auto-added for testing\n    public static void main(String[] args) {\n        Solution solution = new Solution();\n        // Example test will be run\n    }\n}';
          }
        }
      }
      return userCode;
      
    case 'cpp':
      // If the code doesn't have a main function, add one
      if (!userCode.includes('int main(')) {
        // Check if code has the Solution class
        if (!userCode.includes('class Solution')) {
          return `#include <vector>\n#include <iostream>\n\nclass Solution {\npublic:\n    ${userCode.trim()}\n};\n\n// Auto-added for testing\nint main() {\n    Solution solution;\n    // Example test will be run\n    return 0;\n}`;
        } else {
          // Add main function after the Solution class
          return `${userCode.trim()}\n\n// Auto-added for testing\nint main() {\n    Solution solution;\n    // Example test will be run\n    return 0;\n}`;
        }
      }
      return userCode;
  }
  
  return userCode; // Default fallback
}

// Calculate points based on difficulty
const calculatePoints = (difficulty) => {
  switch (difficulty) {
    case 'EASY':
      return 20;
    case 'MEDIUM':
      return 50;
    case 'HARD':
      return 100;
    default:
      return 10;
  }
};

// Helper to extract main function name from problem title
function extractMainFunctionName(title, language) {
  if (!title) return language === 'javascript' ? 'solve' : 'solve';
  
  // Convert title to function name format based on language conventions
  let functionName = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove special characters
    .replace(/\s+/g, '_');    // Replace spaces with underscores
  
  switch (language) {
    case 'javascript':
      // Convert to camelCase for JavaScript
      functionName = functionName
        .split('_')
        .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      break;
      
    case 'python':
      // Python uses snake_case
      functionName = functionName.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (functionName.startsWith('_')) {
        functionName = functionName.substring(1);
      }
      break;
      
    case 'java':
    case 'cpp':
      // Java/C++ methods are typically camelCase
      functionName = functionName
        .split('_')
        .map((word, index) => index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
      break;
  }
  
  return functionName || (language === 'javascript' ? 'solve' : 'solve');
}

export async function POST(request) {
  try {
    if (!JUDGE0_API_URL || !JUDGE0_API_KEY) {
      return NextResponse.json(
        { message: 'Code execution service is not configured. Please contact an administrator.' },
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

    // Validate input
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

    // Get the problem and all its test cases (including hidden ones)
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCasesRel: {}, // Get all test cases for submission
      },
    });

    if (!problem) {
      return NextResponse.json(
        { message: 'Problem not found' },
        { status: 404 }
      );
    }
    
    const completeCode = wrapCodeWithBoilerplate(code, language, problem);

    const submissions = problem.testCasesRel.map(testCase => ({
      language_id: languageId,
      source_code: completeCode,
      stdin: testCase.input,
      expected_output: testCase.expectedOutput || testCase.output,
    }));

    const createSubmissionsResponse = await axios.post(`${JUDGE0_API_URL}/submissions/batch?base64_encoded=false`, {
      submissions,
    }, {
      headers: {
        'X-RapidAPI-Key': JUDGE0_API_KEY,
        'X-RapidAPI-Host': new URL(JUDGE0_API_URL).host,
        'Content-Type': 'application/json',
      }
    });

    const submissionTokens = createSubmissionsResponse.data.map(s => s.token);

    let finalResults = [];
    let processing = true;
    while (processing) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second

      const getSubmissionsResponse = await axios.get(`${JUDGE0_API_URL}/submissions/batch?tokens=${submissionTokens.join(',')}&base64_encoded=false&fields=*`, {
        headers: {
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': new URL(JUDGE0_API_URL).host,
        }
      });

      const results = getSubmissionsResponse.data.submissions;
      
      const stillProcessing = results.some(r => r.status.id === 1 || r.status.id === 2);
      if (!stillProcessing) {
        processing = false;
        finalResults = results;
      }
    }

    const testResults = finalResults.map((result, index) => {
      const testCase = problem.testCasesRel[index];
      const passed = result.status.id === 3; // 3 is "Accepted"
      let output = result.stdout ? result.stdout.trim() : (result.stderr || result.compile_output || '').trim();
      
      return {
        testCaseNumber: index + 1,
        input: testCase.input,
        expectedOutput: testCase.expectedOutput || testCase.output,
        output: output,
        passed,
        status: result.status.description,
        executionTime: parseFloat(result.time),
        memoryUsed: result.memory,
        error: passed ? null : (result.stderr || result.compile_output),
      };
    });

    const allPassed = testResults.every(r => r.passed);
    let status = 'WRONG_ANSWER';
    if (allPassed) {
      status = 'ACCEPTED';
    } else if (testResults.some(r => r.status === 'Compilation Error')) {
      status = 'COMPILE_ERROR';
    } else if (testResults.some(r => r.status.startsWith('Runtime Error'))) {
      status = 'RUNTIME_ERROR';
    }
    
    const totalExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0);
    const maxMemoryUsed = Math.max(...testResults.map(r => r.memoryUsed));

    // Save submission to the database
    const newSubmission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        challengeId,
        code,
        language,
        status,
        results: { testResults },
        executionTime: totalExecutionTime,
        memoryUsed: maxMemoryUsed,
      },
    });

    let pointsAwarded = 0;
    if (status === 'ACCEPTED') {
      pointsAwarded = calculatePoints(problem.difficulty);

      // Check if user has already solved this problem
      const previousCorrectSubmission = await prisma.submission.findFirst({
        where: {
          userId: session.user.id,
          problemId,
          status: 'ACCEPTED',
          id: { not: newSubmission.id },
        },
      });

      if (!previousCorrectSubmission) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            points: {
              increment: pointsAwarded,
            },
          },
        });
      }

      if (challengeId) {
        const participant = await prisma.challengeParticipant.findUnique({
          where: {
            userId_challengeId: {
              userId: session.user.id,
              challengeId,
            },
          },
        });
        if (participant) {
          // Check if this problem was already solved by the user in this challenge
          const previouslySolvedInChallenge = await prisma.submission.findFirst({
            where: {
              userId: session.user.id,
              problemId: problemId,
              challengeId: challengeId,
              status: 'ACCEPTED',
              id: { not: newSubmission.id }
            }
          });
          
          if (!previouslySolvedInChallenge) {
             await prisma.challengeParticipant.update({
              where: {
                id: participant.id,
              },
              data: {
                score: {
                  increment: pointsAwarded,
                },
                problemsSolved: {
                  increment: 1,
                },
              },
            });
          }
        }
      }
    }

    return NextResponse.json({
      submissionId: newSubmission.id,
      status,
      statusMessage: allPassed ? 'All test cases passed!' : 'One or more test cases failed.',
      testResults,
      pointsAwarded,
    });

  } catch (error) {
    console.error('Error submitting code:', error.response ? error.response.data : error.message);
    return NextResponse.json(
      { message: 'Error submitting code', error: error.message },
      { status: 500 }
    );
  }
}