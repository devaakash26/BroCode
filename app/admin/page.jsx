import { prisma } from '@/app/lib/db';
import { Users, BookOpen, Layers, UserCheck, FileCheck2 } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminDashboardAnalytics from '@/app/components/admin/AdminDashboardAnalytics';

export const metadata = {
  title: 'Admin Dashboard - BroCode',
  description: 'Admin dashboard for managing users, problems, and site settings.',
};

export const revalidate = 10; // Revalidate every 10 seconds for real-time data

async function getAdminStats() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    userCount,
    problemCount,
    groupCount,
    submissionCount,
    activeUsers,
    newSignupsCount,
    userSignupRows,
    groupCreatedRows,
    challengeRows,
    challengeJoinRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.group.count(),
    prisma.submission.count(),
    prisma.user.count({
      where: { lastSeen: { gte: oneDayAgo } },
    }),
    prisma.user.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.group.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.challenge.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.challengeParticipant.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: {
        createdAt: true,
        challenge: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return {
    userCount,
    problemCount,
    groupCount,
    submissionCount,
    activeUsers,
    newSignupsCount,
    userSignupEvents: userSignupRows.map((row) => row.createdAt.toISOString()),
    groupCreatedEvents: groupCreatedRows.map((row) => row.createdAt.toISOString()),
    challengeEvents: challengeRows.map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt.toISOString(),
    })),
    challengeJoinEvents: challengeJoinRows.map((row) => ({
      title: row.challenge?.title || 'Untitled Challenge',
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export default async function AdminPage() {
  const stats = await getAdminStats();
  const session = await getServerSession(authOptions);
  const userName = session?.user?.name?.split(' ')[0] || 'Admin';

  const cards = [
    {
      title: 'Total Users',
      value: stats.userCount,
      subtext: `+${stats.newSignupsCount} this week`,
      icon: Users,
      iconClass: 'text-orange-500',
      iconBgClass: 'bg-orange-500/15',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      subtext: 'Active in last 24h',
      icon: UserCheck,
      iconClass: 'text-green-500',
      iconBgClass: 'bg-green-500/15',
    },
    {
      title: 'Total Groups',
      value: stats.groupCount,
      subtext: 'Community spaces created',
      icon: Layers,
      iconClass: 'text-amber-500',
      iconBgClass: 'bg-amber-500/15',
    },
    {
      title: 'Total Problems',
      value: stats.problemCount,
      subtext: 'Coding tasks in catalog',
      icon: BookOpen,
      iconClass: 'text-emerald-500',
      iconBgClass: 'bg-emerald-500/15',
    },
    {
      title: 'Total Submissions',
      value: stats.submissionCount,
      subtext: 'All-time solution attempts',
      icon: FileCheck2,
      iconClass: 'text-sky-500',
      iconBgClass: 'bg-sky-500/15',
    },
  ];

  return (
    <div className="space-y-6">

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map(({ title, value, subtext, icon: Icon, iconClass, iconBgClass }) => (
          <div
            key={title}
            className="rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/70 p-4 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${iconBgClass}`}>
                <Icon className={`h-5 w-5 ${iconClass}`} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
          </div>
        ))}
      </section>

      <AdminDashboardAnalytics
        userSignupEvents={stats.userSignupEvents}
        groupCreatedEvents={stats.groupCreatedEvents}
        challengeEvents={stats.challengeEvents}
        challengeJoinEvents={stats.challengeJoinEvents}
      />
    </div>
  );
}
