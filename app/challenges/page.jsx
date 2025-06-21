import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';
import { Clock, Calendar, Users, ArrowRight, Filter } from 'lucide-react';
import { prisma } from '@/app/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Challenges - BroCode',
  description: 'View and participate in group coding challenges.',
};

async function getChallenges(userId) {
  // Get challenges for groups the user is a member of
  const userChallenges = await prisma.challenge.findMany({
    where: {
      group: {
        members: {
          some: {
            userId,
          },
        },
      },
    },
    include: {
      group: true,
      _count: {
        select: {
          problems: true,
          submissions: true,
        },
      },
    },
    orderBy: [
      {
        startTime: 'asc',
      },
    ],
  });

  // Separate challenges into active, upcoming, and past
  const now = new Date();
  
  const activeChallenges = userChallenges.filter(
    (challenge) => 
      challenge.startTime <= now && 
      challenge.endTime >= now && 
      challenge.isActive
  );
  
  const upcomingChallenges = userChallenges.filter(
    (challenge) => 
      challenge.startTime > now && 
      challenge.isActive
  );
  
  const pastChallenges = userChallenges.filter(
    (challenge) => 
      challenge.endTime < now || 
      !challenge.isActive
  );

  return {
    activeChallenges,
    upcomingChallenges,
    pastChallenges,
  };
}

export default async function ChallengesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/challenges');
  }

  const { activeChallenges, upcomingChallenges, pastChallenges } = await getChallenges(session.user.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Challenges</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Test your skills with coding competitions
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <div className="relative inline-block">
            <button className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Active Challenges */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-green-600" />
          Active Challenges
        </h2>
        
        {activeChallenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeChallenges.map((challenge) => (
              <Link 
                key={challenge.id} 
                href={`/challenges/${challenge.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{challenge.title}</h3>
                        <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                          Active
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Ends {formatDistanceToNow(new Date(challenge.endTime), { addSuffix: true })}
                      </p>
                      <div className="flex items-center mt-4">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{challenge.group.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Problems: </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{challenge._count.problems}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Submissions: </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{challenge._count.submissions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No active challenges at the moment.</p>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Check the upcoming section below or join more groups.</p>
          </div>
        )}
      </div>

      {/* Upcoming Challenges */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          Upcoming Challenges
        </h2>
        
        {upcomingChallenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingChallenges.map((challenge) => (
              <Link 
                key={challenge.id} 
                href={`/challenges/${challenge.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full mr-3">
                      <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{challenge.title}</h3>
                        <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full text-xs font-medium">
                          Upcoming
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Starts {formatDistanceToNow(new Date(challenge.startTime), { addSuffix: true })}
                      </p>
                      <div className="flex items-center mt-4">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{challenge.group.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Problems: </span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{challenge._count.problems}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Details</span>
                        <ArrowRight className="h-4 w-4 ml-1 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">No upcoming challenges scheduled.</p>
            <Link 
              href="/groups"
              className="mt-3 inline-block text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Find more groups to join
            </Link>
          </div>
        )}
      </div>

      {/* Past Challenges */}
      {pastChallenges.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-500" />
            Past Challenges
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Challenge
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Group
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Problems
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pastChallenges.map((challenge) => (
                    <tr key={challenge.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {challenge.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {challenge.group.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(challenge.startTime).toLocaleDateString()} - {new Date(challenge.endTime).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {challenge._count.problems}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link 
                          href={`/challenges/${challenge.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          View Results
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
