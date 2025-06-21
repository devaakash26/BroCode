'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DangerZoneTab({ user }) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (confirmEmail !== user.email) {
      toast.error('Email confirmation does not match.');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Account deleted successfully.');
        router.push('/auth/signin');
      } else {
        toast.error(data.message || 'Failed to delete account.');
      }
    } catch (error) {
      toast.error('An error occurred while deleting the account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 border-t border-red-200 dark:border-red-900/30">
      <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Delete Account</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Once you delete your account, there is no going back. Please be certain.
      </p>
      <div className="mt-6 max-w-md space-y-4">
        <Input
          type="email"
          placeholder="Enter your email to confirm"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
        />
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={isDeleting || confirmEmail !== user.email}
        >
          {isDeleting ? 'Deleting...' : 'Delete My Account'}
        </Button>
      </div>
    </div>
  );
} 
