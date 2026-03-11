'use client';

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

export default function ClientDashboardPage({ userStats, userName }) {
  // Calculate completion rate
  const completionRate = userStats?.submissionCount > 0 
    ? Math.round((userStats.problemsSolved / userStats.submissionCount) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your progress and keep coding
          </p>
        </div>
      
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Problems Solved</span>
              <Code className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{userStats?.problemsSolved || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Groups Joined</span>
              <Users className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{userStats?.groupCount || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Submissions</span>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{userStats?.submissionCount || 0}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Success Rate</span>
              <Award className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{completionRate}%</p>
          </div>
        </div>
      
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                  <Link
                    href="/submissions"
                    prefetch={true}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    View all
                  </Link>
                </div>
              </div>
              
              <div className="p-6">
                {userStats?.recentSubmissions?.length > 0 ? (
                  <div className="space-y-2">
                    {userStats.recentSubmissions.map((submission) => (
                      <div 
                        key={submission.id} 
                        className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <Link 
                            href={`/problems/${submission.problemId}`} 
                            prefetch={true} 
                            className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 text-sm"
                          >
                            {submission.problem.title}
                          </Link>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs font-medium ${
                              submission.problem.difficulty === 'EASY' ? 'text-green-600 dark:text-green-400' :
                              submission.problem.difficulty === 'MEDIUM' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {submission.problem.difficulty.charAt(0) + submission.problem.difficulty.slice(1).toLowerCase()}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <time className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                            </time>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ml-4 ${
                          submission.status === 'ACCEPTED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                          submission.status === 'WRONG_ANSWER' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {submission.status.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Code className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">No recent submissions yet</p>
                    <Link
                      href="/problems"
                      prefetch={true}
                      className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Start solving problems
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Recommended Problems */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Start</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link 
                    href="/problems?difficulty=EASY"
                    prefetch={true} 
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm mb-0.5">Easy Problems</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Build fundamentals</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </Link>
                  
                  <Link 
                    href="/problems?difficulty=MEDIUM"
                    prefetch={true} 
                    className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-sm mb-0.5">Medium Problems</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Level up skills</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Challenges */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming Challenges</h2>
              </div>
              
              <div className="p-6">
                {userStats?.upcomingChallenges?.length > 0 ? (
                  <div className="space-y-3">
                    {userStats.upcomingChallenges.map((challenge) => (
                      <div 
                        key={challenge.id} 
                        className="pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">{challenge.title}</h3>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <Users className="h-3.5 w-3.5 mr-1" />
                          <span>{challenge.group.name}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          <span>{new Date(challenge.startTime).toLocaleDateString()}</span>
                        </div>
                        <Link 
                          href={`/challenges/${challenge.id}`}
                          prefetch={true}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          View details →
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">No upcoming challenges</p>
                    <Link
                      href="/groups"
                      prefetch={true}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Join a group →
                    </Link>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Links</h2>
              </div>
              <div className="p-4">
                <div className="space-y-1">
                  <Link 
                    href="/problems"
                    prefetch={true} 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <BookOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Problem Library</span>
                  </Link>
                  <Link 
                    href="/groups"
                    prefetch={true} 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">My Groups</span>
                  </Link>
                  <Link 
                    href="/leaderboard"
                    prefetch={true} 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <BarChart className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Leaderboard</span>
                  </Link>
                  <Link 
                    href="/groups/create"
                    prefetch={true} 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <PlusCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Create Group</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
