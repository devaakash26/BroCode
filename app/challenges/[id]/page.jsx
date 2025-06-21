import { getServerSession } from 'next-auth/next';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Users, Trophy, Code, ArrowRight } from 'lucide-react';
import { prisma } from '@/app/lib/db';
import { formatDistanceToNow } from 'date-fns';

export async function generateMetadata({ params }) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: params.id },
  });
  
  if (!challenge) {
    return {
      title: 'Challenge Not Found - BroCode',
    };
  }
  
  return {
    title: `${challenge.title} - BroCode Challenge`,
    description: `Participate in the ${challenge.title} challenge.`,
  };
}

async function getChallenge(id, userId) {
  const challenge = await prisma.challenge.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      isActive: true,
      visibleToParticipants: true,
      createdAt: true,
      updatedAt: true,
      maxScore: true,
      realTimeLeaderboard: true,
      allowLateSubmissions: true,
      groupId: true,
      creatorId: true,
      group: {
        select: {
          id: true,
          name: true,
          members: {
            where: {
              userId,
            },
            select: {
              role: true
            }
          },
        },
      },
      problems: {
        select: {
          problem: {
            select: {
              id: true,
              title: true,
              difficulty: true,
            }
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      },
      submissions: {
        where: {
          userId,
        },
        select: {
          id: true,
          problemId: true,
          status: true,
          problem: {
            select: {
              id: true,
              title: true,
            }
          },
        },
      },
      participants: {
        where: { userId }
      },
      _count: {
        select: {
          problems: true,
          submissions: true,
        },
      },
    },
  });

  if (!challenge) {
    return null;
  }

  // Check if user is a member of this group
  const isMember = challenge.group.members.length > 0;
  const isAdmin = challenge.group.members.some(member => member.role === 'ADMIN');
  const participant = challenge.participants[0] || null;

  // Calculate challenge status
  const now = new Date();
  let status;
  if (now < new Date(challenge.startTime)) {
    status = 'UPCOMING';
  } else if (now > new Date(challenge.endTime)) {
    status = 'ENDED';
  } else {
    status = 'ACTIVE';
  }

  // Calculate user's progress
  const totalProblems = challenge.problems.length;
  const solvedProblems = challenge.submissions.filter(sub => sub.status === 'ACCEPTED')
    .map(sub => sub.problemId)
    .filter((v, i, a) => a.indexOf(v) === i).length;
  
  const progressPercentage = totalProblems > 0 ? Math.round((solvedProblems / totalProblems) * 100) : 0;

  return {
    ...challenge,
    isMember,
    isAdmin,
    status,
    isDisqualified: participant?.disqualified || false,
    userProgress: {
      solved: solvedProblems,
      total: totalProblems,
      percentage: progressPercentage,
    },
  };
}

export default async function ChallengePage({ params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/auth/signin?callbackUrl=/challenges/${params.id}`);
  }

  const challenge = await getChallenge(params.id, session.user.id);

  if (!challenge) {
    notFound();
  }

  // If user is not a member of the group, redirect to group page
  if (!challenge.isMember) {
    redirect(`/groups/${challenge.group.id}`);
  }

  // If the user tries to access the page directly and is disqualified
  if (challenge.isDisqualified) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <h1 className="text-4xl font-bold text-red-500 mb-4">Disqualified</h1>
            <p className="text-lg">You have been disqualified from this challenge and cannot rejoin.</p>
            <Link href={`/groups/${challenge.groupId}`} className="mt-6 text-blue-400 hover:underline">
                Return to Group
            </Link>
        </div>
    );
  }

  const startDate = new Date(challenge.startTime);
  const endDate = new Date(challenge.endTime);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/challenges"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Challenges
        </Link>
      </div>

      {/* Challenge Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{challenge.title}</h1>
              <Link
                href={`/groups/${challenge.group.id}`}
                className="text-indigo-200 hover:text-white flex items-center mt-2"
              >
                <Users className="h-4 w-4 mr-1" />
                {challenge.group.name}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                challenge.status === 'ACTIVE' 
                  ? 'bg-green-100 text-green-800' 
                  : challenge.status === 'UPCOMING'
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {challenge.status === 'ACTIVE' 
                  ? 'Active' 
                  : challenge.status === 'UPCOMING'
                    ? 'Upcoming' 
                    : 'Ended'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Challenge Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</h3>
                <p className="mt-1 text-base font-medium">
                  {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</h3>
                <p className="mt-1 text-base font-medium">
                  {endDate.toLocaleDateString()} at {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</h3>
                <p className="mt-1 text-base font-medium">
                  {formatDistanceToNow(endDate, { addSuffix: false, baseDate: startDate })}
                </p>
              </div>
            </div>
          </div>
          
          {/* Description */}
          {challenge.description && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium mb-2">Description</h2>
              <p className="text-gray-700 dark:text-gray-300">{challenge.description}</p>
            </div>
          )}
          
          {/* User Progress */}
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3">Your Progress</h2>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">{challenge.userProgress.solved} of {challenge.userProgress.total} problems solved</span>
                <span className="text-sm font-medium">{challenge.userProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full" 
                  style={{ width: `${challenge.userProgress.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Problems List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Code className="h-5 w-5 mr-2 text-indigo-600" />
            Problems
          </h2>
          
          {challenge.problems.length > 0 ? (
            <div className="space-y-4">
              {challenge.problems.map((challengeProblem) => {
                const problem = challengeProblem.problem;
                const userSubmission = challenge.submissions.find(
                  sub => sub.problemId === problem.id && sub.status === 'ACCEPTED'
                );
                
                return (
                  <Link
                    key={problem.id}
                    href={`/problems/${problem.id}/challenge?challengeId=${challenge.id}&groupId=${challenge.group.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-950 transition-all"
                  >
                    <div className="flex items-center">
                      <div className={`w-2 h-10 rounded-l-md mr-3 ${
                        userSubmission
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`}></div>
                      <div>
                        <h3 className="font-medium">{problem.title}</h3>
                        <div className="flex mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${
                            problem.difficulty === 'EASY'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : problem.difficulty === 'MEDIUM'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {problem.difficulty}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {challengeProblem._count.submissions} submissions
                          </span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No problems have been added to this challenge yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 