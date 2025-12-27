'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  IconAlertTriangle,
  IconCheck,
  IconLink,
  IconPlus,
  IconRefresh,
  IconTrash
} from '@tabler/icons-react';
import {
  getQuarantineItems,
  getQuarantineHealth,
  resolveQuarantineItem,
  type QuarantineItem,
  type QuarantineHealth
} from '@/lib/api';
import { format } from 'date-fns';

export default function QuarantinePage() {
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [health, setHealth] = useState<QuarantineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolution dialog state
  const [selectedItem, setSelectedItem] = useState<QuarantineItem | null>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState<'link_to_deal' | 'create_new_deal' | 'discard'>('link_to_deal');
  const [linkDealId, setLinkDealId] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsData, healthData] = await Promise.all([
        getQuarantineItems(),
        getQuarantineHealth()
      ]);
      setItems(itemsData);
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quarantine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openResolveDialog = (item: QuarantineItem) => {
    setSelectedItem(item);
    setResolution('link_to_deal');
    setLinkDealId('');
    setShowResolveDialog(true);
  };

  const handleResolve = async () => {
    if (!selectedItem) return;
    if (resolution === 'link_to_deal' && !linkDealId) {
      alert('Please enter a deal ID');
      return;
    }

    setResolving(true);
    try {
      const itemId = selectedItem.id || selectedItem.quarantine_id || '';
      const result = await resolveQuarantineItem(
        itemId,
        resolution,
        resolution === 'link_to_deal' ? linkDealId : undefined
      );

      if (result.success) {
        setShowResolveDialog(false);
        setSelectedItem(null);
        fetchData(); // Refresh
      } else {
        alert('Resolution failed');
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setResolving(false);
    }
  };

  if (error) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
        <IconAlertTriangle className='h-12 w-12 text-destructive' />
        <h2 className='text-xl font-semibold'>Failed to load quarantine</h2>
        <p className='text-muted-foreground'>{error}</p>
        <Button onClick={fetchData} variant='outline'>
          <IconRefresh className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 md:p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Quarantine</h1>
          <p className='text-muted-foreground'>
            Review and resolve items that need classification
          </p>
        </div>
        <Button onClick={fetchData} variant='outline' size='sm' disabled={loading}>
          <IconRefresh className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Status</CardDescription>
            <CardTitle className='flex items-center gap-2'>
              {loading ? (
                <Skeleton className='h-6 w-20' />
              ) : (
                <Badge
                  variant={health?.status === 'healthy' ? 'secondary' : 'destructive'}
                  className='text-lg py-1 px-3'
                >
                  {health?.status || 'unknown'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Pending Items</CardDescription>
            <CardTitle className='text-3xl'>
              {loading ? <Skeleton className='h-9 w-12' /> : health?.pending_items || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Oldest Pending</CardDescription>
            <CardTitle className='text-3xl'>
              {loading ? (
                <Skeleton className='h-9 w-12' />
              ) : (
                `${health?.oldest_pending_days || 0}d`
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quarantine Items */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconAlertTriangle className='h-5 w-5' />
            Pending Items
          </CardTitle>
          <CardDescription>
            {items.length} item{items.length !== 1 ? 's' : ''} awaiting resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-20 w-full' />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
              <IconCheck className='h-12 w-12 mb-2 opacity-50 text-green-500' />
              <p className='text-lg font-medium'>All clear!</p>
              <p className='text-sm'>No items in quarantine</p>
            </div>
          ) : (
            <ScrollArea className='h-[500px]'>
              <div className='space-y-3'>
                {items.map((item, i) => (
                  <div
                    key={item.id || item.quarantine_id || i}
                    className='rounded-lg border p-4 hover:bg-accent/50 transition-colors'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium truncate'>
                          {item.email_subject || item.subject || 'Unknown subject'}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          From: {item.sender || item.from || 'Unknown'}
                        </p>
                        <div className='flex items-center gap-2 mt-2'>
                          <Badge variant='outline'>
                            {item.quarantine_reason || item.reason || 'Classification uncertain'}
                          </Badge>
                          <span className='text-xs text-muted-foreground'>
                            {item.received_at || item.timestamp
                              ? format(
                                  new Date(item.received_at || item.timestamp || ''),
                                  'MMM d, yyyy HH:mm'
                                )
                              : '-'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openResolveDialog(item)}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Resolve Quarantine Item</DialogTitle>
            <DialogDescription>
              Choose how to handle this item
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className='space-y-4 py-4'>
              <div className='rounded-lg bg-muted p-3'>
                <p className='font-medium text-sm truncate'>
                  {selectedItem.email_subject || selectedItem.subject || 'Unknown'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  From: {selectedItem.sender || selectedItem.from || 'Unknown'}
                </p>
              </div>

              <RadioGroup
                value={resolution}
                onValueChange={(v) => setResolution(v as typeof resolution)}
              >
                <div className='space-y-3'>
                  <div className='flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50'>
                    <RadioGroupItem value='link_to_deal' id='link' className='mt-1' />
                    <Label htmlFor='link' className='flex-1 cursor-pointer'>
                      <div className='flex items-center gap-2'>
                        <IconLink className='h-4 w-4' />
                        <span className='font-medium'>Link to Existing Deal</span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Associate this item with an existing deal
                      </p>
                    </Label>
                  </div>

                  <div className='flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50'>
                    <RadioGroupItem value='create_new_deal' id='create' className='mt-1' />
                    <Label htmlFor='create' className='flex-1 cursor-pointer'>
                      <div className='flex items-center gap-2'>
                        <IconPlus className='h-4 w-4' />
                        <span className='font-medium'>Create New Deal</span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Create a new deal from this item
                      </p>
                    </Label>
                  </div>

                  <div className='flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50'>
                    <RadioGroupItem value='discard' id='discard' className='mt-1' />
                    <Label htmlFor='discard' className='flex-1 cursor-pointer'>
                      <div className='flex items-center gap-2'>
                        <IconTrash className='h-4 w-4' />
                        <span className='font-medium'>Discard</span>
                      </div>
                      <p className='text-sm text-muted-foreground mt-1'>
                        Mark as not relevant and remove
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>

              {resolution === 'link_to_deal' && (
                <div className='space-y-2'>
                  <Label htmlFor='deal-id'>Deal ID</Label>
                  <Input
                    id='deal-id'
                    placeholder='e.g., DEAL-2025-001'
                    value={linkDealId}
                    onChange={(e) => setLinkDealId(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolving || (resolution === 'link_to_deal' && !linkDealId)}
            >
              {resolving ? 'Resolving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
