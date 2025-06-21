'use client';

import { useState } from 'react';
import { 
  ArrowLeft,
  Mail,
  UserPlus,
  Check,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function InviteUserPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Simple email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowSuccess(true);
        setEmail('');
        toast.success('Invitation sent successfully');
      } else {
        setFormError(data.error || 'Failed to send invitation');
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setFormError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/users" 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        </Link>
        <h1 className="text-2xl font-bold">Invite New User</h1>
      </div>
      
      {/* Success message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <h3 className="text-green-800 dark:text-green-400 font-medium">Invitation Sent Successfully!</h3>
              <p className="text-green-700 dark:text-green-500 text-sm mt-1">
                The user will receive an email with instructions to create their account.
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => setShowSuccess(false)}
              className="text-sm px-3 py-1.5 border border-green-300 dark:border-green-800 rounded-md bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              Send another invitation
            </button>
            <Link
              href="/admin/users"
              className="text-sm px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-md text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40"
            >
              Return to users
            </Link>
          </div>
        </div>
      )}
      
      {/* Invitation form */}
      {!showSuccess && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <div className="max-w-lg mx-auto">
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300">
                  Invite a new user to join the platform. They will receive an email with instructions to create their account.
                </p>
              </div>
              
              {formError && (
                <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-md">
                  <div className="flex items-center text-red-800 dark:text-red-400">
                    <XCircle className="h-4 w-4 mr-2" />
                    {formError}
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      className="pl-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                {/* Role field */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User Role
                  </label>
                  <select
                    id="role"
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="USER">Regular User</option>
                    <option value="GROUP_ADMIN">Group Admin</option>
                    <option value="PLATFORM_ADMIN">Platform Admin</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {role === 'PLATFORM_ADMIN' ? 
                      'Platform admins have full access to all features, including user management.' : 
                      role === 'GROUP_ADMIN' ? 
                        'Group admins can create and manage groups, challenges, and custom problems.' : 
                        'Regular users can solve problems and participate in groups and challenges.'}
                  </p>
                </div>
                
                {/* Submit button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-white ${
                      isSubmitting 
                        ? 'bg-indigo-400 dark:bg-indigo-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    }`}
                  >
                    <UserPlus className="h-5 w-5" />
                    {isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
