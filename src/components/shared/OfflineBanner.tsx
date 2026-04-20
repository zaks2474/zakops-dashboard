/**
 * Offline Banner (Phase 20.5.7)
 *
 * Shows when SSE connection is lost. Informs user that real-time
 * updates are paused and data may be stale.
 */

'use client';

import React from 'react';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface OfflineBannerProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  className?: string;
}

export function OfflineBanner({ connectionState, onRetry, className }: OfflineBannerProps) {
  // Only show when not connected
  if (connectionState === 'connected') {
    return null;
  }

  const config = {
    connecting: {
      icon: Loader2,
      iconClass: 'animate-spin',
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      title: 'Connecting...',
      message: 'Establishing real-time connection',
      showRetry: false,
    },
    disconnected: {
      icon: WifiOff,
      iconClass: '',
      bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      title: 'Real-time paused',
      message: 'Updates may be delayed. Reconnecting automatically...',
      showRetry: true,
    },
    error: {
      icon: WifiOff,
      iconClass: '',
      bg: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      title: 'Connection lost',
      message: 'Unable to receive real-time updates. Please check your connection.',
      showRetry: true,
    },
  };

  const { icon: Icon, iconClass, bg, text, title, message, showRetry } = config[connectionState];

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 border-b px-4 py-2',
        bg,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className={cn('h-4 w-4', text, iconClass)} />
          <div>
            <span className={cn('font-medium', text)}>{title}</span>
            <span className={cn('ml-2 text-sm', text, 'opacity-80')}>{message}</span>
          </div>
        </div>
        {showRetry && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className={cn(text, 'hover:bg-transparent hover:opacity-80')}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to add padding to main content when banner is visible.
 */
export function useOfflineBannerPadding(connectionState: ConnectionState) {
  return connectionState !== 'connected' ? 'pt-10' : '';
}

export default OfflineBanner;
