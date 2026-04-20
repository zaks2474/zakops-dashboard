'use client';

/**
 * Client-side Providers (Phase 20.5.1, updated for UX fix)
 *
 * This file must be "use client" because it contains:
 * - React Query provider (uses React context)
 * - SSE subscriptions (uses browser EventSource)
 * - Toast notifications (uses DOM)
 *
 * The root layout.tsx remains a server component.
 *
 * NOTE: OfflineBanner removed - replaced with subtle SSEStatusIndicator
 * in the header for world-class UX (no aggressive red banners).
 */

import React, { createContext, useContext } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActiveThemeProvider } from '../active-theme';
import { AgentDrawerProvider } from '@/components/agent/AgentDrawer';
import { QueryErrorBoundary } from '@/components/shared/QueryErrorBoundary';
import { useGlobalNotifications } from '@/hooks/useSSENotifications';
import type { ConnectionState } from '@/components/shared/OfflineBanner';

// Create a client outside the component to avoid recreating on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes - reduce unnecessary refetches
      gcTime: 10 * 60 * 1000,      // 10 minutes garbage collection
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnMount: false,       // Don't refetch on mount if data exists
      refetchOnReconnect: false,   // Don't refetch on reconnect
      retry: 1,                    // Only retry once on failure
    },
  },
});

/**
 * SSE Connection Context
 *
 * Exposes connection state for subtle header indicator.
 * NO aggressive banners - just context for components that want to show status.
 */
interface SSEContextValue {
  connectionState: ConnectionState;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextValue>({
  connectionState: 'connecting',
  reconnect: () => {},
});

export function useSSEContext() {
  return useContext(SSEContext);
}

/**
 * Global SSE Provider
 *
 * Subscribes to SSE events and converts them to notifications.
 * Exposes connection state via context for subtle header indicator.
 * NO banner - clean UX.
 */
function GlobalSSEProvider({ children }: { children: React.ReactNode }) {
  const { connectionState, reconnect } = useGlobalNotifications();

  return (
    <SSEContext.Provider value={{ connectionState, reconnect }}>
      {children}
    </SSEContext.Provider>
  );
}

export default function Providers({
  activeThemeValue,
  children
}: {
  activeThemeValue: string;
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorBoundary>
        <ActiveThemeProvider initialTheme={activeThemeValue}>
          <AgentDrawerProvider>
            <GlobalSSEProvider>
              {children}
            </GlobalSSEProvider>
          </AgentDrawerProvider>
        </ActiveThemeProvider>
      </QueryErrorBoundary>
    </QueryClientProvider>
  );
}
