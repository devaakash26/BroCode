'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useProblemDrawer } from '@/app/context/ProblemDrawerContext';
import { X, Search } from 'lucide-react';

export default function ProblemListDrawer() {
    const { isDrawerOpen, closeDrawer } = useProblemDrawer();
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isDrawerOpen && problems.length === 0) {
            setLoading(true);
            setError(null);
            const fetchProblems = async () => {
                try {
                    const response = await fetch('/api/problems/list');
                    if (!response.ok) {
                        throw new Error('Failed to fetch problems');
                    }
                    const data = await response.json();
                    setProblems(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchProblems();
        }
    }, [isDrawerOpen, problems.length]);

    const filteredProblems = useMemo(() => {
        if (!searchTerm) {
            return problems;
        }
        return problems.filter(problem =>
            problem.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [problems, searchTerm]);

    const solvedCount = useMemo(() => problems.filter(p => p.solved).length, [problems]);
    const totalCount = problems.length;
    const progress = totalCount > 0 ? (solvedCount / totalCount) * 100 : 0;

  return (
    <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
        onClick={closeDrawer}
      ></div>
      
      <div 
        className={`relative top-0 left-0 h-full w-96 bg-white dark:bg-gray-900 shadow-lg z-50 p-4 transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold">Problem List</h2>
          <button onClick={closeDrawer} className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="mb-4 flex-shrink-0">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{solvedCount} / {totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>

        <div className="relative mb-4 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Search problems..."
            />
        </div>

        <div className="overflow-y-auto flex-grow h-full pb-10">
            {loading ? (
                <p className="text-gray-500 dark:text-gray-400">Loading problems...</p>
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : (
                <ul>
                    {filteredProblems.length > 0 ? (
                        filteredProblems.map((problem) => (
                            <li key={problem.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                                <Link href={`/problems/${problem.id}`} onClick={closeDrawer} className="block p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors duration-150">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{problem.title}</span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                            problem.difficulty === 'EASY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            problem.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}>
                                            {problem.difficulty}
                                        </span>
                                    </div>
                                    {problem.solved && <span className="text-green-500 text-xs font-bold mt-1 inline-block">Solved</span>}
                                </Link>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No problems found.</p>
                    )}
                </ul>
            )}
        </div>
      </div>
    </div>
  );
} 