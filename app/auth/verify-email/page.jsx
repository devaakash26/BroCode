'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loading } from '@/components/ui/loading';

export default function VerifyEmailPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState({ success: false, message: '', debug: {} });
  const [showDebug, setShowDebug] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerificationResult({ 
          success: false, 
          message: 'No verification token provided. Please request a new verification email.',
          debug: { token: 'missing' }
        });
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Starting verification with token:", token.substring(0, 5) + "...");
        const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();
        
        console.log("Verification API response:", data);

        if (response.ok) {
          // Success
          setVerificationResult({ 
            success: true, 
            message: data.message || 'Email verified successfully!',
            debug: data
          });
          
          // Show toast
          toast.success('Email verified successfully!');
        } else {
          // Error
          setVerificationResult({ 
            success: false, 
            message: data.message || 'Failed to verify email',
            debug: data
          });
          toast.error(data.message || 'Failed to verify email');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationResult({ 
          success: false, 
          message: 'An error occurred during verification. Please try again.',
          debug: { error: error.message }
        });
        toast.error('An error occurred during verification');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Simple redirect to dashboard
  const handleGoDashboard = () => {
    // Directly navigate to the dashboard with a page reload
    window.location.href = '/dashboard';
  };
  
  // Redirect to request new verification email
  const handleResendVerification = () => {
    window.location.href = '/auth/verification-required';
  };
  
  // Toggle debug info
  const toggleDebug = () => {
    setShowDebug(prev => !prev);
  };

  if (isVerifying) {
    return (
      <div className="container relative flex h-[calc(100vh-5rem)] flex-col items-center justify-center">
        <div className="mx-auto max-w-sm text-center">
          <Loading size="lg" className="mx-auto mb-4" />
          <p>Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container relative flex h-[calc(100vh-5rem)] flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center space-y-6">
        {verificationResult.success ? (
          <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
            <svg 
              className="w-16 h-16 text-green-500 mx-auto mb-4" 
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
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Thank you for verifying your email address. Your account is now fully activated.
            </p>
            <div className="flex flex-col gap-2 md:flex-row md:gap-4 justify-center">
              <button
                onClick={handleGoDashboard}
                className="inline-block rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Go to Dashboard
              </button>
              <Link
                href="/auth/signin"
                className="inline-block rounded-md bg-white border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
              >
                Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
            <svg 
              className="w-16 h-16 text-red-500 mx-auto mb-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{verificationResult.message}</p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleResendVerification}
                className="inline-block rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Request New Verification Email
              </button>
              
              <Link
                href="/auth/signin"
                className="inline-block rounded-md bg-white border border-gray-300 px-3.5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
              >
                Back to Sign In
              </Link>
              
              <button 
                onClick={toggleDebug}
                className="text-xs text-gray-500 mt-4 underline"
              >
                {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
              </button>
              
              {showDebug && (
                <div className="mt-4 text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-xs">
                  <pre>{JSON.stringify(verificationResult.debug, null, 2)}</pre>
                  <p className="mt-2 text-xs">Token (first 5 chars): {token ? token.substring(0, 5) + '...' : 'null'}</p>
                  <p className="mt-1 text-xs">Token length: {token ? token.length : 0}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
