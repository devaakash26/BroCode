'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import AccountSettingsTab from '../components/profile/AccountSettingsTab';
import DangerZoneTab from '../components/profile/DangerZoneTab';
import StatsCards from '../components/profile/StatsCards';
import ContributionGraph from '../components/profile/ContributionGraph';
import RecentActivity from '../components/profile/RecentActivity';
import LeetCodeStats from '../components/profile/LeetCodeStats';
import { User } from 'lucide-react';
import UserQueriesPage from './queries/page';

export function ProfileClientPage({ user: initialUser }) {
  const { data: session, update } = useSession();
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('overview');
  const [leetcodeStats, setLeetcodeStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchLeetCodeStats = async () => {
      if (user.leetcodeUsername) {
        setIsLoadingStats(true);
        try {
          const res = await fetch(`/api/leetcode-stats?username=${user.leetcodeUsername}`);
          const data = await res.json();
          if (data.success) {
            setLeetcodeStats(data.stats);
          } else {
            setLeetcodeStats(null);
          }
        } catch (error) {
          setLeetcodeStats(null);
        } finally {
          setIsLoadingStats(false);
        }
      } else {
        setIsLoadingStats(false);
        setLeetcodeStats(null);
      }
    };
    fetchLeetCodeStats();
  }, [user.leetcodeUsername]);

  const onUserUpdate = useCallback((updatedUser) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUser }));
    update(updatedUser);
  }, [update]);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <User className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">Loading profile...</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch your data.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <ProfileHeader user={user} onUserUpdate={onUserUpdate} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <StatsCards stats={user.stats} />
          <div className="mt-8">
            <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="mt-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <ContributionGraph data={user.contributionData} />
                    </div>
                  </div>
                  <div className="lg:col-span-1 sticky top-24 space-y-8">
                    <LeetCodeStats stats={leetcodeStats} isLoading={isLoadingStats} />
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                      <RecentActivity activity={user.recentActivity} />
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'queries' && (
                <UserQueriesPage />
              )}
              {activeTab === 'settings' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <AccountSettingsTab user={user} onUserUpdate={onUserUpdate} />
                </div>
              )}
              {activeTab === 'danger' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                  <DangerZoneTab user={user} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
