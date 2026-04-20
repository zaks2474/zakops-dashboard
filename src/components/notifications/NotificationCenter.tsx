/**
 * Notification Center (Phase 20.5)
 *
 * Dropdown panel showing all notifications with filtering and actions.
 */

'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  CheckCheck,
  X,
  Info,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Briefcase,
  Bot,
  Mail,
  Zap,
} from 'lucide-react';
import {
  useNotificationStore,
  Notification,
  NotificationType,
  NotificationCategory,
} from '@/stores/notificationStore';

export function NotificationCenter() {
  const { notifications, unreadCount, markAllAsRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');

  const filteredNotifications = notifications.filter(n => {
    if (n.dismissed) return false;
    if (filter === 'all') return true;
    return n.category === filter;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | NotificationCategory)}>
          <TabsList className="w-full justify-start px-4 py-2 h-auto flex-wrap bg-transparent">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="deal" className="text-xs">Deals</TabsTrigger>
            <TabsTrigger value="agent" className="text-xs">Agent</TabsTrigger>
            <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
            <TabsTrigger value="action" className="text-xs">Actions</TabsTrigger>
          </TabsList>

          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: Notification;
}

function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, dismiss } = useNotificationStore();

  const typeConfig: Record<NotificationType, { icon: typeof Info; color: string; bg: string }> = {
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950' },
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950' },
  };

  const categoryIcons: Record<NotificationCategory, typeof Zap> = {
    system: Zap,
    deal: Briefcase,
    agent: Bot,
    email: Mail,
    action: Zap,
  };

  const config = typeConfig[notification.type];
  const CategoryIcon = categoryIcons[notification.category];
  const TypeIcon = config.icon;

  return (
    <div
      className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
      }`}
      onClick={() => markAsRead(notification.id)}
    >
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <TypeIcon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(notification.id);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {notification.message && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <CategoryIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </span>
            {!notification.read && (
              <Badge variant="secondary" className="text-xs py-0">New</Badge>
            )}
          </div>
          {notification.action && (
            <Button
              variant="link"
              size="sm"
              className="p-0 h-auto mt-2"
              onClick={(e) => {
                e.stopPropagation();
                notification.action?.onClick?.();
                if (notification.action?.href) {
                  window.location.href = notification.action.href;
                }
              }}
            >
              {notification.action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;
