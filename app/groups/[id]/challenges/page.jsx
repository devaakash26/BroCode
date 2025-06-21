'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, PlusCircle, Clock, Calendar, Trophy, Flag } from 'lucide-react';
import { ChallengeSkeleton } from '@/components/ui/card-skeleton';
import { toast } from 'react-hot-toast';

export default function GroupChallengesPage({ params }) {
  const { id: groupId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [challenges, setChallenges] = useState([]);
  const [group, setGroup] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'upcoming', 'past'
  
  // Fetch group and challenges
  useEffect(() => {
    if (status === 'loading') return;
    
    const fetchData = async () => {
      try {
        // Fetch group info first
        const groupResponse = await fetch(`/api/groups/${groupId}`);
        if (!groupResponse.ok) {
          throw new Error('Failed to fetch group');
        }
        const groupData = await groupResponse.json();
        setGroup(groupData.group);
        setIsAdmin(groupData.isAdmin);
        
        // Then fetch challenges
        const statusParam = activeFilter !== 'all' ? `&status=${activeFilter}` : '';
        const challengesResponse = await fetch(`/api/groups/${groupId}/challenges?limit=50${statusParam}`);
        if (!challengesResponse.ok) {
          throw new Error('Failed to fetch challenges');
        }
        const challengesData = await challengesResponse.json();
        setChallenges(challengesData.challenges || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load challenges');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [groupId, status, activeFilter]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}/challenges`);
    }
  }, [status, router, groupId]);
  
  if (isLoading || status === 'loading') {
    return <ChallengeSkeleton />;
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
  
  // Helper function to categorize challenges
  const getChallengeStatus = (challenge) => {
    const now = new Date();
    const startTime = new Date(challenge.startTime);
    const endTime = new Date(challenge.endTime);
    
    if (now < startTime) return 'upcoming';
    if (now > endTime) return 'past';
    return 'active';
  };
  
  // Apply client-side filtering (in addition to server filtering)
  const filteredChallenges = activeFilter === 'all' 
    ? challenges 
    : challenges.filter(challenge => getChallengeStatus(challenge) === activeFilter);
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with back button */}
      <div className="mb-6">
        <Link 
          href={`/groups/${groupId}`} 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Group
        </Link>
      </div>
      
      {/* Challenges header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">{group.name} Challenges</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Compete with other members and improve your skills
          </p>
        </div>
        
        {isAdmin && (
          <Link
            href={`/groups/${groupId}/create-challenge`}
            className="mt-4 md:mt-0 inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Challenge
          </Link>
        )}
      </div>
      
      {/* Filter tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 text-sm font-medium ${
            activeFilter === 'all'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          All Challenges
        </button>
        <button
          onClick={() => setActiveFilter('active')}
          className={`px-4 py-2 text-sm font-medium ${
            activeFilter === 'active'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveFilter('upcoming')}
          className={`px-4 py-2 text-sm font-medium ${
            activeFilter === 'upcoming'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveFilter('past')}
          className={`px-4 py-2 text-sm font-medium ${
            activeFilter === 'past'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Past
        </button>
      </div>
      
      {/* Challenge list */}
      {filteredChallenges.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <Flag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No challenges found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isAdmin 
              ? "This group doesn't have any challenges yet. Create the first one!"
              : "This group doesn't have any challenges yet."}
          </p>
          {isAdmin && (
            <Link
              href={`/groups/${groupId}/create-challenge`}
              className="inline-flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Challenge
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map((challenge) => {
            const status = getChallengeStatus(challenge);
            const statusColors = {
              active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
              upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
              past: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-400'
            };
            
            return (
              <div 
                key={challenge.id}
                className="border dark:border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded ${statusColors[status]}`}>
                      {status === 'active' && 'Active'}
                      {status === 'upcoming' && 'Upcoming'}
                      {status === 'past' && 'Ended'}
                    </span>
                    {!challenge.isPublic && (
                      <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded dark:bg-yellow-900/30 dark:text-yellow-400">
                        Private
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">{challenge.title}</h3>
                  
                  {challenge.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {challenge.description}
                    </p>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <Trophy className="h-4 w-4 mr-1" />
                    <span>{challenge._count?.problems || 0} Problems</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      {new Date(challenge.startTime).toLocaleDateString()} - {new Date(challenge.endTime).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <Link
                      href={`/groups/${groupId}/challenges/${challenge.id}`}
                      className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center py-2 rounded-md transition-colors"
                    >
                      {status === 'active' && 'Join Now'}
                      {status === 'upcoming' && 'View Details'}
                      {status === 'past' && 'View Results'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 