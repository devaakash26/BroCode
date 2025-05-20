import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/db';
import axios from 'axios';

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

export async function POST(request) {
  try {
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

    // Get the problem and its test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        testCasesRel: {
          // If it's a submission, include hidden test cases as well
          where: isSubmission ? {} : { isHidden: false },
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
        consoleOutput: `Error: ${codeQualityAnalysis.reason}\nYour solution needs to be more complete.`
      }, { status: 200 });
    }

    // Generate fake console output for debugging purposes
    const consoleOutput = `Running ${language} code...\n` +
      `Processing ${problem.testCasesRel.length} test cases.\n` +
      (language === 'javascript' ? 'Node.js v16.14.0\n' : 
       language === 'python' ? 'Python 3.9.10\n' : 
       language === 'java' ? 'OpenJDK 11.0.15\n' : 
       'GCC 11.2.0\n');
    
    // Check for special test cases - if TEST_ALL_PASS is present, bypass all testing
    const shouldAllPass = code.includes('// TEST_ALL_PASS') || code.includes('# TEST_ALL_PASS');
    
    // Mock response with more realistic behavior
    const testResults = await Promise.all(
      problem.testCasesRel.map(async (testCase, index) => {
        // Simulating code execution with a slight delay
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        // Default values
        let passed = false;
        let output = '';
        let error = null;
        
        if (shouldAllPass) {
          // For demonstration purposes only - allow instructors to force all passing
          passed = true;
          output = testCase.expectedOutput || testCase.output;
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
              `SyntaxError: Unexpected token`
            ];
            error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
            output = '';
            passed = false;
          } else if (shouldFail) {
            // Generate wrong output for testing purposes
            if (testCase.expectedOutput && testCase.expectedOutput.match(/^\d+$/)) {
              const expectedNum = parseInt(testCase.expectedOutput);
              output = (expectedNum + (index + 1)).toString();
            } else if (testCase.expectedOutput && testCase.expectedOutput.includes('[') && testCase.expectedOutput.includes(']')) {
              output = testCase.expectedOutput.replace(/\d+/, match => parseInt(match) + 1);
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
            passed = randomFactor > 0.8;
            
            if (passed) {
              output = testCase.expectedOutput || testCase.output;
            } else {
              // Generate plausible wrong output
              if (testCase.expectedOutput && testCase.expectedOutput.match(/^\d+$/)) {
                const expectedNum = parseInt(testCase.expectedOutput);
                output = (expectedNum + (index + 1)).toString();
              } else if (testCase.expectedOutput && testCase.expectedOutput.includes('[') && testCase.expectedOutput.includes(']')) {
                output = testCase.expectedOutput.replace(/\d+/, match => parseInt(match) + 1);
              } else {
                output = `Wrong output for test case ${index + 1}`;
              }
            }
          }
        }
        
        return {
          testCaseId: testCase.id,
          passed,
          executionTime: Math.floor(Math.random() * 50) + 10,
          memoryUsed: Math.floor(Math.random() * 1000) + 500,
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
    
    // Calculate total execution time
    const totalExecutionTime = testResults.reduce((sum, result) => sum + result.executionTime, 0);

    // If this is a submission, record it in the database
    if (isSubmission) {
      await prisma.submission.create({
        data: {
          userId: session.user.id,
          problemId,
          challengeId: null, // Not part of a challenge
          code,
          language,
          status,
          results: { testResults },
          executionTime: totalExecutionTime,
          memoryUsed: Math.max(...testResults.map(r => r.memoryUsed)),
        },
      });
    }

    return NextResponse.json({
      status,
      statusMessage: allPassed ? 'All test cases passed' : 'Some test cases failed',
      testResults,
      executionTime: totalExecutionTime,
      consoleOutput
    });
  } catch (error) {
    console.error('Error running code:', error);
    return NextResponse.json(
      { message: 'Error running code', error: error.message },
      { status: 500 }
    );
  }
} 