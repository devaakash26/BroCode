'use client';

import { useState, useEffect } from 'react';
import { X, User, UserX, ClipboardList, Users, Calendar, Tag, Award, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function UserDetailsModal({ userId, isOpen, onClose, onUserDeleted }) {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setUserData(data.user);
      } else {
        setError(data.error || 'Failed to load user details');
        toast.error(data.error || 'Failed to load user details');
      }
    } catch (error) {
      setError('An error occurred while fetching user details');
      toast.error('An error occurred while fetching user details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      setIsDeleting(true);
      
      try {
        const response = await fetch(`/api/admin/users?id=${userId}`, {
          method: 'DELETE',
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast.success('User deleted successfully');
          onClose();
          if (onUserDeleted) onUserDeleted(userId);
        } else {
          toast.error(data.error || 'Failed to delete user');
        }
      } catch (error) {
        toast.error('An error occurred while deleting the user');
        console.error(error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 overflow-hidden">
        {/* Overlay with improved animation */}
        <div 
          className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ease-in-out" 
          onClick={onClose}
        ></div>
        
        {/* Side-over panel with improved animation */}
        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
          <div className={`w-screen max-w-md transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col bg-white dark:bg-gray-900 shadow-xl rounded-l-xl overflow-hidden">
              {/* Header with improved styling */}
              <div className="px-6 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800 sm:px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    User Details
                  </h2>
                  <div className="ml-3 h-7 flex items-center">
                    <button
                      type="button"
                      className="rounded-md text-white opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
                      onClick={onClose}
                    >
                      <span className="sr-only">Close panel</span>
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Content with improved loading state */}
              <div className="relative flex-1 px-6 py-6 sm:px-6 overflow-y-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-indigo-200 border-t-indigo-600 dark:border-t-indigo-400 dark:border-indigo-700"></div>
                    <p className="mt-4 text-indigo-600 dark:text-indigo-400">Loading user details...</p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center text-center text-red-500 py-12">
                    <XCircle className="h-16 w-16 mb-4 text-red-500" />
                    <p className="text-lg font-medium">{error}</p>
                    <button 
                      onClick={fetchUserDetails}
                      className="mt-4 px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Try Again
                    </button>
                  </div>
                ) : userData ? (
                  <div className="space-y-8">
                    {/* User profile header with improved styling */}
                    <div className="flex flex-col items-center pb-6 border-b border-gray-200 dark:border-gray-700">
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold mb-4 shadow-lg">
                        {userData.image ? (
                          <img src={userData.image} alt={userData.name} className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                          userData.name?.charAt(0).toUpperCase() || userData.email.charAt(0).toUpperCase()
                        )}
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{userData.name || 'No Name'}</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-2">{userData.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          userData.role === 'PLATFORM_ADMIN' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ring-1 ring-purple-600/20' 
                            : userData.role === 'GROUP_ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-600/20'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ring-1 ring-gray-600/20'
                        }`}>
                          {userData.role === 'PLATFORM_ADMIN' ? 'Platform Admin' : 
                           userData.role === 'GROUP_ADMIN' ? 'Group Admin' : 'User'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          userData.isVerified 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ring-1 ring-green-600/20' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 ring-1 ring-yellow-600/20'
                        }`}>
                          {userData.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Joined {formatDistanceToNow(new Date(userData.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                    
                    {/* Tabs navigation with improved styling */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`pb-4 px-1 transition-colors duration-200 ${
                            activeTab === 'overview'
                              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
                          } font-medium text-sm`}
                        >
                          Overview
                        </button>
                        <button
                          onClick={() => setActiveTab('submissions')}
                          className={`pb-4 px-1 transition-colors duration-200 ${
                            activeTab === 'submissions'
                              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
                          } font-medium text-sm`}
                        >
                          Submissions
                        </button>
                        <button
                          onClick={() => setActiveTab('groups')}
                          className={`pb-4 px-1 transition-colors duration-200 ${
                            activeTab === 'groups'
                              ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600'
                          } font-medium text-sm`}
                        >
                          Groups
                        </button>
                      </nav>
                    </div>
                    
                    {/* Tab content with improved styling for cards */}
                    <div className="mt-6">
                      {activeTab === 'overview' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center">
                                <div className="p-3 rounded-full bg-indigo-100 dark:bg-indigo-900">
                                  <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Submissions</p>
                                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{userData.totalSubmissions || 0}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center">
                                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Problems Solved</p>
                                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{userData.uniqueProblemsSolved || 0}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center">
                                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Groups Joined</p>
                                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{userData.groups?.length || 0}</p>
                                </div>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center">
                                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
                                  <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div className="ml-4">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Success Rate</p>
                                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {userData.totalSubmissions 
                                      ? Math.round(((userData.submissionStats?.ACCEPTED || 0) / userData.totalSubmissions) * 100)
                                      : 0}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {userData.groupsCreated && userData.groupsCreated.length > 0 && (
                            <div className="mt-8">
                              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">Groups Created</h3>
                              <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {userData.groupsCreated.map(group => (
                                  <li key={group.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-150">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                          {group._count.members} members • Created {formatDistanceToNow(new Date(group.createdAt), { addSuffix: true })}
                                        </p>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'submissions' && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Submissions</h3>
                          {userData.submissions && userData.submissions.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {userData.submissions.map(submission => (
                                <li key={submission.id} className="py-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">{submission.problem.title}</p>
                                      <div className="flex items-center mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          submission.problem.difficulty === 'EASY'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : submission.problem.difficulty === 'MEDIUM'
                                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}>
                                          {submission.problem.difficulty}
                                        </span>
                                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          submission.status === 'ACCEPTED'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}>
                                          {submission.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          {formatDistanceToNow(new Date(submission.submittedAt), { addSuffix: true })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No submissions found.</p>
                          )}
                        </div>
                      )}
                      
                      {activeTab === 'groups' && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Groups</h3>
                          {userData.groups && userData.groups.length > 0 ? (
                            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                              {userData.groups.map(group => (
                                <li key={group.id} className="py-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium">{group.name}</p>
                                      <div className="flex items-center mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                          group.role === 'ADMIN'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                        }`}>
                                          {group.role}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                          Joined {formatDistanceToNow(new Date(group.joinedAt), { addSuffix: true })}
                                        </span>
                                      </div>
                                      {group.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                          {group.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No groups joined.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              
              {/* Footer with improved styling */}
              {userData && (
                <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-800 flex justify-between border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white mr-2"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-2" />
                        Delete User
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center items-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
