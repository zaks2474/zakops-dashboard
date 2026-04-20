/**
 * Header SSE Status (Phase 20.5 UX Fix)
 *
 * A subtle SSE connection indicator for the header.
 * Shows a small dot next to the agent icon.
 */

'use client';

import React from 'react';
import { useSSEContext } from './providers';
import { SSEStatusIndicator } from '@/components/shared/SSEStatusIndicator';

export function HeaderSSEStatus() {
  const { connectionState, reconnect } = useSSEContext();

  return (
    <SSEStatusIndicator
      connectionState={connectionState}
      onRetry={reconnect}
      className="mr-1"
    />
  );
}

export default HeaderSSEStatus;
