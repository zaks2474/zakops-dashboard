/**
 * Notification Store (Phase 20.5, updated 20.5.4)
 *
 * Manages application notifications with categories, persistence, and actions.
 *
 * Phase 20.5.4: Timestamps stored as ISO strings to avoid serialization issues
 * with Zustand persist middleware.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'system' | 'deal' | 'agent' | 'email' | 'action';

export interface NotificationAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message?: string;
  timestamp: string; // ISO string - avoids serialization issues with persist
  read: boolean;
  dismissed: boolean;
  persistent: boolean; // Stays until manually dismissed
  action?: NotificationAction;
  metadata?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  clearOld: (maxAgeMs: number) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const id = nanoid();
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: new Date().toISOString(), // Store as ISO string
          read: false,
          dismissed: false,
          persistent: notification.persistent ?? false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep max 100
          unreadCount: state.unreadCount + 1,
        }));

        return id;
      },

      markAsRead: (id) => {
        set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (!notification || notification.read) return state;

          return {
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      dismiss: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n =>
            n.id === id ? { ...n, dismissed: true, read: true } : n
          ),
          unreadCount: state.notifications.find(n => n.id === id && !n.read)
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
        }));
      },

      dismissAll: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, dismissed: true, read: true })),
          unreadCount: 0,
        }));
      },

      clearOld: (maxAgeMs) => {
        const cutoffTime = Date.now() - maxAgeMs;
        set((state) => ({
          notifications: state.notifications.filter(n =>
            n.persistent || new Date(n.timestamp).getTime() > cutoffTime
          ),
        }));
      },
    }),
    {
      name: 'zakops-notifications',
      partialize: (state) => ({
        notifications: state.notifications.filter(n => n.persistent || !n.dismissed),
      }),
      // Recalculate unread count on rehydrate (timestamps are already strings)
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.unreadCount = state.notifications.filter(n => !n.read && !n.dismissed).length;
        }
      },
    }
  )
);

// Helper hooks
export function useUnreadNotifications() {
  return useNotificationStore((state) =>
    state.notifications.filter(n => !n.read && !n.dismissed)
  );
}

export function useNotificationsByCategory(category: NotificationCategory) {
  return useNotificationStore((state) =>
    state.notifications.filter(n => n.category === category && !n.dismissed)
  );
}

export default useNotificationStore;
