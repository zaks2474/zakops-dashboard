/**
 * SSE Status Indicator (Phase 20.5 UX Fix)
 *
 * A subtle, world-class status indicator for SSE connection.
 * Shows a small colored dot - never an aggressive banner.
 *
 * States:
 * - Connected: Green dot (live)
 * - Connecting: Pulsing amber dot (subtle)
 * - Disconnected: Gray dot (only after grace period)
 * - Error: Small amber dot with tooltip (never red takeover)
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConnectionState } from './OfflineBanner';

interface SSEStatusIndicatorProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  className?: string;
  showLabel?: boolean;
}

export function SSEStatusIndicator({
  connectionState,
  onRetry,
  className,
  showLabel = false,
}: SSEStatusIndicatorProps) {
  const config = {
    connected: {
      dotColor: 'bg-green-500',
      pulseColor: '',
      label: 'Live',
      tooltip: 'Real-time updates active',
    },
    connecting: {
      dotColor: 'bg-amber-400',
      pulseColor: 'animate-pulse',
      label: 'Connecting',
      tooltip: 'Establishing connection...',
    },
    disconnected: {
      dotColor: 'bg-gray-400',
      pulseColor: '',
      label: 'Offline',
      tooltip: 'Real-time updates paused. Click to retry.',
    },
    error: {
      dotColor: 'bg-amber-500',
      pulseColor: '',
      label: 'Reconnecting',
      tooltip: 'Connection issue. Retrying automatically...',
    },
  };

  const { dotColor, pulseColor, label, tooltip } = config[connectionState];

  const indicator = (
    <button
      onClick={connectionState !== 'connected' ? onRetry : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-full transition-opacity',
        connectionState !== 'connected' && onRetry && 'cursor-pointer hover:opacity-80',
        className
      )}
      aria-label={tooltip}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          dotColor,
          pulseColor
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {label}
        </span>
      )}
    </button>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SSEStatusIndicator;
