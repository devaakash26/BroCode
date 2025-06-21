'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { EnvelopeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { ActionButton } from '@/components/ui/action-button';
import { Loading } from '@/components/ui/loading';

export default function VerificationRequiredPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const hasShownSuccessToast = useRef(false);
  
  // Periodically check email verification status
  useEffect(() => {
    if (!session?.user || isVerified) return;
    
    const checkVerificationStatus = async () => {
      if (isCheckingStatus) return;
      
      try {
        setIsCheckingStatus(true);
        const response = await fetch('/api/user/verification-status');
        const data = await response.json();
        
        // Debug info
        console.log("Verification status response:", data);
        console.log("Check count:", checkCount + 1);
        
        setCheckCount(prev => prev + 1);
        
        if (data.success && data.isVerified) {
          console.log("Email verified, preparing for redirect");
          // Set verified state to stop further checks
          setIsVerified(true);
          
          // Show success message only once
          if (!hasShownSuccessToast.current) {
            toast.success('Email verified successfully!');
            hasShownSuccessToast.current = true;
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    // Check immediately on page load
    checkVerificationStatus();
    
    // Set up interval to check periodically (every 5 seconds)
    const intervalId = setInterval(checkVerificationStatus, 5000);
    
    // Clean up interval
    return () => clearInterval(intervalId);
  }, [session, isCheckingStatus, isVerified, checkCount]);
  
  // Handle manual redirect to dashboard
  const handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };
  
  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/resend-verification');
      const data = await response.json();

      if (response.ok) {
        toast.success('Verification email sent successfully');
      } else {
        toast.error(data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      toast.error('Something went wrong');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };
  
  // Handle direct navigation if already verified or user is OAuth user (Google login)
  useEffect(() => {
    if (status === "authenticated" && (session?.user?.emailVerified || session?.user?.isOAuthUser)) {
      console.log("User already verified or is OAuth user, redirecting to dashboard");
      window.location.href = '/dashboard';
    }
  }, [status, session]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <EnvelopeIcon className="h-10 w-10 text-yellow-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">Email Verification Required</h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Please verify your email address to access your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isVerified ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg 
                  className="w-12 h-12 text-green-500" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">Email Verified Successfully!</h3>
              <p className="text-sm text-gray-500 mb-4">You can now access all features of the application.</p>
              <button
                onClick={handleGoDashboard}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                We've sent a verification link to: <span className="font-semibold">{session?.user?.email}</span>
              </p>
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please check your inbox and click on the verification link to verify your email address.
                  If you don't see the email, check your spam folder.
                </p>
                
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <ActionButton
                    onClick={handleResendVerification}
                    isLoading={isLoading}
                    loadingText="Sending..."
                    className="w-full"
                    variant="default"
                  >
                    Resend verification email
                  </ActionButton>
                </div>
                
                <div className="flex items-center justify-center mt-6">
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already verified your email?{' '}
            <button
              onClick={handleGoDashboard}
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Go to dashboard <ArrowRightIcon className="inline-block h-4 w-4" />
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 
