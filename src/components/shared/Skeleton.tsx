/**
 * Skeleton Loading Components (Phase 20.3)
 *
 * Provides shimmer-effect placeholders for loading states.
 * Matches the structure of actual content for smooth transitions.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Skeleton({ className, children, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

// Text line skeleton
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// Avatar skeleton
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton className={cn('rounded-full', sizeClasses[size])} />;
}

// Card skeleton
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border rounded-lg', className)}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

// Table row skeleton
export function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton with header
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Deal card skeleton (matches DealCard structure)
export function SkeletonDealCard() {
  return (
    <div className="p-3 border rounded-lg bg-card shadow-sm">
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 mt-1" />
        <div className="flex-1">
          <Skeleton className="h-4 w-2/3 mb-2" />
          <div className="flex items-center gap-1 mb-1">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-1 mb-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Deal board column skeleton
export function SkeletonDealColumn() {
  return (
    <div className="flex flex-col min-w-[280px] rounded-lg bg-muted/50">
      <div className="flex items-center justify-between p-3 border-b">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="p-2 space-y-2">
        <SkeletonDealCard />
        <SkeletonDealCard />
        <SkeletonDealCard />
      </div>
    </div>
  );
}

// Full deal board skeleton
export function SkeletonDealBoard() {
  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      <SkeletonDealColumn />
      <SkeletonDealColumn />
      <SkeletonDealColumn />
      <SkeletonDealColumn />
      <SkeletonDealColumn />
      <SkeletonDealColumn />
    </div>
  );
}

// Activity timeline skeleton
export function SkeletonTimeline({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Stats card skeleton
export function SkeletonStatsCard() {
  return (
    <div className="p-6 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Dashboard stats grid skeleton
export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  );
}

// Chart skeleton
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="h-64 flex items-end justify-around gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-8 rounded-t"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
