'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { CardSkeleton } from '@/components/ui/card-skeleton';

export default function UserProfileDialog({ userId, isOpen, onClose }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  // Fetch user data when dialog opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setUserData(data);
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to load user data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="user-profile-dialog" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with improved styling */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-filter backdrop-blur-[2px] transition duration-300 ease-in-out z-10" 
          aria-hidden="true" 
          onClick={onClose}
        ></div>
        
        {/* Dialog content with improved z-index */}
        <div className="inline-block align-bottom bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-700 relative z-20">
          {/* Header section */}
          <div className="relative">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-gray-800 rounded-full p-1 transition-all hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Enhanced background pattern */}
            <div className="h-32 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 relative overflow-hidden !z-[-1]">
              {/* Animated wave pattern */}
              <div className="absolute inset-0">
                <svg className="w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path 
                    d="M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z" 
                    fill="rgba(255,255,255,0.2)"
                  >
                    <animate 
                      attributeName="d" 
                      dur="10s" 
                      repeatCount="indefinite"
                      values="
                        M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z;
                        M0,50 Q25,70 50,50 Q75,30 100,50 L100,100 L0,100 Z;
                        M0,50 Q25,30 50,50 Q75,70 100,50 L100,100 L0,100 Z
                      "
                    />
                  </path>
                </svg>
              </div>
              
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>
            </div>
            
            {loading ? (
              <CardSkeleton />
            ) : error ? (
              <div className="p-6 text-center text-red-400">
                {error}
              </div>
            ) : userData ? (
              <>
                {/* User profile section */}
                <div className="px-6 pb-4 -mt-16">
                  <div className="flex flex-col sm:flex-row sm:items-end">
                    {/* Enhanced avatar with better glow effect */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-500 rounded-full opacity-70 blur-md group-hover:opacity-90 group-hover:blur-lg transition-all duration-300"></div>
                      <div className="relative h-24 w-24 rounded-full bg-indigo-700 border-4 border-gray-800 flex items-center justify-center text-white text-3xl font-bold mb-4 sm:mb-0 shadow-xl">
                        {userData.image ? (
                          <Image 
                            src={userData.image} 
                            alt={userData.name} 
                            width={96} 
                            height={96} 
                            className="rounded-full h-[87px]" 
                          />
                        ) : (
                          userData.name?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    </div>
                    
                    {/* User info */}
                    <div className="sm:ml-4">
                      <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{userData.name}</h2>
                      <p className="text-gray-400">Member since {userData.joinDate}</p>
                    </div>
                    
                    {/* Stats summary with improved styling */}
                    <div className="flex mt-4 sm:mt-0 sm:ml-auto space-x-4">
                      <div className="text-center px-3 py-2 bg-gray-800 rounded-lg shadow-inner">
                        <div className="text-xl font-bold text-white">{userData.solvedProblems.total}</div>
                        <div className="text-xs text-gray-400">Problems</div>
                      </div>
                      <div className="text-center px-3 py-2 bg-gray-800 rounded-lg shadow-inner">
                        <div className="text-xl font-bold text-white">{userData.groups?.length || 0}</div>
                        <div className="text-xs text-gray-400">Groups</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Tabs */}
                <div className="border-b border-gray-700">
                  <nav className="flex -mb-px px-6">
                    <button
                      className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'overview' 
                          ? 'border-indigo-500 text-indigo-400' 
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('overview')}
                    >
                      Overview
                    </button>
                    <button
                      className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'groups' 
                          ? 'border-indigo-500 text-indigo-400' 
                          : 'border-transparent text-gray-400 hover:text-gray-300'
                      }`}
                      onClick={() => setActiveTab('groups')}
                    >
                      Groups
                    </button>
                  </nav>
                </div>
                
                {/* Tab content */}
                <div className="px-6 py-4">
                  {activeTab === 'overview' && (
                    <div>
                      {/* Problem solving stats with glowing cards */}
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                          </svg>
                          Problem Solving
                        </h3>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-green-500 opacity-25 group-hover:opacity-60 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                            <div className="relative bg-gray-800 rounded-lg p-3 text-center">
                              <div className="text-green-400 text-sm font-medium">Easy</div>
                              <div className="text-xl font-bold text-white">{userData.solvedProblems.easy}</div>
                            </div>
                          </div>
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-yellow-500 opacity-25 group-hover:opacity-60 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                            <div className="relative bg-gray-800 rounded-lg p-3 text-center">
                              <div className="text-yellow-400 text-sm font-medium">Medium</div>
                              <div className="text-xl font-bold text-white">{userData.solvedProblems.medium}</div>
                            </div>
                          </div>
                          <div className="relative group">
                            <div className="absolute -inset-0.5 bg-red-500 opacity-25 group-hover:opacity-60 rounded-lg blur-sm group-hover:blur-md transition-all duration-300"></div>
                            <div className="relative bg-gray-800 rounded-lg p-3 text-center">
                              <div className="text-red-400 text-sm font-medium">Hard</div>
                              <div className="text-xl font-bold text-white">{userData.solvedProblems.hard}</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Enhanced progress bar with smoother glow effect */}
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{userData.solvedProblems.total} / 2000 problems</span>
                          </div>
                          <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-indigo-600 relative"
                              style={{ width: `${Math.max(2, (userData.solvedProblems.total / 2000) * 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-indigo-400 opacity-50">
                                <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" 
                                     style={{ 
                                       backgroundSize: '200% 100%',
                                       animation: 'shimmer 2s infinite'
                                     }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Add keyframes for shimmer animation to component style */}
                        <style jsx>{`
                          @keyframes shimmer {
                            0% { background-position: 200% 0; }
                            100% { background-position: -200% 0; }
                          }
                        `}</style>
                      </div>
                      
                      {/* Recent activity with improved cards */}
                      <div>
                        <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                          </svg>
                          Recent Activity
                        </h3>
                        <div className="space-y-3">
                          {userData.recentActivity && userData.recentActivity.length > 0 ? (
                            userData.recentActivity.map(activity => (
                              <div key={activity.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center hover:bg-gray-750 transition-colors border border-gray-700">
                                <div>
                                  <div className="text-white font-medium">{activity.problemName}</div>
                                  <div className="text-xs text-gray-400">{activity.solvedAt}</div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  activity.difficulty === 'EASY' ? 'bg-green-900 text-green-300' :
                                  activity.difficulty === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                                  'bg-red-900 text-red-300'
                                }`}>
                                  {activity.difficulty.charAt(0) + activity.difficulty.slice(1).toLowerCase()}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-400 py-6">
                              No recent activity
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'groups' && (
                    <div>
                      <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                        </svg>
                        Groups
                      </h3>
                      {userData.groups && userData.groups.length > 0 ? (
                        <div className="space-y-4">
                          {userData.groups.map(group => (
                            <div key={group.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="text-white font-medium">{group.name}</h4>
                                  <p className="text-gray-400 text-sm">{group.memberCount} members</p>
                                </div>
                                <span className="bg-indigo-900 text-indigo-300 text-xs font-medium px-3 py-1 rounded-full border border-indigo-700">
                                  Member
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-6 bg-gray-800 rounded-lg border border-gray-700">
                          This user doesn't belong to any groups yet.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Footer with just the close button */}
                <div className="bg-gray-900 px-6 py-3 flex justify-end items-center border-t border-gray-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 focus:ring-offset-gray-900"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-gray-400">
                Could not load user data
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
