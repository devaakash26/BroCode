// This file is deprecated - authOptions are now defined in app/api/auth/[...nextauth]/route.js
// Importing here for backward compatibility
import { authOptions as nextAuthOptions } from '../app/api/auth/[...nextauth]/route.js';

export const authOptions = nextAuthOptions;

// Helper function to check if user is authenticated
export const isAuthenticated = (session) => {
  return !!(session && session.user);
};

// Helper function to check user role
export const hasRole = (session, role) => {
  return !!(session?.user?.role === role);
};

// Helper function to check if email is verified
export const isEmailVerified = (session) => {
  return !!(session?.user?.emailVerified);
}; 