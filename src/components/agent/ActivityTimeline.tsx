/**
 * ActivityTimeline Component (Phase 16.6)
 *
 * Displays a real-time timeline of deal activity using SSE.
 * Shows agent runs, stage changes, email events, and other deal activity.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconActivity,
  IconArrowRight,
  IconCheck,
  IconMail,
  IconRobot,
  IconAlertTriangle,
  IconRefresh,
  IconClock,
  IconCircleDot,
} from '@tabler/icons-react';
import { useSSEForDeal, type SSEEvent } from '@/hooks/useSSE';

// =============================================================================
// Types
// =============================================================================

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  icon: React.ReactNode;
  status?: 'success' | 'error' | 'warning' | 'info' | 'pending';
  data?: Record<string, unknown>;
}

export interface ActivityTimelineProps {
  /** Deal ID to show activity for */
  dealId: string;
  /** Initial events to display (from server) */
  initialEvents?: ActivityItem[];
  /** Maximum items to display */
  maxItems?: number;
  /** Enable SSE for real-time updates */
  enableRealtime?: boolean;
  /** Additional class name */
  className?: string;
  /** Callback when new event arrives */
  onNewEvent?: (event: SSEEvent) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getEventIcon(eventType: string): React.ReactNode {
  if (eventType.startsWith('agent.')) {
    return <IconRobot className="h-4 w-4" />;
  }
  if (eventType.startsWith('deal.stage')) {
    return <IconArrowRight className="h-4 w-4" />;
  }
  if (eventType.startsWith('email.')) {
    return <IconMail className="h-4 w-4" />;
  }
  if (eventType.includes('completed') || eventType.includes('success')) {
    return <IconCheck className="h-4 w-4" />;
  }
  if (eventType.includes('failed') || eventType.includes('error')) {
    return <IconAlertTriangle className="h-4 w-4" />;
  }
  return <IconActivity className="h-4 w-4" />;
}

function getEventStatus(eventType: string): ActivityItem['status'] {
  if (eventType.includes('completed') || eventType.includes('success')) {
    return 'success';
  }
  if (eventType.includes('failed') || eventType.includes('error')) {
    return 'error';
  }
  if (eventType.includes('warning')) {
    return 'warning';
  }
  if (eventType.includes('started') || eventType.includes('processing')) {
    return 'pending';
  }
  return 'info';
}

function formatEventTitle(eventType: string, data: Record<string, unknown>): string {
  const typeMap: Record<string, string> = {
    'deal.stage_changed': `Stage changed to ${data.to_stage || 'unknown'}`,
    'deal.created': 'Deal created',
    'deal.updated': 'Deal updated',
    'agent.run_started': 'Agent run started',
    'agent.run_completed': 'Agent run completed',
    'agent.run_failed': 'Agent run failed',
    'agent.tool_called': `Tool called: ${data.tool_name || 'unknown'}`,
    'email.sent': `Email sent: ${data.subject || 'No subject'}`,
    'email.received': `Email received: ${data.subject || 'No subject'}`,
    'email.thread_linked': 'Email thread linked to deal',
    'approval.requested': 'Approval requested',
    'approval.approved': 'Approved',
    'approval.rejected': 'Rejected',
  };

  return typeMap[eventType] || eventType.replace(/\./g, ' ').replace(/_/g, ' ');
}

function sseEventToActivityItem(event: SSEEvent): ActivityItem {
  return {
    id: event.id,
    type: event.type,
    title: formatEventTitle(event.type, event.data),
    description: (event.data.description as string) || undefined,
    timestamp: new Date(event.timestamp),
    icon: getEventIcon(event.type),
    status: getEventStatus(event.type),
    data: event.data,
  };
}

// =============================================================================
// Status Badge Component
// =============================================================================

function StatusBadge({ status }: { status?: ActivityItem['status'] }) {
  if (!status) return null;

  const variants: Record<string, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  const icons: Record<string, React.ReactNode> = {
    success: <IconCheck className="h-3 w-3" />,
    error: <IconAlertTriangle className="h-3 w-3" />,
    warning: <IconAlertTriangle className="h-3 w-3" />,
    info: <IconCircleDot className="h-3 w-3" />,
    pending: <IconClock className="h-3 w-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${variants[status]}`}>
      {icons[status]}
    </span>
  );
}

// =============================================================================
// Timeline Item Component
// =============================================================================

function TimelineItem({ item, isLast }: { item: ActivityItem; isLast: boolean }) {
  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
      )}

      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
        {item.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            <StatusBadge status={item.status} />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(item.timestamp, { addSuffix: true })}
          </span>
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {format(item.timestamp, 'MMM d, yyyy HH:mm:ss')}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ActivityTimeline({
  dealId,
  initialEvents = [],
  maxItems = 50,
  enableRealtime = true,
  className,
  onNewEvent,
}: ActivityTimelineProps) {
  const [realtimeEvents, setRealtimeEvents] = useState<ActivityItem[]>([]);

  // Handle new SSE events
  const handleEvent = useCallback((event: SSEEvent) => {
    const activityItem = sseEventToActivityItem(event);
    setRealtimeEvents((prev) => {
      // Dedupe by ID
      if (prev.some((e) => e.id === activityItem.id)) {
        return prev;
      }
      return [activityItem, ...prev].slice(0, maxItems);
    });
    onNewEvent?.(event);
  }, [maxItems, onNewEvent]);

  // SSE connection
  const { connected, connecting, error, reconnectAttempt } = useSSEForDeal({
    dealId,
    enabled: enableRealtime,
    onEvent: handleEvent,
  });

  // Merge initial and realtime events
  const allEvents = useMemo(() => {
    const merged = [...realtimeEvents, ...initialEvents];
    // Dedupe and sort by timestamp (newest first)
    const deduped = merged.reduce((acc, item) => {
      if (!acc.some((e) => e.id === item.id)) {
        acc.push(item);
      }
      return acc;
    }, [] as ActivityItem[]);
    return deduped
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [realtimeEvents, initialEvents, maxItems]);

  // Connection status indicator
  const ConnectionStatus = () => {
    if (!enableRealtime) return null;

    if (connecting) {
      return (
        <Badge variant="outline" className="text-xs gap-1">
          <IconRefresh className="h-3 w-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }

    if (error) {
      return (
        <Badge variant="destructive" className="text-xs gap-1">
          <IconAlertTriangle className="h-3 w-3" />
          {reconnectAttempt > 0 ? `Reconnecting (${reconnectAttempt})...` : 'Disconnected'}
        </Badge>
      );
    }

    if (connected) {
      return (
        <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      );
    }

    return null;
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <IconActivity className="h-4 w-4" />
          Activity
        </h3>
        <ConnectionStatus />
      </div>

      {/* Timeline */}
      {allEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <IconActivity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activity yet</p>
          {enableRealtime && connected && (
            <p className="text-xs mt-1">Watching for updates...</p>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-0">
            {allEvents.map((item, index) => (
              <TimelineItem
                key={item.id}
                item={item}
                isLast={index === allEvents.length - 1}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

export function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityTimeline;
