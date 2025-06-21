'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  Globe, 
  Lock, 
  EyeOff, 
  Users, 
  Info, 
  Link as LinkIcon,
  Image as ImageIcon,
  Camera,
  X
} from 'lucide-react';
import { LoadingPage } from '@/components/ui/loading';

export default function CreateGroupPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'PUBLIC',
    memberLimit: '',
    image: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use JPEG, PNG, GIF, or WebP images.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create a preview of the selected image
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create FormData to handle file upload
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('visibility', formData.visibility);
      
      if (formData.memberLimit) {
        formDataToSend.append('memberLimit', formData.memberLimit);
      }
      
      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }
      
      // Add image file if selected
      if (selectedFile) {
        formDataToSend.append('imageFile', selectedFile);
      }

      // Submit to API
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        body: formDataToSend, // FormData automatically sets the content-type header
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Group created successfully!');
        
        // Add a small delay before redirecting
        setTimeout(() => {
          router.push(`/groups/${data.id}`);
        }, 500);
      } else {
        toast.error(data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Group creation error:', error);
      toast.error('An error occurred while creating the group');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Main Form Section */}
        <div className="flex-1 order-2 md:order-1">
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-6">Create a New Group</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold pb-2 border-b border-gray-200 dark:border-gray-700">
                  Basic Information
                </h2>
                
                {/* Group Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    Group Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter a name for your group"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="What is this group about? What kinds of challenges will you create?"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/500 characters
                  </p>
                </div>
                
                {/* Group Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Group Image
                  </label>
                  
                  {/* Image preview */}
                  {previewImage && (
                    <div className="mb-3 relative">
                      <div className="w-full h-40 rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                        <img 
                          src={previewImage} 
                          alt="Group preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="absolute top-2 right-2 bg-gray-800 bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  {/* File upload button */}
                  {!previewImage && (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md flex items-center justify-center cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                    >
                      <div className="text-center">
                        <Camera className="h-8 w-8 mx-auto text-gray-400" />
                        <p className="mt-1 text-sm text-gray-500">Click to upload an image</p>
                        <p className="text-xs text-gray-400">(Max: 5MB, JPG, PNG, GIF, WebP)</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  )}
                  
                  {/* URL input as alternative */}
                  <div className="mt-3">
                    <label htmlFor="image" className="block text-sm font-medium mb-1">
                      Or add image URL
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                    <input
                      type="url"
                      id="image"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Add an image URL for your group's avatar
                  </p>
                  </div>
                </div>
              </div>
              
              {/* Privacy & Membership Section */}
              <div className="space-y-4 pt-2">
                <h2 className="text-lg font-semibold pb-2 border-b border-gray-200 dark:border-gray-700">
                  Privacy & Membership
                </h2>
                
                {/* Visibility Option */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Group Visibility <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/30 transition">
                      <input
                        type="radio"
                        name="visibility"
                        value="PUBLIC"
                        checked={formData.visibility === 'PUBLIC'}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3 flex items-center">
                        <Globe className="h-5 w-5 text-green-500 mr-2" />
                        <div>
                          <p className="font-medium">Public</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Anyone can find and join this group
                          </p>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/30 transition">
                      <input
                        type="radio"
                        name="visibility"
                        value="PRIVATE"
                        checked={formData.visibility === 'PRIVATE'}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3 flex items-center">
                        <Lock className="h-5 w-5 text-orange-500 mr-2" />
                        <div>
                          <p className="font-medium">Private</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Only visible to members, requires invitation to join
                          </p>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/30 transition">
                      <input
                        type="radio"
                        name="visibility"
                        value="UNLISTED"
                        checked={formData.visibility === 'UNLISTED'}
                        onChange={handleChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3 flex items-center">
                        <EyeOff className="h-5 w-5 text-purple-500 mr-2" />
                        <div>
                          <p className="font-medium">Unlisted</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Not visible in search, but anyone with the link can join
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Member Limit */}
                <div>
                  <label htmlFor="memberLimit" className="block text-sm font-medium mb-1">
                    Member Limit
                  </label>
                  <div className="flex items-center">
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                      </span>
                      <input
                        type="number"
                        id="memberLimit"
                        name="memberLimit"
                        value={formData.memberLimit}
                        onChange={handleChange}
                        placeholder="No limit"
                        min="2"
                        max="1000"
                        className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-md focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <p className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      Leave empty for no limit
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 px-4 rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Group...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Info Panel */}
        <div className="md:w-80 order-1 md:order-2">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-6 sticky top-20">
            <h3 className="flex items-center text-lg font-medium text-indigo-800 dark:text-indigo-300 mb-4">
              <Info className="h-5 w-5 mr-2" />
              About Groups
            </h3>
            
            <div className="space-y-4 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                Groups are communities where you can collaborate with other coders, create challenges, and track progress together.
              </p>
              
              <div className="space-y-1.5">
                <h4 className="font-medium text-indigo-800 dark:text-indigo-300">As a group admin, you can:</h4>
                <ul className="list-disc list-outside ml-5 text-gray-700 dark:text-gray-300 space-y-1">
                  <li>Create coding challenges for your members</li>
                  <li>Set problem sets and time limits</li>
                  <li>View real-time submission results</li>
                  <li>Monitor progress through leaderboards</li>
                  <li>Manage group membership</li>
                </ul>
              </div>
              
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-800">
                <Link
                  href="/groups"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center"
                >
                  <LinkIcon className="h-4 w-4 mr-1" />
                  Browse existing groups
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
