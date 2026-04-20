/**
 * Shared Components (Phase 20, updated 20.5)
 */

export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { QueryErrorBoundary } from './QueryErrorBoundary';
export { LoadingWrapper, ErrorState, EmptyState } from './LoadingWrapper';
export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonDealCard,
  SkeletonDealColumn,
  SkeletonDealBoard,
  SkeletonTimeline,
  SkeletonStatsCard,
  SkeletonStatsGrid,
  SkeletonChart,
} from './Skeleton';

// Phase 20.5 additions
export { OfflineBanner, useOfflineBannerPadding } from './OfflineBanner';
export type { ConnectionState } from './OfflineBanner';
export { showSimpleConflictToast } from './SimpleConflictToast';
export type { SimpleConflictInfo } from './SimpleConflictToast';
export { SSEStatusIndicator } from './SSEStatusIndicator';
