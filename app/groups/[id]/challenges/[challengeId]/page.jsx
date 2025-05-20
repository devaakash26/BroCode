'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, Trophy, UserCheck, Flag, BarChart, User } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

export default function ChallengeDetailsPage({ params }) {
  const { id: groupId, challengeId } = params;
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [challenge, setChallenge] = useState(null);
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('problems'); // 'problems', 'leaderboard', 'details'
  
  // Add state for leaderboard data
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState({ hasStarted: false, hasEnded: false });
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  
  // Fetch challenge and group data
  useEffect(() => {
    if (authStatus === 'loading') return;
    
    const fetchData = async () => {
      try {
        // Fetch group info
        const groupResponse = await fetch(`/api/groups/${groupId}`);
        if (!groupResponse.ok) {
          throw new Error('Failed to fetch group');
        }
        const groupData = await groupResponse.json();
        setGroup(groupData.group);
        
        // Fetch challenge details from actual API endpoint
        const challengeResponse = await fetch(`/api/groups/${groupId}/challenges/${challengeId}`);
        if (!challengeResponse.ok) {
          throw new Error('Failed to fetch challenge details');
        }
        const challengeData = await challengeResponse.json();
        setChallenge(challengeData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load challenge details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [groupId, challengeId, authStatus]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}/challenges/${challengeId}`);
    }
  }, [authStatus, router, groupId, challengeId]);
  
  // Add function to fetch leaderboard data
  const fetchLeaderboard = async () => {
    if (!challengeId || !groupId) return;
    
    setIsLeaderboardLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setLeaderboardStatus(data.status);
      } else {
        console.error('Failed to fetch leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLeaderboardLoading(false);
    }
  };
  
  // Fetch leaderboard when tab changes to leaderboard
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab]);
  
  if (isLoading || authStatus === 'loading') {
    return (
      <div className="container py-8 flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!challenge || !group) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Challenge not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The challenge you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link 
            href={`/groups/${groupId}/challenges`} 
            className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-md font-medium hover:bg-indigo-700 transition-colors"
          >
            Back to Challenges
          </Link>
        </div>
      </div>
    );
  }
  
  // Helper function to determine the challenge status
  const getChallengeStatus = () => {
    const now = new Date();
    const startTime = new Date(challenge.startTime);
    const endTime = new Date(challenge.endTime);
    
    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'past';
    return 'active';
  };
  
  const challengeStatus = getChallengeStatus();
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    past: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
  };
  
  const formattedStartDate = new Date(challenge.startTime).toLocaleString();
  const formattedEndDate = new Date(challenge.endTime).toLocaleString();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <Toaster position="top-center" />
      
      {/* Header with back button */}
      <div className="mb-6">
        <Link 
          href={`/groups/${groupId}/challenges`} 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Challenges
        </Link>
      </div>
      
      {/* Challenge Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${statusColors[challengeStatus]}`}>
              {challengeStatus === 'active' && 'Active'}
              {challengeStatus === 'upcoming' && 'Upcoming'}
              {challengeStatus === 'past' && 'Ended'}
            </span>
            {!challenge.isPublic && (
              <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded dark:bg-yellow-900/30 dark:text-yellow-400">
                Private
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">{challenge.title}</h1>
          
          {challenge.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {challenge.description}
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              <div>
                <div><strong>Start:</strong> {formattedStartDate}</div>
                <div><strong>End:</strong> {formattedEndDate}</div>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <UserCheck className="h-4 w-4 mr-2" />
              <div>
                <div><strong>Participants:</strong> {challenge.participants}</div>
                <div><strong>Created by:</strong> {challenge.creator.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'problems'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Problems
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'leaderboard'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'details'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Details
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {activeTab === 'problems' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Challenge Problems</h2>
            
            {challenge.problems.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No problems in this challenge.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {challenge.problems.map((problem, index) => (
                  <div key={problem.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-gray-500 dark:text-gray-400 mr-4">{index + 1}.</span>
                      <div>
                        <h3 className="font-medium">{problem.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 inline-block
                          ${problem.difficulty === 'EASY' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                            problem.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {problem.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <Link
                      href={`/problems/${problem.id}/challenge?challengeId=${challengeId}&groupId=${groupId}`}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
                    >
                      Solve
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'leaderboard' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Leaderboard</h2>
            
            {isLeaderboardLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Problems Solved
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {leaderboard.map((entry) => (
                      <tr key={entry.user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            entry.rank === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' :
                            entry.rank === 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {entry.user.image ? (
                              <div className="relative h-8 w-8 rounded-full overflow-hidden mr-3">
                                <Image
                                  src={entry.user.image}
                                  alt={`${entry.user.name}'s avatar`}
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 mr-3">
                                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              </div>
                            )}
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {entry.user.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {entry.problemsSolved}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {entry.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
            <div className="mt-4 text-center py-10">
              <BarChart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                  {!leaderboardStatus.hasStarted 
                    ? 'Leaderboard will be available once the challenge begins.' 
                    : leaderboardStatus.hasEnded && leaderboard.length === 0
                      ? 'Challenge has ended. No submissions were made.'
                      : 'No submissions yet. Be the first to submit!'}
              </p>
            </div>
            )}
          </div>
        )}
        
        {activeTab === 'details' && (
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Challenge Details</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</h3>
                <p className="mt-1">{challenge.description || 'No description provided.'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Rules</h3>
                <ul className="mt-1 list-disc list-inside text-gray-600 dark:text-gray-400">
                  <li>Solve as many problems as you can before the challenge ends</li>
                  <li>Points are awarded based on difficulty and submission time</li>
                  <li>Each correct submission earns points: Easy (100), Medium (200), Hard (300)</li>
                  <li>Partial solutions are not awarded points</li>
                  <li>You can submit multiple times, only your best submission counts</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Visibility</h3>
                <p className="mt-1">This challenge is {challenge.isPublic ? 'public' : 'private'} to members of {group.name}.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 