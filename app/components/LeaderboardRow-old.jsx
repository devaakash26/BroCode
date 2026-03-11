'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Flame, Zap, Star } from 'lucide-react';

// Skeleton component for loading state
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => (
        <div 
          key={i}
          className="px-6 py-4 bg-white dark:bg-gray-900"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardRow({ user, isCurrentUser }) {
  const [imageError, setImageError] = useState(false);

  // Determine user level and color based on problems solved
  const getLevelInfo = (count) => {
    if (count > 100) return { label: 'Legend', color: 'from-purple-500 to-pink-500', icon: Star, glow: 'shadow-purple-500/50' };
    if (count > 50) return { label: 'Master', color: 'from-green-500 to-emerald-500', icon: Trophy, glow: 'shadow-green-500/50' };
    if (count > 20) return { label: 'Expert', color: 'from-blue-500 to-cyan-500', icon: Zap, glow: 'shadow-blue-500/50' };
    if (count > 10) return { label: 'Pro', color: 'from-yellow-500 to-orange-500', icon: TrendingUp, glow: 'shadow-yellow-500/50' };
    return { label: 'Rookie', color: 'from-gray-500 to-gray-600', icon: Flame, glow: 'shadow-gray-500/50' };
  };

  const levelInfo = getLevelInfo(user.solvedCount);
  const LevelIcon = levelInfo.icon;
  
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('open-profile-dialog', { 
      detail: { userId: user.id }
    }));
  };

  return (
    <div 
      className={`group px-4 sm:px-6 py-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30 cursor-pointer transition-all duration-300 ${
        isCurrentUser ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border-l-4 border-indigo-600' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Rank Badge */}
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
            user.rank <= 10 
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            #{user.rank}
          </div>

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {user.image && !imageError ? (
              <div className="relative h-14 w-14 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-lg">
                <Image
                  className="rounded-full object-cover"
                  src={user.image}
                  alt={user.name || 'User avatar'}
                  fill
                  sizes="56px"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${levelInfo.color} flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white dark:ring-gray-900`}>
                {user.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            {user.rank <= 10 && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <Trophy className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name and Level */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                {user.name}
              </h3>
              {isCurrentUser && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <LevelIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{levelInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Stats - Mobile Stacked, Desktop Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto sm:ml-auto">
          {/* Problems Solved */}
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2.5 sm:min-w-[200px]">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${levelInfo.color} ${levelInfo.glow} shadow-lg flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{user.solvedCount}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Solved</div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-gradient-to-r ${levelInfo.color} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, user.percentComplete)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {user.recentSolves > 0 && (
            <div className="flex items-center gap-2 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl px-4 py-2.5 border border-orange-200 dark:border-orange-900/50">
              <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
              <div>
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Hot Streak</div>
                <div className="text-sm font-bold text-orange-700 dark:text-orange-300">{user.recentSolves} this month</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
