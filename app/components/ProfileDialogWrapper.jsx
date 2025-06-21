'use client';

import { useState, useEffect } from 'react';
import UserProfileDialog from './UserProfileDialog';

export default function ProfileDialogWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Listen for the custom event from the server component
    const handleOpenDialog = (event) => {
      setUserId(event.detail.userId);
      setIsOpen(true);
    };

    window.addEventListener('open-profile-dialog', handleOpenDialog);

    // Clean up event listener
    return () => {
      window.removeEventListener('open-profile-dialog', handleOpenDialog);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <UserProfileDialog 
      userId={userId}
      isOpen={isOpen}
      onClose={handleClose}
    />
  );
} 
