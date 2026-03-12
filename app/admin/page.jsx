import { prisma } from '@/app/lib/db';
import Link from 'next/link';
import { Users, BookOpen, Settings, ChevronRight, UserPlus, Layers } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const metadata = {
  title: 'Admin Dashboard - BroCode',
  description: 'Admin dashboard for managing users, problems, and site settings.',
};

export const revalidate = 10; // Revalidate every 10 seconds for real-time data

async function getAdminStats() {
  // Get current counts
  const [userCount, problemCount, groupCount, submissionCount] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.group.count(),
    prisma.submission.count(),
  ]);

  // Get user signups for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const userTrend = await prisma.user.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    where: {
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Process into daily counts
  const dailySignups = Array(7).fill(0);
  const today = new Date();
  
  userTrend.forEach(item => {
    const date = new Date(item.createdAt);
    const daysAgo = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysAgo >= 0 && daysAgo < 7) {
      dailySignups[6 - daysAgo] += item._count.id;
    }
  });

  // Calculate 24-hour active users
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const activeUsers = await prisma.user.count({
    where: { lastSeen: { gte: oneDayAgo } },
  });

  // New signups in last 7 days
  const newSignupsCount = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return {
    userCount,
    problemCount,
    groupCount,
    submissionCount,
    activeUsers,
    dailySignups,
    newSignupsCount,
  };
}

export default async function AdminPage() {
  const stats = await getAdminStats();
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.split(' ')[0] || 'Admin';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hi, {userName}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening with your platform today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              +{stats.newSignupsCount} this week
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.userCount.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
        </div>

        {/* Active Users (24h) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Last 24h
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.activeUsers.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
        </div>

        {/* Total Groups */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.groupCount.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Groups</p>
        </div>

        {/* Total Problems */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {stats.problemCount.toLocaleString()}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Problems</p>
        </div>
      </div>

      {/* Weekly Signup Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          New Signups (Last 7 Days)
        </h3>
        <div className="flex items-end h-48 gap-2">
          {stats.dailySignups.map((count, index) => {
            const maxCount = Math.max(...stats.dailySignups, 1);
            const height = (count / maxCount) * 100;
            const daysAgo = 6 - index;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '160px' }}>
                  <span className="text-xs font-medium text-gray-900 dark:text-white mb-1">{count}</span>
                  <div
                    className="w-full bg-orange-500 dark:bg-orange-600 rounded-t transition-all hover:bg-orange-600 dark:hover:bg-orange-500"
                    style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0px' }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link 
              href="/admin/users/new" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create New User</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Manually add a user</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link 
              href="/admin/problems/new" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Add New Problem</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Create a coding challenge</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
            <Link 
              href="/admin/settings" 
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Site Settings</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Configure platform</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <span className="font-medium text-gray-700 dark:text-gray-300">Total Submissions</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.submissionCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <span className="font-medium text-gray-700 dark:text-gray-300">Database Status</span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <span className="font-medium text-gray-700 dark:text-gray-300">Server Status</span>
              <span className="text-sm font-semibold text-green-600 dark:text-green-400">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
