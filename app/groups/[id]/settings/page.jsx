'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
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
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  
  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGroupName, setDeleteGroupName] = useState('');
  
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const fetchGroupDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      const groupResponse = await fetch(`/api/groups/${params.id}`);
      if (!groupResponse.ok) {
        toast.error(`Network error: ${groupResponse.status} ${groupResponse.statusText}`);
        return;
      }
      
      const groupData = await groupResponse.json();
      if (groupData.message && !groupData.group) {
        toast.error(groupData.message || 'Failed to load group details');
        router.push('/groups');
        return;
      }
      
      const groupInfo = groupData.group;
      if (!groupInfo) {
        toast.error('Group information is missing');
        return;
      }
      
      setGroup(groupInfo);
      setEditedName(groupInfo.name || '');
      setEditedDescription(groupInfo.description || '');
      
      const userMembership = groupInfo.members.find(m => m.userId === session?.user?.id);
      const userRole = userMembership?.role;
      
      setIsAdmin(userRole === 'ADMIN');
      
      if (userRole !== 'ADMIN') {
         // It's a member, not an admin, so they can't see settings page unless we allow members to see a limited view
         // For now, let's check if they are at least a member.
         const isMember = groupInfo.members.some(m => m.userId === session?.user?.id);
         if (!isMember) {
            toast.error('You are not a member of this group.');
        router.push(`/groups/${params.id}`);
        return;
         }
      }
      
      if (groupInfo.members && Array.isArray(groupInfo.members)) {
        const formattedMembers = groupInfo.members.map(member => ({
          userId: member.userId,
          role: member.role,
          userName: member.user?.name || 'Unknown User',
          userImage: member.user?.image || null
        }));
        setMembers(formattedMembers);
      } else {
        toast.error('Failed to load group members');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router, session?.user?.id]);
  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchGroupDetails();
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, fetchGroupDetails, router]);
  
  const handleUpdateBasicInfo = async () => {
    if (!editedName.trim()) {
      toast.error('Group name cannot be empty');
      return;
    }
    
    try {
      const loadingToast = toast.loading('Updating group information...');
      const response = await fetch(`/api/groups/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editedName, description: editedDescription }),
      });
      const data = await response.json();
      toast.dismiss(loadingToast);
      
      if (data.group) {
        toast.success(data.message || 'Group information updated successfully');
        setGroup(data.group);
        setIsEditingBasic(false);
        setShowSuccessAnimation(true);
      } else {
        toast.error(data.message || 'Failed to update group');
      }
    } catch (error) {
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    }
  };
  
  const handleLeaveGroup = async () => {
    try {
      const loadingToast = toast.loading('Leaving group...');
      const response = await fetch(`/api/groups/${params.id}/leave`, { method: 'POST' });
      const data = await response.json();
      toast.dismiss(loadingToast);
      
      if (response.ok) {
        toast.success(data.message || 'You have left the group.');
        router.push('/groups');
      } else {
        toast.error(data.message || 'Failed to leave the group.');
      }
    } catch (error) {
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setShowLeaveConfirm(false);
    }
  };
  
  const handleDeleteGroup = async () => {
    if (deleteGroupName !== group?.name) {
      toast.error('Group name does not match');
      return;
    }
    
    try {
      const loadingToast = toast.loading('Deleting group...');
      const response = await fetch(`/api/groups/${params.id}`, { method: 'DELETE' });
      const data = await response.json();
      toast.dismiss(loadingToast);
      
      if (response.ok) {
        toast.success(data.message || 'Group deleted successfully');
        router.push('/groups');
      } else {
        toast.error(data.message || 'Failed to delete group');
      }
    } catch (error) {
      toast.error(`Error: ${error.message || 'Something went wrong'}`);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading || status === 'loading') {
    return <div>Loading...</div>; // Or a proper skeleton loader
  }

  if (!group) {
    return <div>Group not found or you do not have permission to view this page.</div>;
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showSuccessAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Group information updated successfully!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Your changes have been saved.
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setShowSuccessAnimation(false)}>Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href={`/groups/${params.id}`} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ml-4">
            Group Settings
          </h1>
        </div>
        
        {/* Admin-only settings */}
        {isAdmin && (
          <>
            {/* Basic Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              {/* ... (rest of the admin settings form) ... */}
            </div>

            {/* Members Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Members</h2>
              {/* ... (rest of the members management) ... */}
            </div>
          </>
        )}

        {/* Danger Zone */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-2">Danger Zone</h2>
          
          {isAdmin ? (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/20 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Delete this group</h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 max-w-xl">
                    Once you delete a group, there is no going back. All data will be permanently removed.
                  </p>
                        </div>
                            <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-4 md:mt-0 md:ml-6 flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                  Delete Group
                            </button>
              </div>
                          </div>
                        ) : (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/20 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-300">Leave this group</h3>
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 max-w-xl">
                    If you leave this group, you will lose access to all its content and will need to be re-invited to join again.
                  </p>
                </div>
                            <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="mt-4 md:mt-0 md:ml-6 flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                  Leave Group
                            </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Please type <strong className="font-mono">{group?.name}</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteGroupName}
              onChange={(e) => setDeleteGroupName(e.target.value)}
              className="w-full mt-2 p-2 border rounded"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button onClick={handleDeleteGroup} disabled={deleteGroupName !== group?.name} className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Leave Group</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Are you sure you want to leave this group?
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={() => setShowLeaveConfirm(false)}>Cancel</button>
              <button onClick={handleLeaveGroup} className="px-4 py-2 bg-red-600 text-white rounded">
                Leave
              </button>
            </div>
      </div>
    </div>
      )}
    </div>
  );
}

