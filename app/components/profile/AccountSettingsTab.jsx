'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export default function AccountSettingsTab({ user, onUserUpdate }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [leetcodeUsername, setLeetcodeUsername] = useState(user.leetcodeUsername || '');
  const [isSavingLeetcode, setIsSavingLeetcode] = useState(false);

  const handleUpdateLeetcode = async () => {
    setIsSavingLeetcode(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leetcodeUsername }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('LeetCode username updated!');
        onUserUpdate({ leetcodeUsername });
      } else {
        toast.error(data.message || 'Failed to update LeetCode username.');
      }
    } catch (error) {
      toast.error('An error occurred.');
    } finally {
      setIsSavingLeetcode(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Failed to change password.');
      }
    } catch (error) {
      toast.error('An error occurred.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">LeetCode Account</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Link your LeetCode account to display your stats on your profile.
        </p>
        <div className="mt-4 flex items-center gap-2 max-w-md">
          <Input
            type="text"
            placeholder="LeetCode Username"
            value={leetcodeUsername}
            onChange={(e) => setLeetcodeUsername(e.target.value)}
          />
          <Button onClick={handleUpdateLeetcode} disabled={isSavingLeetcode}>
            {isSavingLeetcode ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
      
      <Separator />

      <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-8">Change Password</h3>
      <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
        <div className="max-w-md">
          <Input
            type="password"
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="max-w-md">
          <Input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="max-w-md">
          <Input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </form>
    </div>
  );
} 
