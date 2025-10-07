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

    // Validate with backend - supports both localhost and production
    const getApiUrl = () => {
      if (process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
      }
      // Default to production for server-side rendering
      return 'https://anoosh.vercel.app/api/v1';
    };
    
    const API_BASE_URL = getApiUrl();
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
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
