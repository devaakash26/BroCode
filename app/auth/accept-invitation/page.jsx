'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Key, 
  User, 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password validation
  const [passwordError, setPasswordError] = useState('');
  
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check your email and try again.');
      setIsLoading(false);
      return;
    }
    
    fetchInvitation(token);
  }, [token]);
  
  const fetchInvitation = async (token) => {
    try {
      const response = await fetch(`/api/auth/invitation?token=${token}`);
      const data = await response.json();
      
      if (data.success) {
        setInvitation(data.invitation);
      } else {
        setError(data.error || 'Invalid invitation');
      }
    } catch (error) {
      console.error('Error retrieving invitation:', error);
      setError('Failed to retrieve invitation details');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setPasswordError('');
    
    // Validate password
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/auth/invitation/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name,
          password,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowSuccess(true);
        toast.success('Account created successfully!');
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Calculate password strength
  const getPasswordStrength = (password) => {
    if (!password) return 0;
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    return Math.min(5, score);
  };
  
  const passwordStrength = getPasswordStrength(password);
  
  const renderPasswordStrengthBar = () => {
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = [
      'bg-red-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-green-500'
    ];
    
    return (
      <div className="mt-1">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Password Strength
          </div>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {strengthLabels[passwordStrength]}
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${strengthColors[passwordStrength]} transition-all duration-300`}
            style={{ width: `${(passwordStrength / 5) * 100}%` }}
          />
        </div>
      </div>
    );
  };
  
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return (
          <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            Platform Admin
          </span>
        );
      case 'GROUP_ADMIN':
        return (
          <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full text-xs font-medium">
            <Shield className="h-3.5 w-3.5" />
            Group Admin
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs font-medium">
            <User className="h-3.5 w-3.5" />
            User
          </span>
        );
    }
  };
  
  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Account Created!</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your account has been successfully created. You can now login to access the platform.
            </p>
            <Link
              href="/auth/signin"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md font-medium"
            >
              Log In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto mb-4">
            <Image 
              src="/logo.svg" 
              width={64} 
              height={64} 
              alt="BroCode"
              className="rounded-full"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            You've been invited!
          </h1>
          <p className="text-sm text-muted-foreground">
            Create your account to join BroCode
          </p>
        </div>
        {error && <div className="text-red-500 text-center">{error}</div>}
        
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="py-6">
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                <h3 className="text-lg font-medium text-red-800 dark:text-red-400 mb-2">
                  {error}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Please check your email for a valid invitation link or contact the administrator.
                </p>
                <Link 
                  href="/"
                  className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800">
                <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-400 mb-2">
                  Invitation Details
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Email:</span>
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Role:</span>
                    <div>{getRoleDisplay(invitation.role)}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Invited by:</span>
                    <span className="font-medium">{invitation.inviter.name || invitation.inviter.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      className="pl-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {password && renderPasswordStrengthBar()}
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Key className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-10 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                {passwordError && (
                  <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
                
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                      isSubmitting 
                        ? 'bg-indigo-400 dark:bg-indigo-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 inline animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 
