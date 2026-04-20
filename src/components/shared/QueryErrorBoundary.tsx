/**
 * Query Error Boundary (Phase 20.4)
 *
 * Specialized error boundary for React Query errors.
 * Provides retry functionality and better error messages for API errors.
 */

'use client';

import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';
import { Button } from '@/components/ui/button';
import { RefreshCw, WifiOff, ServerOff, Lock, AlertCircle } from 'lucide-react';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(error) => {
            // Log API errors differently - intentional for error tracking
            if (isApiError(error)) {
              // eslint-disable-next-line no-console
              console.error('API Error:', error);
            }
          }}
          fallback={
            <QueryErrorFallback onReset={reset} />
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

interface QueryErrorFallbackProps {
  error?: Error;
  onReset: () => void;
}

function QueryErrorFallback({ error, onReset }: QueryErrorFallbackProps) {
  const errorInfo = getErrorInfo(error);
  const IconComponent = errorInfo.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className={`w-12 h-12 rounded-full ${errorInfo.bgColor} flex items-center justify-center mb-4`}>
        <IconComponent className={`h-6 w-6 ${errorInfo.iconColor}`} />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {errorInfo.title}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {errorInfo.description}
      </p>
      <Button onClick={onReset}>
        <RefreshCw className="h-4 w-4 mr-2" />
        {errorInfo.retryText}
      </Button>
    </div>
  );
}

function isApiError(error: unknown): boolean {
  return error !== null && typeof error === 'object' && ('response' in error || 'status' in error);
}

interface ErrorInfoResult {
  icon: typeof AlertCircle;
  bgColor: string;
  iconColor: string;
  title: string;
  description: string;
  retryText: string;
}

function getErrorInfo(error?: Error): ErrorInfoResult {
  const errorWithStatus = error as Error & { status?: number };

  // Network error
  if (typeof window !== 'undefined' && !navigator.onLine) {
    return {
      icon: WifiOff,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'No Internet Connection',
      description: 'Please check your connection and try again.',
      retryText: 'Retry',
    };
  }

  // Check for network error in message
  if (error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('fetch')) {
    return {
      icon: WifiOff,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'Connection Error',
      description: 'Unable to connect to the server. Please check your connection.',
      retryText: 'Retry',
    };
  }

  // 401/403 - Auth error
  if (errorWithStatus?.status === 401 || errorWithStatus?.status === 403) {
    return {
      icon: Lock,
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      title: 'Access Denied',
      description: "You do not have permission to view this content.",
      retryText: 'Try Again',
    };
  }

  // 5xx - Server error
  if (errorWithStatus?.status && errorWithStatus.status >= 500) {
    return {
      icon: ServerOff,
      bgColor: 'bg-destructive/10',
      iconColor: 'text-destructive',
      title: 'Server Error',
      description: 'Our servers are having trouble. Please try again later.',
      retryText: 'Retry',
    };
  }

  // Default
  return {
    icon: AlertCircle,
    bgColor: 'bg-destructive/10',
    iconColor: 'text-destructive',
    title: 'Something Went Wrong',
    description: 'We encountered an error loading this content.',
    retryText: 'Try Again',
  };
}

export default QueryErrorBoundary;
