'use client';

import Image from 'next/image';
import { Medal, Circle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for loading state
export function LeaderboardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="h-4 col-span-1" />
          <Skeleton className="h-4 col-span-6" />
          <Skeleton className="h-4 col-span-2" />
          <Skeleton className="h-4 col-span-3" />
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="px-6 py-4">
            <div className="grid grid-cols-12 gap-4 items-center">
              <Skeleton className="h-4 w-6 col-span-1" />
              <div className="col-span-6 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-8 col-span-2 mx-auto" />
              <Skeleton className="h-4 w-12 col-span-3 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardRow({ user, rank, isCurrentUser }) {
  // Medal icons for top 3
  const getMedalIcon = (rank) => {
    if (rank === 1) return <Medal className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return null;
  };

  return (
    <div 
      className={`
        grid grid-cols-12 gap-4 px-6 py-4 items-center
        ${isCurrentUser ? 'border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/10' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
      `}
    >
      {/* Rank Column */}
      <div className="col-span-1 flex items-center gap-2">
        {getMedalIcon(rank)}
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {rank}
        </span>
      </div>

      {/* Developer Column */}
      <div className="col-span-6 flex items-center gap-3">
        <div className="relative">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={40}
              height={40}
              className="rounded-full border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online indicator */}
          <Circle className="w-3 h-3 text-green-500 fill-green-500 absolute bottom-0 right-0 border-2 border-white dark:border-gray-800 rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {user.name}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </div>
        </div>
      </div>

      {/* Solved Column */}
      <div className="col-span-2 text-center">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {user.solvedCount || 0}
        </span>
      </div>

      {/* Total Score Column */}
      <div className="col-span-3 text-right">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {user.solvedCount || 0}
        </span>
      </div>
    </div>
  );
}
