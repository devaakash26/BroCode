'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Save, 
  ArrowLeft,
  Plus,
  X,
  ChevronDown,
  AlertCircle,
  Check,
  Code,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import the code editor to avoid SSR issues
const CodeEditor = dynamic(
  () => import('@/app/components/CodeEditor'),
  { ssr: false }
);

// Predefined list of categories
const CATEGORIES = [
  'Arrays',
  'Strings',
  'Hash Table',
  'Linked List',
  'Stack',
  'Queue',
  'Tree',
  'Graph',
  'Heap',
  'Dynamic Programming',
  'Greedy',
  'Backtracking',
  'Math',
  'Binary Search',
  'Sorting',
  'Two Pointers',
  'Sliding Window',
  'Recursion',
  'Bit Manipulation',
];

// Available programming languages
const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' }
];

// Default template code for each language
const DEFAULT_TEMPLATE_CODE = {
  javascript: 'function solution(input) {\n  // Your code here\n  \n  return result;\n}',
  python: 'def solution(input):\n    # Your code here\n    \n    return result',
  java: 'public class Solution {\n    public static String solution(String input) {\n        // Your code here\n        \n        return result;\n    }\n}',
  cpp: '#include <iostream>\n\nstd::string solution(std::string input) {\n    // Your code here\n    \n    return result;\n}'
};

export default function NewProblemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [activeLanguage, setActiveLanguage] = useState('javascript');
  const [formData, setFormData] = useState({
    title: '',
    difficulty: 'MEDIUM',
    description: '',
    exampleInput: '',
    exampleOutput: '',
    constraints: '',
    solution: '',
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    categories: [],
    templateCode: { ...DEFAULT_TEMPLATE_CODE },
    testCases: [
      { input: '', expectedOutput: '', explanation: '' }
    ],
  });
  
  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle code template change
  const handleCodeChange = (language, code) => {
    setFormData(prev => ({
      ...prev,
      templateCode: {
        ...prev.templateCode,
        [language]: code
      }
    }));
  };
  
  // Handle test case changes
  const handleTestCaseChange = (index, field, value) => {
    const updatedTestCases = [...formData.testCases];
    updatedTestCases[index] = {
      ...updatedTestCases[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      testCases: updatedTestCases
    }));
  };
  
  // Add new test case
  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      testCases: [
        ...prev.testCases,
        { input: '', expectedOutput: '', explanation: '' }
      ]
    }));
  };
  
  // Remove test case
  const removeTestCase = (index) => {
    if (formData.testCases.length <= 1) return;
    
    const updatedTestCases = formData.testCases.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      testCases: updatedTestCases
    }));
  };
  
  // Toggle category
  const toggleCategory = (category) => {
    setFormData(prev => {
      const categories = [...prev.categories];
      
      if (categories.includes(category)) {
        return {
          ...prev,
          categories: categories.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          categories: [...categories, category]
        };
      }
    });
  };
  
  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Problem title is required');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Problem description is required');
      return;
    }
    
    if (formData.categories.length === 0) {
      setError('At least one category is required');
      return;
    }
    
    if (formData.testCases.some(tc => !tc.input.trim() || !tc.expectedOutput.trim())) {
      setError('All test cases must have input and expected output');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Create a clean copy of the form data for submission
      const dataToSubmit = {
        ...formData,
        // Ensure templateCode is a valid JSON object
        templateCode: { ...formData.templateCode },
        // Clean up test cases
        testCases: formData.testCases.map(tc => ({
          input: tc.input.trim(),
          expectedOutput: tc.expectedOutput.trim(),
          explanation: tc.explanation?.trim() || '',
          isHidden: false
        }))
      };
      
      console.log("Submitting data:", JSON.stringify(dataToSubmit, null, 2));
      
      const response = await fetch('/api/admin/problems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Received non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        // Redirect to the problems list page after a short delay
        setTimeout(() => {
          router.push('/admin/problems');
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to create problem');
      }
    } catch (error) {
      console.error('Error creating problem:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin/problems"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Create New Problem</h1>
        </div>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || success}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-md"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Creating...</span>
            </>
          ) : success ? (
            <>
              <Check className="h-5 w-5" />
              <span>Created!</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Create Problem</span>
            </>
          )}
        </button>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error creating problem</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-start gap-3">
          <Check className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Problem created successfully</h3>
            <p className="mt-1 text-sm text-green-700 dark:text-green-400">Redirecting to problems list...</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Problem details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                    placeholder="e.g. Two Sum"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Difficulty *
                  </label>
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="timeComplexity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expected Time Complexity
                  </label>
                  <input
                    type="text"
                    id="timeComplexity"
                    name="timeComplexity"
                    value={formData.timeComplexity}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                    placeholder="e.g. O(n)"
                  />
                </div>
                
                <div>
                  <label htmlFor="spaceComplexity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Expected Space Complexity
                  </label>
                  <input
                    type="text"
                    id="spaceComplexity"
                    name="spaceComplexity"
                    value={formData.spaceComplexity}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                    placeholder="e.g. O(n)"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Tabs for problem content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'description'
                      ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Description</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('testCases')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'testCases'
                      ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Test Cases</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('solution')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'solution'
                      ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Solution</span>
                  </div>
                </button>
              </nav>
            </div>
            
            <div className="p-6">
              {activeTab === 'description' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Problem Description *
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={8}
                      className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                      placeholder="Describe the problem clearly..."
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Markdown is supported. Be clear and provide all necessary context.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="exampleInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Example Input
                      </label>
                      <textarea
                        id="exampleInput"
                        name="exampleInput"
                        value={formData.exampleInput}
                        onChange={handleChange}
                        rows={4}
                        className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                        placeholder="Example input..."
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="exampleOutput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Example Output
                      </label>
                      <textarea
                        id="exampleOutput"
                        name="exampleOutput"
                        value={formData.exampleOutput}
                        onChange={handleChange}
                        rows={4}
                        className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                        placeholder="Example output..."
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="constraints" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Constraints
                    </label>
                    <textarea
                      id="constraints"
                      name="constraints"
                      value={formData.constraints}
                      onChange={handleChange}
                      rows={4}
                      className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                      placeholder="e.g. 1 <= n <= 10^5"
                    />
                  </div>
                </div>
              )}
              
              {activeTab === 'testCases' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Test Cases</h3>
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Test Case</span>
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {formData.testCases.map((testCase, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 relative">
                        <div className="absolute top-2 right-2">
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            disabled={formData.testCases.length <= 1}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 disabled:hover:text-gray-400"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor={`testCase${index}Input`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Input *
                            </label>
                            <textarea
                              id={`testCase${index}Input`}
                              value={testCase.input}
                              onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                              rows={3}
                              className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                              placeholder="Test case input..."
                              required
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`testCase${index}Output`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Expected Output *
                            </label>
                            <textarea
                              id={`testCase${index}Output`}
                              value={testCase.expectedOutput}
                              onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                              rows={3}
                              className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                              placeholder="Expected output..."
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <label htmlFor={`testCase${index}Explanation`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Explanation
                          </label>
                          <textarea
                            id={`testCase${index}Explanation`}
                            value={testCase.explanation}
                            onChange={(e) => handleTestCaseChange(index, 'explanation', e.target.value)}
                            rows={2}
                            className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                            placeholder="Explanation for this test case..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {activeTab === 'solution' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="solution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Solution Explanation
                    </label>
                    <textarea
                      id="solution"
                      name="solution"
                      value={formData.solution}
                      onChange={handleChange}
                      rows={8}
                      className="block w-full border border-gray-300 dark:border-gray-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-900 dark:text-white"
                      placeholder="Explain the optimal solution approach..."
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Provide a clear explanation of the optimal approach. Include algorithm, time and space complexity analysis.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Template Code
                      </label>
                      
                      {/* Language tabs */}
                      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                        <nav className="flex -mb-px space-x-4">
                          {LANGUAGES.map(lang => (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => setActiveLanguage(lang.id)}
                              className={`py-2 px-3 text-sm font-medium ${
                                activeLanguage === lang.id
                                  ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                              }`}
                            >
                              {lang.name}
                            </button>
                          ))}
                        </nav>
                      </div>
                      
                      {/* Code editor for active language */}
                      <div className="h-64 border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                        <CodeEditor
                          value={formData.templateCode[activeLanguage]}
                          onChange={(code) => handleCodeChange(activeLanguage, code)} 
                          language={activeLanguage === 'cpp' ? 'cpp' : activeLanguage}
                          height="100%"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right column - Categories */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Categories</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Select at least one category that best describes this problem.
            </p>
            
            <div className="space-y-2">
              {CATEGORIES.map(category => (
                <div key={category} className="flex items-center">
                  <input
                    id={`category-${category}`}
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700"
                    checked={formData.categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <label 
                    htmlFor={`category-${category}`}
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
