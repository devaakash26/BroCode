'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchGroup, updateGroupData, removeMember } from '@/lib/store/groupSlice';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Camera, Trash2, UserMinus, Shield, ShieldAlert,
  Save, Globe, Lock, Link2, Users, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', icon: Globe, desc: 'Anyone can find and join' },
  { value: 'PRIVATE', label: 'Private', icon: Lock, desc: 'Invite only' },
  { value: 'UNLISTED', label: 'Unlisted', icon: Link2, desc: 'Only accessible via invite link' },
];

function Avatar({ src, name, size = 36 }) {
  if (src) return (
    <Image src={src} alt={name || ''} width={size} height={size}
      className="rounded-full object-cover" style={{ width: size, height: size }} />
  );
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <span className="text-indigo-600 dark:text-indigo-400">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const groupState = useSelector(s => s.group);

  // Local form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [memberLimit, setMemberLimit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Image upload state
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Member remove state
  const [removingUserId, setRemovingUserId] = useState(null);

  // Delete modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteGroupName, setDeleteGroupName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Leave modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const groupId = params.id;
  const group = groupState.data;
  const isAdmin = groupState.isAdmin;
  const isMember = groupState.isMember;
  const isLoading = groupState.status === 'loading' || groupState.status === 'idle';

  // Sync form when group data loads
  useEffect(() => {
    if (group) {
      setName(group.name || '');
      setDescription(group.description || '');
      setVisibility(group.visibility || 'PUBLIC');
      setMemberLimit(group.memberLimit != null ? String(group.memberLimit) : '');
      setPreviewImage(null);
      setSelectedFile(null);
    }
  }, [group]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  // Fetch group if not loaded
  useEffect(() => {
    if (status === 'authenticated' && groupId && groupState.lastFetched !== groupId) {
      dispatch(fetchGroup(groupId));
    }
  }, [status, groupId, dispatch, groupState.lastFetched]);

  // Redirect non-members
  useEffect(() => {
    if (group && !isMember) {
      router.push(`/groups/${groupId}`);
    }
  }, [group, isMember, groupId, router]);

  const handleSaveBasicInfo = async () => {
    if (!name.trim()) { toast.error('Group name cannot be empty'); return; }
    setIsSaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          visibility,
          memberLimit: memberLimit ? Number(memberLimit) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to save'); return; }
      dispatch(updateGroupData(data.group));
      toast.success('Settings saved!');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadImage = async () => {
    if (!selectedFile) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      const res = await fetch(`/api/groups/${groupId}/image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Upload failed'); return; }
      dispatch(updateGroupData({ image: data.imageUrl }));
      setPreviewImage(null);
      setSelectedFile(null);
      toast.success('Group image updated!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to remove member'); return; }
      dispatch(removeMember(userId));
      toast.success('Member removed');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (deleteGroupName !== group?.name) { toast.error('Group name does not match'); return; }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to delete'); return; }
      toast.success('Group deleted');
      router.push('/groups');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || 'Failed to leave'); return; }
      toast.success('Left group');
      router.push('/groups');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setShowLeaveConfirm(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Group not found.</p>
      </div>
    );
  }

  const members = group.members || [];
  const creatorId = group.creatorId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/groups/${groupId}`}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Group Settings</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{group.name}</p>
          </div>
          {isAdmin && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>

        {/* ── ADMIN ONLY SECTIONS ── */}
        {isAdmin ? (
          <>
            {/* Basic Info */}
            <SectionCard title="Basic Information" icon={<ShieldAlert className="w-4 h-4" />}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={80}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Visibility
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {VISIBILITY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                      <button key={value} type="button" onClick={() => setVisibility(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                          visibility === value
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] leading-tight opacity-70">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Member Limit <span className="text-gray-400 font-normal">(leave blank for unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="500"
                    value={memberLimit}
                    onChange={e => setMemberLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="w-32 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                  />
                </div>

                <div className="pt-1">
                  <button onClick={handleSaveBasicInfo} disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/20">
                    {isSaving
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </SectionCard>

            {/* Group Image */}
            <SectionCard title="Group Image" icon={<Camera className="w-4 h-4" />}>
              <div className="flex items-center gap-5">
                <div className="relative group">
                  {previewImage ? (
                    <Image src={previewImage} alt="Preview" width={80} height={80}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-300" />
                  ) : group.image ? (
                    <Image src={group.image} alt={group.name} width={80} height={80}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                      {group.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    <Camera className="w-4 h-4" />
                    Choose Image
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  </label>
                  {selectedFile && (
                    <button onClick={handleUploadImage} disabled={isUploadingImage}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                      {isUploadingImage
                        ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Save className="w-3.5 h-3.5" />}
                      Upload
                    </button>
                  )}
                  <p className="text-xs text-gray-400">PNG, JPG up to 5 MB</p>
                </div>
              </div>
            </SectionCard>

            {/* Member Management */}
            <SectionCard title={`Members (${members.length})`} icon={<Users className="w-4 h-4" />}>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {members.map(m => {
                  const memberName = m.user?.name || m.userName || 'Unknown';
                  const memberImage = m.user?.image || m.userImage || null;
                  const isCreator = m.userId === creatorId;
                  const isYou = m.userId === session?.user?.id;

                  return (
                    <div key={m.userId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <Avatar src={memberImage} name={memberName} size={36} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {memberName} {isYou && <span className="text-gray-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {isCreator ? 'Creator' : (m.role?.toLowerCase() || 'member')}
                        </p>
                      </div>
                      {!isCreator && !isYou && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removingUserId === m.userId}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                        >
                          {removingUserId === m.userId
                            ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <UserMinus className="w-3.5 h-3.5" />}
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </>
        ) : (
          /* Non-admin notice */
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-5 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Admin-only settings</p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                Only group admins can change settings. You can leave the group below.
              </p>
            </div>
          </div>
        )}

        {/* Danger Zone — all members see this */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-500 uppercase tracking-wide">Danger Zone</h2>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300 text-sm">
                  {isAdmin ? 'Delete this group' : 'Leave this group'}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 max-w-sm">
                  {isAdmin
                    ? 'Once deleted, the group and all its data will be permanently removed.'
                    : "You'll lose access and will need to be re-invited to join again."}
                </p>
              </div>
              <button
                onClick={() => isAdmin ? setShowDeleteConfirm(true) : setShowLeaveConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-sm">
                {isAdmin ? <Trash2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                {isAdmin ? 'Delete Group' : 'Leave Group'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Group</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This action is <strong>irreversible</strong>. Type <strong className="font-mono text-red-600 dark:text-red-400">{group?.name}</strong> to confirm.
              </p>
              <input type="text" value={deleteGroupName} onChange={e => setDeleteGroupName(e.target.value)}
                placeholder="Type group name..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500/40" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteGroup} disabled={deleteGroupName !== group?.name || isDeleting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors">
                  {isDeleting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirm Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLeaveConfirm(false)} />
            <motion.div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6"
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Leave Group?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                You will lose access to all group content and will need an invite to rejoin.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowLeaveConfirm(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={handleLeaveGroup}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
                  Leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
