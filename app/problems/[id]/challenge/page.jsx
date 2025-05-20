'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Toaster, toast } from 'react-hot-toast';
import ChallengeInterface from '../../../components/challenges/challenge-interface';

export default function ChallengeProblemPage({ params }) {
  const { id: problemId } = params;
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('challengeId');
  const groupId = searchParams.get('groupId');
  
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [problems, setProblems] = useState([]);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect(`/auth/signin?callbackUrl=/problems/${problemId}/challenge?challengeId=${challengeId}&groupId=${groupId}`);
    }
  }, [status, problemId, challengeId, groupId]);

  // Fetch problem and challenge data
  useEffect(() => {
    if (status === 'loading') return;
    if (!challengeId || !problemId || !groupId) {
      toast.error('Missing required parameters');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch problem details
        const problemRes = await fetch(`/api/problems/${problemId}`);
        if (!problemRes.ok) {
          throw new Error('Failed to fetch problem');
        }
        const problemData = await problemRes.json();
        setProblem(problemData);

        // Fetch challenge details to get all problems
        const challengeRes = await fetch(`/api/groups/${groupId}/challenges/${challengeId}`);
        if (!challengeRes.ok) {
          throw new Error('Failed to fetch challenge');
        }
        const challengeData = await challengeRes.json();
        setChallenge(challengeData);

        // Fetch all problem details for navigation
        const problemDetailsPromises = challengeData.problems.map(async (p) => {
          const res = await fetch(`/api/problems/${p.id}`);
          if (res.ok) {
            return res.json();
          }
          return null;
        });

        const allProblems = await Promise.all(problemDetailsPromises);
        setProblems(allProblems.filter(Boolean));
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load problem data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [problemId, challengeId, groupId, status]);

  if (loading || status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!problem || !challenge || !problems.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Error Loading Problem</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The problem or challenge could not be loaded. Please try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <ChallengeInterface
        challengeId={challengeId}
        groupId={groupId}
        initialProblem={problem}
        problems={problems}
        user={session?.user}
      />
    </>
  );
} 