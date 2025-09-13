import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export async function validateServerAuth(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth_token')?.value;
    
    if (!authToken) {
      return null;
    }

    // Validate with backend only (no JWT verification)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1'}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data?.user || null;
  } catch (error) {
    console.error('Server auth validation failed:', error);
    return null;
  }
}

export async function requireAuth(redirectTo: string = '/'): Promise<User> {
  const user = await validateServerAuth();
  
  if (!user) {
    redirect(`${redirectTo}?redirect=${encodeURIComponent('/dashboard')}`);
  }
  
  return user;
}

export async function redirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const user = await validateServerAuth();
  
  if (user) {
    redirect(redirectTo);
  }
}
