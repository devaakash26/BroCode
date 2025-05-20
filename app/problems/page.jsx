import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ClientProblemsPage from './client-page';

export const metadata = {
  title: 'Problems - NeetCode',
  description: 'Browse and solve DSA problems',
};

async function getProblems(userId) {
  const problems = await prisma.problem.findMany({
    where: {
      isPublic: true,
    },
    select: {
      id: true,
      title: true,
      difficulty: true,
      tags: true,
      _count: {
        select: {
          submissions: true,
        },
      },
      submissions: {
        where: {
          userId,
          status: 'ACCEPTED',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Format the data to include submission status
  return problems.map(problem => ({
    ...problem,
    solved: problem.submissions.length > 0,
    submissions: undefined, // Remove submissions from the returned object
    submissionCount: problem._count.submissions,
    _count: undefined, // Remove _count from the returned object
    acceptance: Math.floor(Math.random() * 41) + 60, // Random acceptance rate between 60-100% for demo
  }));
}

export default async function ProblemsPage() {
  const session = await getServerSession(authOptions);
  const problems = await getProblems(session?.user?.id || '');

  // Compute stats for the client page
  const easyProblems = problems.filter(p => p.difficulty === 'EASY');
  const mediumProblems = problems.filter(p => p.difficulty === 'MEDIUM');
  const hardProblems = problems.filter(p => p.difficulty === 'HARD');
  const solvedProblems = problems.filter(p => p.solved);

  // Extract all unique tags
  const allTags = [...new Set(problems.flatMap(p => p.tags))].sort();

  // Stats object
  const stats = {
    total: problems.length,
    solved: solvedProblems.length,
    easy: {
      total: easyProblems.length,
      solved: easyProblems.filter(p => p.solved).length
    },
    medium: {
      total: mediumProblems.length,
      solved: mediumProblems.filter(p => p.solved).length
    },
    hard: {
      total: hardProblems.length,
      solved: hardProblems.filter(p => p.solved).length
    },
    tags: allTags
  };

  return (
    <ClientProblemsPage 
      initialProblems={problems} 
      stats={stats} 
    />
  );
} 