import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  async function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // Role-based access control for admin routes
    if (pathname.startsWith('/admin') && token?.role !== 'PLATFORM_ADMIN') {
      const url = req.nextUrl.clone()
      url.pathname = '/unauthorized' // Redirect to a generic unauthorized page
      return NextResponse.redirect(url);
    }
    
    // Let all other authorized requests pass.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public access to home, auth, and specific API routes
        const publicPaths = [
          '/',
          '/auth',
          '/api/auth',
          '/api/trpc', // Allow tRPC requests
          '/problems' // Let's make problems public
        ];

        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true;
        }

        // For all other paths, user must be authenticated
        return !!token;
      },
    },
    // If authorization fails, redirect to the login page.
    pages: {
      signIn: '/auth/signin',
      error: '/auth/error', // Error code passed in query string
    }
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health - health check
     * - api/socket - websocket
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /logo.svg (logo file)
     */
    '/((?!api/health|api/socket|_next/static|_next/image|favicon.ico|logo.svg).*)',
  ],
};

