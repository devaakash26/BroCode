'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CameraIcon,
  XMarkIcon,
  CheckIcon,
  ShieldCheckIcon,
  TrophyIcon,
  CodeBracketIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { Loading } from '@/components/ui/loading';
import { ActionButton } from '@/components/ui/action-button';
import { ProfileSkeleton } from '@/components/ui/card-skeleton';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [contributionData, setContributionData] = useState([]);
  const [isContributionLoading, setIsContributionLoading] = useState(true);
  const [mockSubmissions, setMockSubmissions] = useState([]);
  const [mockActivity, setMockActivity] = useState([]);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, [session]);
  
  // Fetch user data from the backend API
  const fetchUserData = async () => {
    setIsLoading(true);
    setIsContributionLoading(true);
    
    try {
      // Fetch the user profile data from the real API
      const response = await fetch('/api/user/profile');
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Set user data with the real data from the API
        setUserData(data.user);
        setEditedName(data.user.name || '');
        
        // Set contribution data if available
        if (data.user.contributionData && data.user.contributionData.length > 0) {
          setContributionData(data.user.contributionData);
        } else {
          // Fetch contribution data separately if not included
          fetchContributionData(data.user.id);
        }
      } else {
        toast.error(data.message || 'Failed to load profile data');
      }
    } catch (error) {
      console.error('Profile data fetch error:', error);
      toast.error('Failed to load profile data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
      setIsContributionLoading(false);
    }
  };

  // Fetch contribution data separately if needed
  const fetchContributionData = async (userId) => {
    try {
      const response = await fetch(`/api/user/contributions?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setContributionData(data.contributionData);
      }
    } catch (error) {
      console.error('Error fetching contribution data:', error);
    } finally {
      setIsContributionLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile updated successfully');
        setUserData(prevData => prevData ? { ...prevData, name: editedName } : null);
        // Update session to reflect the name change
        await update({ name: editedName });
        setIsEditing(false);
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    try {
      setIsChangingPassword(true);
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userData) {
      toast.error('User data not available');
      return;
    }
    
    if (!deleteConfirmEmail) {
      toast.error('Please enter your email to confirm');
      return;
    }

    if (deleteConfirmEmail !== userData.email) {
      toast.error('Email does not match your account');
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch('/api/user/profile', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account deleted successfully');
        router.push('/auth/signin');
      } else {
        toast.error(data.message || 'Failed to delete account');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfilePicture = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('profileImage', selectedFile);
      
      const response = await fetch('/api/user/upload-profile-image', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Profile picture updated');
        // Update local state with new image
        setUserData(prevData => prevData ? { ...prevData, image: data.imageUrl } : null);
        // Update session to reflect the new image
        await update({ image: data.imageUrl });
        // Reset state
        setSelectedFile(null);
        setPreviewImage(null);
      } else {
        toast.error(data.message || 'Failed to update profile picture');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const cancelImageUpload = () => {
    setSelectedFile(null);
    setPreviewImage(null);
  };

  // If we have a session but no user data was returned, show error
  if (session && !isLoading && !userData) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <p className="text-gray-500 dark:text-gray-400 text-center">Failed to load profile data</p>
        </div>
      </div>
    );
  }
  
  // If no session or no userData, show message and login link
  if ((!session && !isLoading) || !userData) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Please sign in to view your profile</p>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }
  
  // At this point, userData should exist, but let's add an extra safety check
  // to prevent "Cannot read properties of null" errors
  if (!userData) return null;
  
  const userCreatedAt = new Date(userData.createdAt || Date.now());
  const memberSince = userCreatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Use only actual user data with sensible defaults
  const stats = {
    problemsSolved: userData?.problemsSolved || 0,
    rank: userData?.rank || '-',
    submissions: userData?.submissions?.length || 0,
    successRate: userData?.successRate || 0,
    streak: userData?.streak || 0,
    contestsParticipated: userData?.contestsParticipated || 0,
  };
  
  // Set default empty array for recentActivity if it doesn't exist
  userData.recentActivity = userData.recentActivity || [];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-12">
      {/* Profile Header / Cover */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 h-60 relative">
        <div className="container max-w-5xl mx-auto px-4 h-full flex items-end">
          <div className="flex flex-col md:flex-row items-center md:items-end pb-4 relative z-10 w-full">
            <div className="rounded-full bg-white dark:bg-gray-800 p-1.5 shadow-xl -mb-16 md:mb-0 md:mr-6">
              <div className="relative h-32 w-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                {userData.image ? (
                  <img 
                    src={previewImage || userData.image} 
                    alt={userData.name || 'Profile'} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-16 w-16 text-gray-400" />
                )}
                
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200"
                  disabled={isUploading}
                >
                  <CameraIcon className="h-8 w-8 text-white" />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>
            
            <div className="flex-grow mt-8 md:mt-0 text-center md:text-left">
              <div className="md:mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  {isEditing ? (
                    <div className="flex items-center mb-2 justify-center md:justify-start">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-xl font-bold"
                      />
                      <button 
                        onClick={handleUpdateName}
                        className="ml-2 text-green-500 hover:text-green-600"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setEditedName(userData.name || '');
                        }}
                        className="ml-1 text-red-500 hover:text-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center justify-center md:justify-start">
                      {userData.name || 'Anonymous User'}
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="ml-2 text-gray-200 hover:text-white"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    </h1>
                  )}
                  <p className="text-indigo-100">{userData.email}</p>
                </div>
                
                <div className="mt-4 md:mt-0 flex justify-center md:justify-end">
                  {previewImage && (
                    <div className="flex space-x-2">
                      <button
                        onClick={uploadProfilePicture}
                        disabled={isUploading}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isUploading ? (
                          <Loading className="h-4 w-4 mr-2" />
                        ) : (
                          <CheckIcon className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </button>
                      <button
                        onClick={cancelImageUpload}
                        disabled={isUploading}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <XMarkIcon className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-white">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Member since {memberSince}
                </div>
                <div className="flex items-center">
                  <TrophyIcon className="h-4 w-4 mr-1" />
                  Rank #{stats.rank}
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {stats.streak} day streak
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="container max-w-5xl mx-auto px-4 mt-20 md:mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <CodeBracketIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Problems Solved</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stats.problemsSolved}</h2>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stats.successRate}%</h2>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <TrophyIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Contests</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stats.contestsParticipated}</h2>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Submissions</p>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{stats.submissions}</h2>
              </div>
            </div>
          </div>
        </div>
        
        {/* Profile Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'submissions'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Submissions
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity Summary</h3>
                
                {/* Activity Calendar */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Contribution Calendar</h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Last 12 months</div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <div className="h-32 flex items-end gap-1 pb-1">
                      {isContributionLoading ? (
                        <div className="w-full flex items-center justify-center">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Loading contribution data...
                          </p>
                        </div>
                      ) : contributionData.length > 0 ? (
                        Array.from({ length: 52 }, (_, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-1">
                            {Array.from({ length: 7 }, (_, dayIndex) => {
                              const dataIndex = weekIndex * 7 + dayIndex;
                              const dayData = contributionData[dataIndex] || { count: 0 };
                              
                              let bgColor = 'bg-gray-200 dark:bg-gray-600';
                              if (dayData.count === 1) bgColor = 'bg-green-200 dark:bg-green-900';
                              if (dayData.count === 2) bgColor = 'bg-green-300 dark:bg-green-800';
                              if (dayData.count === 3) bgColor = 'bg-green-400 dark:bg-green-700';
                              if (dayData.count === 4) bgColor = 'bg-green-500 dark:bg-green-600';
                              
                              return (
                                <div
                                  key={dayIndex}
                                  className={`h-3 w-3 rounded-sm ${bgColor} hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-300 cursor-pointer transition-all`}
                                  title={dayData.date ? `${dayData.date}: ${dayData.count} submissions` : 'No data'}
                                ></div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="w-full flex items-center justify-center">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            No contribution data available
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Less</span>
                    <div className="flex gap-1">
                      <span className="block h-3 w-3 bg-gray-200 dark:bg-gray-600 rounded-sm"></span>
                      <span className="block h-3 w-3 bg-green-200 dark:bg-green-900 rounded-sm"></span>
                      <span className="block h-3 w-3 bg-green-300 dark:bg-green-800 rounded-sm"></span>
                      <span className="block h-3 w-3 bg-green-400 dark:bg-green-700 rounded-sm"></span>
                      <span className="block h-3 w-3 bg-green-500 dark:bg-green-600 rounded-sm"></span>
                    </div>
                    <span>More</span>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {!userData || !userData.recentActivity || userData.recentActivity.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No recent activity to display
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Start solving problems to see your activity here
                      </p>
                    </div>
                  ) : (
                    userData.recentActivity.map((activity, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className={`rounded-md p-2 ${
                              activity.type === 'success' ? 'bg-green-100 dark:bg-green-900' : 
                              activity.type === 'attempted' ? 'bg-yellow-100 dark:bg-yellow-900' : 
                              'bg-blue-100 dark:bg-blue-900'
                            }`}>
                              {activity.type === 'success' ? (
                                <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : activity.type === 'attempted' ? (
                                <ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              ) : (
                                <CodeBracketIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.title}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(activity.date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {activity.details}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Your Submissions</h3>
                
                {/* Submissions table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Problem
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Language
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Runtime
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {!userData || !userData.submissions || userData.submissions.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            <div>No submissions yet</div>
                            <div className="mt-2 text-sm">
                              <button 
                                onClick={() => router.push('/problems')}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Start solving problems
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        userData.submissions.map((submission, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              <a 
                                href={`/problems/${submission.problemSlug || '#'}`}
                                className="hover:underline"
                              >
                                {submission.problemName || 'Unknown Problem'}
                              </a>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                submission.status === 'Accepted' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {submission.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {submission.language || 'Unknown'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {submission.runtime || 'N/A'} 
                              {submission.runtime ? ' ms' : ''}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {submission.date ? new Date(submission.date).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'Unknown date'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {/* Badges tab removed */}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Settings</h3>
                
                {/* Password Change Form */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                    <KeyIcon className="h-5 w-5 mr-2" />
                    Change Password
                  </h4>
                  
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Current Password
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        New Password
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <ActionButton
                        type="submit"
                        isLoading={isChangingPassword}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Change Password
                      </ActionButton>
                    </div>
                  </form>
                </div>
                
                {/* Delete Account Section */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                  <h4 className="font-medium text-red-800 dark:text-red-300 mb-4 flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />
                    Delete Account
                  </h4>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                  
                  <div className="mb-4">
                    <label htmlFor="deleteConfirmEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enter your email to confirm
                    </label>
                    <input
                      type="email"
                      id="deleteConfirmEmail"
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      placeholder={userData.email}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <ActionButton
                      onClick={handleDeleteAccount}
                      isLoading={isDeleting}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                    >
                      Delete Account
                    </ActionButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 