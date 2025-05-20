import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma, checkDatabaseConnection } from '@/app/lib/db';
import Link from 'next/link';
import { Users, Plus, ChevronRight, AlertTriangle, RefreshCw, Search, Globe, Star, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Groups - NeetCode',
  description: 'Join or create groups for DSA challenges',
};

async function getGroups(userId) {
  try {
    // Check database connection first
    const connectionStatus = await checkDatabaseConnection();
    if (!connectionStatus.connected) {
      console.error('Database connection issue:', connectionStatus.error);
      return { 
        error: true, 
        message: 'Unable to connect to database. Please try again later.',
        details: connectionStatus 
      };
    }

    // Get the user's groups
    const userGroups = await prisma.userGroup.findMany({
      where: {
        userId,
      },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
                challenges: true,
              },
            },
          },
        },
      },
    });

    // Get public groups the user is not part of (limited to 5)
    const otherGroups = await prisma.group.findMany({
      where: {
        isActive: true,
        visibility: 'PUBLIC',
        members: {
          none: {
            userId,
          },
        },
      },
      take: 5,
      include: {
        _count: {
          select: {
            members: true,
            challenges: true,
          },
        },
      },
      orderBy: {
        members: {
          _count: 'desc',
        },
      },
    });

    return {
      userGroups: userGroups.map(ug => ({
        ...ug.group,
        role: ug.role,
      })),
      otherGroups,
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
  const groupsData = session ? await getGroups(session.user.id) : { userGroups: [], otherGroups: [] };
  
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
        
        {/* Still show the create group button for better UX */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Can't load your groups right now</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            While we're resolving this issue, you can still create a new group.
          </p>
          <div className="mt-6">
            <Link
              href="/groups/create"
              className="rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="h-4 w-4 inline mr-1" />
              Create Group
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const { userGroups, otherGroups } = groupsData;

  return (
    <div className="container py-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg overflow-hidden mb-10">
        <div className="px-8 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
              Coding Groups
            </h1>
            <p className="mt-3 max-w-xl text-indigo-100">
              Collaborate, compete, and learn with other coders. Join existing groups 
              or create your own to tackle challenges together.
            </p>
          </div>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0 gap-4">
            <Link
              href="/groups/join"
              className="inline-flex items-center rounded-md bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition"
            >
              Join a Group
            </Link>
            <Link
              href="/groups/create"
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Group
            </Link>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-700 dark:border-gray-600 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search for groups..."
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option>Sort by: Newest</option>
                <option>Sort by: Most Active</option>
                <option>Sort by: Most Members</option>
                <option>Sort by: Alphabetical</option>
              </select>
            </div>
            
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* My Groups Section with Enhanced Cards */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Groups</h2>
          <Link
            href="/groups/manage"
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center"
          >
            Manage all groups
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        {userGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300 transform hover:-translate-y-1"
              >
                <div className="h-2 bg-gradient-to-r from-indigo-500 to-blue-500"></div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-md bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <span className={`ml-2 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      group.role === 'ADMIN' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    }`}>
                      {group.role}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10 mb-4">
                    {group.description || 'No description provided'}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-4">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4 mr-1.5" />
                        <span>{group._count.members}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>{group._count.challenges} challenges</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                      <span className="text-sm font-medium">View</span>
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">You haven't joined any groups yet</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Join a group to participate in coding challenges together with others or create your own community!
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/groups/join"
                  className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Browse Groups
                </Link>
                <Link
                  href="/groups/create"
                  className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <Plus className="h-4 w-4 inline mr-1.5" />
                  Create Group
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Discover Groups */}
      {otherGroups.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Globe className="h-5 w-5 text-indigo-500 mr-2" />
              Discover Groups
            </h2>
            <Link
              href="/groups/discover"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center"
            >
              View all groups
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="group bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {group.description || 'No description provided'}
                  </p>
                  
                  <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>{group._count.members}</span>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {group._count.challenges} challenges
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 