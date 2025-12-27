'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconClock,
  IconRefresh
} from '@tabler/icons-react';
import { getActions, getDueActions, type Action } from '@/lib/api';
import { format, isToday, isThisWeek, isPast } from 'date-fns';

export default function ActionsPage() {
  const [allActions, setAllActions] = useState<Action[]>([]);
  const [dueActions, setDueActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, due] = await Promise.all([
        getActions(),
        getDueActions()
      ]);
      setAllActions(all);
      setDueActions(due);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Categorize actions
  const overdueActions = allActions.filter(a => {
    if (a.status !== 'pending') return false;
    const scheduled = new Date(a.scheduled_for);
    return isPast(scheduled) && !isToday(scheduled);
  });

  const todayActions = allActions.filter(a => {
    if (a.status !== 'pending') return false;
    return isToday(new Date(a.scheduled_for));
  });

  const thisWeekActions = allActions.filter(a => {
    if (a.status !== 'pending') return false;
    const scheduled = new Date(a.scheduled_for);
    return isThisWeek(scheduled) && !isToday(scheduled) && !isPast(scheduled);
  });

  const upcomingActions = allActions.filter(a => {
    if (a.status !== 'pending') return false;
    const scheduled = new Date(a.scheduled_for);
    return !isThisWeek(scheduled) && !isPast(scheduled);
  });

  const completedActions = allActions.filter(a => a.status === 'completed');

  if (error) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
        <IconAlertTriangle className='h-12 w-12 text-destructive' />
        <h2 className='text-xl font-semibold'>Failed to load actions</h2>
        <p className='text-muted-foreground'>{error}</p>
        <Button onClick={fetchData} variant='outline'>
          <IconRefresh className='mr-2 h-4 w-4' />
          Retry
        </Button>
      </div>
    );
  }

  const ActionList = ({ actions, emptyMessage }: { actions: Action[]; emptyMessage: string }) => (
    <ScrollArea className='h-[400px]'>
      {actions.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
          <IconCalendarEvent className='h-12 w-12 mb-2 opacity-50' />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {actions.map((action) => (
            <Link key={action.action_id} href={`/deals/${action.deal_id}`}>
              <div className='flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer'>
                <div className='flex-1 min-w-0'>
                  <p className='font-medium'>{action.action_type}</p>
                  <p className='text-sm text-muted-foreground truncate'>
                    {action.deal_id}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm'>
                    {format(new Date(action.scheduled_for), 'MMM d, yyyy')}
                  </p>
                  <Badge
                    variant={
                      action.is_due
                        ? 'destructive'
                        : action.status === 'completed'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {action.status}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 md:p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Actions</h1>
          <p className='text-muted-foreground'>
            Manage scheduled and pending actions
          </p>
        </div>
        <Button onClick={fetchData} variant='outline' size='sm' disabled={loading}>
          <IconRefresh className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Due Now</CardDescription>
            <CardTitle className='text-3xl'>
              {loading ? <Skeleton className='h-9 w-12' /> : dueActions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Overdue</CardDescription>
            <CardTitle className='text-3xl text-destructive'>
              {loading ? <Skeleton className='h-9 w-12' /> : overdueActions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Today</CardDescription>
            <CardTitle className='text-3xl'>
              {loading ? <Skeleton className='h-9 w-12' /> : todayActions.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>This Week</CardDescription>
            <CardTitle className='text-3xl'>
              {loading ? <Skeleton className='h-9 w-12' /> : thisWeekActions.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Actions Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <IconClock className='h-5 w-5' />
            All Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          ) : (
            <Tabs defaultValue='due'>
              <TabsList>
                <TabsTrigger value='due'>
                  Due Now
                  {dueActions.length > 0 && (
                    <Badge variant='destructive' className='ml-2'>
                      {dueActions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='overdue'>
                  Overdue
                  {overdueActions.length > 0 && (
                    <Badge variant='destructive' className='ml-2'>
                      {overdueActions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value='today'>
                  Today ({todayActions.length})
                </TabsTrigger>
                <TabsTrigger value='week'>
                  This Week ({thisWeekActions.length})
                </TabsTrigger>
                <TabsTrigger value='upcoming'>
                  Upcoming ({upcomingActions.length})
                </TabsTrigger>
                <TabsTrigger value='completed'>
                  Completed ({completedActions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value='due'>
                <ActionList actions={dueActions} emptyMessage='No actions due right now' />
              </TabsContent>
              <TabsContent value='overdue'>
                <ActionList actions={overdueActions} emptyMessage='No overdue actions' />
              </TabsContent>
              <TabsContent value='today'>
                <ActionList actions={todayActions} emptyMessage='No actions scheduled for today' />
              </TabsContent>
              <TabsContent value='week'>
                <ActionList actions={thisWeekActions} emptyMessage='No actions scheduled this week' />
              </TabsContent>
              <TabsContent value='upcoming'>
                <ActionList actions={upcomingActions} emptyMessage='No upcoming actions' />
              </TabsContent>
              <TabsContent value='completed'>
                <ActionList actions={completedActions} emptyMessage='No completed actions' />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
