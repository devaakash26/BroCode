import { prisma, disconnectPrisma } from '@/app/lib/db';
import DashboardStats from '@/app/components/admin/DashboardStats';
import Link from 'next/link';
import { Users, BookOpen, Settings, ChevronRight } from 'lucide-react';

export const metadata = {
  title: 'Admin Dashboard - NeetCode',
  description: 'Platform administration dashboard',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getAdminStats() {
  try {
    // Get total counts with individual try/catch blocks
    let userCount = 0, groupCount = 0, problemCount = 0, submissionCount = 0;
    let recentUsers = [], recentProblems = [];
    let submissionTrend = [], userTrend = [], problemTrend = [], groupTrend = [];

    try {
      userCount = await prisma.user.count();
    } catch (error) {
      console.error('Error fetching user count:', error);
    }

    try {
      groupCount = await prisma.group.count();
    } catch (error) {
      console.error('Error fetching group count:', error);
    }

    try {
      problemCount = await prisma.problem.count();
    } catch (error) {
      console.error('Error fetching problem count:', error);
    }

    try {
      submissionCount = await prisma.submission.count();
    } catch (error) {
      console.error('Error fetching submission count:', error);
    }

    // Get recent users
    try {
      recentUsers = await prisma.user.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }

    // Get recent problems
    try {
      recentProblems = await prisma.problem.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          title: true,
          difficulty: true,
          createdAt: true,
        },
      });
    } catch (error) {
      console.error('Error fetching recent problems:', error);
    }

    // Get submission data for the last 7 days for trends
    const today = new Date();
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);

    try {
      submissionTrend = await prisma.$queryRaw`
        SELECT 
          date("submittedAt") as date, 
          COUNT(*) as count
        FROM "Submission"
        WHERE "submittedAt" >= ${last7Days}
        GROUP BY date("submittedAt")
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error('Error fetching submission trend:', error);
    }

    // Get user registration trend for the last 7 days
    try {
      userTrend = await prisma.$queryRaw`
        SELECT 
          date("createdAt") as date, 
          COUNT(*) as count
        FROM "User"
        WHERE "createdAt" >= ${last7Days}
        GROUP BY date("createdAt")
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error('Error fetching user trend:', error);
    }

    // Get problem creation trend for the last 7 days
    try {
      problemTrend = await prisma.$queryRaw`
        SELECT 
          date("createdAt") as date, 
          COUNT(*) as count
        FROM "Problem"
        WHERE "createdAt" >= ${last7Days}
        GROUP BY date("createdAt")
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error('Error fetching problem trend:', error);
    }

    // Get group creation trend for the last 7 days
    try {
      groupTrend = await prisma.$queryRaw`
        SELECT 
          date("createdAt") as date, 
          COUNT(*) as count
        FROM "Group"
        WHERE "createdAt" >= ${last7Days}
        GROUP BY date("createdAt")
        ORDER BY date ASC
      `;
    } catch (error) {
      console.error('Error fetching group trend:', error);
    }

    // Format the trend data for the charts
    const formatTrendData = (data, days = 7) => {
      const result = new Array(days).fill(0);
      const dateMap = new Map();
      
      // Create a map of dates to counts
      data.forEach(item => {
        const dateStr = new Date(item.date).toISOString().split('T')[0];
        dateMap.set(dateStr, Number(item.count));
      });
      
      // Fill in the result array
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (days - 1 - i));
        const dateStr = date.toISOString().split('T')[0];
        result[i] = dateMap.get(dateStr) || 0;
      }
      
      return result;
    };

    return {
      stats: {
        userCount,
        groupCount,
        problemCount,
        submissionCount,
        userTrend: formatTrendData(userTrend),
        problemTrend: formatTrendData(problemTrend),
        submissionTrend: formatTrendData(submissionTrend),
        groupTrend: formatTrendData(groupTrend),
      },
      recentUsers,
      recentProblems,
    };
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    return {
      stats: {
        userCount: 0,
        groupCount: 0,
        problemCount: 0,
        submissionCount: 0,
        userTrend: Array(7).fill(0),
        problemTrend: Array(7).fill(0),
        submissionTrend: Array(7).fill(0),
        groupTrend: Array(7).fill(0),
      },
      recentUsers: [],
      recentProblems: [],
    };
  } finally {
    // Ensure we disconnect from the database to release connections
    try {
      await disconnectPrisma();
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }
}

export default async function AdminDashboardPage() {
  const { stats, recentUsers, recentProblems } = await getAdminStats();

  return (
    <div className="space-y-8">
      {/* Dashboard Stats with real data trends */}
      <DashboardStats stats={stats} />

      {/* Admin Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-5">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/admin/users"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Manage Users</h3>
              <Users className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">View, edit, and manage user accounts</p>
          </Link>

          <Link
            href="/admin/problems"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Manage Problems</h3>
              <BookOpen className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create, edit, and manage DSA problems</p>
          </Link>

          <Link
            href="/admin/groups"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Manage Groups</h3>
              <Users className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">View and manage all groups</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Platform Settings</h3>
              <Settings className="h-5 w-5 text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure platform-wide settings</p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Users */}
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold">Recent Users</h2>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
            >
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentUsers.length > 0 ? (
                  recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.role === 'PLATFORM_ADMIN' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                            : user.role === 'GROUP_ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Problems */}
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold">Recent Problems</h2>
            <Link
              href="/admin/problems"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
            >
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {recentProblems.length > 0 ? (
                  recentProblems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {problem.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          problem.difficulty === 'EASY' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : problem.difficulty === 'MEDIUM'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {problem.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(problem.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No problems found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}