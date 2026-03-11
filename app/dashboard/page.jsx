import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/app/lib/db';
import ClientDashboardPage from './client-page';
import { redisHelpers } from '@/lib/redis';

export const metadata = {
  title: 'Dashboard - BroCode',
  description: 'Your coding dashboard',
};

// Match Redis cache TTL (1 hour) to prevent unnecessary refetches
export const revalidate = 3600; // ISR: revalidate every 1 hour

// Use dynamic rendering with caching (authentication required)
// The staleTimes in next.config.mjs will cache in the router for better navigation

async function getDashboardStats(userId) {
  // Check cache first
  const cacheKey = `brocode-dashboard-stats-${userId}`;
  if (redisHelpers?.cache) {
    try {
      const cachedStats = await redisHelpers.cache.get(cacheKey);
      if (cachedStats) {
        console.log('[Dashboard SSR] Cache HIT');
        return cachedStats.stats;
      }
      console.log('[Dashboard SSR] Cache MISS');
    } catch (e) {
      console.error('[Dashboard SSR] Cache error:', e);
    }
  }

  // Run all independent queries in parallel with $transaction
  const [
    submissionCount,
    groupCount,
    solvedProblemIds,
    upcomingChallenges,
    recentSubmissions,
  ] = await prisma.$transaction([
    prisma.submission.count({
      where: { userId },
    }),
    prisma.userGroup.count({
      where: { userId },
    }),
    prisma.submission.findMany({
      where: { userId, status: "ACCEPTED" },
      select: { problemId: true },
      distinct: ["problemId"],
    }),
    prisma.challenge.findMany({
      where: {
        startTime: { gt: new Date() },
        group: {
          members: { some: { userId } },
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        group: {
          select: { id: true, name: true },
        },
      },
      take: 3,
      orderBy: { startTime: "asc" },
    }),
    prisma.submission.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        language: true,
        submittedAt: true,
        problemId: true,
        problem: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      take: 5,
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  const stats = {
    submissionCount,
    groupCount,
    problemsSolved: solvedProblemIds.length,
    upcomingChallenges,
    recentSubmissions,
  };

  // Cache the stats (1 hour TTL)
  if (redisHelpers?.cache) {
    try {
      await redisHelpers.cache.set(cacheKey, { success: true, stats }, 3600);
      console.log('[Dashboard SSR] Successfully cached');
    } catch (e) {
      console.error('[Dashboard SSR] Failed to cache:', e);
    }
  }

  return stats;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  const userStats = await getDashboardStats(session.user.id);

  return <ClientDashboardPage userStats={userStats} userName={session.user.name} />;
}
