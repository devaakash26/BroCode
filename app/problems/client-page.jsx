'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Filter, ChevronLeft } from 'lucide-react';

export default function ClientProblemsPage({ initialProblems, stats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract stats
  const { total, solved, easy, medium, hard, tags } = stats;
  
  // Memoize uniqueProblems to prevent re-creation on every render
  const uniqueProblems = useMemo(() => 
    Array.from(new Map(initialProblems.map(problem => [problem.id, problem])).values()),
    [initialProblems]
  );
  
  // State for problems and filters
  const [problems, setProblems] = useState(uniqueProblems);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [selectedTags, setSelectedTags] = useState(searchParams.get('tags')?.split(',') || []);
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'recent');
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'desc');
  
  // Filter problems
  useEffect(() => {
    setLoading(true);
    
    let filtered = [...uniqueProblems];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply difficulty filter
    if (difficulty) {
      filtered = filtered.filter(p => p.difficulty === difficulty.toUpperCase());
    }
    
    // Apply status filter
    if (status === 'solved') {
      filtered = filtered.filter(p => p.solved);
    } else if (status === 'todo') {
      filtered = filtered.filter(p => !p.solved);
    }
    
    // Apply tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => 
        selectedTags.every(tag => p.tags.includes(tag))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'difficulty':
          const difficultyOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
          comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
          break;
        case 'acceptance':
          comparison = a.acceptance - b.acceptance;
          break;
        case 'submissions':
          comparison = a.submissionCount - b.submissionCount;
          break;
        default: // Recent by default
          // Assuming ID correlates with recency, higher ID = more recent
          comparison = b.id.localeCompare(a.id);
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
    
    setProblems(filtered);
    setLoading(false);
  }, [searchTerm, difficulty, status, selectedTags, sortBy, sortOrder, uniqueProblems]);
  
  // Update URL with filters
  const updateUrlParams = () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.set('search', searchTerm);
    if (difficulty) params.set('difficulty', difficulty);
    if (status) params.set('status', status);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    if (sortBy !== 'recent') params.set('sortBy', sortBy);
    if (sortOrder !== 'desc') params.set('order', sortOrder);
    
    router.push(`/problems?${params.toString()}`, { scroll: false });
  };
  
  // Handle filter change
  const applyFilters = () => {
    updateUrlParams();
  };
  
  // Handle sort
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setDifficulty('');
    setStatus('');
    setSelectedTags([]);
    setSortBy('recent');
    setSortOrder('desc');
    router.push('/problems', { scroll: false });
  };
  
  return (
    <div className="w-full px-0 py-6 space-y-6">
      {/* Progress header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <h1 className="text-xl font-bold text-white">Problem Set</h1>
            <div className="mt-3 sm:mt-0 flex items-center gap-2">
              <div className="text-sm font-medium text-white">Your progress:</div>
              <div className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white">
                {solved} / {total} problems solved
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x divide-gray-200 dark:divide-gray-700">
          <div className="px-4 text-center">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</div>
            <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-indigo-600 rounded-full" 
                style={{ width: `${(solved / total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="px-4 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{easy.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Easy</div>
            <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-green-600 rounded-full" 
                style={{ width: `${(easy.solved / easy.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="px-4 text-center">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{medium.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Medium</div>
            <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-yellow-600 rounded-full" 
                style={{ width: `${(medium.solved / medium.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="px-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{hard.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Hard</div>
            <div className="mt-1 h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-1.5 bg-red-600 rounded-full" 
                style={{ width: `${(hard.solved / hard.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and filter tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Search questions by title, tag, or ID"
                />
              </div>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <select 
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
              
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="solved">Solved</option>
                <option value="todo">To Do</option>
              </select>

              <button
                onClick={applyFilters}
                className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md"
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              
              {(searchTerm || difficulty || status || selectedTags.length > 0) && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          
          {/* Tags section */}
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.slice(0, 10).map(tag => (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag) 
                      : [...prev, tag]
                  );
                }}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tag}
                {selectedTags.includes(tag) && (
                  <span className="ml-1">×</span>
                )}
              </button>
            ))}
            {tags.length > 10 && (
              <button className="px-2.5 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                +{tags.length - 10} more
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Problems table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="pl-6 pr-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                  Status
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center">
                    <span>Title</span>
                    {sortBy === 'title' ? (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('difficulty')}
                >
                  <div className="flex items-center">
                    <span>Difficulty</span>
                    {sortBy === 'difficulty' ? (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('acceptance')}
                >
                  <div className="flex items-center">
                    <span>Acceptance</span>
                    {sortBy === 'acceptance' ? (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('submissions')}
                >
                  <div className="flex items-center">
                    <span>Submissions</span>
                    {sortBy === 'submissions' ? (
                      sortOrder === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan="4" className="text-center py-4">Loading...</td></tr>
              ) : problems.length > 0 ? (
                problems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {problem.solved ? <span className="text-green-500 font-bold">✔</span> : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/problems/${problem.id}`} className="text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                        {problem.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        problem.difficulty === 'EASY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                          problem.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
                      >
                        {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <span className={`text-sm ${
                          problem.acceptance > 75 ? 'text-green-600 dark:text-green-400' : 
                          problem.acceptance > 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {problem.acceptance}%
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              problem.acceptance > 75 ? 'bg-green-600' : 
                              problem.acceptance > 50 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${problem.acceptance}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {problem.submissionCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 2).map((tag) => (
                          <span 
                            key={tag} 
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No problems found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {problems.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm sm:px-6">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(problems.length, 10)}</span> of{' '}
                <span className="font-medium">{problems.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:ring-gray-700 dark:hover:bg-gray-700 dark:text-gray-500">
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button className="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  1
                </button>
                <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:ring-gray-700 dark:hover:bg-gray-700 dark:text-gray-500">
                  <span className="sr-only">Next</span>
                  <ChevronDown className="h-5 w-5 rotate-270" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
