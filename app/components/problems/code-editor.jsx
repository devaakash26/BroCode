'use client';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useRef } from 'react';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { Play, Save, CheckCircle, AlertCircle, Clock, RotateCcw, ChevronLeft, ChevronRight, Zap, Code, X, Trophy, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

const defaultLanguages = [
  { id: 'cpp', name: 'C++', defaultCode: '// Write your C++ solution here\n\n' },
  { id: 'javascript', name: 'JavaScript', defaultCode: '// Write your JavaScript solution here\n\n' },
  { id: 'python', name: 'Python', defaultCode: '// Write your Python solution here\n\n' },
  { id: 'java', name: 'Java', defaultCode: '// Write your Java solution here\n\n' },
];

function complexityToFn(bigO) {
  const s = String(bigO || '').toLowerCase().replace(/[\s{}·]/g, '');
  if (!s) return null;
  if (s.includes('constant')) return () => 1;
  if (s.includes('n!') || s.includes('factorial')) {
    return (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  }
  if (s.includes('2^n') || s.includes('2ⁿ') || s.includes('exponential')) return (n) => Math.pow(2, n);
  if (s.includes('n^3') || s.includes('n³')) return (n) => n * n * n;
  if (s.includes('n^2') || s.includes('n²')) return (n) => n * n;
  if (s.includes('nlogn')) return (n) => n * Math.log2(Math.max(n, 2));
  if (s.includes('logn') || s.includes('log')) return (n) => Math.log2(Math.max(n, 2));
  if (s.includes('sqrt') || s.includes('√')) return (n) => Math.sqrt(n);
  if (s.includes('n')) return (n) => n;
  return () => 1; // O(1) or anything with no 'n'
}

const COMPLEXITY_NS = [1, 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40];
const clampCost = (v) => Math.min(Math.max(1, v), 1e15);

// Rotating status lines shown while the AI is "cooking" a result — no model
// names surface anywhere in the UI, just a sense of active work happening.
const AI_REVIEW_STEPS = [
  'Reading your solution…',
  'Checking correctness…',
  'Hunting for edge cases…',
  'Cooking up enhancements…',
  'Plating the final review…',
];
const COMPLEXITY_STEPS = [
  'Reading your code…',
  'Counting the loops…',
  'Working out the Big-O…',
  'Comparing to the optimal solution…',
];

// Build recharts data comparing the user's growth curve to the optimal one.
function buildComplexityChartData(userBigO, optimalBigO) {
  const userFn = complexityToFn(userBigO);
  const optFn = complexityToFn(optimalBigO);
  const data = COMPLEXITY_NS.map((n) => {
    const point = { n };
    if (userFn) point.you = clampCost(userFn(n));
    if (optFn) point.optimal = clampCost(optFn(n));
    return point;
  });
  return { data, hasUser: !!userFn, hasOptimal: !!optFn };
}

export default function CodeEditor({
  problemId,
  initialCode = '',
  onSubmit,
  testCases = [],
  readOnly = false,
  challengeId = null,
  isDisabled = false
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(initialCode || defaultLanguages.find(lang => lang.id === 'cpp')?.defaultCode || '');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [theme, setTheme] = useState('vs-dark');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('results'); // 'results' | 'console' | 'ai'
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complexity, setComplexity] = useState(null);
  const [isComputingComplexity, setIsComputingComplexity] = useState(false);
  const [aiLoadingStep, setAiLoadingStep] = useState(0);
  const [complexityLoadingStep, setComplexityLoadingStep] = useState(0);
  const resultsPanelRef = useRef(null);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [compilationStatus, setCompilationStatus] = useState(null);
  const [testCaseStatus, setTestCaseStatus] = useState([]);
  const [lockedRanges, setLockedRanges] = useState([]);
  const editorRef = useRef(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const isInitialMount = useRef(true);

  // When language changes, update the code to the new boilerplate.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const selectedLang = defaultLanguages.find(lang => lang.id === language);
    setCode(selectedLang?.defaultCode || '');
  }, [language]);

  // Re-identify locked ranges whenever the code changes.
  useEffect(() => {
    identifyLockedRanges();
  }, [code]);

  // Cycle the "cooking" status line while each AI call is in flight.
  useEffect(() => {
    if (!isAnalyzing) {
      setAiLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setAiLoadingStep((s) => (s + 1) % AI_REVIEW_STEPS.length);
    }, 1500);
    return () => clearInterval(id);
  }, [isAnalyzing]);

  useEffect(() => {
    if (!isComputingComplexity) {
      setComplexityLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setComplexityLoadingStep((s) => (s + 1) % COMPLEXITY_STEPS.length);
    }, 1500);
    return () => clearInterval(id);
  }, [isComputingComplexity]);

  // Auto-open panel when results are available (and close it when results are cleared)
  useEffect(() => {
    if (results) {
      setIsPanelOpen(true);
    } else {
      setIsPanelOpen(false);
    }
  }, [results]);

  // Reset execution progress when not running
  useEffect(() => {
    if (!isRunning && !isSubmitting) {
      setExecutionProgress(0);
      setCompilationStatus(null);
      setTestCaseStatus([]);
    }
  }, [isRunning, isSubmitting]);

  // Animation for execution progress
  useEffect(() => {
    let timer;
    if (isRunning || isSubmitting) {
      // Start with compilation
      setCompilationStatus('running');

      timer = setTimeout(() => {
        // Simulate compilation completing
        setCompilationStatus('completed');
        setExecutionProgress(25);

        // Initialize test case statuses to "waiting"
        const initialStatuses = testCases.map(() => 'waiting');
        setTestCaseStatus(initialStatuses);

        // Simulate test cases running one by one
        let currentCase = 0;
        const testCaseTimer = setInterval(() => {
          if (currentCase < testCases.length) {
            // Update current test case to "running"
            setTestCaseStatus(prev => {
              const updated = [...prev];
              updated[currentCase] = 'running';
              return updated;
            });

            // After a delay, mark it as "completed"
            setTimeout(() => {
              setTestCaseStatus(prev => {
                const updated = [...prev];
                updated[currentCase] = 'completed';
                return updated;
              });

              // Update progress based on completed test cases
              setExecutionProgress(25 + ((currentCase + 1) / testCases.length) * 75);

              // Move to next test case
              currentCase++;
            }, 500 + Math.random() * 1000); // Random time per test case
          } else {
            clearInterval(testCaseTimer);
          }
        }, 800); // Start a new test case every 800ms

        return () => {
          clearInterval(testCaseTimer);
        };
      }, 1000); // Compilation takes 1 second
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isRunning, isSubmitting, testCases.length]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (resultsPanelRef.current && !resultsPanelRef.current.contains(event.target) && isPanelOpen) {
        // Don't close if clicking on run or submit buttons
        const isActionButton = event.target.closest('button') &&
          (event.target.closest('button').textContent.includes('Run') ||
           event.target.closest('button').textContent.includes('Submit') ||
           event.target.closest('button').textContent.includes('Complexity'));

        if (!isActionButton) {
          setIsPanelOpen(false);
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPanelOpen]);

  // Function to identify locked ranges in code
  const identifyLockedRanges = () => {
    // Reset locked ranges
    const ranges = [];

    if (!code) return;

    // Find all locked regions marked with special comments
    const lines = code.split('\n');
    let startLine = -1;

    for (let i = 0; i < lines.length; i++) {
      // Look for markers that indicate locked code regions
      if (lines[i].includes('// BEGIN LOCKED') || lines[i].includes('/* BEGIN LOCKED */') ||
          lines[i].includes('# BEGIN LOCKED') || lines[i].includes('<!-- BEGIN LOCKED -->')) {
        startLine = i;
      }

      if ((lines[i].includes('// END LOCKED') || lines[i].includes('/* END LOCKED */') ||
           lines[i].includes('# END LOCKED') || lines[i].includes('<!-- END LOCKED -->')) &&
          startLine !== -1) {
        ranges.push({
          startLineNumber: startLine + 1,
          endLineNumber: i + 1,
          isReadOnly: true
        });
        startLine = -1;
      }
    }

    setLockedRanges(ranges);
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleThemeChange = (e) => {
    setTheme(e.target.value);
  };

  const runCode = async () => {
    if (!session) {
      toast.error("Please sign in to run your code.");
      router.push('/auth/signin');
      return;
    }
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    // Reset and start execution
    setIsRunning(true);
    setResults(null);
    setAiAnalysis(null);
    setActiveTab('results');
    setExecutionProgress(5); // Start progress at 5%

    try {
      // Simulate intelligent pre-validation (like LeetCode)
      const validationIssues = preValidateCode(code, language);
      if (validationIssues) {
        // Delay to simulate checking
        await new Promise(resolve => setTimeout(resolve, 800));
        setExecutionProgress(20);

        // Show compilation status as failed
        setCompilationStatus('failed');

        // Return early with validation error
        setResults({
          status: 'QUALITY_ERROR',
          statusMessage: validationIssues,
          compileError: validationIssues,
          consoleOutput: `Error: ${validationIssues}`,
          testResults: []
        });

        toast.error('Code quality issue: ' + validationIssues);
        setIsRunning(false);
        return;
      }

      // Continue with API call for execution
      setExecutionProgress(30); // Progress to 30% after validation

      const response = await fetch('/api/run-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          problemId,
          isSubmission: false,
        }),
      });

      setExecutionProgress(70); // Progress to 70% after API response

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to run code');
      }

      // Small delay to simulate processing the results
      await new Promise(resolve => setTimeout(resolve, 500));
      setExecutionProgress(100);

      setResults({...data, isSubmission: false});

      if (data.status === 'ACCEPTED') {
        toast.success('All test cases passed!');
      } else if (data.status === 'COMPILE_ERROR') {
        toast.error('Compilation error: ' + data.statusMessage);
      } else if (data.status === 'QUALITY_ERROR') {
        toast.error('Code quality error: ' + data.statusMessage);
      } else {
        toast.error('Some test cases failed');
      }
    } catch (error) {
      console.error('Error running code:', error);
      toast.error(error.message || 'Error running code');
      setResults({
        status: 'CLIENT_ERROR',
        statusMessage: error.message || 'An error occurred while running the code.',
        testResults: []
      });
      setExecutionProgress(0);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!session) {
      toast.error("Please sign in to submit your solution.");
      router.push('/auth/signin');
      return;
    }
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    // Reset and start execution
    setIsSubmitting(true);
    setResults(null);
    setAiAnalysis(null);
    setActiveTab('results');
    setExecutionProgress(5); // Start progress at 5%

    try {
      // Simulate intelligent pre-validation (like LeetCode)
      const validationIssues = preValidateCode(code, language);
      if (validationIssues) {
        // Delay to simulate checking
        await new Promise(resolve => setTimeout(resolve, 800));
        setExecutionProgress(20);

        // Show compilation status as failed
        setCompilationStatus('failed');

        // Return early with validation error
        setResults({
          status: 'QUALITY_ERROR',
          statusMessage: validationIssues,
          compileError: validationIssues,
          consoleOutput: `Error: ${validationIssues}`,
          testResults: []
        });

        toast.error('Code quality issue: ' + validationIssues);
        setIsSubmitting(false);
        return;
      }

      // Continue with API call for execution
      setExecutionProgress(30); // Progress to 30% after validation

      const response = await fetch('/api/submit-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          problemId,
          challengeId
        }),
      });

      setExecutionProgress(70); // Progress to 70% after API response

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit code');
      }

      // Small delay to simulate processing the results
      await new Promise(resolve => setTimeout(resolve, 500));
      setExecutionProgress(100);

      setResults({...data, isSubmission: true});

      // Auto-run the AI review on every submission (additive + non-blocking).
      // The Judge0 verdict above is already shown; this only enriches the
      // "AI Review" tab, and is cached server-side per unique code.
      runAiAnalysis(code, language);

      if (data.status === 'ACCEPTED') {
        toast.success('All test cases passed! Solution submitted successfully.');
      } else if (data.status === 'COMPILE_ERROR') {
        toast.error('Compilation error: ' + data.statusMessage);
      } else if (data.status === 'QUALITY_ERROR') {
        toast.error('Code quality error: ' + data.statusMessage);
      } else {
        toast.error(`Submission failed: ${data.statusMessage || 'Some test cases failed'}`);
      }

      // Call the onSubmit callback if provided
      if (onSubmit) {
        onSubmit(data);
      }
    } catch (error) {
      console.error('Error submitting code:', error);
      toast.error(error.message || 'Error submitting code');
      setResults({
        status: 'CLIENT_ERROR',
        statusMessage: error.message || 'An error occurred while submitting the code.',
        testResults: []
      });
      setExecutionProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch the AI review for a submission. Fire-and-forget from submitCode:
  // it manages its own loading state and never throws into the submit flow, so
  // a slow or unconfigured AI backend can't affect the Judge0 verdict.
  const runAiAnalysis = async (analyzeCode, analyzeLanguage) => {
    if (!session || !analyzeCode?.trim()) return;
    setAiAnalysis(null);
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: analyzeCode, language: analyzeLanguage, problemId }),
      });
      const data = await response.json();
      if (response.status === 429) {
        setAiAnalysis({ available: false, message: data.message || 'Too many AI requests — try again shortly.' });
        return;
      }
      setAiAnalysis(data);
    } catch (error) {
      console.error('AI analysis error:', error);
      setAiAnalysis({ available: false, message: 'Could not load AI analysis.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze the current code's time & space complexity on demand (button-driven).
  // Opens the Complexity tab and populates the growth graph. Independent of the
  // Judge0 run/submit flow.
  const computeComplexity = async () => {
    if (!session) {
      toast.error('Please sign in to analyze complexity.');
      router.push('/auth/signin');
      return;
    }
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }
    setComplexity(null);
    setIsComputingComplexity(true);
    setIsPanelOpen(true);
    setActiveTab('complexity');
    try {
      const response = await fetch('/api/ai/complexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, problemId }),
      });
      const data = await response.json();
      if (response.status === 429) {
        setComplexity({ available: false, message: data.message || 'Too many AI requests — try again shortly.' });
        return;
      }
      setComplexity(data);
    } catch (error) {
      console.error('Complexity error:', error);
      setComplexity({ available: false, message: 'Could not analyze complexity.' });
    } finally {
      setIsComputingComplexity(false);
    }
  };

  // Pre-validate code on client side before sending to server
  const preValidateCode = (code, language) => {
    // Check if code is too short
    if (code.trim().length < 50) {
      return 'Solution is too short to solve this problem effectively';
    }

    // Language-specific pre-validation
    switch (language) {
      case 'javascript':
        if (!code.includes('function') && !code.includes('=>')) {
          return 'JavaScript solution must define a function';
        }
        if (!code.includes('return')) {
          return 'JavaScript solution should return a value';
        }
        break;
      case 'python':
        if (!code.includes('def ')) {
          return 'Python solution must define a function';
        }
        if (!code.includes('return ')) {
          return 'Python solution should return a value';
        }
        break;
      case 'java':
        if (!code.includes('class')) {
          return 'Java solution must define a class';
        }
        if (!code.includes('public')) {
          return 'Java solution should have public methods';
        }
        break;
      case 'cpp':
        // Enhanced C++ validation
        if (code.includes('int main()') && !code.includes('for') && !code.includes('while') && !code.includes('if')) {
          return 'C++ solution must include algorithmic logic with control structures';
        }

        // Check for empty or incomplete main function
        if (code.includes('int main()') && code.split('\n').filter(line => line.trim().length > 0).length < 8) {
          const hasLogic = code.includes('for') || code.includes('while') ||
                          (code.match(/=/g) || []).length > 2 || // Multiple assignments
                          code.includes('push_back');

          if (!hasLogic) {
            return 'C++ solution appears incomplete. Include necessary algorithm implementation.';
          }
        }
        break;
    }

    return null; // No issues found
  };

  const handleResetConfirm = () => {
    const selectedLang = defaultLanguages.find(lang => lang.id === language);
    setCode(initialCode || selectedLang?.defaultCode || '');
    setResults(null);
    setAiAnalysis(null);
    setComplexity(null);
    toast.success('Code reset');
    setIsResetDialogOpen(false);
  };

  const getEditorLanguage = () => {
    // Map our language IDs to Monaco editor language IDs
    switch (language) {
      case 'javascript': return 'javascript';
      case 'python': return 'python';
      case 'java': return 'java';
      case 'cpp': return 'cpp';
      default: return 'javascript';
    }
  };

  const renderTestCaseResult = (testCase, index) => {
    if (!results || !testCase) return null;

    const testResult = results.testResults?.[index];

    // If it's a hidden test case and we're not submitting, don't show it
    const isHidden = testCase.isHidden;

    // Don't show hidden test cases during run mode (only during submit)
    if (isHidden && !isSubmitting && !results.isSubmission) {
      return null;
    }

    // If there's no result for this test case, don't render anything
    if (!testResult) return null;

    return (
      <div className={`mb-4 rounded-lg ${
        testResult.passed ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
      }`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {testResult.passed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <h4 className="font-medium">
              Test Case {index + 1} {isHidden && <span className="text-xs text-gray-500">(Hidden)</span>}
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{testResult.executionTime}ms</span>
            </div>
            {testResult.passed ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                Passed
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                Failed
              </span>
            )}
          </div>
        </div>

        <div className="p-4">
          {/* For hidden test cases, show limited information */}
          {isHidden ? (
            <div className="flex flex-col items-center justify-center p-4 text-gray-500 dark:text-gray-400">
              <p className="text-sm text-center">
                This is a hidden test case. {testResult.passed ? 'Your solution passed this test!' : 'Your solution failed on this test.'}
              </p>
              {!testResult.passed && testResult.error && (
                <div className="mt-4 w-full text-red-600 dark:text-red-400">
                  <p className="font-medium text-sm mb-1">Error:</p>
                  <pre className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {testResult.error}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <span>Input</span>
                </p>
                <pre className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                  {testCase.input}
                </pre>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <span>Expected Output</span>
                  </p>
                  <pre className="h-full p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {testCase.expectedOutput || testCase.output}
                  </pre>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    <span>Your Output</span>
                  </p>
                  <pre className={`h-full p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap ${
                    testResult.passed
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {testResult.output || '(No output)'}
                  </pre>
                </div>
              </div>

              {!testResult.passed && testResult.error && (
                <div className="text-red-600 dark:text-red-400">
                  <p className="font-medium text-sm mb-1">Error:</p>
                  <pre className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                    {testResult.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResultsSummary = () => {
    if (!results) return null;

    const totalTests = results.testResults ? results.testResults.length : 0;
    const passedTests = results.testResults ? results.testResults.filter(t => t.passed).length : 0;
    const isSuccess = passedTests === totalTests && totalTests > 0;

    return (
      <div className={`mb-6 p-4 rounded-lg ${
        isSuccess
          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
          : results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR' || results.status === 'CLIENT_ERROR'
            ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
            : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR' || results.status === 'CLIENT_ERROR' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            {results.status === 'COMPILE_ERROR'
              ? 'Compile Error'
              : results.status === 'QUALITY_ERROR'
                ? 'Code Quality Error'
                : results.status === 'CLIENT_ERROR'
                  ? 'Error'
                  : 'Test Summary'}
          </h3>

          {results.status !== 'COMPILE_ERROR' && results.status !== 'QUALITY_ERROR' && results.status !== 'CLIENT_ERROR' && (
            <div className="text-sm">
              <span className="font-medium">{passedTests}/{totalTests}</span> tests passed
            </div>
          )}
        </div>

        {(results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR' || results.status === 'CLIENT_ERROR') ? (
          <div className="mt-2 text-red-600 dark:text-red-400">
            <pre className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm overflow-x-auto whitespace-pre-wrap">
              {results.compileError || results.statusMessage}
            </pre>
            {results.status === 'QUALITY_ERROR' && (
              <div className="mt-3 text-sm">
                <p className="font-medium">Tips to improve your solution:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Make sure your solution is complete and implements the required functionality</li>
                  <li>Include proper function definitions with parameters</li>
                  <li>Add necessary logic (loops, conditionals, etc.) for the problem</li>
                  <li>Include return statements where needed</li>
                  <li>Make sure your code follows the expected structure for the language</li>
                </ul>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${passedTests === totalTests ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${totalTests > 0 ? (passedTests / totalTests) * 100 : 0}%` }}
              ></div>
            </div>

            {results.executionTime && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Total execution time: {results.executionTime}ms</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Shared "AI is cooking" loading state for both the AI Review and
  // Complexity tabs — a rotating status line + pulsing glow, no model names.
  const renderCookingState = (steps, step) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/25 border-t-primary animate-spin"></div>
        <Sparkles className="w-6 h-6 text-primary relative z-10" />
      </div>
      <p key={step} className="text-sm font-medium animate-fade-in">{steps[step]}</p>
      <div className="flex gap-1.5 mt-3">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce"></span>
      </div>
    </div>
  );

  const renderComplexity = () => {
    if (isComputingComplexity) {
      return renderCookingState(COMPLEXITY_STEPS, complexityLoadingStep);
    }
    if (!complexity) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <Clock className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">Click “Complexity” to analyze your solution’s Big-O.</p>
          <p className="text-xs mt-1">Time &amp; space complexity, plus a growth graph vs. optimal.</p>
        </div>
      );
    }
    if (complexity.available === false) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">{complexity.message || 'Complexity analysis is unavailable right now.'}</p>
        </div>
      );
    }
    const c = complexity.complexity;
    if (!c) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">Could not determine complexity for this code.</p>
          {complexity.error && <p className="text-xs mt-1">{complexity.error}</p>}
        </div>
      );
    }

    const userTime = c.time?.bigO;
    const optimalTime = c.optimal?.time || complexity.reference?.time || '';
    const { data, hasUser, hasOptimal } = buildComplexityChartData(userTime, optimalTime);

    const verdictStyle = {
      optimal: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'near-optimal': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      suboptimal: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary/80">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-generated analysis</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Time Complexity</p>
            <p className="text-2xl font-mono font-bold">{userTime || '—'}</p>
            {c.time?.explanation && <p className="text-xs text-muted-foreground mt-1">{c.time.explanation}</p>}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Space Complexity</p>
            <p className="text-2xl font-mono font-bold">{c.space?.bigO || '—'}</p>
            {c.space?.explanation && <p className="text-xs text-muted-foreground mt-1">{c.space.explanation}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {c.verdict && (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${verdictStyle[c.verdict] || ''}`}>
              {c.verdict}
            </span>
          )}
          {optimalTime && (
            <span className="text-muted-foreground">Optimal: <span className="font-mono text-foreground">{optimalTime}</span></span>
          )}
        </div>
        {c.dominantOperation && (
          <p className="text-sm"><span className="font-medium">Dominant cost:</span> <span className="text-muted-foreground">{c.dominantOperation}</span></p>
        )}
        {c.optimal?.note && <p className="text-sm text-muted-foreground">{c.optimal.note}</p>}

        {data.length > 0 && (hasUser || hasOptimal) && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Relative growth vs input size — log scale, illustrative (not exact operation counts).</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="n"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    label={{ value: 'input size (n)', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis
                    scale="log"
                    domain={[1, 'dataMax']}
                    allowDataOverflow
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => (v >= 1000 ? Number(v).toExponential(0) : v)}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(24,24,27,0.92)', color: '#fff' }}
                    formatter={(v, name) => [Number(v).toLocaleString(), name === 'you' ? 'Your solution' : 'Optimal']}
                    labelFormatter={(l) => `n = ${l}`}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => (value === 'you' ? `Your solution${userTime ? ` (${userTime})` : ''}` : `Optimal${optimalTime ? ` (${optimalTime})` : ''}`)}
                  />
                  {hasUser && <Line type="monotone" dataKey="you" stroke="#3b82f6" strokeWidth={2} dot={false} />}
                  {hasOptimal && <Line type="monotone" dataKey="optimal" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 4" dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {complexity.cached && (
          <div className="pt-2 border-t text-xs text-muted-foreground italic">cached result</div>
        )}
      </div>
    );
  };

  const renderAiAnalysis = () => {
    if (isAnalyzing) {
      return renderCookingState(AI_REVIEW_STEPS, aiLoadingStep);
    }

    if (!aiAnalysis) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <Zap className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">Submit your solution to get an AI review.</p>
          <p className="text-xs mt-1">Approach breakdown, enhancements, and edge-case tests.</p>
        </div>
      );
    }

    if (aiAnalysis.available === false) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm">{aiAnalysis.message || 'AI analysis is unavailable right now.'}</p>
        </div>
      );
    }

    const { groq, gemini, cached, errors } = aiAnalysis;

    const riskColor = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    const severityColor = { info: 'text-blue-500', warning: 'text-yellow-500', error: 'text-red-500' };
    const impactColor = {
      correctness: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      performance: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      memory: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      readability: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      style: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    const categoryColor = {
      typical: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      edge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      boundary: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      large: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      adversarial: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-primary/80">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI-generated review</span>
        </div>
        {gemini?.verdict && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">AI Verdict</h3>
            </div>
            <p className="text-sm text-muted-foreground">{gemini.verdict}</p>
          </div>
        )}

        {groq && (
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Code className="w-4 h-4" /> Quick Analysis
              {groq.correctnessRisk && (
                <span className={`ml-auto px-2 py-0.5 text-xs font-medium rounded-full ${riskColor[groq.correctnessRisk] || ''}`}>
                  {groq.correctnessRisk} risk
                </span>
              )}
            </h3>
            {groq.approachSummary && <p className="text-sm mb-2">{groq.approachSummary}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-3">
              {groq.detectedAlgorithm && <span>Algorithm: <span className="font-medium text-foreground">{groq.detectedAlgorithm}</span></span>}
              {groq.candidateTimeComplexity && <span>Time: <span className="font-mono font-medium text-foreground">{groq.candidateTimeComplexity}</span></span>}
              {groq.candidateSpaceComplexity && <span>Space: <span className="font-mono font-medium text-foreground">{groq.candidateSpaceComplexity}</span></span>}
            </div>
            {groq.issues?.length > 0 && (
              <ul className="space-y-1.5">
                {groq.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${severityColor[issue.severity] || ''}`} />
                    <span><span className="font-medium">{issue.title}.</span> <span className="text-muted-foreground">{issue.detail}</span></span>
                  </li>
                ))}
              </ul>
            )}
            {groq.edgeCasesToWatch?.length > 0 && (
              <div className="mt-3 text-xs">
                <span className="font-medium">Edge cases to watch: </span>
                <span className="text-muted-foreground">{groq.edgeCasesToWatch.join(' · ')}</span>
              </div>
            )}
          </div>
        )}

        {gemini?.enhancements?.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2">Suggested Enhancements</h3>
            <div className="space-y-2">
              {gemini.enhancements.map((e, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${impactColor[e.impact] || ''}`}>{e.impact}</span>
                    <h4 className="font-medium text-sm">{e.title}</h4>
                  </div>
                  {e.why && <p className="text-xs text-muted-foreground mb-1">{e.why}</p>}
                  {e.suggestion && <p className="text-sm">{e.suggestion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {gemini?.optimalApproach && (gemini.optimalApproach.summary || gemini.optimalApproach.timeComplexity) && (
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold text-sm mb-2">Optimal Approach</h3>
            {gemini.optimalApproach.summary && <p className="text-sm mb-2">{gemini.optimalApproach.summary}</p>}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {gemini.optimalApproach.timeComplexity && <span>Time: <span className="font-mono font-medium text-foreground">{gemini.optimalApproach.timeComplexity}</span></span>}
              {gemini.optimalApproach.spaceComplexity && <span>Space: <span className="font-mono font-medium text-foreground">{gemini.optimalApproach.spaceComplexity}</span></span>}
            </div>
          </div>
        )}

        {gemini?.suggestedTestCases?.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-1">AI-Suggested Test Cases</h3>
            <p className="text-xs text-muted-foreground mb-2">Unverified suggestions — automatic verification against the reference solution is coming next.</p>
            <div className="space-y-2">
              {gemini.suggestedTestCases.map((tc, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${categoryColor[tc.category] || ''}`}>{tc.category}</span>
                    {tc.rationale && <span className="text-xs text-muted-foreground">{tc.rationale}</span>}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-medium mb-1">Input</p>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto whitespace-pre-wrap">{tc.input}</pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">Expected Output</p>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto whitespace-pre-wrap">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(cached || errors?.groq || errors?.gemini) && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            {cached && <span className="italic">cached result</span>}
            {(errors?.groq || errors?.gemini) && (
              <span className="text-amber-600 dark:text-amber-400">
                Part of the analysis was unavailable — try resubmitting
              </span>
            )}
          </div>
        )}

        {!groq && !gemini && (
          <div className="text-sm text-muted-foreground text-center py-6">No analysis could be generated for this submission.</div>
        )}
      </div>
    );
  };

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Only apply restrictions in challenge mode
    if (challengeId) {
      // Prevent copy/paste/cut only in challenge mode
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        if (challengeId) {
          toast.error('Copy is disabled in challenge mode');
        } else {
          // Allow copy in non-challenge mode
          document.execCommand('copy');
        }
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        if (challengeId) {
          toast.error('Paste is disabled in challenge mode');
        } else {
          // Allow paste in non-challenge mode
          document.execCommand('paste');
        }
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        if (challengeId) {
          toast.error('Cut is disabled in challenge mode');
        } else {
          // Allow cut in non-challenge mode
          document.execCommand('cut');
        }
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-background border rounded-md px-2 py-1"
            disabled={isDisabled}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Reset code"
                disabled={isDisabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Code</DialogTitle>
                <DialogDescription>
                  Are you sure you want to reset your code? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleResetConfirm}>Reset</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={runCode}
            variant="outline"
            size="sm"
            disabled={isSubmitting || isDisabled}
          >
            {isRunning ? (
              <div className="flex items-center">
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Running...
              </div>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                Run Code
              </>
            )}
          </Button>
          <Button
            onClick={submitCode}
            size="sm"
            disabled={isSubmitting || isDisabled}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Submitting...
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Submit
              </>
            )}
          </Button>
          <Button
            onClick={computeComplexity}
            variant="outline"
            size="sm"
            disabled={isRunning || isSubmitting || isComputingComplexity || isDisabled}
            title="Analyze time & space complexity"
          >
            {isComputingComplexity ? (
              <div className="flex items-center">
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Analyzing...
              </div>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-1" />
                Complexity
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={getEditorLanguage()}
          value={code}
          theme={theme}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            readOnly: isDisabled,
            renderWhitespace: 'selection',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            wrappingStrategy: 'advanced',
            padding: { top: 10, bottom: 10 },
          }}
          onMount={handleEditorDidMount}
          onChange={handleEditorChange}
        />
      </div>

      {/* Results Panel */}
      <div
        ref={resultsPanelRef}
        className={`absolute bottom-0 left-0 right-0 bg-background border-t transform transition-transform duration-300 ease-in-out ${
          isPanelOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '50vh', zIndex: 40 }}
      >
        <button
          onClick={() => setIsPanelOpen(false)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 z-50"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'results' ? 'border-b-2 border-b-primary' : ''
            }`}
            onClick={() => setActiveTab('results')}
          >
            Results
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'console' ? 'border-b-2 border-b-primary' : ''
            }`}
            onClick={() => setActiveTab('console')}
          >
            Console
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${
              activeTab === 'ai' ? 'border-b-2 border-b-primary' : ''
            }`}
            onClick={() => setActiveTab('ai')}
          >
            <Zap className="w-3.5 h-3.5" />
            AI Review
            {isAnalyzing && <span className="loading loading-spinner loading-sm"></span>}
            {!isAnalyzing && aiAnalysis?.available && activeTab !== 'ai' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            )}
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 ${
              activeTab === 'complexity' ? 'border-b-2 border-b-primary' : ''
            }`}
            onClick={() => setActiveTab('complexity')}
          >
            <Clock className="w-3.5 h-3.5" />
            Complexity
            {isComputingComplexity && <span className="loading loading-spinner loading-sm"></span>}
          </button>
        </div>
        <div className="p-4 overflow-y-auto" style={{maxHeight: 'calc(50vh - 41px)'}}>
          {activeTab === 'results' && (
            <div>
              {renderResultsSummary()}
              <div className="space-y-4">
                {results?.testResults?.map((result, index) => {
                  const currentTestCases = results.isSubmission
                    ? testCases
                    : testCases.filter(tc => tc.isExample);
                  return renderTestCaseResult(currentTestCases[index], index);
                })}
              </div>
            </div>
          )}
          {activeTab === 'console' && (
            <div>
              <h3 className="font-semibold mb-2">Console Output</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 rounded p-4 text-sm whitespace-pre-wrap">
                {results?.consoleOutput || 'No console output for this run.'}
              </pre>
            </div>
          )}
          {activeTab === 'ai' && <div>{renderAiAnalysis()}</div>}
          {activeTab === 'complexity' && <div>{renderComplexity()}</div>}
        </div>
      </div>

      {isDisabled && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
            <h3 className="text-xl font-semibold mb-2">Challenge Ended</h3>
            <p className="text-muted-foreground">
              The challenge has ended. Check the leaderboard for final results!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}