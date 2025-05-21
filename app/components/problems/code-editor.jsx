'use client';

import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Play, Save, CheckCircle, AlertCircle, Clock, RotateCcw, ChevronLeft, ChevronRight, Zap, Code } from 'lucide-react';
import toast from 'react-hot-toast';

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
}) {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(initialCode || defaultLanguages[0].defaultCode);
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

  // Reset code when language changes
  useEffect(() => {
    if (!initialCode) {
      const selectedLang = defaultLanguages.find(lang => lang.id === language);
      setCode(selectedLang?.defaultCode || '');
    }
    // Identify locked ranges in the code when language changes
    identifyLockedRanges();
  }, [language, initialCode]);

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

      setResults(data);
      
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
      setResults(null); // Clear results on error
      setExecutionProgress(0);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
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

      setResults(data);
      
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
      setResults(null); // Clear results on error
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

  const resetCode = () => {
    const confirmed = window.confirm('Are you sure you want to reset your code?');
    if (confirmed) {
      const selectedLang = defaultLanguages.find(lang => lang.id === language);
      setCode(initialCode || selectedLang?.defaultCode || '');
      setResults(null);
      toast.success('Code reset');
    }
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
    if (!results) return null;
    
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

    return (
      <div className={`mb-6 p-4 rounded-lg ${
        passedTests === totalTests 
          ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
          : results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR'
            ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
            : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            {passedTests === totalTests ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            {results.status === 'COMPILE_ERROR' 
              ? 'Compile Error' 
              : results.status === 'QUALITY_ERROR' 
                ? 'Code Quality Error' 
                : 'Test Summary'}
          </h3>
          
          {results.status !== 'COMPILE_ERROR' && results.status !== 'QUALITY_ERROR' && (
            <div className="text-sm">
              <span className="font-medium">{passedTests}/{totalTests}</span> tests passed
            </div>
          )}
        </div>
        
        {(results.status === 'COMPILE_ERROR' || results.status === 'QUALITY_ERROR') ? (
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

  // Monaco editor options with support for locked regions
  const editorOptions = {
    readOnly: readOnly,
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: true,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    // Support for locked ranges
    readOnlyEditableRanges: lockedRanges
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex flex-wrap gap-4 p-4 bg-gray-100 dark:bg-gray-800">
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={handleLanguageChange}
            disabled={readOnly || isRunning || isSubmitting}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          >
            {defaultLanguages.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Theme
          </label>
          <select
            id="theme"
            value={theme}
            onChange={handleThemeChange}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="ml-auto flex items-end gap-2">
          {!readOnly && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-600 disabled:opacity-50"
                onClick={resetCode}
                disabled={isRunning || isSubmitting}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                onClick={runCode}
                disabled={isRunning || isSubmitting || readOnly}
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin mr-1">⏳</span>
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Code
                  </>
                )}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
                onClick={submitCode}
                disabled={isRunning || isSubmitting || readOnly}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-1">⏳</span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Submit
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress bar for execution - only shown when running or submitting */}
      {(isRunning || isSubmitting || executionProgress > 0) && (
        <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
          <div 
            className="h-1 bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${executionProgress}%` }}
          ></div>
        </div>
      )}

      <div className="flex-grow border dark:border-gray-700 relative">
        <Editor
          height="100%"
          language={getEditorLanguage()}
          value={code}
          theme={theme}
          onChange={handleEditorChange}
          options={editorOptions}
        />
        
        {/* Execution Status Overlay - shown when running */}
        {(isRunning || isSubmitting) && (
          <div className="absolute bottom-4 right-4 bg-gray-900/80 text-white p-3 rounded-lg shadow-lg z-20 min-w-[200px]">
            <div className="flex items-center mb-2">
              <div className="animate-pulse mr-2 bg-indigo-500 h-2 w-2 rounded-full"></div>
              <span className="font-medium">{isRunning ? 'Running Code' : 'Submitting Solution'}</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  compilationStatus === 'running' ? 'bg-yellow-400 animate-pulse' :
                  compilationStatus === 'completed' ? 'bg-green-500' :
                  compilationStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
                <span>Compiling code</span>
              </div>
              
              {testCaseStatus.map((status, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${
                    status === 'waiting' ? 'bg-gray-400' :
                    status === 'running' ? 'bg-yellow-400 animate-pulse' :
                    status === 'completed' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                  <span>Running test case {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Results Panel Toggle Button - Only show when results are available */}
        {results && (
          <button
            type="button"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={`absolute top-1/2 transform -translate-y-1/2 ${isPanelOpen ? 'right-[calc(min(600px,_60%))]' : 'right-0'} 
                       z-10 rounded-l-lg p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition-all duration-300`}
            aria-label={isPanelOpen ? 'Close results panel' : 'Open results panel'}
          >
            {isPanelOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
        
        {/* Results Panel - Sliding from the right, only when results are available */}
        {results && (
          <div 
            ref={resultsPanelRef}
            className={`absolute top-0 right-0 h-full w-[60%] max-w-[600px] min-w-[300px] bg-white dark:bg-gray-800 
                       border-l border-gray-200 dark:border-gray-700 shadow-xl z-[5] transform transition-transform duration-300 ease-in-out
                       ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
                <button
                  className={`flex-1 flex items-center justify-center px-4 py-3 ${
                    activeTab === 'results' 
                      ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  onClick={() => setActiveTab('results')}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Test Results
                </button>
                <button
                  className={`flex-1 flex items-center justify-center px-4 py-3 ${
                    activeTab === 'console' 
                      ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-medium' 
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  onClick={() => setActiveTab('console')}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Console Output
                </button>
              </div>
              
              <div className="overflow-y-auto p-4 flex-grow">
                {activeTab === 'results' && (
                  <>
                    {renderResultsSummary()}
                    
                    <div className="space-y-1">
                      {testCases.map((testCase, index) => (
                        <div key={index}>
                          {renderTestCaseResult(testCase, index)}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {activeTab === 'console' && (
                  <div className="h-full">
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap h-full">
                      {results.consoleOutput || 'No console output generated.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 