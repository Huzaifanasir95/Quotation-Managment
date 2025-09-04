'use client';

import React, { Suspense } from 'react';

interface SuspenseWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Reusable Suspense wrapper with loading fallback
export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({ 
  children, 
  fallback 
}) => (
  <Suspense 
    fallback={
      fallback || (
        <div className="flex items-center justify-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )
    }
  >
    {children}
  </Suspense>
);

// Specialized loading components for different contexts
export const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4">
      <div className="flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Loading modal...</span>
      </div>
    </div>
  </div>
);

export const ComponentLoadingFallback = () => (
  <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
  </div>
);
