/**
 * useSSE Hook (Phase 16.6)
 *
 * SSE subscription hook for deal/correlation-based real-time events.
 * Features:
 * - Correlation ID filtering (e.g., by deal_id)
 * - Automatic reconnection with exponential backoff
 * - Event deduplication using seen event IDs
 * - Last-Event-ID resume capability
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface SSEEvent {
  id: string;
  type: string;
  data: Record<string, unknown>;
  correlation_id?: string;
  timestamp: string;
  sequence?: number;
}

export interface SSEConnectionState {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  lastEventId: string | null;
  reconnectAttempt: number;
}

export interface UseSSEOptions {
  /** Enable/disable the connection */
  enabled?: boolean;
  /** Correlation ID to filter events (e.g., deal_id) */
  correlationId?: string;
  /** User ID for user-scoped events */
  userId?: string;
  /** Event types to subscribe to (empty = all) */
  eventTypes?: string[];
  /** Callback for received events */
  onEvent?: (event: SSEEvent) => void;
  /** Callback when connection established */
  onConnect?: () => void;
  /** Callback when connection lost */
  onDisconnect?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on reconnect attempt */
  onReconnect?: (attempt: number) => void;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base reconnect delay in ms (default: 1000) */
  baseReconnectDelay?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Event deduplication window size (default: 100) */
  dedupeWindowSize?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_BASE_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_DELAY = 30000;
const DEFAULT_DEDUPE_WINDOW_SIZE = 100;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSSE(options: UseSSEOptions = {}) {
  const {
    enabled = true,
    correlationId,
    userId,
    eventTypes = [],
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    baseReconnectDelay = DEFAULT_BASE_RECONNECT_DELAY,
    maxReconnectDelay = DEFAULT_MAX_RECONNECT_DELAY,
    dedupeWindowSize = DEFAULT_DEDUPE_WINDOW_SIZE,
  } = options;

  const [state, setState] = useState<SSEConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    lastEventId: null,
    reconnectAttempt: 0,
  });

  // Refs for connection management
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const seenEventsRef = useRef<Set<string>>(new Set());

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Calculate reconnect delay with exponential backoff + jitter
  const getReconnectDelay = useCallback(
    (attempt: number) => {
      const delay = Math.min(
        baseReconnectDelay * Math.pow(2, attempt),
        maxReconnectDelay
      );
      // Add jitter (0-25% of delay)
      return delay + Math.random() * delay * 0.25;
    },
    [baseReconnectDelay, maxReconnectDelay]
  );

  // Manage deduplication window
  const isDuplicate = useCallback(
    (eventId: string): boolean => {
      if (!eventId) return false;
      if (seenEventsRef.current.has(eventId)) {
        return true;
      }
      seenEventsRef.current.add(eventId);
      // Trim window if too large
      if (seenEventsRef.current.size > dedupeWindowSize) {
        const arr = Array.from(seenEventsRef.current);
        seenEventsRef.current = new Set(arr.slice(-dedupeWindowSize));
      }
      return false;
    },
    [dedupeWindowSize]
  );

  // Connect to SSE stream
  const connect = useCallback(
    async (lastEventId?: string) => {
      if (!enabled) return;

      // Abort any existing connection
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({
        ...prev,
        connecting: true,
        error: null,
      }));

      try {
        // Build SSE URL with query parameters
        // Priority: explicit SSE URL > API URL > fallback to backend default port (8091)
        const sseUrl = process.env.NEXT_PUBLIC_SSE_URL;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8091';
        const baseUrl = sseUrl || `${apiUrl}/api/events/stream`;
        const url = new URL(baseUrl);

        if (correlationId) {
          url.searchParams.set('correlation_id', correlationId);
        }
        if (userId) {
          url.searchParams.set('user_id', userId);
        }
        if (eventTypes.length > 0) {
          url.searchParams.set('event_types', eventTypes.join(','));
        }

        const headers: HeadersInit = {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        };

        if (lastEventId) {
          headers['Last-Event-ID'] = lastEventId;
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          // Handle non-200 responses WITHOUT throwing to avoid UI crashes
          const errMsg = `HTTP ${response.status}: ${response.statusText}`;
          console.warn('SSE connection failed:', errMsg);

          // 404, 401, 403 are permanent errors - don't retry
          if (response.status === 404 || response.status === 401 || response.status === 403) {
            const err = new Error(errMsg);
            if (mountedRef.current) {
              setState((prev) => ({
                ...prev,
                connected: false,
                connecting: false,
                error: err,
                reconnectAttempt: maxReconnectAttempts + 1, // Stop retries
              }));
              onError?.(err);
              onDisconnect?.();
            }
            return; // Don't throw, just exit gracefully
          }

          // For server errors (5xx), throw to trigger retry logic
          throw new Error(errMsg);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        // Connection established
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            connected: true,
            connecting: false,
            reconnectAttempt: 0,
          }));
          onConnect?.();
        }

        const decoder = new TextDecoder();
        let buffer = '';

        // Process SSE stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent: {
            id?: string;
            event?: string;
            data?: string;
          } = {};

          for (const line of lines) {
            if (line.startsWith('id: ')) {
              currentEvent.id = line.slice(4).trim();
            } else if (line.startsWith('event: ')) {
              currentEvent.event = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentEvent.data = (currentEvent.data || '') + line.slice(6);
            } else if (line === '' && currentEvent.data) {
              // End of event - process it
              try {
                const eventId = currentEvent.id || '';
                const eventType = currentEvent.event || 'message';

                // Skip duplicates
                if (eventId && isDuplicate(eventId)) {
                  currentEvent = {};
                  continue;
                }

                // Skip heartbeat/ping events
                if (eventType === 'ping' || eventType === 'heartbeat') {
                  currentEvent = {};
                  continue;
                }

                const parsedData = JSON.parse(currentEvent.data);

                const event: SSEEvent = {
                  id: eventId,
                  type: eventType,
                  data: parsedData,
                  correlation_id: parsedData.correlation_id,
                  timestamp: parsedData.timestamp || new Date().toISOString(),
                  sequence: parsedData.sequence,
                };

                // Update last event ID
                if (eventId && mountedRef.current) {
                  setState((prev) => ({
                    ...prev,
                    lastEventId: eventId,
                  }));
                }

                // Call event handler
                onEvent?.(event);
              } catch (e) {
                console.error('Failed to parse SSE event:', e, currentEvent);
              }
              currentEvent = {};
            }
          }
        }

        // Stream ended normally
        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            connected: false,
            connecting: false,
          }));
          onDisconnect?.();
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Intentional abort, don't reconnect
          return;
        }

        console.error('SSE connection error:', error);

        if (mountedRef.current) {
          const err = error instanceof Error ? error : new Error(String(error));

          setState((prev) => {
            const nextAttempt = prev.reconnectAttempt + 1;

            // Schedule reconnect if under limit
            if (nextAttempt <= maxReconnectAttempts) {
              const delay = getReconnectDelay(prev.reconnectAttempt);
              onReconnect?.(nextAttempt);

              reconnectTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  connect(prev.lastEventId || undefined);
                }
              }, delay);
            }

            return {
              ...prev,
              connected: false,
              connecting: false,
              error: err,
              reconnectAttempt: nextAttempt,
            };
          });

          onError?.(err);
        }
      }
    },
    [
      enabled,
      correlationId,
      userId,
      eventTypes,
      maxReconnectAttempts,
      getReconnectDelay,
      isDuplicate,
      onConnect,
      onDisconnect,
      onError,
      onEvent,
      onReconnect,
    ]
  );

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    clearReconnectTimeout();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      connected: false,
      connecting: false,
      error: null,
      lastEventId: null,
      reconnectAttempt: 0,
    });

    seenEventsRef.current.clear();
  }, [clearReconnectTimeout]);

  // Reset reconnect attempts
  const resetReconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      reconnectAttempt: 0,
    }));
  }, []);

  // Connect on mount / when dependencies change
  useEffect(() => {
    mountedRef.current = true;

    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, correlationId, userId, eventTypes.join(',')]);

  return {
    ...state,
    connect: () => connect(state.lastEventId || undefined),
    disconnect,
    resetReconnect,
  };
}

// =============================================================================
// Convenience Hook: useSSEForDeal
// =============================================================================

export interface UseSSEForDealOptions {
  dealId: string;
  enabled?: boolean;
  onEvent?: (event: SSEEvent) => void;
  onStageChange?: (from: string, to: string) => void;
  onAgentUpdate?: (data: Record<string, unknown>) => void;
  onEmailUpdate?: (data: Record<string, unknown>) => void;
}

/**
 * Convenience hook for subscribing to events for a specific deal.
 */
export function useSSEForDeal(options: UseSSEForDealOptions) {
  const {
    dealId,
    enabled = true,
    onEvent,
    onStageChange,
    onAgentUpdate,
    onEmailUpdate,
  } = options;

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      // Call generic handler
      onEvent?.(event);

      // Call specific handlers based on event type
      if (event.type === 'deal.stage_changed' && onStageChange) {
        const data = event.data as { from_stage?: string; to_stage?: string };
        onStageChange(data.from_stage || '', data.to_stage || '');
      }

      if (event.type.startsWith('agent.') && onAgentUpdate) {
        onAgentUpdate(event.data);
      }

      if (event.type.startsWith('email.') && onEmailUpdate) {
        onEmailUpdate(event.data);
      }
    },
    [onEvent, onStageChange, onAgentUpdate, onEmailUpdate]
  );

  return useSSE({
    enabled: enabled && !!dealId,
    correlationId: dealId,
    onEvent: handleEvent,
  });
}

export default useSSE;
