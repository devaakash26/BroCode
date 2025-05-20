'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Users, 
  ImageIcon, 
  Pencil, 
  Trash2, 
  ShieldAlert,
  Shield,
  UserMinus,
  User,
  UserPlus,
  Save,
  X,
  Camera,
  AlertTriangle
} from 'lucide-react';

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const fileInputRef = useRef(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  
  // Edit states
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGroupName, setDeleteGroupName] = useState('');
  
  // Member management
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  
  // Define the fetch function before the useEffect that uses it
  const fetchGroupDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch group details
      const groupResponse = await fetch(`/api/groups/${params.id}`);
      if (!groupResponse.ok) {
        console.error('Group API response not OK:', groupResponse.status, groupResponse.statusText);
        toast.error(`Network error: ${groupResponse.status} ${groupResponse.statusText}`);
        return;
      }
      
      const groupData = await groupResponse.json();
      console.log('Group data received:', groupData);
      
      // The API returns direct objects, not a {success, error} format
      if (groupData.message) {
        // If there's a message property, it's likely an error
        console.error('Group data error:', groupData.message);
        toast.error(groupData.message || 'Failed to load group details');
        router.push('/groups');
        return;
      }
      
      const groupInfo = groupData.group;
      if (!groupInfo) {
        console.error('No group info found in response', groupData);
        toast.error('Group information is missing');
        return;
      }
      
      setGroup(groupInfo);
      setEditedName(groupInfo.name || '');
      setEditedDescription(groupInfo.description || '');
      
      // Check user permissions
      const userRole = groupData.userRole;
      console.log('User role:', userRole);
      setIsAdmin(userRole === 'ADMIN' || userRole === 'CREATOR');
      setIsCreator(userRole === 'CREATOR');
      
      // If not admin, redirect
      if (userRole !== 'ADMIN' && userRole !== 'CREATOR') {
        toast.error('You do not have permission to access group settings');
        router.push(`/groups/${params.id}`);
        return;
      }
      
      // Extract members from the group data (they're already included in the API response)
      if (groupInfo.members && Array.isArray(groupInfo.members)) {
        console.log('Group members found in response:', groupInfo.members.length);
        
        // Map members to the expected format
        const formattedMembers = groupInfo.members.map(member => ({
          userId: member.userId,
          groupId: member.groupId,
          role: member.role,
          joinedAt: member.joinedAt,
          isCreator: groupInfo.creatorId === member.userId,
          userName: member.user?.name || 'Unknown User',
          userEmail: member.user?.email || '',
          userImage: member.user?.image || null
        }));
        
        setMembers(formattedMembers);
      } else {
        console.error('No members array in group data:', groupInfo);
        toast.error('Failed to load group members');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);
  
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    fetchGroupDetails();
  }, [session, status, fetchGroupDetails]);
  
  const handleUpdateBasicInfo = async () => {
    if (!editedName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }
    
    try {
      // Show loading indicator
      const loadingToast = toast.loading('Updating group information...');
      
      const response = await fetch(`/api/groups/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription
        }),
      });
      
      const data = await response.json();
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Success case will include a group object, error case will only have a message (no group)
      if (data.group) {
        toast.success(data.message || 'Group information updated successfully');
        setGroup(data.group);
        setIsEditingBasic(false);
      } else {
        // Error case
        console.error('Group update error:', data.message);
        toast.error(data.message || 'Failed to update group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
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
  
  const uploadGroupImage = async () => {
    if (!selectedFile) return;
    
    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      
      const response = await fetch(`/api/groups/${params.id}/image`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.message && data.imageUrl) {
        toast.success(data.message || 'Group image updated');
        setGroup(prevGroup => prevGroup ? {...prevGroup, image: data.imageUrl} : null);
        setSelectedFile(null);
        setPreviewImage(null);
      } else {
        toast.error(data.message || 'Failed to update group image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Something went wrong');
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelImageUpload = () => {
    setSelectedFile(null);
    setPreviewImage(null);
  };
  
  const handleDeleteGroup = async () => {
    console.log('Delete button clicked, group name check:', {
      typedName: deleteGroupName,
      actualName: group?.name, 
      matches: deleteGroupName === group?.name
    });
    
    if (deleteGroupName !== group?.name) {
      toast.error('Group name does not match');
      return;
    }
    
    try {
      // Show loading indicator
      const loadingToast = toast.loading('Deleting group...');
      console.log('Sending DELETE request to:', `/api/groups/${params.id}`);
      
      const response = await fetch(`/api/groups/${params.id}`, {
        method: 'DELETE',
      });
      
      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Success message will be "Group deleted successfully"
      if (data.message === 'Group deleted successfully') {
        console.log('Delete success, redirecting to /groups');
        toast.success(data.message);
        router.push('/groups');
      } else {
        // Any other message is an error
        console.error('Group deletion error:', data.message);
        toast.error(data.message || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    }
  };
  
  const handleRemoveMember = async (userId) => {
    try {
      setIsRemovingMember(true);
      
      const response = await fetch(`/api/groups/${params.id}/members/${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Member removed successfully');
        setMembers(members.filter(member => member.userId !== userId));
        setExpandedMemberId(null);
      } else {
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Something went wrong');
    } finally {
      setIsRemovingMember(false);
    }
  };
  
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    
    try {
      const response = await fetch(`/api/groups/${params.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Member ${newRole === 'ADMIN' ? 'promoted to admin' : 'demoted to member'}`);
        
        // Update members list with the new role
        setMembers(members.map(member => 
          member.userId === userId ? {...member, role: newRole} : member
        ));
      } else {
        toast.error(data.error || `Failed to ${newRole === 'ADMIN' ? 'promote' : 'demote'} member`);
      }
    } catch (error) {
      console.error('Error changing member role:', error);
      toast.error('Something went wrong');
    }
  };
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-6"></div>
            <div className="h-72 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }
  
    return (    <div className="p-4 md:p-8">      {/* Removed Toaster as it's likely already in layout or elsewhere */}      <div className="max-w-4xl mx-auto">        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Link 
            href={`/groups/${params.id}`}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </Link>
                    <h1 className="text-2xl font-bold flex items-center">            Group Settings             {group && (              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400 font-normal">                {group.name}              </span>            )}          </h1>
        </div>
        
                {/* Basic Information */}        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">          <h2 className="text-xl font-semibold mb-4 flex items-center">            <Pencil className="h-5 w-5 mr-2 text-gray-500" />            Basic Information          </h2>                    {group && (            <div className="flex flex-col md:flex-row gap-6">              {/* Group Image */}              <div className="shrink-0">                <div className="relative group">                  <div className="h-32 w-32 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">                    {previewImage ? (                      <img                         src={previewImage}                         alt="Preview"                         className="h-full w-full object-cover"                      />                    ) : group?.image ? (                      <img                         src={group.image}                         alt={group.name}                         className="h-full w-full object-cover"                      />                    ) : (                      <div className="h-full w-full flex items-center justify-center">                        <ImageIcon className="h-12 w-12 text-gray-400" />                      </div>                    )}                  </div>                                    <button                    onClick={() => fileInputRef.current?.click()}                    className="absolute bottom-2 right-2 bg-indigo-600 rounded-full p-1.5 text-white shadow-lg hover:bg-indigo-700"                    disabled={isUploading}                  >                    <Camera className="h-4 w-4" />                  </button>                                    <input                    type="file"                    ref={fileInputRef}                    onChange={handleFileChange}                    accept="image/*"                    className="hidden"                  />                </div>                                {/* Image upload actions */}                {previewImage && (                  <div className="mt-3 space-x-2 flex">                    <button                      onClick={cancelImageUpload}                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"                    >                      Cancel                    </button>                    <button                      onClick={uploadGroupImage}                      disabled={isUploading}                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"                    >                      {isUploading ? 'Uploading...' : 'Update Image'}                    </button>                  </div>                )}              </div>                            {/* Group Details */}              <div className="flex-1">                {isEditingBasic ? (                  <div className="space-y-4">                    <div>                      <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">                        Group Name                      </label>                      <input                        id="groupName"                        type="text"                        value={editedName}                        onChange={(e) => setEditedName(e.target.value)}                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"                        placeholder="Enter group name"                      />                    </div>                                        <div>                      <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">                        Description                      </label>                      <textarea                        id="groupDescription"                        value={editedDescription}                        onChange={(e) => setEditedDescription(e.target.value)}                        rows={3}                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"                        placeholder="Describe your group (optional)"                      />                    </div>                                        <div className="flex justify-end space-x-3">                      <button                        onClick={() => {                          setIsEditingBasic(false);                          setEditedName(group?.name || '');                          setEditedDescription(group?.description || '');                        }}                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"                      >                        Cancel                      </button>                      <button                        onClick={handleUpdateBasicInfo}                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"                      >                        Save Changes                      </button>                    </div>                  </div>                ) : (                  <div>                    <dl className="space-y-4">                      <div>                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>                        <dd className="mt-1 text-lg font-medium text-gray-900 dark:text-white">{group?.name}</dd>                      </div>                                            <div>                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>                        <dd className="mt-1 text-gray-900 dark:text-white">                          {group?.description || <span className="text-gray-500 dark:text-gray-400 italic">No description</span>}                        </dd>                      </div>                                            <div>                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Members</dt>                        <dd className="mt-1 text-gray-900 dark:text-white">{group?.currentMembers || members.length}</dd>                      </div>                    </dl>                                        <div className="mt-4">                      <button                        onClick={() => setIsEditingBasic(true)}                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"                      >                        <Pencil className="h-4 w-4 mr-2" />                        Edit Group Information                      </button>                    </div>                  </div>                )}              </div>            </div>          )}        </div>
        
        {/* Manage Members */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-500" />
            Manage Members
          </h2>
          
          {members.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 italic">No members found</p>
          ) : (
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Member
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => (
                    <tr key={member.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                            {member.userImage ? (
                              <img src={member.userImage} alt={member.userName} className="h-10 w-10 object-cover" />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.userName || 'Anonymous User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {member.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.role === 'ADMIN' 
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                            : member.isCreator
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {member.isCreator ? 'Creator' : member.role === 'ADMIN' ? 'Admin' : 'Member'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {expandedMemberId === member.userId ? (
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => setExpandedMemberId(null)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              <X className="h-5 w-5" />
                            </button>
                            
                            {/* Don't show remove/demote options for the creator */}
                            {!member.isCreator && (
                              <>
                                {/* Toggle role button (promote/demote) */}
                                {isCreator && (
                                  <button
                                    onClick={() => handleToggleRole(member.userId, member.role)}
                                    className={`p-1 ${
                                      member.role === 'ADMIN' 
                                        ? 'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
                                        : 'text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                                    }`}
                                    title={member.role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}
                                  >
                                    {member.role === 'ADMIN' ? (
                                      <Shield className="h-5 w-5" />
                                    ) : (
                                      <ShieldAlert className="h-5 w-5" />
                                    )}
                                  </button>
                                )}
                                
                                {/* Remove member button */}
                                <button
                                  onClick={() => handleRemoveMember(member.userId)}
                                  disabled={isRemovingMember}
                                  className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  title="Remove from group"
                                >
                                  <UserMinus className="h-5 w-5" />
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          // Can't modify the creator or yourself
                          session?.user?.id !== member.userId && !member.isCreator && (
                            <button
                              onClick={() => setExpandedMemberId(member.userId)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <span className="sr-only">Manage</span>
                              <Pencil className="h-5 w-5" />
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
                {/* Danger Zone - Enhanced UI */}        {isCreator && (          <div id="danger-zone" className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg shadow-md p-6 border border-red-100 dark:border-red-800/30">            <h2 className="text-xl font-semibold mb-4 text-red-800 dark:text-red-400 flex items-center">              <AlertTriangle className="h-5 w-5 mr-2" />              Danger Zone            </h2>                        <div className="mb-6 border-l-4 border-red-500 dark:border-red-400 pl-4 py-1">              <p className="text-red-700 dark:text-red-300">                Deleting a group will permanently remove all of its data, including:              </p>              <ul className="mt-2 list-disc list-inside text-red-600 dark:text-red-300 space-y-1">                <li>All challenges and related submissions</li>                <li>All messages and discussions</li>                <li>All membership information</li>                <li>All group settings and configurations</li>              </ul>              <p className="mt-2 text-red-700 dark:text-red-300 font-semibold">                This action cannot be undone.              </p>            </div>                        {showDeleteConfirm ? (              <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-red-200 dark:border-red-900 shadow-inner">                <div className="flex items-center mb-4 text-red-600 dark:text-red-400">                  <AlertTriangle className="h-5 w-5 mr-2" />                  <h3 className="font-semibold">Confirm Deletion</h3>                </div>                                <p className="text-red-800 dark:text-red-400 mb-3">                  Please type <span className="font-mono bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded font-medium">{group?.name}</span> to confirm deletion                </p>                                <div className="mb-4">                  <input                    type="text"                    value={deleteGroupName}                    onChange={(e) => setDeleteGroupName(e.target.value)}                    className="w-full px-3 py-2 border border-red-300 dark:border-red-900 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white transition-colors"                    placeholder="Type group name to confirm"                  />                </div>                                <div className="flex space-x-3 justify-end">                  <button                    onClick={() => setShowDeleteConfirm(false)}                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"                  >                    Cancel                  </button>                  <button                    onClick={handleDeleteGroup}                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 flex items-center transition-colors shadow-sm"                    disabled={deleteGroupName !== group?.name}                  >                    <Trash2 className="h-4 w-4 mr-2" />                    Permanently Delete Group                  </button>                </div>              </div>            ) : (              <button                onClick={() => setShowDeleteConfirm(true)}                className="mt-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md hover:from-red-700 hover:to-red-800 flex items-center shadow-sm transition-colors"              >                <Trash2 className="h-4 w-4 mr-2" />                Delete Group              </button>            )}          </div>        )}
      </div>
    </div>
  );
}; 