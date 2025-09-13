import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/'];

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/sales',
  '/purchases',
  '/inventory',
  '/accounting',
  '/reports',
  '/settings',
  '/quotation-workflow',
  '/import-export'
];

async function verifyToken(token: string): Promise<boolean> {
  try {
    // Validate token with backend only (no JWT verification in edge runtime)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get auth token from cookie
  const authToken = request.cookies.get('auth_token')?.value;

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.includes(pathname);

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    if (!authToken) {
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token server-side
    const isValidToken = await verifyToken(authToken);
    if (!isValidToken) {
      // Clear invalid token and redirect to login
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (isPublicRoute && authToken && pathname === '/') {
    const isValidToken = await verifyToken(authToken);
    if (isValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // Clear invalid token
      const response = NextResponse.next();
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.ico$|.*\\.css$|.*\\.js$).*)',
  ],
};
