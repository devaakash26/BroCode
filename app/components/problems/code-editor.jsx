'use client';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useState, useEffect, useRef } from 'react';
const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
import { Play, Save, CheckCircle, AlertCircle, Clock, RotateCcw, ChevronLeft, ChevronRight, Zap, Code, X, Trophy } from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  const [activeTab, setActiveTab] = useState('results'); // results or console
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
           event.target.closest('button').textContent.includes('Submit'));
        
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