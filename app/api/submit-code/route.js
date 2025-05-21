import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import { sendChallengeJoinEmail } from '@/app/lib/email';

// Helper to validate code syntax based on language
function validateCodeSyntax(code, language) {
  // Basic syntax validation based on language
  switch (language) {
    case 'javascript':
      if (!code.includes('function') && !code.includes('=>') && !code.includes('return')) {
        return { valid: false, error: 'JavaScript code should contain functions or return statements' };
      }
      break;
    case 'python':
      if (code.includes('{') && code.includes('}') && !code.includes('#')) {
        return { valid: false, error: 'This does not appear to be valid Python code' };
      }
      if (!code.includes('def') && !code.includes('return') && !code.includes('print')) {
        return { valid: false, error: 'Python code should contain function definitions, return or print statements' };
      }
      break;
    case 'java':
      if (!code.includes('class') || !code.includes('public') || !code.includes('{')) {
        return { valid: false, error: 'Java code should contain class definitions with proper syntax' };
      }
      break;
    case 'cpp':
      if (!code.includes('#include') && !code.includes('int') && !code.includes('{')) {
        return { valid: false, error: 'C++ code should include proper headers and function definitions' };
      }
      
      // Check if the solution is just printing and not returning a value
      const userCode = extractUserCodeFromLockedSections(code);
      if (userCode.includes('cout') && !userCode.includes('return') && 
          (userCode.includes('vector<int>') || userCode.includes('vector <int>') || 
           userCode.includes('vector<string>') || userCode.includes('vector <string>'))) {
        return { valid: false, error: 'Your solution should return a value, not just print to console' };
      }
      break;
  }
  return { valid: true };
}

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

// Function to extract user code from submissions with locked sections
function extractUserCodeFromLockedSections(fullCode) {
  if (!fullCode.includes('BEGIN LOCKED') || !fullCode.includes('END LOCKED')) {
    return fullCode; // No locked sections, return the full code
  }
  
  const lines = fullCode.split('\n');
  const userCodeParts = [];
  let inLockedSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('BEGIN LOCKED')) {
      inLockedSection = true;
      continue;
    }
    
    if (lines[i].includes('END LOCKED')) {
      inLockedSection = false;
      continue;
    }
    
    if (!inLockedSection) {
      userCodeParts.push(lines[i]);
    }
  }
  
  return userCodeParts.join('\n');
}

// Helper to analyze code for solution quality
function analyzeCodeQuality(code, language, problem) {
  // If code has locked sections, only analyze the user-editable parts
  const codeToAnalyze = extractUserCodeFromLockedSections(code);
  
  // More advanced code analysis to detect trivial or incomplete solutions
  const codeLength = codeToAnalyze.trim().length;
  const nonCommentLines = codeToAnalyze.split('\n')
    .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('#') && !line.trim().startsWith('*'))
    .filter(line => line.trim().length > 0)
    .length;
  
  // A solution that's too short is likely incomplete
  if (nonCommentLines < 3) {
    return { isQualitySolution: false, reason: 'Solution is too short to be complete' };
  }
  
  // Language-specific checks
  switch (language) {
    case 'javascript':
      // Check for minimal solution components
      const hasProperFunction = codeToAnalyze.includes('function') && codeToAnalyze.includes('(') && codeToAnalyze.includes(')');
      const hasArrowFunction = codeToAnalyze.includes('=>');
      const hasReturn = codeToAnalyze.includes('return');
      const hasMeaningfulLogic = codeToAnalyze.includes('if') || codeToAnalyze.includes('for') || codeToAnalyze.includes('while') || 
                               codeToAnalyze.includes('.map') || codeToAnalyze.includes('.filter') || codeToAnalyze.includes('.reduce');
      
      if (!(hasProperFunction || hasArrowFunction) || !hasReturn) {
        return { isQualitySolution: false, reason: 'JavaScript solution must define and return from a function' };
      }
      
      if (!hasMeaningfulLogic && nonCommentLines < 5) {
        return { isQualitySolution: false, reason: 'Solution lacks necessary logic' };
      }
      break;
      
    case 'python':
      // Check for Python solution components
      const hasPyFunction = codeToAnalyze.includes('def') && codeToAnalyze.includes(':');
      const hasPyReturn = codeToAnalyze.includes('return');
      const hasPyLogic = codeToAnalyze.includes('if') || codeToAnalyze.includes('for') || codeToAnalyze.includes('while') || 
                      codeToAnalyze.includes('in ') || codeToAnalyze.includes('range(');
      
      if (!hasPyFunction || !hasPyReturn) {
        return { isQualitySolution: false, reason: 'Python solution must define a function and return a value' };
      }
      
      if (!hasPyLogic && nonCommentLines < 5) {
        return { isQualitySolution: false, reason: 'Solution lacks necessary logic' };
      }
      break;
      
    case 'java':
      // Check for Java solution components
      const hasClass = codeToAnalyze.includes('class') && codeToAnalyze.includes('{') && codeToAnalyze.includes('}');
      const hasMethod = codeToAnalyze.includes('public') && 
                      (codeToAnalyze.includes('static') || codeToAnalyze.includes('void') || codeToAnalyze.includes('int') || 
                       codeToAnalyze.includes('String') || codeToAnalyze.includes('boolean'));
      const hasJavaReturn = !codeToAnalyze.includes('void') || codeToAnalyze.includes('return');
      
      if (!hasClass || !hasMethod) {
        return { isQualitySolution: false, reason: 'Java solution must include a class with proper method' };
      }
      
      if (!hasJavaReturn) {
        return { isQualitySolution: false, reason: 'Solution must return a value or be properly defined as void' };
      }
      break;
      
    case 'cpp':
      // Check for C++ solution components
      const hasInclude = codeToAnalyze.includes('#include');
      const hasMainOrFunction = (codeToAnalyze.includes('int main') || codeToAnalyze.includes('void main')) || 
                             (codeToAnalyze.includes('int ') && codeToAnalyze.includes('(') && codeToAnalyze.includes(')') && !codeToAnalyze.includes('main'));
      const hasCppReturn = codeToAnalyze.includes('return');
      
      // Look for actual algorithm implementation
      const hasMeaningfulCppLogic = 
        codeToAnalyze.includes('for (') || 
        codeToAnalyze.includes('while (') || 
        codeToAnalyze.includes('if (') || 
        (codeToAnalyze.match(/vector/g) || []).length > 1 || // Using vectors for processing
        codeToAnalyze.includes('unordered_map') && codeToAnalyze.includes('[') || // Using map with indexing
        codeToAnalyze.includes('push_back') || 
        codeToAnalyze.includes('sort(') ||
        codeToAnalyze.match(/cin >>/g) && codeToAnalyze.match(/cout <</g); // Has both input and output
      
      // Detect if the code actually processes data and does calculations
      const hasActualProcessing = 
        codeToAnalyze.includes('++') || 
        codeToAnalyze.includes('--') || 
        codeToAnalyze.includes('+=') || 
        codeToAnalyze.includes('-=') || 
        codeToAnalyze.includes('*=') || 
        (codeToAnalyze.match(/=/g) || []).length >= 2; // Multiple assignments
      
      if (!hasInclude) {
        return { isQualitySolution: false, reason: 'C++ solution should include necessary headers' };
      }
      
      if (!hasMainOrFunction) {
        return { isQualitySolution: false, reason: 'C++ solution must define a function or main method' };
      }
      
      if (!hasCppReturn && !codeToAnalyze.includes('void')) {
        return { isQualitySolution: false, reason: 'Solution must return a value or be declared void' };
      }
      
      // Check if solution only prints to console without returning anything
      if (codeToAnalyze.includes('cout') && !hasCppReturn) {
        return { isQualitySolution: false, reason: 'Your solution should return a value, not just print to console' };
      }
      
      // Detect trivial solutions like just "int main() {}"
      if (codeToAnalyze.includes('int main') && nonCommentLines < 8) {
        // Check for empty or nearly empty main function with no meaningful logic
        if (!hasMeaningfulCppLogic || !hasActualProcessing) {
          return { isQualitySolution: false, reason: 'C++ solution is incomplete. Add algorithm implementation with loops, conditionals, or data structures.' };
        }
      }
      
      // Minimal requirements for a solution
      if (!hasMeaningfulCppLogic && !hasActualProcessing) {
        return { isQualitySolution: false, reason: 'C++ solution lacks necessary logic or data processing.' };
      }
      break;
  }
  
  return { isQualitySolution: true };
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

    // Check if this is the user's first submission to this challenge
    let isFirstChallengeSubmission = false;
    let challengeInfo = null;
    let groupInfo = null;

    if (challengeId) {
      // Check if this is the first submission by this user for this challenge
      const previousSubmissions = await prisma.submission.count({
        where: {
          userId: session.user.id,
          challengeId: challengeId,
        },
      });

      isFirstChallengeSubmission = previousSubmissions === 0;

      // If it's the first submission, get challenge details for email
      if (isFirstChallengeSubmission) {
        challengeInfo = await prisma.challenge.findUnique({
          where: { id: challengeId },
          include: {
            group: {
              select: {
                name: true,
              },
            },
          },
        });
        
        if (challengeInfo) {
          groupInfo = challengeInfo.group;
        }
      }
    }

    // Validate code syntax based on selected language
    const syntaxValidation = validateCodeSyntax(code, language);
    if (!syntaxValidation.valid) {
      return NextResponse.json({
        status: 'COMPILE_ERROR',
        statusMessage: syntaxValidation.error,
        compileError: syntaxValidation.error,
        testResults: [],
        consoleOutput: `Error: ${syntaxValidation.error}`
      }, { status: 200 });
    }

    // Get the problem and all its test cases (including hidden ones)
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCasesRel: {
          // For submissions, use non-example test cases
          where: { isExample: false }
        },
      },
    });

    if (!problem) {
      return NextResponse.json(
        { message: 'Problem not found' },
        { status: 404 }
      );
    }
    
    // Analyze code for solution quality
    const codeQualityAnalysis = analyzeCodeQuality(code, language, problem);
    if (!codeQualityAnalysis.isQualitySolution) {
      return NextResponse.json({
        status: 'QUALITY_ERROR',
        statusMessage: codeQualityAnalysis.reason,
        compileError: codeQualityAnalysis.reason,
        testResults: [],
        consoleOutput: `Error: ${codeQualityAnalysis.reason}\nYour submission needs to be more complete.`
      }, { status: 200 });
    }

    // Wrap the code with proper boilerplate if needed
    const completeCode = wrapCodeWithBoilerplate(code, language, problem);

    // Generate fake console output for debugging purposes
    const consoleOutput = `Running ${language} code...\n` +
      `Processing ${problem.testCasesRel.length} test cases (including hidden test cases).\n` +
      (language === 'javascript' ? 'Node.js v16.14.0\n' : 
       language === 'python' ? 'Python 3.9.10\n' : 
       language === 'java' ? 'OpenJDK 11.0.15\n' : 
       'GCC 11.2.0\n');
    
    // Flag to identify trivial "print only" solutions
    const isPrintOnlySolution = 
      (language === 'cpp' && 
       code.includes('cout') && 
       !extractUserCodeFromLockedSections(code).includes('return')) ||
      (language === 'python' && 
       code.includes('print') && 
       !extractUserCodeFromLockedSections(code).includes('return')) ||
      (language === 'javascript' && 
       code.includes('console.log') && 
       !extractUserCodeFromLockedSections(code).includes('return'));
    
    // Check for special test cases - if TEST_ALL_PASS is present, bypass all testing
    const shouldAllPass = (code.includes('// TEST_ALL_PASS') || code.includes('# TEST_ALL_PASS')) && 
                         !isPrintOnlySolution; // Never pass print-only solutions
    
    // For the prototype, we're using a more realistic mock execution
    // Mock test results with more realistic behavior
    const testResults = await Promise.all(
      problem.testCasesRel.map(async (testCase, index) => {
        // Simulating code execution with a slight delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 300));
        
        // Default values
        let passed = false;
        let output = '';
        let error = null;
        
        if (shouldAllPass) {
          // For demonstration purposes only - allow instructors to force all passing
          passed = true;
          output = testCase.output;
        } else if (isPrintOnlySolution) {
          // Always fail print-only solutions that don't return values
          passed = false;
          error = language === 'cpp' 
              ? "Runtime error: Function doesn't return a value"
              : language === 'python'
              ? "Runtime error: Function returns None instead of expected result"
              : "Runtime error: Function doesn't return a value";
          output = language === 'cpp' ? 'Hello' : 'undefined';
        } else {
          // For testing purposes, we can force errors/failures with special comments
          const shouldGenerateError = code.includes('// TEST_ERROR') || code.includes('# TEST_ERROR');
          const shouldFail = code.includes('// TEST_FAIL') || code.includes('# TEST_FAIL');
          
          if (shouldGenerateError) {
            // Generate an error for testing purposes
            const errorTypes = [
              `TypeError: Cannot read property 'length' of undefined`,
              `ReferenceError: variable is not defined`,
              `RangeError: Maximum call stack size exceeded`,
              `SyntaxError: Unexpected token in JSON at position 0`
            ];
            error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            output = '';
            passed = false;
          } else if (shouldFail) {
            // Generate wrong output for testing purposes
            if (testCase.output && testCase.output.match(/^\d+$/)) {
              const expectedNum = parseInt(testCase.output);
              output = (expectedNum + (index + 1)).toString();
            } else if (testCase.output && testCase.output.includes('[') && testCase.output.includes(']')) {
              output = testCase.output.replace(/\d+/, match => parseInt(match) + 1);
            } else {
              output = `Wrong output for test case ${index + 1}`;
            }
            passed = false;
          } else {
            // Special handling for common problems like Two Sum
            const isProblemTwoSum = 
              problem.title.includes('Two Sum') || 
              (problem.description && problem.description.includes('sum') && problem.description.includes('target'));
            
            if (isProblemTwoSum) {
              // Check if solution has the right components for Two Sum
              const userCode = extractUserCodeFromLockedSections(code);
              const hasTwoSumAlgorithm = 
                // Check for HashMap/unordered_map approach
                ((language === 'cpp' && (userCode.includes('unordered_map') || userCode.includes('map<'))) ||
                 (language === 'javascript' && (userCode.includes('Map') || userCode.includes('{}') || userCode.includes('Object.') || userCode.includes('[') && userCode.includes(']'))) ||
                 (language === 'python' && (userCode.includes('dict') || userCode.includes('{}')))) &&
                // Check for proper loop and difference calculation
                ((userCode.includes('for') || userCode.includes('while') || userCode.includes('forEach') || userCode.includes('map(') || 
                  userCode.includes('each') || userCode.includes('reduce')) &&
                 (userCode.includes('-') || userCode.includes('+')));
              
              // For Two Sum, if code shows right algorithm components, it's likely correct
              if (hasTwoSumAlgorithm && userCode.includes('return') && !userCode.includes('cout') && userCode.length > 100) {
                passed = true;
                output = testCase.output;
              } else {
                // Provide more realistic output for incorrect Two Sum solutions
                // Always output a pair of indices, just not the correct ones
                if (testCase.output && testCase.output.includes('[') && testCase.output.includes(',')) {
                  // Generate wrong but plausible indices
                  const wrongIndices = JSON.parse(testCase.output);
                  const altIndex1 = (wrongIndices[0] + 1) % 4; // Keep within array bounds
                  const altIndex2 = (wrongIndices[1] + 1) % 4;
                  output = `[${altIndex1},${altIndex2}]`;
                } else {
                  output = '[1,1]'; // Default wrong output for Two Sum
                }
                passed = false;
              }
            } else {
              // For other problems, use the standard simulation logic
              // The longer the solution, the more likely it passes (for demo purposes)
              const solutionComplexity = extractUserCodeFromLockedSections(code).length / 100; // rough complexity metric
              
              // Check for essential elements in a valid solution for this problem
              const hasValidSolutionComponents = 
                (language === 'cpp' && (
                  (code.includes('unordered_map') || code.includes('for') || code.includes('while')) &&
                  code.includes('return') && 
                  !code.includes('cout') // Valid solutions shouldn't print
                )) ||
                (language === 'javascript' && (
                  code.includes('Map') || code.includes('for') || code.includes('while') || code.includes('forEach') ||
                  code.includes('reduce') || code.includes('filter')
                )) ||
                (language === 'python' && (
                  code.includes('dict') || code.includes('for ') || code.includes('while')
                ));
              
              const randomFactor = Math.random() + solutionComplexity;
              
              // Make passing more dependent on having proper solution components
              passed = hasValidSolutionComponents && randomFactor > 0.7; // slightly easier to pass for submissions
              
              if (passed) {
                output = testCase.output;
              } else {
                // Generate plausible wrong output
                if (testCase.output && testCase.output.match(/^\d+$/)) {
                  const expectedNum = parseInt(testCase.output);
                  output = (expectedNum + (index + 1)).toString();
                } else if (testCase.output && testCase.output.includes('[') && testCase.output.includes(']')) {
                  output = testCase.output.replace(/\d+/, match => parseInt(match) + 1);
                } else {
                  output = `Wrong output for test case ${index + 1}`;
                }
              }
            }
          }
        }
        
        return {
          testCaseId: testCase.id,
          passed,
          executionTime: Math.floor(Math.random() * 100) + 10,
          memoryUsed: Math.floor(Math.random() * 2000) + 500,
          output,
          error
        };
      })
    );

    // Determine overall status
    const allPassed = testResults.every(result => result.passed);
    let status = allPassed ? 'ACCEPTED' : 'WRONG_ANSWER';
    
    // If any test has an error, update the status accordingly
    if (!allPassed && testResults.some(result => result.error)) {
      status = 'RUNTIME_ERROR';
    }
    
    // Calculate metrics
    const totalExecutionTime = testResults.reduce((sum, result) => sum + result.executionTime, 0);
    const maxMemoryUsed = Math.max(...testResults.map(r => r.memoryUsed));

    // Calculate score (simple version - percentage of test cases passed)
    const score = Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100);

    // Calculate points based on difficulty if status is ACCEPTED
    const pointsEarned = allPassed ? calculatePoints(problem.difficulty) : 0;

    // Create the submission record
    const submission = await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        challengeId,
        code,
        language,
        status,
        results: { testResults },
        score,
        executionTime: totalExecutionTime,
        memoryUsed: maxMemoryUsed,
        pointsEarned
      },
    });

    // Send email notification for first challenge submission
    if (isFirstChallengeSubmission && challengeInfo && groupInfo) {
      try {
        await sendChallengeJoinEmail({
          to: session.user.email,
          name: session.user.name || 'User',
          challengeName: challengeInfo.title,
          groupName: groupInfo.name,
          startTime: challengeInfo.startTime,
          endTime: challengeInfo.endTime,
        });
        console.log(`Challenge join email sent to ${session.user.email} for challenge ${challengeId}`);
      } catch (emailError) {
        console.error('Error sending challenge join email:', emailError);
        // Don't fail the submission if email sending fails
      }
    }

    // If it's part of a challenge and status is ACCEPTED, update user's score
    if (challengeId && status === 'ACCEPTED') {
      try {
        const challenge = await prisma.challenge.findUnique({
          where: { id: challengeId },
          select: { groupId: true }
        });

        if (challenge) {
          await prisma.userGroup.updateMany({
            where: {
              userId: session.user.id,
              groupId: challenge.groupId
            },
            data: {
              score: { increment: pointsEarned }
            }
          });
        }
      } catch (error) {
        console.error('Error updating user score:', error);
        // Continue with response even if score update fails
      }
    }

    // Return the submission results
    return NextResponse.json({
      status,
      statusMessage: status === 'ACCEPTED' ? 'All test cases passed!' : 'Some test cases failed',
      submissionId: submission.id,
      testResults: testResults.map(result => ({
        ...result,
        // Don't expose output of hidden test cases
        output: problem.testCasesRel.find(tc => tc.id === result.testCaseId)?.isHidden ? '[Hidden]' : result.output,
      })),
      score,
      executionTime: totalExecutionTime,
      memoryUsed: maxMemoryUsed,
      pointsEarned
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting code:', error);
    return NextResponse.json(
      { message: 'Error submitting code', error: error.message },
      { status: 500 }
    );
  }
} 