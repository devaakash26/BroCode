'use client';

import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { Camera, Check, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProfileHeader({ user, onUserUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleNameChange = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    // optimistic update can be implemented here
    onUserUpdate({ name });
    setIsEditing(false);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || 'Failed to update name.');
        onUserUpdate({ name: user.name }); // revert on failure
      } else {
        toast.success('Name updated successfully!');
      }
    } catch (error) {
      toast.error('An error occurred while updating the name.');
      onUserUpdate({ name: user.name }); // revert on failure
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('profileImage', selectedFile);

    try {
      const response = await fetch('/api/user/upload-profile-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Profile picture updated!');
        onUserUpdate({ image: data.imageUrl });
        setPreviewImage(null);
        setSelectedFile(null);
      } else {
        toast.error(data.message || 'Failed to upload image.');
      }
    } catch (error) {
      toast.error('An error occurred while uploading the image.');
    } finally {
      setIsUploading(false);
    }
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
            <div className="relative">
              <div className="h-32 w-32 rounded-full bg-gray-200 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-900 flex items-center justify-center">
                {previewImage || user.image ? (
                  <img src={previewImage || user.image} alt="Profile" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <User className="h-16 w-16 text-gray-400" />
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
              {previewImage && (
                <div className="absolute bottom-0 right-0 flex space-x-1">
                  <Button size="icon" className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-600" onClick={handleImageUpload} disabled={isUploading}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => setPreviewImage(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="text-center md:text-left">
              {isEditing ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-2xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none"
                  />
                  <Button size="icon" className="ml-2 h-8 w-8" onClick={handleNameChange}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="ml-1 h-8 w-8" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white cursor-pointer" onClick={() => setIsEditing(true)}>
                  {user.name}
                </h1>
              )}
              <p className="text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Member since {memberSince}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
