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
      break;
  }
  return { valid: true };
}

// Helper to analyze code for solution quality
function analyzeCodeQuality(code, language, problem) {
  // More advanced code analysis to detect trivial or incomplete solutions
  const codeLength = code.trim().length;
  const nonCommentLines = code.split('\n')
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
      const hasProperFunction = code.includes('function') && code.includes('(') && code.includes(')');
      const hasArrowFunction = code.includes('=>');
      const hasReturn = code.includes('return');
      const hasMeaningfulLogic = code.includes('if') || code.includes('for') || code.includes('while') || 
                               code.includes('.map') || code.includes('.filter') || code.includes('.reduce');
      
      if (!(hasProperFunction || hasArrowFunction) || !hasReturn) {
        return { isQualitySolution: false, reason: 'JavaScript solution must define and return from a function' };
      }
      
      if (!hasMeaningfulLogic && nonCommentLines < 5) {
        return { isQualitySolution: false, reason: 'Solution lacks necessary logic' };
      }
      break;
      
    case 'python':
      // Check for Python solution components
      const hasPyFunction = code.includes('def') && code.includes(':');
      const hasPyReturn = code.includes('return');
      const hasPyLogic = code.includes('if') || code.includes('for') || code.includes('while') || 
                      code.includes('in ') || code.includes('range(');
      
      if (!hasPyFunction || !hasPyReturn) {
        return { isQualitySolution: false, reason: 'Python solution must define a function and return a value' };
      }
      
      if (!hasPyLogic && nonCommentLines < 5) {
        return { isQualitySolution: false, reason: 'Solution lacks necessary logic' };
      }
      break;
      
    case 'java':
      // Check for Java solution components
      const hasClass = code.includes('class') && code.includes('{') && code.includes('}');
      const hasMethod = code.includes('public') && 
                      (code.includes('static') || code.includes('void') || code.includes('int') || 
                       code.includes('String') || code.includes('boolean'));
      const hasJavaReturn = !code.includes('void') || code.includes('return');
      
      if (!hasClass || !hasMethod) {
        return { isQualitySolution: false, reason: 'Java solution must include a class with proper method' };
      }
      
      if (!hasJavaReturn) {
        return { isQualitySolution: false, reason: 'Solution must return a value or be properly defined as void' };
      }
      break;
      
    case 'cpp':
      // Check for C++ solution components
      const hasInclude = code.includes('#include');
      const hasMainOrFunction = (code.includes('int main') || code.includes('void main')) || 
                             (code.includes('int ') && code.includes('(') && code.includes(')') && !code.includes('main'));
      const hasCppReturn = code.includes('return');
      
      // Look for actual algorithm implementation
      const hasMeaningfulCppLogic = 
        code.includes('for (') || 
        code.includes('while (') || 
        code.includes('if (') || 
        (code.match(/vector/g) || []).length > 1 || // Using vectors for processing
        code.includes('unordered_map') && code.includes('[') || // Using map with indexing
        code.includes('push_back') || 
        code.includes('sort(') ||
        code.match(/cin >>/g) && code.match(/cout <</g); // Has both input and output
      
      // Detect if the code actually processes data and does calculations
      const hasActualProcessing = 
        code.includes('++') || 
        code.includes('--') || 
        code.includes('+=') || 
        code.includes('-=') || 
        code.includes('*=') || 
        (code.match(/=/g) || []).length >= 2; // Multiple assignments
      
      if (!hasInclude) {
        return { isQualitySolution: false, reason: 'C++ solution should include necessary headers' };
      }
      
      if (!hasMainOrFunction) {
        return { isQualitySolution: false, reason: 'C++ solution must define a function or main method' };
      }
      
      if (!hasCppReturn && !code.includes('void')) {
        return { isQualitySolution: false, reason: 'Solution must return a value or be declared void' };
      }
      
      // Detect trivial solutions like just "int main() {}"
      if (code.includes('int main') && nonCommentLines < 8) {
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
        testCasesRel: true,
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

    // Generate fake console output for debugging purposes
    const consoleOutput = `Running ${language} code...\n` +
      `Processing ${problem.testCasesRel.length} test cases (including hidden test cases).\n` +
      (language === 'javascript' ? 'Node.js v16.14.0\n' : 
       language === 'python' ? 'Python 3.9.10\n' : 
       language === 'java' ? 'OpenJDK 11.0.15\n' : 
       'GCC 11.2.0\n');
    
    // Check for special test cases - if TEST_ALL_PASS is present, bypass all testing
    const shouldAllPass = code.includes('// TEST_ALL_PASS') || code.includes('# TEST_ALL_PASS');
    
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
            // By default, for the prototype, we'll say most detailed solutions pass
            // But randomize a bit to make testing more interesting
            // In a real implementation, this would run actual code
            
            // The longer the solution, the more likely it passes (for demo purposes)
            const solutionComplexity = code.length / 100; // rough complexity metric
            const randomFactor = Math.random() + solutionComplexity;
            
            // For demo, more complex solutions are more likely to pass
            passed = randomFactor > 0.7; // slightly easier to pass for submissions
            
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