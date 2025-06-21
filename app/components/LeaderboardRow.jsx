'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for loading state
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* Rows */}
      {[...Array(10)].map((_, i) => (
        <div 
          key={i}
          className={`grid grid-cols-12 gap-4 px-6 py-4 ${
            i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
          }`}
        >
          {/* Rank */}
          <div className="col-span-1 flex items-center">
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          
          {/* User */}
          <div className="col-span-3 flex items-center">
            <div className="flex items-center">
              <Skeleton className="h-10 w-10 rounded-full mr-3" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          
          {/* Problems Solved */}
          <div className="col-span-3 flex items-center space-x-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-2 w-full" />
          </div>
          
          {/* Recent Activity */}
          <div className="col-span-3">
            <Skeleton className="h-4 w-40" />
          </div>
          
          {/* Level */}
          <div className="col-span-2 flex items-center space-x-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardRow({ user, isCurrentUser, isEvenRow }) {
  const [imageError, setImageError] = useState(false);

  // Determine user level based on problems solved
  const level = user.solvedCount > 100 ? 'Master' :
              user.solvedCount > 50 ? 'Expert' :
              user.solvedCount > 10 ? 'Intermediate' : 'Beginner';
  
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-profile-dialog', { 
      detail: { userId: user.id }
    }));
  };

  return (
    <div 
      className={`grid grid-cols-12 gap-4 px-6 py-4 ${
        isCurrentUser ? 'bg-indigo-100 dark:bg-indigo-900/30' : 
        isEvenRow ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
      } hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition duration-150`}
      onClick={handleClick}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center">
        {user.rank <= 3 ? (
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-white font-bold ${
            user.rank === 1 ? 'bg-yellow-600' : 
            user.rank === 2 ? 'bg-gray-500' : 
            'bg-amber-700'
          }`}>
            {user.rank}
          </div>
        ) : (
          <div className="text-gray-600 dark:text-gray-400 pl-3">
            {user.rank}
          </div>
        )}
      </div>
      
      {/* User */}
      <div className="col-span-3 flex items-center">
        <div className="h-10 w-10 relative mr-3">
          {user.image && !imageError ? (
            <div className="relative h-10 w-10 rounded-full overflow-hidden">
              <Image
                className="rounded-full object-cover"
                src={user.image}
                alt={user.name || 'User avatar'}
                fill
                sizes="40px"
                onError={() => setImageError(true)}
                priority={user.rank <= 3}
              />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white text-lg font-medium">
                {user.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          )}
          {user.rank <= 3 && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 ${
              user.rank === 1 ? 'border-yellow-600 text-yellow-500' : 
              user.rank === 2 ? 'border-gray-500 text-gray-400' : 
              'border-amber-700 text-amber-600'
            }`}>
              <span className="text-xs font-bold">{user.rank}</span>
            </div>
          )}
        </div>
        <div>
          <span className="text-gray-900 dark:text-white font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
            {user.name}
          </span>
          {isCurrentUser && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 rounded-full">
              You
            </span>
          )}
        </div>
      </div>
      
      {/* Problems Solved */}
      <div className="col-span-3 flex items-center">
        <span className="text-gray-900 dark:text-white mr-3">{user.solvedCount}</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: `${Math.min(100, user.percentComplete)}%` }}
          ></div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="col-span-3 text-gray-900 dark:text-white">
        {user.recentSolves > 0 ? (
          <span>{user.recentSolves} problems <span className="text-gray-500 dark:text-gray-400 text-sm">(30 days)</span></span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 text-sm">(30 days)</span>
        )}
      </div>
      
      {/* Level */}
      <div className="col-span-2 flex items-center">
        <div className={`h-2.5 w-2.5 rounded-full mr-2 ${
          level === 'Master' ? 'bg-green-500' :
          level === 'Expert' ? 'bg-blue-500' : 
          level === 'Intermediate' ? 'bg-yellow-500' : 
          'bg-gray-500'
        }`}></div>
        <span className="text-gray-900 dark:text-white">{level}</span>
      </div>
    </div>
  );
} 
