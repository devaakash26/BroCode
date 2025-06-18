'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Filter, X, CheckCircle, Tag, BarChart, Trophy, Bookmark, ChevronLeft } from 'lucide-react';

export default function ClientProblemsPage({ initialProblems, stats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract stats
  const { total, solved, easy, medium, hard, tags } = stats;
  
  // Remove duplicates from initialProblems based on id
  const uniqueProblems = Array.from(new Map(initialProblems.map(problem => [problem.id, problem])).values());
  
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
    
    let filtered = Array.from(new Map(initialProblems.map(problem => [problem.id, problem])).values());
    
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
    } else if (status === 'bookmarked') {
      filtered = filtered.filter(p => p.bookmarked);
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
  }, [searchTerm, difficulty, status, selectedTags, sortBy, sortOrder, initialProblems]);
  
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
  
  const handleBookmarkToggle = async (problemId) => {
    // Optimistic UI update
    const originalProblems = problems;
    setProblems(prevProblems =>
      prevProblems.map(p =>
        p.id === problemId ? { ...p, bookmarked: !p.bookmarked } : p
      )
    );

    try {
      const response = await fetch(`/api/problems/${problemId}/bookmark`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update bookmark');
      }
    } catch (error) {
      console.error(error);
      // Revert on failure
      setProblems(originalProblems);
      alert('Could not update bookmark. Please try again.');
    }
  };
  
  const difficultyConfig = {
    EASY: { color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/50' },
    MEDIUM: { color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/50' },
    HARD: { color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/50' },
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* New Header */}
      <header className="bg-white dark:bg-gray-800/50 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Problem Set</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Hone your skills with our curated collection of problems.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
            <Trophy className="w-4 h-4" />
            <span>{solved} / {total} Problems Solved</span>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {['EASY', 'MEDIUM', 'HARD'].map(level => (
            <div key={level}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-semibold ${difficultyConfig[level].color}`}>{level}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{stats[level.toLowerCase()].solved} / {stats[level.toLowerCase()].total}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${difficultyConfig[level].bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-100', '-500 to-' + difficultyConfig[level].color.replace('text-','').replace('-600', '-400'))}`}
                  style={{ width: `${(stats[level.toLowerCase()].solved / stats[level.toLowerCase()].total) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </header>
      
      {/* Filter and Search Section */}
      <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                placeholder="Search by title or tag..."
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
             {['All', 'EASY', 'MEDIUM', 'HARD'].map(d => (
              <button key={d} onClick={() => setDifficulty(d === 'All' ? '' : d)} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${difficulty === d || (difficulty === '' && d === 'All') ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
           <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
            {['All', 'solved', 'todo', 'bookmarked'].map(s => (
              <button key={s} onClick={() => setStatus(s === 'All' ? '' : s)} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors capitalize ${status === s || (status === '' && s === 'All') ? 'bg-indigo-600 text-white shadow' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {s === 'todo' ? 'To Do' : s}
              </button>
            ))}
          </div>
        </div>
        {/* Active Filters */}
        {(searchTerm || difficulty || status || selectedTags.length > 0) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active:</span>
            {selectedTags.map(tag => (
              <div key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 rounded-full text-sm">
                <span>{tag}</span>
                <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3"/></button>
              </div>
            ))}
            <button onClick={resetFilters} className="text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 font-medium">Clear All</button>
          </div>
        )}
      </div>

      {/* Problems List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading problems...</div>
        ) : problems.length > 0 ? (
          problems.map((problem) => (
            <div key={problem.id} className="block group relative">
              <Link href={`/problems/${problem.id}`}>
                <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 p-4 transition-all duration-300 hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/50 hover:scale-[1.01]">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1 flex justify-center">
                      {problem.solved ? 
                        <CheckCircle className="w-5 h-5 text-green-500" /> :
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-indigo-400 transition-colors"></div>
                      }
                    </div>
                    <div className="col-span-11 md:col-span-5">
                      <p className="font-semibold text-gray-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{problem.title}</p>
                    </div>
                    <div className="hidden md:col-span-3 md:flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500"/>
                      <div className="flex flex-wrap gap-1.5">
                        {problem.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="hidden md:col-span-2 md:block">
                       <span className={`px-3 py-1 text-xs font-semibold rounded-full ${difficultyConfig[problem.difficulty].bgColor} ${difficultyConfig[problem.difficulty].color}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                     <div className="hidden md:col-span-1 md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                       <BarChart className="w-4 h-4" />
                       {problem.acceptance}%
                    </div>
                  </div>
                </div>
              </Link>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // Prevent link navigation
                  handleBookmarkToggle(problem.id);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100/50 dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Bookmark problem"
              >
                <Bookmark className={`w-5 h-5 ${problem.bookmarked ? 'text-indigo-600 fill-current' : 'text-gray-400 group-hover:text-indigo-500'}`} />
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-800/50 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">No Problems Found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results.</p>
            <button onClick={resetFilters} className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors">
              Reset Filters
            </button>
          </div>
        )}
      </div>
      
      {/* Pagination remains for now, can be improved later */}
      {problems.length > 0 && (
         <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between bg-white dark:bg-gray-800/50 px-4 py-3 border border-gray-200/50 dark:border-gray-700/50 rounded-lg shadow-md sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Previous</button>
            <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Next</button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(problems.length, 50)}</span> of{' '}
                <span className="font-medium">{problems.length}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button aria-current="page" className="relative z-10 inline-flex items-center bg-indigo-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                  1
                </button>
                <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:z-20 focus:outline-offset-0">
                  <span className="sr-only">Next</span>
                  <ChevronDown className="h-5 w-5 -rotate-90" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 