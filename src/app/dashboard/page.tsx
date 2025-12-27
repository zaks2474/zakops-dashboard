'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconBox,
  IconCalendarEvent,
  IconChartBar,
  IconClock,
  IconRefresh
} from '@tabler/icons-react';
import {
  getDeals,
  getDueActions,
  getQuarantineHealth,
  getQuarantineItems,
  getAlerts,
  type Deal,
  type Action,
  type QuarantineItem,
  type QuarantineHealth,
  type Alert
} from '@/lib/api';

// Stage order for pipeline funnel
const STAGE_ORDER = [
  'inbound',
  'screening',
  'qualified',
  'loi',
  'diligence',
  'closing',
  'integration',
  'operations',
  'growth',
  'exit_planning'
];

const STAGE_COLORS: Record<string, string> = {
  inbound: 'bg-slate-500',
  screening: 'bg-blue-500',
  qualified: 'bg-cyan-500',
  loi: 'bg-teal-500',
  diligence: 'bg-green-500',
  closing: 'bg-emerald-500',
  integration: 'bg-lime-500',
  operations: 'bg-yellow-500',
  growth: 'bg-amber-500',
  exit_planning: 'bg-orange-500',
};

export default function DashboardPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [dueActions, setDueActions] = useState<Action[]>([]);
  const [quarantineHealth, setQuarantineHealth] = useState<QuarantineHealth | null>(null);
  const [quarantineItems, setQuarantineItems] = useState<QuarantineItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealsData, actionsData, healthData, itemsData, alertsData] = await Promise.all([
        getDeals({ status: 'active' }),
        getDueActions(),
        getQuarantineHealth(),
        getQuarantineItems(),
        getAlerts()
      ]);
      setDeals(dealsData);
      setDueActions(actionsData);
      setQuarantineHealth(healthData);
      setQuarantineItems(itemsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
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

  // Calculate stage counts
  const stageCounts = STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.stage === stage).length;
    return acc;
  }, {} as Record<string, number>);

  // Filter deals by selected stage
  const filteredDeals = selectedStage
    ? deals.filter(d => d.stage === selectedStage)
    : deals;

  if (error) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
        <IconAlertTriangle className='h-12 w-12 text-destructive' />
        <h2 className='text-xl font-semibold'>Failed to load dashboard</h2>
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
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <p className='text-muted-foreground'>Deal pipeline overview and activity</p>
        </div>
        <Button onClick={fetchData} variant='outline' size='sm' disabled={loading}>
          <IconRefresh className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Grid */}
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Left Column - Pipeline */}
        <div className='md:col-span-2 space-y-4'>
          {/* Pipeline Funnel */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <IconChartBar className='h-5 w-5' />
                    Pipeline
                  </CardTitle>
                  <CardDescription>
                    {deals.length} active deals across {STAGE_ORDER.filter(s => stageCounts[s] > 0).length} stages
                  </CardDescription>
                </div>
                {selectedStage && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setSelectedStage(null)}
                  >
                    Clear filter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='flex gap-2 flex-wrap'>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className='h-8 w-24' />
                  ))}
                </div>
              ) : (
                <div className='flex gap-2 flex-wrap'>
                  {STAGE_ORDER.map((stage) => {
                    const count = stageCounts[stage];
                    if (count === 0) return null;
                    return (
                      <Button
                        key={stage}
                        variant={selectedStage === stage ? 'default' : 'outline'}
                        size='sm'
                        className='gap-2'
                        onClick={() => setSelectedStage(selectedStage === stage ? null : stage)}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${STAGE_COLORS[stage] || 'bg-gray-500'}`}
                        />
                        {stage}
                        <Badge variant='secondary' className='ml-1'>
                          {count}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deals Table */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <IconBox className='h-5 w-5' />
                    {selectedStage ? `${selectedStage} Deals` : 'All Deals'}
                  </CardTitle>
                  <CardDescription>
                    {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
                    {selectedStage ? ` in ${selectedStage}` : ''}
                  </CardDescription>
                </div>
                <Link href='/deals'>
                  <Button variant='ghost' size='sm'>
                    View all
                    <IconArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[300px]'>
                {loading ? (
                  <div className='space-y-2'>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className='h-16 w-full' />
                    ))}
                  </div>
                ) : filteredDeals.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
                    <IconBox className='h-12 w-12 mb-2 opacity-50' />
                    <p>No deals found</p>
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {filteredDeals.slice(0, 10).map((deal) => (
                      <Link key={deal.deal_id} href={`/deals/${deal.deal_id}`}>
                        <div className='flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors cursor-pointer'>
                          <div className='flex-1 min-w-0'>
                            <p className='font-medium truncate'>
                              {deal.canonical_name || deal.deal_id}
                            </p>
                            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                              <Badge variant='outline' className='text-xs'>
                                {deal.stage}
                              </Badge>
                              {deal.broker && <span>{deal.broker}</span>}
                            </div>
                          </div>
                          <div className='text-right text-sm text-muted-foreground'>
                            {deal.days_since_update !== undefined && (
                              <span>{deal.days_since_update}d ago</span>
                            )}
                            {deal.priority && (
                              <Badge
                                variant={deal.priority === 'HIGHEST' ? 'destructive' : 'secondary'}
                                className='ml-2'
                              >
                                {deal.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {filteredDeals.length > 10 && (
                      <p className='text-center text-sm text-muted-foreground py-2'>
                        +{filteredDeals.length - 10} more deals
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Action Rail */}
        <div className='space-y-4'>
          {/* Due Actions */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <IconClock className='h-5 w-5' />
                  Due Actions
                </CardTitle>
                <Link href='/actions'>
                  <Button variant='ghost' size='sm'>
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='space-y-2'>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : dueActions.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground'>
                  <IconCalendarEvent className='h-8 w-8 mx-auto mb-2 opacity-50' />
                  <p className='text-sm'>No actions due</p>
                </div>
              ) : (
                <ScrollArea className='h-[200px]'>
                  <div className='space-y-2'>
                    {dueActions.slice(0, 5).map((action) => (
                      <Link key={action.action_id} href={`/deals/${action.deal_id}`}>
                        <div className='rounded-lg border p-2 hover:bg-accent transition-colors cursor-pointer'>
                          <p className='text-sm font-medium'>{action.action_type}</p>
                          <p className='text-xs text-muted-foreground truncate'>
                            {action.deal_id}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quarantine */}
          <Card>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <CardTitle className='flex items-center gap-2 text-base'>
                  <IconAlertTriangle className='h-5 w-5' />
                  Quarantine
                </CardTitle>
                <Link href='/quarantine'>
                  <Button variant='ghost' size='sm'>
                    View all
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className='h-20 w-full' />
              ) : (
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Status</span>
                    <Badge
                      variant={quarantineHealth?.status === 'healthy' ? 'secondary' : 'destructive'}
                    >
                      {quarantineHealth?.status || 'unknown'}
                    </Badge>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-muted-foreground'>Pending</span>
                    <span className='font-medium'>{quarantineHealth?.pending_items || 0}</span>
                  </div>
                  {quarantineItems.length > 0 && (
                    <div className='pt-2 border-t'>
                      <p className='text-xs text-muted-foreground mb-2'>Recent items:</p>
                      {quarantineItems.slice(0, 2).map((item, i) => (
                        <div key={item.id || item.quarantine_id || i} className='text-xs truncate'>
                          {item.email_subject || item.subject || 'Unknown'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <IconAlertTriangle className='h-5 w-5' />
                Alerts
                {alerts.length > 0 && (
                  <Badge variant='destructive'>{alerts.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className='h-16 w-full' />
              ) : alerts.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground'>
                  <p className='text-sm'>No active alerts</p>
                </div>
              ) : (
                <ScrollArea className='h-[150px]'>
                  <div className='space-y-2'>
                    {alerts.slice(0, 5).map((alert, i) => (
                      <div
                        key={i}
                        className={`rounded-lg border p-2 ${
                          alert.severity === 'high'
                            ? 'border-destructive bg-destructive/10'
                            : alert.severity === 'warning'
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : ''
                        }`}
                      >
                        <p className='text-sm font-medium'>{alert.type}</p>
                        <p className='text-xs text-muted-foreground'>{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
