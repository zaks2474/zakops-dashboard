/**
 * Loading Wrapper Component (Phase 20.3)
 *
 * Handles loading, error, and empty states with consistent UX.
 * Shows skeleton while loading, error UI on failure, empty state when no data.
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingWrapperProps {
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  skeleton: React.ReactNode;
  emptyState?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function LoadingWrapper({
  isLoading,
  isError,
  error,
  isEmpty = false,
  skeleton,
  emptyState,
  onRetry,
  children,
}: LoadingWrapperProps) {
  // Loading state
  if (isLoading) {
    return <>{skeleton}</>;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        error={error}
        onRetry={onRetry}
      />
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <>
        {emptyState || <DefaultEmptyState />}
      </>
    );
  }

  // Success - render children
  return <>{children}</>;
}

interface ErrorStateProps {
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  description = 'We encountered an error while loading this content.',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
      {error && (
        <p className="text-sm text-muted-foreground mb-4 font-mono">
          {error.message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title = 'No items found',
  description = "There is nothing here yet.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon || <Inbox className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function DefaultEmptyState() {
  return <EmptyState />;
}

export default LoadingWrapper;
