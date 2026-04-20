/**
 * Custom Hooks (Phase 16.6, 20, 20.5)
 */

// SSE hooks (Phase 16.6)
export { useSSE, useSSEForDeal } from './useSSE';
export type { SSEEvent, SSEConnectionState, UseSSEOptions, UseSSEForDealOptions } from './useSSE';

// Optimistic mutation hooks (Phase 20, updated 20.5)
export { useOptimisticMutation } from './useOptimisticMutation';
export type { ConflictInfo } from './useOptimisticMutation';

// Optimistic deal hooks (Phase 20, updated 20.5.5)
export {
  useOptimisticStageTransition,
  useOptimisticDealUpdate,
  useOptimisticDealsListTransition,
  useDealEventReconciliation,
  generateIdempotencyKey,
} from './useOptimisticDeal';

// SSE notification hooks (Phase 20, updated 20.5.6)
export {
  useSSENotifications,
  useDealNotifications,
  useGlobalNotifications,
} from './useSSENotifications';
