import { redirect } from 'next/navigation';
import ChallengeInterface from '@/app/components/challenges/challenge-interface';
import { prisma } from '@/app/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import Link from 'next/link';

// Fetch data on the server
async function getChallengeData(challengeId, problemId, userId) {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        problems: {
          select: { problem: true },
          orderBy: { order: 'asc' },
        },
        ChallengeParticipant: {
          where: { userId },
        },
      },
    });

    if (!challenge) {
      return { error: 'Challenge not found' };
    }

    const problems = challenge.problems.map(p => p.problem);
    const currentProblem = problems.find(p => p.id === problemId);

    if (!currentProblem) {
      return { error: 'Problem not found in this challenge' };
    }

    return {
      challenge,
      problems,
      currentProblem,
      participant: challenge.ChallengeParticipant[0] || null,
    };
  } catch (error) {
    console.error('Error fetching challenge data:', error);
    return { error: 'Failed to load challenge data' };
  }
}

export default async function ProblemInChallengePage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/problems/${params.id}`);
  }

  const { id: problemId } = params;
  const { challengeId, groupId } = searchParams;

  if (!challengeId || !groupId) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h2 className="text-2xl font-bold mb-4">Missing Parameters</h2>
          <p>Challenge or Group ID is missing from the request.</p>
        </div>
      );
  }
  
  const { challenge, problems, currentProblem, participant, error } = await getChallengeData(
    challengeId,
    problemId,
    session.user.id
  );

  if (error || !challenge || !problems.length || !currentProblem) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Error Loading Challenge</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error || "The problem or challenge could not be loaded. Please try again."}
        </p>
        <Link 
          href={`/groups/${groupId}/challenges/${challengeId}`}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Back to Challenge Details
        </Link>
      </div>
    );
  }

  const challengeDetails = {
    ...challenge,
    endTime: challenge.endTime.toISOString(),
    startTime: challenge.startTime.toISOString(),
    isDisqualified: participant?.disqualified || false,
  };

  return (
    <ChallengeInterface
      challengeId={challengeId}
      groupId={groupId}
      currentProblem={currentProblem}
      problems={problems}
      user={session?.user}
      challenge={challengeDetails}
    />
  );
} 