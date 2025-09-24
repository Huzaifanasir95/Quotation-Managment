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

async function verifyToken(token: string, request: NextRequest): Promise<boolean> {
  try {
    // Determine API base URL based on environment
    let apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
    
    // If no environment variable is set, determine from the current request
    if (!apiBaseUrl) {
      const { protocol, host } = request.nextUrl;
      apiBaseUrl = `${protocol}//${host}/api/v1`;
    }
    
    console.log('🔍 Verifying token with API:', apiBaseUrl);
    
    // Validate token with backend only (no JWT verification in edge runtime)
    const response = await fetch(`${apiBaseUrl}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('🔐 Token verification response:', response.status, response.ok);
    return response.ok;
  } catch (error) {
    console.error('❌ Token verification failed:', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🛡️ Middleware: Processing request to:', pathname);
  
  // Get auth token from cookie
  const authToken = request.cookies.get('auth_token')?.value;
  
  console.log('🍪 Middleware: Auth token:', authToken ? 'present' : 'missing');

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.includes(pathname);

  console.log('🔒 Middleware: Route status:', {
    path: pathname,
    isProtected: isProtectedRoute,
    isPublic: isPublicRoute
  });

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    if (!authToken) {
      console.log('❌ Middleware: No auth token for protected route, redirecting to login');
      const loginUrl = new URL('/', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token server-side
    console.log('🔍 Middleware: Verifying token for protected route');
    const isValidToken = await verifyToken(authToken, request);
    if (!isValidToken) {
      console.log('❌ Middleware: Invalid token, clearing and redirecting to login');
      // Clear invalid token and redirect to login
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
    console.log('✅ Middleware: Valid token, allowing access to protected route');
  }

  // If user is authenticated and trying to access login page, redirect to dashboard
  if (isPublicRoute && authToken && pathname === '/') {
    console.log('🔍 Middleware: Checking token for redirect to dashboard');
    const isValidToken = await verifyToken(authToken, request);
    if (isValidToken) {
      console.log('✅ Middleware: Valid token on login page, redirecting to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      console.log('❌ Middleware: Invalid token on login page, clearing token');
      // Clear invalid token
      const response = NextResponse.next();
      response.cookies.delete('auth_token');
      return response;
    }
  }

  console.log('➡️ Middleware: Allowing request to proceed');
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
