/**
 * Optimistic Mutation Hook (Phase 20.1, updated 20.5)
 *
 * Provides optimistic updates with automatic rollback on failure.
 * Integrates with React Query for cache management.
 *
 * Phase 20.5 updates:
 * - Axios-safe error handling via getHttpStatus/isConflictError
 * - Simple conflict toast for missing server data
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { isConflictError, getErrorData } from '@/lib/errors';
import { showSimpleConflictToast, SimpleConflictInfo } from '@/components/shared/SimpleConflictToast';

interface PendingMutation<T> {
  id: string;
  optimisticData: T;
  originalData: T;
  timestamp: number;
}

export interface ConflictInfo<T> {
  mutationId: string;
  localData: T;
  serverData: T;
  timestamp: number;
}

interface UseOptimisticMutationOptions<TData, TVariables> {
  // Query key to update optimistically
  queryKey: unknown[];

  // Function to apply optimistic update to cached data
  optimisticUpdate: (current: TData, variables: TVariables) => TData;

  // Mutation function
  mutationFn: (variables: TVariables) => Promise<TData>;

  // Optional: Handle conflicts with full server data
  onConflict?: (conflict: ConflictInfo<TData>) => void;

  // Optional: Handle simple conflicts (no server data available)
  onSimpleConflict?: (conflict: SimpleConflictInfo) => void;

  // Optional: Custom rollback logic
  onRollback?: (original: TData, error: Error) => void;

  // Standard mutation options
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables = void>({
  queryKey,
  optimisticUpdate,
  mutationFn,
  onConflict,
  onSimpleConflict,
  onRollback,
  onSuccess,
  onError,
}: UseOptimisticMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();
  const pendingMutations = useRef<Map<string, PendingMutation<TData>>>(new Map());
  const [conflicts, setConflicts] = useState<ConflictInfo<TData>[]>([]);

  const mutation = useMutation({
    mutationFn: async (variables: TVariables) => {
      const mutationId = nanoid();
      const currentData = queryClient.getQueryData<TData>(queryKey);

      if (!currentData) {
        // No cached data - just run mutation without optimistic update
        return mutationFn(variables);
      }

      // Store original for potential rollback
      pendingMutations.current.set(mutationId, {
        id: mutationId,
        optimisticData: optimisticUpdate(currentData, variables),
        originalData: currentData,
        timestamp: Date.now(),
      });

      // Apply optimistic update immediately
      queryClient.setQueryData<TData>(queryKey, (old) =>
        old ? optimisticUpdate(old, variables) : old
      );

      try {
        const result = await mutationFn(variables);

        // Success - remove from pending
        pendingMutations.current.delete(mutationId);

        return result;
      } catch (error) {
        // Check if it's a conflict error (409) using Axios-safe utility
        if (isConflictError(error)) {
          const serverData = getErrorData<{ current?: TData; message?: string }>(error);
          const pending = pendingMutations.current.get(mutationId);

          if (pending) {
            // If server returns current data, use full conflict resolution
            if (serverData?.current) {
              const conflict: ConflictInfo<TData> = {
                mutationId,
                localData: pending.optimisticData,
                serverData: serverData.current,
                timestamp: Date.now(),
              };

              setConflicts(prev => [...prev, conflict]);
              onConflict?.(conflict);
            } else {
              // Server did not return data - show simple refresh prompt
              const simpleConflict: SimpleConflictInfo = {
                mutationId,
                message: serverData?.message || 'This item was modified by another user. Please refresh and try again.',
              };

              // Call custom handler if provided, otherwise show default toast
              if (onSimpleConflict) {
                onSimpleConflict(simpleConflict);
              } else {
                showSimpleConflictToast(simpleConflict.message);
              }
            }
          }
        }

        // Rollback optimistic update
        const pending = pendingMutations.current.get(mutationId);
        if (pending) {
          queryClient.setQueryData<TData>(queryKey, pending.originalData);
          onRollback?.(pending.originalData, error as Error);
        }

        pendingMutations.current.delete(mutationId);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      onError?.(error as Error, variables);
    },
  });

  const resolveConflict = useCallback((
    mutationId: string,
    resolution: 'local' | 'server' | TData
  ) => {
    const conflict = conflicts.find(c => c.mutationId === mutationId);
    if (!conflict) return;

    let resolvedData: TData;
    if (resolution === 'local') {
      resolvedData = conflict.localData;
    } else if (resolution === 'server') {
      resolvedData = conflict.serverData;
    } else {
      resolvedData = resolution;
    }

    queryClient.setQueryData<TData>(queryKey, resolvedData);
    setConflicts(prev => prev.filter(c => c.mutationId !== mutationId));
  }, [conflicts, queryClient, queryKey]);

  const dismissConflict = useCallback((mutationId: string) => {
    setConflicts(prev => prev.filter(c => c.mutationId !== mutationId));
  }, []);

  return {
    ...mutation,
    conflicts,
    resolveConflict,
    dismissConflict,
    hasPendingMutations: pendingMutations.current.size > 0,
  };
}

export default useOptimisticMutation;
