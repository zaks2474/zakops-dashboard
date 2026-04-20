/**
 * SSE to Notification Bridge with Noise Control (Phase 20.6, updated 20.5.6)
 *
 * Converts SSE events into user-facing notifications.
 * Features:
 * - Cooldown windows for repetitive events
 * - Grouped notifications (e.g., "6 deals updated")
 * - Configurable event suppression
 * - Connection state tracking for offline UX
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSSE, SSEEvent } from './useSSE';
import { useNotificationStore, NotificationCategory, NotificationType } from '@/stores/notificationStore';
import { toast } from '@/components/notifications/Toast';
import type { ConnectionState } from '@/components/shared/OfflineBanner';

// =============================================================================
// Grace Period Configuration
// =============================================================================

const GRACE_CONFIG = {
  // Time before showing "disconnected" state (ms)
  disconnectedGracePeriod: 15000, // 15 seconds
  // Time before showing "error" state (ms)
  errorGracePeriod: 10000, // 10 seconds
  // Max reconnect attempts before giving up silently
  maxSilentRetries: 5,
};

// =============================================================================
// Noise Control Configuration
// =============================================================================

const NOISE_CONFIG = {
  // Cooldown in ms before showing another notification of the same type
  cooldowns: {
    'deal.stage_changed': 2000,
    'deal.updated': 5000,
    'deal.created': 1000,
    'agent.run_completed': 10000, // Longer cooldown for noisy events
    'agent.step_completed': 30000, // Very noisy, long cooldown
    'action.approved': 2000,
    'action.rejected': 2000,
    'email.received': 3000,
    default: 1000,
  } as Record<string, number>,

  // Events to suppress entirely (no notifications, but still process)
  suppressed: new Set([
    'agent.step_started',
    'agent.step_completed', // Too granular for user notifications
    'system.heartbeat',
    'ping',
    'heartbeat',
  ]),

  // Events that should only go to notification center, not toast
  silentEvents: new Set([
    'agent.run_completed',
    'agent.run_started',
    'deal.updated',
    'email.classified',
  ]),

  // Grouping window in ms
  groupingWindow: 3000,
};

// =============================================================================
// Event Configuration
// =============================================================================

interface EventConfig {
  category: NotificationCategory;
  type: NotificationType;
  title: (data: Record<string, unknown>) => string;
  groupTitle?: string;
  message?: (data: Record<string, unknown>) => string | undefined;
  groupMessage?: (count: number) => string;
  showToast: boolean;
  persistent: boolean;
  action?: (data: Record<string, unknown>) => { label: string; href?: string; onClick?: () => void } | undefined;
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  'deal.stage_changed': {
    category: 'deal',
    type: 'info',
    title: (d) => `Deal moved to ${d.to_stage || 'new stage'}`,
    groupTitle: 'deals updated',
    message: (d) => d.deal_name as string | undefined,
    groupMessage: (n) => `${n} deals changed stages`,
    showToast: true,
    persistent: false,
    action: (d) => d.deal_id ? { label: 'View Deal', href: `/deals/${d.deal_id}` } : undefined,
  },
  'deal.created': {
    category: 'deal',
    type: 'success',
    title: () => 'New deal created',
    groupTitle: 'new deals',
    message: (d) => d.deal_name as string | undefined,
    groupMessage: (n) => `${n} new deals created`,
    showToast: true,
    persistent: false,
    action: (d) => d.deal_id ? { label: 'View Deal', href: `/deals/${d.deal_id}` } : undefined,
  },
  'deal.updated': {
    category: 'deal',
    type: 'info',
    title: () => 'Deal updated',
    groupTitle: 'deals updated',
    message: (d) => d.deal_name as string | undefined,
    groupMessage: (n) => `${n} deals updated`,
    showToast: false, // Silent - only notification center
    persistent: false,
  },
  'agent.run_started': {
    category: 'agent',
    type: 'info',
    title: () => 'Agent started processing',
    groupTitle: 'agent tasks started',
    message: (d) => d.task_type as string | undefined,
    showToast: false, // Silent
    persistent: false,
  },
  'agent.run_completed': {
    category: 'agent',
    type: 'success',
    title: () => 'Agent task completed',
    groupTitle: 'agent tasks completed',
    message: (d) => d.task_type as string | undefined,
    groupMessage: (n) => `${n} agent tasks completed`,
    showToast: false, // Silent - only notification center
    persistent: false,
  },
  'agent.action_proposed': {
    category: 'action',
    type: 'warning',
    title: () => 'Agent proposed an action',
    message: (d) => (d.reasoning_preview || d.action_type) as string | undefined,
    showToast: true,
    persistent: true, // Keep until reviewed
    action: (d) => d.action_id ? { label: 'Review', href: `/actions/${d.action_id}` } : undefined,
  },
  'action.created': {
    category: 'action',
    type: 'info',
    title: () => 'New action pending',
    message: (d) => d.action_type as string | undefined,
    showToast: true,
    persistent: false,
    action: (d) => d.action_id ? { label: 'View', href: `/actions/${d.action_id}` } : undefined,
  },
  'action.approved': {
    category: 'action',
    type: 'success',
    title: () => 'Action approved',
    groupTitle: 'actions approved',
    message: (d) => `${d.action_type || 'Action'} has been approved`,
    groupMessage: (n) => `${n} actions approved`,
    showToast: true,
    persistent: false,
  },
  'action.rejected': {
    category: 'action',
    type: 'warning',
    title: () => 'Action rejected',
    message: (d) => d.reason as string | undefined,
    showToast: true,
    persistent: false,
  },
  'action.approval_recorded': {
    category: 'action',
    type: 'info',
    title: (d) => d.fully_approved ? 'Action fully approved' : 'Approval recorded',
    message: (d) => {
      const have = d.approvals_have as number;
      const need = d.approvals_needed as number;
      if (have && need) return `${have}/${need} approvals`;
      return undefined;
    },
    showToast: true,
    persistent: false,
  },
  'email.received': {
    category: 'email',
    type: 'info',
    title: (d) => `New email from ${d.from || 'unknown'}`,
    groupTitle: 'new emails',
    message: (d) => d.subject as string | undefined,
    groupMessage: (n) => `${n} new emails received`,
    showToast: true,
    persistent: false,
    action: (d) => d.thread_id ? { label: 'View', href: `/email/${d.thread_id}` } : undefined,
  },
  'email.classified': {
    category: 'email',
    type: 'info',
    title: () => 'Email classified',
    message: (d) => `Classification: ${d.classification || 'unknown'}`,
    showToast: false, // Silent
    persistent: false,
  },
  'system.error': {
    category: 'system',
    type: 'error',
    title: () => 'System error occurred',
    message: (d) => d.message as string | undefined,
    showToast: true,
    persistent: true,
  },
  'system.warning': {
    category: 'system',
    type: 'warning',
    title: () => 'System warning',
    message: (d) => d.message as string | undefined,
    showToast: true,
    persistent: false,
  },
};

// =============================================================================
// Event Grouping
// =============================================================================

interface EventGroup {
  type: string;
  count: number;
  firstEvent: Record<string, unknown>;
  timer: ReturnType<typeof setTimeout> | null;
}

// =============================================================================
// Hook
// =============================================================================

interface UseSSENotificationsOptions {
  correlationId?: string;
  enabled?: boolean;
}

interface UseSSENotificationsReturn {
  events: SSEEvent[];
  connectionState: ConnectionState;
  reconnect: () => void;
}

export function useSSENotifications({
  correlationId,
  enabled = true,
}: UseSSENotificationsOptions = {}): UseSSENotificationsReturn {
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Track last notification time per event type
  const lastNotificationTime = useRef<Map<string, number>>(new Map());

  // Track event groups for batching
  const eventGroups = useRef<Map<string, EventGroup>>(new Map());

  // Show notification (single or grouped)
  const showNotification = useCallback((
    type: string,
    data: Record<string, unknown>,
    isGrouped: boolean,
    groupCount?: number
  ) => {
    const config = EVENT_CONFIG[type];
    if (!config) return;

    const title = isGrouped && groupCount && config.groupTitle
      ? `${groupCount} ${config.groupTitle}`
      : config.title(data);

    const message = isGrouped && config.groupMessage && groupCount
      ? config.groupMessage(groupCount)
      : config.message?.(data);

    // Add to notification center
    addNotification({
      type: config.type,
      category: config.category,
      title,
      message,
      persistent: config.persistent,
      action: !isGrouped ? config.action?.(data) : undefined,
      metadata: { eventType: type, grouped: isGrouped, count: groupCount },
    });

    // Show toast (unless silent or grouped with many items)
    const isSilent = NOISE_CONFIG.silentEvents.has(type);
    if (config.showToast && !isSilent && !isGrouped) {
      const toastFn = toast[config.type];
      const configAction = config.action?.(data);
      // Convert href-based actions to onClick for toast
      const toastAction = configAction
        ? {
            label: configAction.label,
            onClick: configAction.onClick || (() => {
              if (configAction.href) {
                window.location.href = configAction.href;
              }
            }),
          }
        : undefined;
      toastFn({
        title,
        description: message,
        action: toastAction,
      });
    }

    // Show grouped toast with lower prominence
    if (isGrouped && groupCount && groupCount > 1 && config.showToast && !isSilent) {
      toast.info({
        title,
        description: message,
        duration: 3000, // Shorter duration for grouped
      });
    }
  }, [addNotification]);

  // Flush a group and show notification
  const flushGroup = useCallback((type: string) => {
    const group = eventGroups.current.get(type);
    if (!group) return;

    if (group.timer) {
      clearTimeout(group.timer);
    }
    eventGroups.current.delete(type);
    lastNotificationTime.current.set(type, Date.now());

    if (group.count === 1) {
      // Single event - show normally
      showNotification(type, group.firstEvent, false);
    } else {
      // Multiple events - show grouped notification
      showNotification(type, group.firstEvent, true, group.count);
    }
  }, [showNotification]);

  // Group an event for batching
  const groupEvent = useCallback((type: string, data: Record<string, unknown>) => {
    const existing = eventGroups.current.get(type);

    if (existing) {
      existing.count++;
      // Clear existing timer
      if (existing.timer) clearTimeout(existing.timer);
    } else {
      eventGroups.current.set(type, {
        type,
        count: 1,
        firstEvent: data,
        timer: null,
      });
    }

    // Set timer to flush the group
    const group = eventGroups.current.get(type)!;
    group.timer = setTimeout(() => {
      flushGroup(type);
    }, NOISE_CONFIG.groupingWindow);
  }, [flushGroup]);

  // Process incoming event
  const processEvent = useCallback((event: SSEEvent) => {
    const { type, data } = event;

    // Skip suppressed events
    if (NOISE_CONFIG.suppressed.has(type)) {
      return;
    }

    // Skip events without config
    if (!EVENT_CONFIG[type]) {
      return;
    }

    // Check cooldown
    const cooldown = NOISE_CONFIG.cooldowns[type] ?? NOISE_CONFIG.cooldowns.default;
    const lastTime = lastNotificationTime.current.get(type) ?? 0;
    const now = Date.now();

    if (now - lastTime < cooldown) {
      // Within cooldown - group the event
      groupEvent(type, data as Record<string, unknown>);
      return;
    }

    // Outside cooldown - show notification
    lastNotificationTime.current.set(type, now);
    showNotification(type, data as Record<string, unknown>, false);
  }, [groupEvent, showNotification]);

  // Handle event from SSE
  const handleEvent = useCallback((event: SSEEvent) => {
    processEvent(event);
  }, [processEvent]);

  // Subscribe to SSE
  const sseResult = useSSE({
    correlationId,
    enabled,
    onEvent: handleEvent,
  });

  // Grace period tracking
  const disconnectedSince = useRef<number | null>(null);
  const [gracefulState, setGracefulState] = useState<ConnectionState>('connected');

  // Update graceful state with grace period
  useEffect(() => {
    const rawState: ConnectionState = sseResult.connecting
      ? 'connecting'
      : sseResult.connected
        ? 'connected'
        : sseResult.error
          ? 'error'
          : 'disconnected';

    // If connected, reset tracking and show connected
    if (rawState === 'connected') {
      disconnectedSince.current = null;
      setGracefulState('connected');
      return;
    }

    // If connecting, show connecting (brief state)
    if (rawState === 'connecting') {
      // Only show connecting if we were previously connected
      // Otherwise stay in current state during initial connection
      if (gracefulState === 'connected') {
        // Brief connecting state is OK
        setGracefulState('connecting');
      }
      return;
    }

    // If disconnected/error, apply grace period
    const now = Date.now();
    if (disconnectedSince.current === null) {
      disconnectedSince.current = now;
    }

    const elapsed = now - disconnectedSince.current;
    const gracePeriod = rawState === 'error'
      ? GRACE_CONFIG.errorGracePeriod
      : GRACE_CONFIG.disconnectedGracePeriod;

    // Stay silent (show "connected") during grace period
    // This prevents flashing error states during brief disconnects
    if (elapsed < gracePeriod) {
      // Keep showing "connected" during grace period
      // Set a timer to update after grace period expires
      const remaining = gracePeriod - elapsed;
      const timer = setTimeout(() => {
        // After grace period, if still disconnected, show the real state
        // But only show "disconnected", never aggressive "error"
        if (!sseResult.connected && !sseResult.connecting) {
          setGracefulState('disconnected');
        }
      }, remaining);
      return () => clearTimeout(timer);
    }

    // Grace period expired - show disconnected (not error, to be less aggressive)
    setGracefulState('disconnected');
  }, [sseResult.connected, sseResult.connecting, sseResult.error, gracefulState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush any pending groups
      const types = Array.from(eventGroups.current.keys());
      for (const type of types) {
        flushGroup(type);
      }
    };
  }, [flushGroup]);

  return {
    events: [], // Events are processed via callbacks, not returned
    connectionState: gracefulState,
    reconnect: sseResult.connect,
  };
}

// Hook specifically for deal page
export function useDealNotifications(dealId: string) {
  return useSSENotifications({
    correlationId: dealId,
    enabled: !!dealId,
  });
}

// Hook for global notifications (header)
export function useGlobalNotifications() {
  return useSSENotifications({ enabled: true });
}

export default useSSENotifications;
