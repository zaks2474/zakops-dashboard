/**
 * Toast Notifications (Phase 20.5)
 *
 * Transient notifications for immediate feedback.
 * Auto-dismiss with optional actions.
 */

'use client';

import React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

// Export Toaster for app root
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: 'bg-card border shadow-lg',
        duration: 4000,
      }}
    />
  );
}

interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export const toast = {
  success: ({ title, description, duration = 4000, action, onDismiss }: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <ToastContent
          id={id}
          type="success"
          title={title}
          description={description}
          action={action}
          onDismiss={onDismiss}
        />
      ),
      { duration }
    );
  },

  error: ({ title, description, duration = 6000, action, onDismiss }: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <ToastContent
          id={id}
          type="error"
          title={title}
          description={description}
          action={action}
          onDismiss={onDismiss}
        />
      ),
      { duration }
    );
  },

  warning: ({ title, description, duration = 5000, action, onDismiss }: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <ToastContent
          id={id}
          type="warning"
          title={title}
          description={description}
          action={action}
          onDismiss={onDismiss}
        />
      ),
      { duration }
    );
  },

  info: ({ title, description, duration = 4000, action, onDismiss }: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <ToastContent
          id={id}
          type="info"
          title={title}
          description={description}
          action={action}
          onDismiss={onDismiss}
        />
      ),
      { duration }
    );
  },

  // Optimistic update toast with undo
  optimistic: ({ title, description, onUndo }: ToastOptions & { onUndo: () => void }) => {
    return sonnerToast.custom(
      (id) => (
        <ToastContent
          id={id}
          type="success"
          title={title}
          description={description}
          action={{ label: 'Undo', onClick: onUndo }}
        />
      ),
      { duration: 5000 }
    );
  },

  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};

interface ToastContentProps {
  id: string | number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}

function ToastContent({ id, type, title, description, action, onDismiss }: ToastContentProps) {
  const config = {
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      borderColor: 'border-l-green-500',
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      borderColor: 'border-l-red-500',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      borderColor: 'border-l-amber-500',
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      borderColor: 'border-l-blue-500',
    },
  };

  const { icon: Icon, iconColor, borderColor } = config[type];

  return (
    <div className={`bg-card rounded-lg shadow-lg border border-l-4 ${borderColor} p-4 min-w-[300px] max-w-md`}>
      <div className="flex gap-3">
        <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                sonnerToast.dismiss(id);
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 mt-2"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            onDismiss?.();
            sonnerToast.dismiss(id);
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default toast;
