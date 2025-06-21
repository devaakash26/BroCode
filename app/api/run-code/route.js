import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
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
  
  // If it has locked sections, preserve them and only use the user-editable parts
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

    const { code, language, problemId, isSubmission = false } = await request.json();

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

    // Get the problem and its test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCasesRel: {
          // If it's a submission, include hidden test cases as well
          // For normal code runs, only use example test cases
          where: isSubmission ? {} : { isExample: true },
        },
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

    let testResults = [];
    let processing = true;
    while (processing) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second

      const getSubmissionsResponse = await axios.get(`${JUDGE0_API_URL}/submissions/batch?tokens=${submissionTokens.join(',')}&base64_encoded=false&fields=status_id,stdout,stderr,compile_output,token`, {
        headers: {
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': new URL(JUDGE0_API_URL).host,
        }
      });

      const results = getSubmissionsResponse.data.submissions;
      
      const stillProcessing = results.some(r => r.status_id === 1 || r.status_id === 2); // In Queue or Processing
      if (!stillProcessing) {
        processing = false;
        testResults = results.map((result, index) => {
          const testCase = problem.testCasesRel[index];
          const passed = result.status_id === 3; // 3 is "Accepted"
          let output = result.stdout || result.stderr || result.compile_output || '';
          
          return {
            testCaseNumber: index + 1,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput || testCase.output,
            output: output.trim(),
            passed,
            error: passed ? null : (result.stderr || result.compile_output),
          };
        });
      }
    }

    const allPassed = testResults.every(r => r.passed);

    return NextResponse.json({
      status: allPassed ? 'ACCEPTED' : 'WRONG_ANSWER',
      statusMessage: allPassed ? 'All test cases passed!' : 'One or more test cases failed.',
      testResults: testResults,
      consoleOutput: testResults.map(r => `Test Case ${r.testCaseNumber}:\nInput:\n${r.input}\nExpected Output:\n${r.expectedOutput}\nYour Output:\n${r.output}\nResult: ${r.passed ? 'Passed' : 'Failed'}\n`).join('\n')
    }, { status: 200 });

  } catch (error) {
    console.error('Code execution error:', error.response ? error.response.data : error.message);
    return NextResponse.json(
      { message: 'An unexpected error occurred during code execution.' },
      { status: 500 }
    );
  }
}
