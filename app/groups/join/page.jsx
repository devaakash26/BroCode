'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight, Users } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

export default function JoinGroupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get('code');
  
  const [manualCode, setManualCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasInviteCode, setHasInviteCode] = useState(false);
  
  useEffect(() => {
    // If code is in URL and user is authenticated, join automatically
    if (inviteCode && status === 'authenticated') {
      setHasInviteCode(true);
      joinGroup(inviteCode);
    }
  }, [inviteCode, status]);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/groups/join${inviteCode ? `?code=${inviteCode}` : ''}`)}`);
    }
  }, [status, router, inviteCode]);
  
  const joinGroup = async (code) => {
    if (isJoining) return;
    
    setIsJoining(true);
    try {
      const response = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode: code }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join group');
      }
      
      toast.success('Successfully joined the group!');
      
      // Wait a moment to show the success message
      setTimeout(() => {
        router.push(`/groups/${data.groupId}`);
      }, 1500);
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
      setIsJoining(false);
    }
  };
  
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    
    joinGroup(manualCode.trim());
  };
  
  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <div className="text-center mb-8">
        <div className="flex justify-center">
          <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-full p-4 mb-4">
            <UserPlus className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Join a Group</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {hasInviteCode 
            ? 'Processing your invite code...' 
            : 'Enter a group invite code to join'}
        </p>
      </div>
      
      {!hasInviteCode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invite Code
              </label>
              <input
                type="text"
                id="inviteCode"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800"
                disabled={isJoining}
              />
            </div>
            <button
              type="submit"
              disabled={isJoining}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining...
                </>
              ) : (
                <>
                  Join Group
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Don't have an invite code?
            </p>
            <Link
              href="/groups"
              className="block w-full bg-gray-100 dark:bg-gray-700 text-center py-2 px-4 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-800 dark:text-gray-200"
            >
              <Users className="inline-block mr-2 h-4 w-4" />
              Browse Public Groups
            </Link>
          </div>
        </div>
      )}
      
      {hasInviteCode && isJoining && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Joining group with invite code: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{inviteCode}</span></p>
        </div>
      )}
    </div>
  );
} 
