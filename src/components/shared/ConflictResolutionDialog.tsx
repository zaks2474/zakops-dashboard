/**
 * Conflict Resolution Dialog (Phase 20.2)
 *
 * Shows when concurrent edits create a conflict.
 * Displays both versions and lets user choose or merge.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check, GitMerge } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConflictField {
  field: string;
  label: string;
  localValue: unknown;
  serverValue: unknown;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  conflicts: ConflictField[];
  localTimestamp?: Date;
  serverTimestamp?: Date;
  onResolve: (resolution: 'local' | 'server' | Record<string, unknown>) => void;
}

export function ConflictResolutionDialog({
  open,
  onClose,
  title = 'Conflicting Changes Detected',
  description = 'Another user modified this item while you were editing. Choose which version to keep.',
  conflicts,
  localTimestamp,
  serverTimestamp,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Record<string, 'local' | 'server'>>({});
  const [mode, setMode] = useState<'choose' | 'merge'>('choose');

  // Initialize all fields to 'server' (safer default)
  useEffect(() => {
    const initial: Record<string, 'local' | 'server'> = {};
    conflicts.forEach(c => {
      initial[c.field] = 'server';
    });
    setSelectedFields(initial);
  }, [conflicts]);

  const handleFieldSelect = (field: string, source: 'local' | 'server') => {
    setSelectedFields(prev => ({ ...prev, [field]: source }));
  };

  const handleResolve = (type: 'local' | 'server' | 'merge') => {
    if (type === 'local') {
      onResolve('local');
    } else if (type === 'server') {
      onResolve('server');
    } else {
      // Merge: build object from selected fields
      const merged: Record<string, unknown> = {};
      conflicts.forEach(c => {
        merged[c.field] = selectedFields[c.field] === 'local'
          ? c.localValue
          : c.serverValue;
      });
      onResolve(merged);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version timestamps */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">Your Changes</Badge>
              {localTimestamp && (
                <span>{formatDistanceToNow(localTimestamp, { addSuffix: true })}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">Server Version</Badge>
              {serverTimestamp && (
                <span>{formatDistanceToNow(serverTimestamp, { addSuffix: true })}</span>
              )}
            </div>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'choose' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('choose')}
            >
              Choose One
            </Button>
            <Button
              variant={mode === 'merge' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('merge')}
            >
              <GitMerge className="h-4 w-4 mr-1" />
              Merge Fields
            </Button>
          </div>

          {/* Conflict fields */}
          <div className="border rounded-lg divide-y">
            {conflicts.map((conflict) => (
              <div key={conflict.field} className="p-3">
                <div className="font-medium text-sm mb-2">{conflict.label}</div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Local value */}
                  <button
                    type="button"
                    onClick={() => handleFieldSelect(conflict.field, 'local')}
                    className={`p-3 rounded border text-left transition-colors ${
                      mode === 'merge' && selectedFields[conflict.field] === 'local'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    disabled={mode === 'choose'}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Your version</div>
                    <div className="text-sm font-mono break-all">
                      {formatValue(conflict.localValue)}
                    </div>
                    {mode === 'merge' && selectedFields[conflict.field] === 'local' && (
                      <Check className="h-4 w-4 text-blue-500 mt-1" />
                    )}
                  </button>

                  {/* Server value */}
                  <button
                    type="button"
                    onClick={() => handleFieldSelect(conflict.field, 'server')}
                    className={`p-3 rounded border text-left transition-colors ${
                      mode === 'merge' && selectedFields[conflict.field] === 'server'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    disabled={mode === 'choose'}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Server version</div>
                    <div className="text-sm font-mono break-all">
                      {formatValue(conflict.serverValue)}
                    </div>
                    {mode === 'merge' && selectedFields[conflict.field] === 'server' && (
                      <Check className="h-4 w-4 text-green-500 mt-1" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'choose' ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleResolve('server')}
                className="border-green-500 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
              >
                Keep Server Version
              </Button>
              <Button onClick={() => handleResolve('local')}>
                Keep My Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => handleResolve('merge')}>
              <GitMerge className="h-4 w-4 mr-1" />
              Apply Merged Version
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export default ConflictResolutionDialog;
