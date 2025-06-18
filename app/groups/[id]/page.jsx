'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { 
  Users, 
  PlusCircle, 
  Calendar, 
  Trophy, 
  Clock, 
  MessageCircle, 
  Settings, 
  ChevronDown,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import GroupChat from '@/app/components/GroupChat';
import { LoadingPage } from '@/components/ui/loading';
import useSocket from '@/app/hooks/useSocket';
import InviteMembersDialog from '@/components/InviteMembersDialog';

export default function GroupDetailPage({ params }) {
  const { id: groupId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket, isConnected, joinGroup, subscribe, sendHeartbeat } = useSocket({ disableToasts: true });
  
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [activeMembers, setActiveMembers] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [showActiveChallenges, setShowActiveChallenges] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState([]);
  
  // Fetch group data
  useEffect(() => {
    const fetchGroupData = async () => {
      if (status === 'loading') return;
      
      try {
        const response = await fetch(`/api/groups/${groupId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch group');
        }
        
        setGroup(data.group);
        setIsAdmin(data.isAdmin);
        setIsMember(data.isMember);
        
        // Prepare leaderboard data from members
        if (data.group.members) {
          const leaderboard = data.group.members
            .map(member => ({
              userId: member.userId,
              userName: member.user.name,
              userImage: member.user.image,
              score: member.score,
              solvedCount: member.solvedCount,
              lastActive: member.lastActive
            }))
            .sort((a, b) => b.score - a.score);
          
          setLeaderboardData(leaderboard);
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupData();
  }, [groupId, status]);
  
  // Socket connection for real-time updates
  useEffect(() => {
    if (!group) return; // Don't try to connect if no group data
    
    // Only attempt to join the socket group if we're connected
    if (isConnected) {
      try {
        // Join the group room
        joinGroup(groupId);
        
        // Send initial heartbeat to establish presence
        sendHeartbeat({ groupId });
        
        // Send heartbeat every 30 seconds to maintain online presence
        const heartbeatInterval = setInterval(() => {
          if (isConnected) {
            sendHeartbeat({ groupId });
          }
        }, 30000);
        
        // Subscribe to member activity updates
        const unsubscribeMemberActive = subscribe('memberActive', (data) => {
          if (data.groupId === groupId) {
          setActiveMembers(prev => {
            // Add or update active member
            const exists = prev.some(member => member.userId === data.userId);
            if (exists) {
              return prev.map(member => 
                member.userId === data.userId 
                  ? { ...member, timestamp: data.timestamp } 
                  : member
              );
            } else {
              return [...prev, data];
            }
          });
          }
        });
        
        // Subscribe to leaderboard updates
        const unsubscribeLeaderboard = subscribe('leaderboardUpdate', (data) => {
          if (data.groupId === groupId) {
            setLeaderboardData(data.leaderboard);
          }
        });
        
        // Subscribe to member count updates
        const unsubscribeMemberCount = subscribe('memberCountUpdate', (data) => {
          if (data.groupId === groupId) {
            console.log('Member count update received:', data);
            // Force refresh activeMembers to ensure it's accurate
              setActiveMembers(prev => {
                // Clean up stale members
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                return prev.filter(member => new Date(member.timestamp) > fiveMinutesAgo);
              });
          }
        });
        
        // Clean up subscriptions
        return () => {
          unsubscribeMemberActive && unsubscribeMemberActive();
          unsubscribeLeaderboard && unsubscribeLeaderboard();
          unsubscribeMemberCount && unsubscribeMemberCount();
          clearInterval(heartbeatInterval);
        };
      } catch (error) {
        console.error('Socket connection error:', error);
        // Don't show error toast, just silently fail for real-time features
        // The page will still work without real-time updates
      }
    }
  }, [groupId, isConnected, group, joinGroup, subscribe, sendHeartbeat]);
  
  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}`);
    }
  }, [status, router, groupId]);
  
  if (isLoading || status === 'loading') {
    return <LoadingPage />;
  }

  if (!group) {
  return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Group not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The group you're looking for doesn't exist or you don't have permission to view it.
          </p>
        <Link
          href="/groups"
            className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-md font-medium hover:bg-indigo-700 transition-colors"
        >
            Browse Groups
        </Link>
        </div>
      </div>
    );
  }
  
  // Check if there are active members online (activity in the last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const onlineMembers = activeMembers.filter(
    member => new Date(member.timestamp) > fiveMinutesAgo
  ).length;
  
  // Ensure we display accurate member counts
  const totalMemberCount = group?._count?.members || group?.members?.length || 0;
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Group Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl shadow-xl overflow-hidden mb-8">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center">
            {/* Group Avatar */}
            <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              <div className="relative h-24 w-24 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center">
                {group.image ? (
                  <Image 
                    src={group.image} 
                    alt={group.name} 
                    fill 
                    className="object-cover"
                  />
                ) : (
                  <Users className="h-12 w-12 text-white" />
                )}
              </div>
            </div>
            
            {/* Group Info */}
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{group.name}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center text-indigo-100">
                      <Users className="h-4 w-4 mr-1" />
                      <span className="text-sm">{totalMemberCount} members</span>
                    </div>
                    <div className="flex items-center text-indigo-100">
                      <div className="h-2 w-2 rounded-full bg-green-400 mr-1.5"></div>
                      <span className="text-sm">{onlineMembers} online</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                  <InviteMembersDialog 
                    group={group} 
                    className="inline-flex items-center px-3.5 py-1.5 text-sm font-medium rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                  />
                  
                  {isMember && (
                    <Link
                      href={`/groups/${groupId}/settings`}
                      className="inline-flex items-center px-3.5 py-1.5 text-sm font-medium rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-1.5" />
                      Group Settings
                    </Link>
                  )}
                </div>
              </div>
              
              {group.description && (
                <p className="mt-4 text-indigo-100 max-w-3xl">{group.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Challenges Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setShowActiveChallenges(!showActiveChallenges)}
                  className="flex items-center text-xl font-bold text-gray-900 dark:text-white"
                >
                  {showActiveChallenges ? (
                    <ChevronDown className="h-5 w-5 mr-2 text-indigo-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 mr-2 text-indigo-600" />
                  )}
                  Active Challenges
                </button>
                
                {isAdmin && (
                <Link
                    href={`/groups/${groupId}/create-challenge`}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    New Challenge
                </Link>
                )}
              </div>
              
              {showActiveChallenges && (
                <div className="space-y-4">
                  {group.challenges && group.challenges.length > 0 ? (
                    <>
                      {group.challenges
                        .filter(challenge => new Date(challenge.endTime) > new Date())
                        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                        .map(challenge => (
                          <Link
                            key={challenge.id}
                            href={`/groups/${groupId}/challenges/${challenge.id}`}
                            className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                                  {challenge.title}
                                  {new Date() >= new Date(challenge.startTime) && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                      Active
                                    </span>
                                  )}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {challenge.description?.substring(0, 100)}
                                  {challenge.description?.length > 100 ? '...' : ''}
                                </p>
                                <div className="flex items-center gap-4 mt-3">
                                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                                    <Calendar className="h-3.5 w-3.5 mr-1" />
                                    <span>
                                      {new Date(challenge.startTime).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs">
                                    <Clock className="h-3.5 w-3.5 mr-1" />
                                    <span>
                                      {new Date(challenge.startTime).toLocaleTimeString()} - {new Date(challenge.endTime).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 md:mt-0">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                                  <ArrowUpRight className="h-3 w-3 mr-1" />
                                  Enter Challenge
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      <div className="text-center pt-2">
                        <Link
                          href={`/groups/${groupId}/challenges`}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          View all challenges
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">No active challenges</p>
                      {isAdmin && (
                        <Link
                          href={`/groups/${groupId}/create-challenge`}
                          className="mt-2 inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Create the first challenge
                        </Link>
                      )}
                    </div>
                  )}
              </div>
            )}
            </div>
          </div>

          {/* Group Chat */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-indigo-600" />
                Group Chat
              </h2>
              
              <GroupChat groupId={groupId} />
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-8">
          {/* Leaderboard */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <button 
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className="flex items-center text-lg font-bold w-full text-left mb-6 text-gray-900 dark:text-white"
              >
                {showLeaderboard ? (
                  <ChevronDown className="h-5 w-5 mr-2 text-indigo-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 mr-2 text-indigo-600" />
                )}
                <Trophy className="h-5 w-5 mr-2 text-indigo-600" />
                Leaderboard
              </button>
              
              {showLeaderboard && (
                <div className="space-y-2">
                  {leaderboardData.length > 0 ? (
                    leaderboardData.map((member, index) => (
                      <div 
                        key={member.userId}
                        className={`flex items-center p-3 rounded-lg ${
                          index === 0 
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30' 
                            : index === 1 
                              ? 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700' 
                              : index === 2 
                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      >
                        <div className="w-8 text-center mr-3">
                          <span className={`text-lg font-bold ${
                            index === 0 
                              ? 'text-yellow-600 dark:text-yellow-400' 
                              : index === 1 
                                ? 'text-gray-600 dark:text-gray-300' 
                                : index === 2 
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-shrink-0 mr-3">
                          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            {member.userImage ? (
                              <Image 
                                src={member.userImage} 
                                alt={member.userName} 
                                width={40} 
                                height={40} 
                                className="object-cover"
                              />
                            ) : (
                              <div className="text-gray-500 dark:text-gray-400 font-medium">
                                {member.userName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-grow">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {member.userName}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.solvedCount} problems solved
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                            {member.score}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400">No activity yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Start solving challenges to appear on the leaderboard!
                      </p>
                    </div>
                  )}
                </div>
              )}
                    </div>
                  </div>
          
          {/* Members List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center text-gray-900 dark:text-white">
                  <Users className="h-5 w-5 mr-2 text-indigo-600" />
                  Members
                </h2>
                
                {group.currentMembers > 5 && (
                  <Link
                    href={`/groups/${groupId}/members`}
                    className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    View all
                  </Link>
                )}
              </div>
              
              <div className="space-y-3">
                {group.members && group.members.slice(0, 5).map(member => {
                  const isOnline = activeMembers.some(
                    activeMember => 
                      activeMember.userId === member.userId && 
                      new Date(activeMember.timestamp) > fiveMinutesAgo
                  );
                  
                  return (
                    <div key={member.userId} className="flex items-center">
                      <div className="relative flex-shrink-0 mr-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {member.user.image ? (
                            <Image 
                              src={member.user.image} 
                              alt={member.user.name} 
                              width={40} 
                              height={40} 
                              className="object-cover"
                            />
                          ) : (
                            <div className="text-gray-500 dark:text-gray-400 font-medium">
                              {member.user.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
            )}
          </div>

                      <div className="flex-grow">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user.name}
                          {member.role === 'ADMIN' && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                              Admin
                      </span>
                    )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                  </div>
                    </div>
                  );
                })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 