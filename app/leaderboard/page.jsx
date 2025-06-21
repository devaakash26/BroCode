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

export const metadata = {
  title: 'Leaderboard - BroCode',
  description: 'Global rankings of BroCode users',
};

async function getLeaderboard(searchQuery = '', sortBy = 'total') {
  // Get top users by solved problems count
  const users = await prisma.user.findMany({
    where: {
      // Exclude the system user
      email: { not: 'system@neetcode.io' },
      // Include search query if provided
      ...(searchQuery ? {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      submissions: {
        where: {
          status: 'ACCEPTED',
        },
        select: {
          problemId: true,
          submittedAt: true,
        },
      },
    },
    orderBy: {
      submissions: {
        _count: 'desc',
      },
    },
    take: 100,
  });

  // Process data to count unique solved problems and calculate rank
  const leaderboardData = users.map((user, index) => {
    // Count unique solved problems by filtering out duplicates
    const uniqueSolvedProblems = [...new Set(user.submissions.map(s => s.problemId))];
    
    // Calculate recent activity (problems solved in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSolves = user.submissions.filter(s => s.submittedAt > thirtyDaysAgo).length;
    
    return {
      rank: index + 1,
      id: user.id,
      name: user.name || 'Anonymous User',
      email: user.email,
      image: user.image,
      solvedCount: uniqueSolvedProblems.length,
      recentSolves,
    };
  });

  // Sort based on the chosen criteria
  if (sortBy === 'recent') {
    leaderboardData.sort((a, b) => b.recentSolves - a.recentSolves);
  } else {
    leaderboardData.sort((a, b) => b.solvedCount - a.solvedCount);
  }

  // Reassign ranks after sorting
  leaderboardData.forEach((user, index) => {
    user.rank = index + 1;
  });

  return leaderboardData;
}

async function LeaderboardContent({searchParams}) {
  const session = await getServerSession(authOptions);
  const searchQuery = searchParams?.search || '';
  const sortBy = searchParams?.sort || 'total';
  const leaderboard = await getLeaderboard(searchQuery, sortBy);
  
  // Find the current user's position if logged in
  const currentUser = session?.user ? 
    leaderboard.find(user => user.email === session.user.email) : null;
    
  // Format today's date as MM/DD/YYYY
  const today = new Date();
  const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

  return (
    <>
      {/* Leaderboard table */}
      <div className="overflow-hidden rounded-lg shadow">
        {/* Table header */}
        <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Global Rankings</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Updated {formattedDate}
          </div>
        </div>
        
        {/* Column headers */}
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-6 py-3 grid grid-cols-12 gap-4 text-xs uppercase tracking-wider font-medium">
          <div className="col-span-1">Rank</div>
          <div className="col-span-3">User</div>
          <div className="col-span-3">Problems Solved</div>
          <div className="col-span-3">Recent Activity</div>
          <div className="col-span-2">Level</div>
        </div>
        
        {/* Table body */}
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {leaderboard.map((user, index) => {
            const isCurrentUser = currentUser && user.id === currentUser.id;
            const isEvenRow = index % 2 === 0;
            
            // Calculate percentage for progress bar
            const percentComplete = (user.solvedCount / (leaderboard[0]?.solvedCount || 1)) * 100;
            const userWithPercent = { ...user, percentComplete };
            
            return (
              <LeaderboardRow
                key={user.id}
                user={userWithPercent}
                isCurrentUser={isCurrentUser}
                isEvenRow={isEvenRow}
              />
            );
          })}
          
          {leaderboard.length === 0 && (
            <div className="px-6 py-10 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
              {searchQuery ? 
                `No users found matching "${searchQuery}". Try a different search term.` : 
                'No users found in the leaderboard.'}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="text-gray-900 dark:text-white">1</span> to <span className="text-gray-900 dark:text-white">{Math.min(leaderboard.length, 10)}</span> of <span className="text-gray-900 dark:text-white">{leaderboard.length}</span> users
          </div>
          
          <div className="flex items-center">
            <button disabled className="px-2 py-1 rounded-l bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button className="px-3 py-1 bg-indigo-600 text-white">
              1
            </button>
            
            <button disabled className="px-2 py-1 rounded-r bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default async function LeaderboardPage({searchParams}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and filter controls */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="w-full sm:w-96">
            <SearchForm 
              initialValue={searchParams?.search || ''} 
              sortValue={searchParams?.sort || 'total'} 
              placeholder="Search users..."
            />
          </div>
          
          <form action="" method="get" className="flex items-center gap-2">
            {searchParams?.search && <input type="hidden" name="search" value={searchParams.search} />}
            
            <select 
              className="block pl-3 pr-10 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              name="sort"
              defaultValue={searchParams?.sort || 'total'}
            >
              <option value="total">Sort by Total Solved</option>
              <option value="recent">Sort by Recent Activity</option>
            </select>
            <button 
              type="submit" 
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md"
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
