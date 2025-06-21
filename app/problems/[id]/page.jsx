import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import CodeEditor from '@/app/components/problems/code-editor';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Info, Zap } from 'lucide-react';
import BookmarkButton from '@/app/components/problems/BookmarkButton';

export async function generateMetadata({ params }) {
  const problem = await prisma.problem.findUnique({
    where: { id: params.id },
    select: { title: true },
  });

  if (!problem) {
    return {
      title: 'Problem Not Found',
    };
  }

  return {
    title: `${problem.title} - BroCode`,
    description: `Solve the ${problem.title} problem on BroCode`,
  };
}

async function getProblem(id, userId) {
  const problem = await prisma.problem.findUnique({
    where: { 
      id,
      isPublic: true,
    },
    include: {
      testCasesRel: {
        where: { isExample: true },
        select: {
          id: true,
          input: true,
          expectedOutput: true,
          explanation: true,
          isExample: true
        },
      },
      submissions: {
        where: { userId },
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          code: true,
          language: true,
          status: true,
          submittedAt: true,
        },
      },
      bookmarks: {
        where: {
          userId: userId || '',
        },
      },
    },
  });

  if (!problem) {
    return null;
  }

  // Get the previous submission if available
  const lastSubmission = problem.submissions[0] || null;
  const isBookmarked = problem.bookmarks.length > 0;

  return {
    ...problem,
    testCases: problem.testCasesRel, // Map testCasesRel to testCases for compatibility
    lastSubmission,
    isBookmarked,
  };
}

export default async function ProblemDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  
  const problem = await getProblem(params.id, userId);

  if (!problem) {
    notFound();
  }

  const initialCode = problem.lastSubmission?.code || '';
  const initialLanguage = problem.lastSubmission?.language || 'cpp';

  return (
    <div className="container py-10">
      <div className="flex items-center mb-8">
        <Link 
          href="/problems" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Problems
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{problem.title}</h1>
                  {session && <BookmarkButton problemId={problem.id} initialBookmarked={problem.isBookmarked} />}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span 
                    className={`px-2 py-1 text-xs font-semibold rounded-full 
                      ${problem.difficulty === 'EASY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                        problem.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                  >
                    {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {problem.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 prose prose-indigo dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: problem.description }} />
            </div>

            {/* Complexity Info */}
            <div className="mt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="p-3 flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-sm font-semibold mb-1 text-blue-700 dark:text-blue-300">Expected Time Complexity</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{problem.timeComplexity}</p>
                </div>
                <div className="p-3 flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                  <p className="text-sm font-semibold mb-1 text-purple-700 dark:text-purple-300">Expected Space Complexity</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">{problem.spaceComplexity}</p>
                </div>
              </div>
            </div>

            {problem.testCases.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Example Test Cases</h3>
                <div className="space-y-4">
                  {problem.testCases.map((testCase, index) => (
                    <div key={testCase.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Example {index + 1}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Input:</p>
                          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Output:</p>
                          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm overflow-x-auto">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                      </div>
                      {testCase.explanation && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{testCase.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Submission Info */}
            {problem.lastSubmission && (
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-700 dark:text-blue-300">Previous Submission</h3>
                    <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
                      You previously submitted a solution on {new Date(problem.lastSubmission.submittedAt).toLocaleString()}.
                      Status: <span className={`font-medium ${
                        problem.lastSubmission.status === 'ACCEPTED' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {problem.lastSubmission.status.replace(/_/g, ' ')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Code Editor */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-[calc(100vh-14rem)]">
          <CodeEditor 
            problemId={problem.id}
            initialCode={initialCode || (problem.templateCode && problem.templateCode[initialLanguage])}
            initialLanguage={initialLanguage}
            testCases={problem.testCases}
          />
        </div>
      </div>
    </div>
  );
} 