import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// COMPLETELY DISABLE middleware for localhost
// This ensures no auth redirects happen in local development
export async function middleware(request) {
  // Check if running locally (localhost or 127.0.0.1)
  const url = new URL(request.url);
  
  // COMPLETELY DISABLE middleware for localhost
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    // Just pass through all requests
    return NextResponse.next();
  }

  // Skip middleware entirely in development mode
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  
  // Define public paths that don't require authentication
  const publicPaths = [
    '/',              // Home page
    '/problems',      // Public problems list
    '/leaderboard',   // Public leaderboard
    '/auth/signin',
    '/auth/signup',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verification-required',
    '/api',
    '/socket-health',
    '/socket.io',
    '/_next',
    '/favicon.ico',
    '/images'
  ];
  
  // Check if the current path is public
  if (pathname === '/' || publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Get the user token
  const token = await getToken({ req: request });
  
  // Protected routes - require authentication
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/groups',
    '/challenges',
    '/admin'
  ];
  
  // If accessing a protected route and not logged in, redirect to sign-in
  if (protectedPaths.some(path => pathname.startsWith(path)) && !token) {
    const url = new URL('/auth/signin', request.url);
    url.host = new URL(request.url).host;
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  // Check if email is verified - Only check for non-OAuth users
  const isOAuthUser = token?.isOAuthUser || false;
  const isVerified = token?.emailVerified ? true : false;
  
  // If logged in but not verified and not OAuth, redirect to verification required page
  // Skip this check for admins and OAuth users
  if (token && !isVerified && !isOAuthUser && token.role !== 'PLATFORM_ADMIN' && !pathname.startsWith('/auth/verification-required')) {
    const url = new URL('/auth/verification-required', request.url);
    url.host = new URL(request.url).host;
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.ico$).*)' 
  ],
}; 