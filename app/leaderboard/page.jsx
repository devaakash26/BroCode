import { Suspense } from 'react';
import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import Image from 'next/image';
import SearchForm from '@/app/components/SearchForm';
import ProfileDialogWrapper from '@/app/components/ProfileDialogWrapper';
import LeaderboardRow, { LeaderboardSkeleton } from '@/app/components/LeaderboardRow';
import { Trophy } from 'lucide-react';
import { redisHelpers } from '@/lib/redis';

export const metadata = {
  title: 'Leaderboard - BroCode',
  description: 'Global rankings of BroCode users',
};

export const revalidate = 120; // ISR: revalidate every 2 minutes

async function getLeaderboard(searchQuery = '', sortBy = 'total') {
  // Try cache first (only for default view - no search, sorted by total)
  const isDefaultView = !searchQuery && sortBy === 'total';
  const cacheKey = isDefaultView ? 'brocode-leaderboard-default' : null;
  
  if (cacheKey && redisHelpers?.cache) {
    try {
      const cached = await redisHelpers.cache.get(cacheKey);
      if (cached) {
        console.log('[Leaderboard] Cache HIT');
        return cached;
      }
      console.log('[Leaderboard] Cache MISS');
    } catch (e) {
      console.error('[Leaderboard] Cache error:', e);
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Build WHERE clause for the user search
  const userWhere = {
    email: { not: 'system@neetcode.io' },
    ...(searchQuery ? {
      OR: [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { email: { contains: searchQuery, mode: 'insensitive' } },
      ],
    } : {}),
  };

  // Run both aggregations in parallel instead of fetching raw submissions
  const [users, solvedCounts, recentCounts] = await Promise.all([
    // 1) Fetch user info only — NO submissions loaded
    prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    }),
    // 2) Count unique solved problems per user via groupBy
    prisma.submission.groupBy({
      by: ['userId', 'problemId'],
      where: { status: 'ACCEPTED' },
      _min: { submittedAt: true }, // just to satisfy Prisma; lightweight
    }),
    // 3) Count recent submissions (last 30 days) per user
    prisma.submission.groupBy({
      by: ['userId'],
      where: {
        submittedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    }),
  ]);

  // Build lookup maps from the aggregation results
  const solvedMap = new Map(); // userId -> Set of problemIds
  for (const row of solvedCounts) {
    if (!solvedMap.has(row.userId)) solvedMap.set(row.userId, new Set());
    solvedMap.get(row.userId).add(row.problemId);
  }

  const recentMap = new Map(); // userId -> count
  for (const row of recentCounts) {
    recentMap.set(row.userId, row._count.id);
  }

  // Build leaderboard from user list
  const leaderboardData = users.map(user => ({
    rank: 0,
    id: user.id,
    name: user.name || 'Anonymous User',
    email: user.email,
    image: user.image,
    solvedCount: solvedMap.get(user.id)?.size || 0,
    recentSolves: recentMap.get(user.id) || 0,
  }));

  // Sort
  if (sortBy === 'recent') {
    leaderboardData.sort((a, b) => b.recentSolves - a.recentSolves);
  } else {
    leaderboardData.sort((a, b) => b.solvedCount - a.solvedCount);
  }

  // Take top 100 after sorting and assign ranks
  const top100 = leaderboardData.slice(0, 100);
  top100.forEach((user, index) => { user.rank = index + 1; });

  // Cache default view (5 minutes TTL)
  if (cacheKey && redisHelpers?.cache) {
    try {
      await redisHelpers.cache.set(cacheKey, top100, 300);
      console.log('[Leaderboard] Successfully cached');
    } catch (e) {
      console.error('[Leaderboard] Failed to cache:', e);
    }
  }

  return top100;
}

async function LeaderboardContent({searchParams}) {
  const session = await getServerSession(authOptions);
  const searchQuery = searchParams?.search || '';
  const sortBy = searchParams?.sort || 'total';
  const leaderboard = await getLeaderboard(searchQuery, sortBy);
  
  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {searchQuery ? `No users found matching "${searchQuery}"` : 'No users found'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-1">Rank</div>
          <div className="col-span-6">Developer</div>
          <div className="col-span-2 text-center">Solved</div>
          <div className="col-span-3 text-right">Total Score</div>
        </div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {leaderboard.map((user, index) => (
          <LeaderboardRow 
            key={user.id}
            user={user}
            rank={index + 1}
            isCurrentUser={session?.user?.id === user.id}
          />
        ))}
      </div>
    </div>
  );
}

export default async function LeaderboardPage({searchParams}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Global Leaderboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ranking based on total algorithmic problem-solving score.
          </p>
        </div>

        {/* Search and filter controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="w-full sm:w-96">
            <SearchForm 
              initialValue={searchParams?.search || ''} 
              sortValue={searchParams?.sort || 'total'} 
              placeholder="Search developers..."
            />
          </div>
          
          <form action="" method="get" className="flex items-center gap-2">
            {searchParams?.search && <input type="hidden" name="search" value={searchParams.search} />}
            
            <select 
              className="block pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              name="sort"
              defaultValue={searchParams?.sort || 'total'}
            >
              <option value="total">Total Solved</option>
              <option value="recent">Recent Activity</option>
            </select>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Apply
            </button>
          </form>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
} 
