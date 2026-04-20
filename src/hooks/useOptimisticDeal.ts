/**
 * Optimistic Deal Operations (Phase 20.1, updated 20.5.5)
 *
 * Provides optimistic updates for common deal operations:
 * - Stage transitions
 * - Field updates
 * - Notes/comments
 *
 * Phase 20.5.5: SSE dedup via idempotency_key instead of stage matching.
 * Tracks pending mutations and reconciles with SSE events.
 */

'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useOptimisticMutation, ConflictInfo } from './useOptimisticMutation';
import { nanoid } from 'nanoid';
import type { Deal, DealStage } from '@/types/api';

// API helper
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9200';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.detail || `API error: ${response.status}`) as Error & { status: number; data?: unknown };
    err.status = response.status;
    err.data = error;
    throw err;
  }

  return response.json();
}

interface TransitionVariables {
  dealId: string;
  newStage: DealStage;
  reason?: string;
  idempotencyKey?: string;
}

interface UpdateDealVariables {
  dealId: string;
  updates: Partial<Deal>;
  version?: number; // For conflict detection
  idempotencyKey?: string;
}

// Mark optimistic updates with a flag for UI indication
type OptimisticDeal = Deal & { _optimistic?: boolean; _idempotencyKey?: string };

/**
 * Generate an idempotency key for a mutation.
 * Include this in the API request and track it for SSE reconciliation.
 */
export function generateIdempotencyKey(): string {
  return nanoid();
}

/**
 * Track pending mutations for SSE reconciliation.
 */
interface PendingMutation {
  idempotencyKey: string;
  optimisticData: Partial<Deal>;
  timestamp: number;
}

/**
 * Hook to reconcile SSE events with pending optimistic updates.
 * Uses idempotency_key instead of stage matching for accurate dedup.
 */
export function useDealEventReconciliation(dealId: string) {
  const queryClient = useQueryClient();
  const pendingMutations = useRef<Map<string, PendingMutation>>(new Map());

  /**
   * Track a mutation with its idempotency key.
   * Call this when starting an optimistic update.
   */
  const trackMutation = useCallback((idempotencyKey: string, optimisticData: Partial<Deal>) => {
    pendingMutations.current.set(idempotencyKey, {
      idempotencyKey,
      optimisticData,
      timestamp: Date.now(),
    });

    // Clean up old pending mutations (older than 30 seconds)
    const cutoff = Date.now() - 30000;
    const entries = Array.from(pendingMutations.current.entries());
    for (const [key, mutation] of entries) {
      if (mutation.timestamp < cutoff) {
        pendingMutations.current.delete(key);
      }
    }
  }, []);

  /**
   * Handle SSE event for this deal.
   * Reconciles with pending optimistic updates via idempotency_key.
   */
  const handleSSEEvent = useCallback((event: {
    type: string;
    data: {
      deal_id?: string;
      idempotency_key?: string;
      [key: string]: unknown;
    };
  }) => {
    // Only handle events for this deal
    if (event.data.deal_id !== dealId) return;

    const cached = queryClient.getQueryData<OptimisticDeal>(['deal', dealId]);
    if (!cached) return;

    const eventIdempotencyKey = event.data.idempotency_key;

    // Check if this event confirms one of our pending mutations
    if (eventIdempotencyKey && pendingMutations.current.has(eventIdempotencyKey)) {
      // This event confirms our optimistic update
      pendingMutations.current.delete(eventIdempotencyKey);

      // Clear optimistic marker
      queryClient.setQueryData(['deal', dealId], {
        ...cached,
        _optimistic: false,
        _idempotencyKey: undefined,
      });

      return;
    }

    // This is an external change (from another user/session)
    // Check if we have pending mutations that might conflict
    if (cached._optimistic && pendingMutations.current.size > 0) {
      // We have pending changes and received an external update
      // Don't overwrite - let the mutation response handle it
      // eslint-disable-next-line no-console
      console.log('SSE: External change while optimistic update pending, skipping');
      return;
    }

    // Normal case: apply server event
    queryClient.setQueryData(['deal', dealId], {
      ...cached,
      ...event.data,
      _optimistic: false,
    });
  }, [dealId, queryClient]);

  /**
   * Clear a specific pending mutation (on success or failure).
   */
  const clearPendingMutation = useCallback((idempotencyKey: string) => {
    pendingMutations.current.delete(idempotencyKey);
  }, []);

  return {
    trackMutation,
    handleSSEEvent,
    clearPendingMutation,
    hasPendingMutations: () => pendingMutations.current.size > 0,
  };
}

export function useOptimisticStageTransition(dealId: string) {
  const { trackMutation, clearPendingMutation } = useDealEventReconciliation(dealId);

  return useOptimisticMutation<OptimisticDeal, TransitionVariables>({
    queryKey: ['deal', dealId],

    optimisticUpdate: (current, { newStage, idempotencyKey }) => ({
      ...current,
      stage: newStage,
      updated_at: new Date().toISOString(),
      _optimistic: true,
      _idempotencyKey: idempotencyKey,
    }),

    mutationFn: async ({ dealId, newStage, reason }) => {
      const idempotencyKey = generateIdempotencyKey();

      // Track for SSE reconciliation
      trackMutation(idempotencyKey, { stage: newStage });

      try {
        const result = await apiFetch<OptimisticDeal>(`/api/deals/${dealId}/transition`, {
          method: 'POST',
          body: JSON.stringify({
            new_stage: newStage,
            reason,
            idempotency_key: idempotencyKey,
          }),
        });
        return result;
      } catch (error) {
        clearPendingMutation(idempotencyKey);
        throw error;
      }
    },

    onConflict: (conflict) => {
      // eslint-disable-next-line no-console
      console.warn('Stage transition conflict detected', conflict);
    },
  });
}

export function useOptimisticDealUpdate(dealId: string) {
  const { trackMutation, clearPendingMutation } = useDealEventReconciliation(dealId);

  return useOptimisticMutation<OptimisticDeal, UpdateDealVariables>({
    queryKey: ['deal', dealId],

    optimisticUpdate: (current, { updates, idempotencyKey }) => ({
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
      _optimistic: true,
      _idempotencyKey: idempotencyKey,
    }),

    mutationFn: async ({ dealId, updates, version }) => {
      const idempotencyKey = generateIdempotencyKey();

      // Track for SSE reconciliation
      trackMutation(idempotencyKey, updates);

      try {
        const result = await apiFetch<OptimisticDeal>(`/api/deals/${dealId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            ...updates,
            _version: version,
            idempotency_key: idempotencyKey,
          }),
        });
        return result;
      } catch (error) {
        clearPendingMutation(idempotencyKey);
        throw error;
      }
    },
  });
}

// Hook for optimistic updates in the deals list (board view)
export function useOptimisticDealsListTransition() {
  const queryClient = useQueryClient();

  return useOptimisticMutation<OptimisticDeal[], TransitionVariables>({
    queryKey: ['deals', { status: 'active' }],

    optimisticUpdate: (currentDeals, { dealId, newStage, idempotencyKey }) => {
      return currentDeals.map(deal =>
        deal.deal_id === dealId
          ? {
              ...deal,
              stage: newStage,
              updated_at: new Date().toISOString(),
              _optimistic: true,
              _idempotencyKey: idempotencyKey,
            }
          : deal
      );
    },

    mutationFn: async ({ dealId, newStage, reason }) => {
      const idempotencyKey = generateIdempotencyKey();

      await apiFetch(`/api/deals/${dealId}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          new_stage: newStage,
          reason,
          idempotency_key: idempotencyKey,
        }),
      });
      // Return undefined - will be refetched
      return undefined as unknown as OptimisticDeal[];
    },

    onSuccess: () => {
      // Invalidate to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },

    onRollback: () => {
      // Invalidate to restore from server
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

// Export conflict type for use in components
export type { ConflictInfo };
