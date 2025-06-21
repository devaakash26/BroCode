'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function VerificationAlert() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Check if a verification email was recently sent
  useEffect(() => {
    const checkVerificationSent = () => {
      try {
        const sentAt = localStorage.getItem('verificationEmailSent');
        if (sentAt) {
          const sentTime = parseInt(sentAt, 10);
          const now = Date.now();
          // Show the verification sent message for 10 minutes (600000 ms)
          if (now - sentTime < 600000) {
            setVerificationSent(true);
          } else {
            // Clear the localStorage item if it's older than 10 minutes
            localStorage.removeItem('verificationEmailSent');
          }
        }
      } catch (error) {
        console.error('Error checking verification email status:', error);
      }
    };

    checkVerificationSent();
    // Check every minute to update the UI if needed
    const intervalId = setInterval(checkVerificationSent, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Don't show alert for:
  // 1. Users who are not logged in
  // 2. Users who have verified their email
  // 3. OAuth users (Google login)
  // 4. Users who dismissed the alert
  if (!session || 
      !session.user || 
      session.user.emailVerified || 
      session.user.isOAuthUser ||
      isDismissed) {
    return null;
  }

  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/resend-verification');
      const data = await response.json();

      if (response.ok) {
        // Store the time when the verification email was sent
        localStorage.setItem('verificationEmailSent', Date.now().toString());
        setVerificationSent(true);
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

  return (
    <div className={`p-4 mb-6 border-l-4 ${verificationSent 
      ? 'bg-blue-50 border-blue-400' 
      : 'bg-yellow-50 border-yellow-400'}`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${verificationSent ? 'text-blue-400' : 'text-yellow-400'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            {verificationSent ? (
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
                clipRule="evenodd"
              />
            ) : (
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
            )}
          </svg>
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between items-center">
          <p className={`text-sm ${verificationSent ? 'text-blue-700' : 'text-yellow-700'}`}>
            {verificationSent 
              ? `We've sent a verification email to ${session?.user?.email}. Please check your inbox (and spam folder) and click the verification link.`
              : 'Your email address is not verified. Please check your inbox for a verification link or request a new one.'}
          </p>
          <div className="mt-3 md:mt-0 md:ml-6 flex space-x-2">
            {!verificationSent && (
            <button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="text-sm font-medium text-yellow-700 hover:text-yellow-600 whitespace-nowrap"
            >
              {isLoading ? 'Sending...' : 'Resend verification'}
            </button>
            )}
            <button
              onClick={() => setIsDismissed(true)}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
