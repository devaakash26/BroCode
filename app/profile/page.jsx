import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import { notFound } from 'next/navigation';
import { ProfileClientPage } from './client-page';

async function getUserProfile(userId) {
  if (!userId) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        leetcodeUsername: true,
      },
    });

    if (!user) {
      return null;
    }

    const submissions = await prisma.submission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      include: {
        problem: {
          select: {
            title: true,
          },
        },
      },
    });

    const problemsSolved = new Set(
      submissions.filter(s => s.status === 'ACCEPTED').map(s => s.problemId)
    ).size;
    
    const successRate = submissions.length > 0
      ? Math.round((submissions.filter(s => s.status === 'ACCEPTED').length / submissions.length) * 100)
      : 0;

    const contributionData = submissions.reduce((acc, submission) => {
      const date = submission.submittedAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    const recentActivity = submissions.slice(0, 5).map(s => ({
      type: 'submission',
      status: s.status,
      problem: s.problem.title,
      time: s.submittedAt.toISOString(),
    }));

    return {
      ...user,
      stats: {
        problemsSolved,
        submissionsCount: submissions.length,
        successRate,
      },
      contributionData,
      recentActivity,
    };
    } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // This will be caught by middleware, but as a fallback
    notFound();
  }

  const userProfile = await getUserProfile(session.user.id);

  if (!userProfile) {
    notFound();
  }

  return <ProfileClientPage user={userProfile} />;
} 
