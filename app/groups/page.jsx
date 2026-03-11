import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/app/lib/db';
import Link from 'next/link';
import { Users, Plus, ChevronRight, AlertTriangle, RefreshCw, Search, Globe, Code } from 'lucide-react';
import { LoadingPage } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Groups - BroCode',
  description: 'Find, create, and manage your coding groups.',
};

async function getGroups(userId) {
  try {
    // Run both queries in parallel instead of sequentially
    const [userGroups, otherGroups] = await Promise.all([
      // 1) User's groups — use select instead of include
      prisma.userGroup.findMany({
        where: { userId },
        select: {
          role: true,
          group: {
            select: {
              id: true,
              name: true,
              description: true,
              visibility: true,
              image: true,
              _count: {
                select: { members: true, challenges: true },
              },
            },
          },
        },
      }),
      // 2) Discover groups — avoid the slow `none` subquery
      //    Instead, get public groups ordered by popularity, then filter in JS
      prisma.group.findMany({
        where: {
          isActive: true,
          visibility: 'PUBLIC',
        },
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          image: true,
          _count: {
            select: { members: true, challenges: true },
          },
        },
        orderBy: {
          members: { _count: 'desc' },
        },
        take: 20, // fetch a few extra to filter out user's groups
      }),
    ]);

    // Build a set of the user's group IDs for fast lookup
    const userGroupIds = new Set(userGroups.map(ug => ug.group.id));

    return {
      userGroups: userGroups.map(ug => ({
        ...ug.group,
        role: ug.role,
      })),
      // Filter out groups the user already belongs to (in JS, not a DB subquery)
      otherGroups: otherGroups
        .filter(g => !userGroupIds.has(g.id))
        .slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching groups:', error);
    return { 
      error: true, 
      message: 'Failed to load groups', 
      details: error.message
    };
  }
}

export default async function GroupsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return (
      <div className="container py-10">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sign in to view groups</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Please sign in to view and join coding groups.
          </p>
          <div className="mt-6">
            <Link
              href="/auth/signin"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const groupsData = await getGroups(session.user.id);
  
  // Check if there was an error fetching the groups
  if (groupsData.error) {
    return (
      <div className="container py-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
              {groupsData.message}
            </h2>
          </div>
          <div className="mt-4 text-sm text-red-700 dark:text-red-300">
            <p>We're having trouble connecting to our database. This could be due to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Temporary maintenance</li>
              <li>Connection issues</li>
              <li>Server configuration problems</li>
            </ul>
          </div>
          <div className="mt-6">
            <Link 
              href="/groups" 
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const { userGroups, otherGroups } = groupsData;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              Coding Groups
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Collaborate, compete, and learn with other coders
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/groups/join"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Join a Group
            </Link>
            <Link
              href="/groups/create"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Group
            </Link>
          </div>
        </div>

        {/* My Groups Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">My Groups</h2>
          </div>
          
          {userGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                    {group.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group._count.members} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      <span>{group._count.challenges} challenges</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">No groups yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6">
                Join a group to participate in coding challenges or create your own community
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/groups/join"
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Join a Group
                </Link>
                <Link
                  href="/groups/create"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Group
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Discover Groups */}
        {otherGroups.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                Discover Groups
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                    {group.description || 'No description provided'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{group._count.members} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5" />
                      <span>{group._count.challenges} challenges</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
