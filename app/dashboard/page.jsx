'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowRight, 
  PlusCircle, 
  Code, 
  Users, 
  Clock, 
  Award, 
  BookOpen, 
  BarChart, 
  Calendar 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, TableRowSkeleton } from '@/components/ui/card-skeleton';
import { LoadingPage } from '@/components/ui/loading';

export default function DashboardPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/auth/signin');
    },
  });

  const [userStats, setUserStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchUserStats();
    }
  }, [session]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/dashboard-stats');
      const data = await response.json();
      
      if (data.success) {
        setUserStats(data.stats);
      } else {
        console.error('Failed to load dashboard data:', data.message);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state when session is loading or user stats are loading
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return <DashboardSkeleton />;
  }

  // Calculate completion rate
  const completionRate = userStats?.submissionCount > 0 
    ? Math.round((userStats.problemsSolved / userStats.submissionCount) * 100) 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section with Quick Stats */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg mb-8 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome back, {session.user.name}</h1>
              <p className="text-indigo-100 mt-2">Track your progress and keep coding!</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/problems"
                className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors"
              >
                Practice Now
              </Link>
              <Link
                href="/groups/join"
                className="rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800 transition-colors"
              >
                Join Group
              </Link>
            </div>
          </div>
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <Code className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-indigo-100">Problems Solved</p>
                  <p className="text-xl font-bold text-white">{userStats?.problemsSolved || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-indigo-100">Groups Joined</p>
                  <p className="text-xl font-bold text-white">{userStats?.groupCount || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-indigo-100">Total Submissions</p>
                  <p className="text-xl font-bold text-white">{userStats?.submissionCount || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-white/20">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-indigo-100">Success Rate</p>
                  <p className="text-xl font-bold text-white">{completionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <Link
                  href="/submissions"
                  className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                >
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              
              <div className="space-y-4">
                {userStats?.recentSubmissions?.length > 0 ? (
                  userStats.recentSubmissions.map((submission) => (
                    <div 
                      key={submission.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <Link href={`/problems/${submission.problemId}`} className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
                            {submission.problem.title}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Difficulty: <span className={`font-medium ${
                              submission.problem.difficulty === 'EASY' ? 'text-green-600 dark:text-green-400' :
                              submission.problem.difficulty === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {submission.problem.difficulty.charAt(0) + submission.problem.difficulty.slice(1).toLowerCase()}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-medium px-2 py-1 rounded ${
                            submission.status === 'ACCEPTED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            submission.status === 'WRONG_ANSWER' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {submission.status.replace('_', ' ')}
                          </span>
                          <time className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                          </time>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No recent submissions yet</p>
                    <Link
                      href="/problems"
                      className="mt-2 inline-flex items-center text-indigo-600 dark:text-indigo-400"
                    >
                      Start solving problems <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Recommendations Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recommended Problems</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  href="/problems?difficulty=EASY" 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Code className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium">Easy Problems</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Practice fundamentals</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition" />
                  </div>
                </Link>
                
                <Link 
                  href="/problems?difficulty=MEDIUM" 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        <Code className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium">Medium Problems</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Level up your skills</p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-500 transition" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Challenges */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Challenges</h2>
              
              {userStats?.upcomingChallenges?.length > 0 ? (
                <div className="space-y-4">
                  {userStats.upcomingChallenges.map((challenge) => (
                    <div 
                      key={challenge.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <h3 className="font-medium">{challenge.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{challenge.group.name}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{new Date(challenge.startTime).toLocaleString()}</span>
                      </div>
                      <Link 
                        href={`/challenges/${challenge.id}`}
                        className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                      >
                        View details <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 dark:text-gray-400">No upcoming challenges</p>
                  <Link
                    href="/groups"
                    className="mt-2 inline-flex items-center text-indigo-600 dark:text-indigo-400"
                  >
                    Join a group <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Quick Links */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
              <div className="space-y-2">
                <Link 
                  href="/problems" 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <BookOpen className="h-5 w-5 text-indigo-500" />
                  <span className="ml-3 font-medium">Problem Library</span>
                </Link>
                <Link 
                  href="/groups" 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span className="ml-3 font-medium">My Groups</span>
                </Link>
                <Link 
                  href="/submissions" 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <BarChart className="h-5 w-5 text-indigo-500" />
                  <span className="ml-3 font-medium">My Progress</span>
                </Link>
                <Link 
                  href="/groups/create" 
                  className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                >
                  <PlusCircle className="h-5 w-5 text-indigo-500" />
                  <span className="ml-3 font-medium">Create Group</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section Skeleton */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg mb-8 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0">
              <Skeleton className="h-8 w-64 bg-white/20" />
              <Skeleton className="h-4 w-48 bg-white/20 mt-2" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28 bg-white/20 rounded-md" />
              <Skeleton className="h-10 w-28 bg-white/20 rounded-md" />
            </div>
          </div>
          
          {/* Quick Stats Cards Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center">
                  <Skeleton className="h-9 w-9 rounded-full bg-white/20" />
                  <div className="ml-3">
                    <Skeleton className="h-3 w-24 bg-white/20" />
                    <Skeleton className="h-6 w-12 bg-white/20 mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
              
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Recommendations Section Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Challenges Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <Skeleton className="h-6 w-44 mb-4" />
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick Links Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
