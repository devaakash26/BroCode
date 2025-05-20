'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Lock,
  Globe
} from 'lucide-react';
import Link from 'next/link';

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const groupsPerPage = 10;
  
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/groups');
        const data = await response.json();
        
        if (data.success) {
          setGroups(data.groups);
        } else {
          console.error('Failed to fetch groups:', data.error);
          // Display error message to user
          alert(`Error: ${data.error || 'Failed to fetch groups'}`);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
        // Display error message to user
        alert('Error: Failed to connect to the server');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);
  
  // Filter groups based on search term and visibility filter
  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      searchTerm === '' || 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVisibility = 
      visibilityFilter === '' || 
      (visibilityFilter === 'PUBLIC' && group.isPublic) ||
      (visibilityFilter === 'PRIVATE' && !group.isPublic);
    
    return matchesSearch && matchesVisibility;
  });
  
  // Pagination
  const indexOfLastGroup = currentPage * groupsPerPage;
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage;
  const currentGroups = filteredGroups.slice(indexOfFirstGroup, indexOfLastGroup);
  const totalPages = Math.ceil(filteredGroups.length / groupsPerPage);
  
  // Sample group data for UI development - will be replaced with API data
  const sampleGroups = [
    {
      id: '1',
      name: 'Google Interview Prep',
      description: 'Preparation group for Google interviews',
      isPublic: true,
      memberCount: 145,
      adminCount: 2,
      challengeCount: 8,
      createdAt: '2023-04-10T00:00:00Z',
      updatedAt: '2023-08-15T00:00:00Z',
    },
    {
      id: '2',
      name: 'University CS Club',
      description: 'Computer Science club for university students',
      isPublic: true,
      memberCount: 87,
      adminCount: 3,
      challengeCount: 5,
      createdAt: '2023-05-20T00:00:00Z',
      updatedAt: '2023-09-05T00:00:00Z',
    },
    {
      id: '3',
      name: 'Competitive Programming Team',
      description: 'Advanced team for competitive programming contests',
      isPublic: false,
      memberCount: 32,
      adminCount: 1,
      challengeCount: 12,
      createdAt: '2023-03-15T00:00:00Z',
      updatedAt: '2023-08-28T00:00:00Z',
    },
    {
      id: '4',
      name: 'Data Structures Study Group',
      description: 'Study group focusing on data structures',
      isPublic: true,
      memberCount: 64,
      adminCount: 2,
      challengeCount: 6,
      createdAt: '2023-06-12T00:00:00Z',
      updatedAt: '2023-09-10T00:00:00Z',
    },
  ];
  
  const displayGroups = groups.length > 0 ? currentGroups : sampleGroups;
  
  // Add loading state handling
  if (loading && groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading groups...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Group Management</h1>
        <Link 
          href="/groups/create" 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
        >
          <PlusCircle className="h-5 w-5" />
          Create Group
        </Link>
      </div>
      
      {/* Filters and search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
            >
              <option value="">All Visibility</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Groups table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Group
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Visibility
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Members
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Challenges
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {displayGroups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {group.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                          {group.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {group.isPublic ? (
                      <div className="flex items-center text-green-600 dark:text-green-400">
                        <Globe className="h-4 w-4 mr-1.5" />
                        <span>Public</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600 dark:text-amber-400">
                        <Lock className="h-4 w-4 mr-1.5" />
                        <span>Private</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="font-medium">{group.memberCount}</span> members
                    </div>
                    <div>
                      <span className="font-medium">{group.adminCount}</span> admins
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {group.challengeCount} challenges
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(group.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end items-center space-x-2">
                      <Link
                        href={`/groups/${group.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        target="_blank"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/admin/groups/${group.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        onClick={async () => {
                          // Implement delete functionality
                          if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
                            try {
                              const response = await fetch(`/api/admin/groups?id=${group.id}`, {
                                method: 'DELETE',
                              });
                              
                              const data = await response.json();
                              if (data.success) {
                                // Remove the group from the state
                                setGroups(prevGroups => prevGroups.filter(g => g.id !== group.id));
                              } else {
                                console.error('Failed to delete group:', data.error);
                                alert(`Error: ${data.error || 'Failed to delete group'}`);
                              }
                            } catch (error) {
                              console.error('Error deleting group:', error);
                              alert('Error: Failed to connect to the server');
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{indexOfFirstGroup + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastGroup, filteredGroups.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredGroups.length}</span> groups
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                      currentPage === 1
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPage(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                        currentPage === index + 1
                          ? 'z-10 bg-indigo-50 dark:bg-indigo-900 border-indigo-500 dark:border-indigo-500 text-indigo-600 dark:text-indigo-200'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium ${
                      currentPage === totalPages
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 