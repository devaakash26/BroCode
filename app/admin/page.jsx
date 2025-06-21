import { prisma } from '@/app/lib/db';
import Link from 'next/link';
import { Users, BookOpen, Settings, ChevronRight } from 'lucide-react';
import DashboardStats from '@/app/components/admin/DashboardStats';

export const metadata = {
  title: 'Admin Dashboard - BroCode',
  description: 'Admin dashboard for managing users, problems, and site settings.',
};

export const revalidate = 60;

async function getAdminStats() {
  const [userCount, problemCount, groupCount, submissionCount, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.group.count(),
    prisma.submission.count(),
    prisma.user.count({ where: { lastSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);
  return { userCount, problemCount, groupCount, submissionCount, activeUsers };
}

export default async function AdminPage() {
  const stats = await getAdminStats();

  return (
    <div>
      <DashboardStats stats={stats} />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-4">
            <Link href="/admin/users/new" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div>
                <p className="font-semibold">Create New User</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manually add a new user to the platform.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
            <Link href="/admin/problems/new" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div>
                <p className="font-semibold">Add New Problem</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Add a new coding problem to the problem set.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
            <Link href="/admin/settings" className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div>
                <p className="font-semibold">Site Settings</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure global settings for the application.</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Platform Health</h3>
          <ul className="space-y-3">
            <li className="flex justify-between"><span>Database Status:</span> <span className="text-green-500 font-semibold">Connected</span></li>
            <li className="flex justify-between"><span>Redis Status:</span> <span className="text-green-500 font-semibold">Connected</span></li>
            <li className="flex justify-between"><span>Email Service:</span> <span className="text-green-500 font-semibold">Operational</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
