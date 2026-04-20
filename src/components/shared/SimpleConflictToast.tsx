/**
 * Simple Conflict Toast (Phase 20.5.3)
 *
 * Shows when a conflict is detected but we don't have server data
 * for full merge resolution. Prompts user to refresh.
 */

'use client';

import { toast } from '@/components/notifications/Toast';

export interface SimpleConflictInfo {
  mutationId: string;
  message: string;
}

export function showSimpleConflictToast(message: string, onRefresh?: () => void) {
  toast.warning({
    title: 'Update Conflict',
    description: message,
    duration: 10000, // Stay longer for conflicts
    action: onRefresh
      ? {
          label: 'Refresh',
          onClick: () => {
            onRefresh();
          },
        }
      : undefined,
  });
}

export default showSimpleConflictToast;
