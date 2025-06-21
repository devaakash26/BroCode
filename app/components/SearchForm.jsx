'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';

export default function SearchForm({ initialValue = '', sortValue = 'total', placeholder = 'Search...' }) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedValue] = useDebounce(searchTerm, 500);
  const router = useRouter();

  // Listen for debounced value changes to trigger search
  useEffect(() => {
    // Skip the initial render if initialValue matches current search
    if (debouncedValue === initialValue && initialValue === searchTerm) return;
    
    // Build the query string
    const params = new URLSearchParams();
    if (debouncedValue) {
      params.set('search', debouncedValue);
    }
    if (sortValue && sortValue !== 'total') {
      params.set('sort', sortValue);
    }
    
    const queryString = params.toString();
    router.push(queryString ? `?${queryString}` : '');
  }, [debouncedValue, initialValue, sortValue, router]);

  return (
    <div className="relative rounded-md shadow-sm">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        placeholder={placeholder}
      />
      {searchTerm && (
        <button 
          onClick={() => setSearchTerm('')}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
} 
