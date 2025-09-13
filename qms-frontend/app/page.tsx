'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';

interface AuthFormData {
  email: string;
  password: string;
}

function LoginForm() {
  const [error, setError] = useState('');
  const [loadingTime, setLoadingTime] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, user } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<AuthFormData>();

  // Get the redirect URL from search params
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  // If user is already logged in, redirect them
  useEffect(() => {
    console.log('🔍 Auth state check:', { user: !!user, loading, redirectUrl });
    if (user && !loading) {
      console.log('🚀 Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    }
  }, [user, loading, router, redirectUrl]);

  // Update loading time every 100ms when loading
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setLoadingTime(Date.now() - startTime);
      }, 100);
    } else {
      setLoadingTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const onSubmit = async (data: AuthFormData) => {
    setError('');
    const startTime = Date.now();
    
    try {
      // Login using the auth context
      await login(data.email, data.password);
      const totalTime = Date.now() - startTime;
      console.log('✅ Login successful, user will be redirected by useEffect');
      // Don't redirect here - let the useEffect handle it when user state updates
    } catch (err: any) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ Auth error in ${totalTime}ms:`, err);
      setError(err.message || 'An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#56425b' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 transform transition-all duration-300 hover:scale-105">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              type="email"
              id="email"
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                }
              })}
              type="password"
              id="password"
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In... {loadingTime > 0 && `(${(loadingTime / 1000).toFixed(1)}s)`}
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#56425b' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
