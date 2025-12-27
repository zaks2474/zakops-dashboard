'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCalendarEvent,
  IconClock,
  IconFileText,
  IconHistory,
  IconRefresh,
  IconSend
} from '@tabler/icons-react';
import {
  getDeal,
  getDealEvents,
  getDealCaseFile,
  getActions,
  transitionDeal,
  addDealNote,
  type DealDetail,
  type DealEvent,
  type Action
} from '@/lib/api';
import { format } from 'date-fns';

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
  closed_won: 'bg-green-700',
  closed_lost: 'bg-red-700',
};

export default function DealWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [caseFile, setCaseFile] = useState<unknown>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transition dialog state
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [transitionApprovedBy, setTransitionApprovedBy] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  // Note dialog state
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dealData, eventsData, caseFileData, actionsData] = await Promise.all([
        getDeal(dealId),
        getDealEvents(dealId, 50),
        getDealCaseFile(dealId),
        getActions({ deal_id: dealId })
      ]);

      if (!dealData) {
        setError('Deal not found');
        return;
      }

      setDeal(dealData);
      setEvents(eventsData);
      setCaseFile(caseFileData);
      setActions(actionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealId]);

  const handleTransition = async () => {
    if (!selectedTransition || !transitionReason || !transitionApprovedBy) return;

    setTransitioning(true);
    try {
      const result = await transitionDeal(dealId, selectedTransition, transitionReason, transitionApprovedBy);
      if (result.success) {
        setShowTransitionDialog(false);
        setSelectedTransition('');
        setTransitionReason('');
        setTransitionApprovedBy('');
        fetchData(); // Refresh data
      } else {
        alert(`Transition failed: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    setAddingNote(true);
    try {
      const result = await addDealNote(dealId, noteContent);
      if (result.success) {
        setShowNoteDialog(false);
        setNoteContent('');
        fetchData(); // Refresh to show new event
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className='flex flex-1 flex-col gap-4 p-4 md:p-6'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-4 w-96' />
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='md:col-span-2 space-y-4'>
            <Skeleton className='h-64 w-full' />
            <Skeleton className='h-96 w-full' />
          </div>
          <div className='space-y-4'>
            <Skeleton className='h-48 w-full' />
            <Skeleton className='h-48 w-full' />
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className='flex flex-1 flex-col items-center justify-center gap-4 p-8'>
        <IconAlertTriangle className='h-12 w-12 text-destructive' />
        <h2 className='text-xl font-semibold'>Failed to load deal</h2>
        <p className='text-muted-foreground max-w-md text-center'>
          {error || `Deal "${dealId}" not found or could not be loaded`}
        </p>
        <p className='text-xs text-muted-foreground'>
          Endpoint: /api/deals/{dealId}
        </p>
        <div className='flex gap-2'>
          <Button onClick={() => router.push('/deals')} variant='outline'>
            <IconArrowLeft className='mr-2 h-4 w-4' />
            Back to Deals
          </Button>
          <Button onClick={fetchData} variant='outline'>
            <IconRefresh className='mr-2 h-4 w-4' />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const allowedTransitions = deal.state_machine?.allowed_transitions || [];

  return (
    <div className='flex flex-1 flex-col gap-4 p-4 md:p-6'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <Button variant='ghost' size='sm' onClick={() => router.push('/deals')}>
              <IconArrowLeft className='mr-2 h-4 w-4' />
              Deals
            </Button>
          </div>
          <h1 className='text-2xl font-bold tracking-tight'>
            {deal.canonical_name || deal.deal_id}
          </h1>
          <div className='flex items-center gap-2 mt-1'>
            <Badge variant='outline' className='gap-1'>
              <span
                className={`h-2 w-2 rounded-full ${STAGE_COLORS[deal.stage] || 'bg-gray-500'}`}
              />
              {deal.stage}
            </Badge>
            <Badge variant='secondary'>{deal.status}</Badge>
            {deal.metadata?.priority && (
              <Badge
                variant={deal.metadata.priority === 'HIGHEST' ? 'destructive' : 'secondary'}
              >
                {deal.metadata.priority}
              </Badge>
            )}
            <span className='text-sm text-muted-foreground'>{deal.deal_id}</span>
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setShowNoteDialog(true)}>
            Add Note
          </Button>
          <Button onClick={fetchData} variant='outline' size='sm'>
            <IconRefresh className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className='grid gap-4 md:grid-cols-3'>
        {/* Left Column - Main Content */}
        <div className='md:col-span-2 space-y-4'>
          {/* Tabs */}
          <Tabs defaultValue='overview'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='case-file'>Case File</TabsTrigger>
              <TabsTrigger value='events'>Events ({events.length})</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value='overview' className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                {/* Deal Info */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-base'>Deal Information</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Stage</span>
                      <span className='font-medium'>{deal.stage}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Status</span>
                      <span className='font-medium'>{deal.status}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Created</span>
                      <span className='font-medium'>
                        {deal.created_at ? format(new Date(deal.created_at), 'MMM d, yyyy') : '-'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Updated</span>
                      <span className='font-medium'>
                        {deal.updated_at ? format(new Date(deal.updated_at), 'MMM d, yyyy') : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Broker Info */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-base'>Broker</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Name</span>
                      <span className='font-medium'>{deal.broker?.name || '-'}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Email</span>
                      <span className='font-medium text-sm'>{deal.broker?.email || '-'}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Company</span>
                      <span className='font-medium'>{deal.broker?.company || '-'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Financials */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-base'>Financials</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Asking Price</span>
                      <span className='font-medium'>
                        {deal.metadata?.asking_price != null
                          ? `$${deal.metadata.asking_price.toLocaleString()}`
                          : <span className='text-muted-foreground'>TBD</span>}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>EBITDA</span>
                      <span className='font-medium'>
                        {deal.metadata?.ebitda != null
                          ? `$${deal.metadata.ebitda.toLocaleString()}`
                          : <span className='text-muted-foreground'>TBD</span>}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>NDA Status</span>
                      <span className='font-medium'>
                        {deal.metadata?.nda_status || <span className='text-muted-foreground'>Unknown</span>}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>CIM Received</span>
                      <span className='font-medium'>
                        {deal.metadata?.cim_received === true ? 'Yes' : deal.metadata?.cim_received === false ? 'No' : <span className='text-muted-foreground'>Unknown</span>}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Info */}
                <Card>
                  <CardHeader className='pb-3'>
                    <CardTitle className='text-base'>Company</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Sector</span>
                      <span className='font-medium'>
                        {deal.company_info?.sector || <span className='text-muted-foreground'>Unknown</span>}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-sm text-muted-foreground'>Location</span>
                      <span className='font-medium'>
                        {deal.company_info?.location
                          ? `${deal.company_info.location.city || 'Unknown'}, ${deal.company_info.location.state || 'Unknown'}`
                          : <span className='text-muted-foreground'>Unknown</span>}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Case File Tab */}
            <TabsContent value='case-file'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <IconFileText className='h-5 w-5' />
                    Case File
                  </CardTitle>
                  <CardDescription>
                    Projected deal state from event history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {caseFile ? (
                    <ScrollArea className='h-[500px]'>
                      <pre className='text-sm bg-muted p-4 rounded-lg overflow-auto'>
                        {JSON.stringify(caseFile, null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <IconFileText className='h-12 w-12 mx-auto mb-2 opacity-50' />
                      <p>No case file available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value='events'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <IconHistory className='h-5 w-5' />
                    Event History
                  </CardTitle>
                  <CardDescription>
                    {events.length} event{events.length !== 1 ? 's' : ''} recorded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      <IconHistory className='h-12 w-12 mx-auto mb-2 opacity-50' />
                      <p>No events recorded</p>
                    </div>
                  ) : (
                    <ScrollArea className='h-[500px]'>
                      <div className='space-y-4'>
                        {events.map((event, i) => (
                          <div key={event.event_id || i} className='relative pl-6 pb-4 border-l-2 border-muted last:pb-0'>
                            <div className='absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary' />
                            <div className='flex items-start justify-between'>
                              <div>
                                <p className='font-medium'>{event.event_type}</p>
                                {event.actor && (
                                  <p className='text-sm text-muted-foreground'>by {event.actor}</p>
                                )}
                              </div>
                              <span className='text-xs text-muted-foreground'>
                                {event.timestamp
                                  ? format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')
                                  : '-'}
                              </span>
                            </div>
                            {event.data && (
                              <pre className='mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32'>
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions Rail */}
        <div className='space-y-4'>
          {/* Stage Transitions */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Stage Transitions</CardTitle>
              <CardDescription>
                {deal.state_machine?.advisory_context || 'Move deal to next stage'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allowedTransitions.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No transitions available (terminal stage)
                </p>
              ) : (
                <div className='flex flex-wrap gap-2'>
                  {allowedTransitions.map((stage) => (
                    <Button
                      key={stage}
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setSelectedTransition(stage);
                        setShowTransitionDialog(true);
                      }}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Actions */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <IconClock className='h-5 w-5' />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className='text-center py-4 text-muted-foreground'>
                  <IconCalendarEvent className='h-8 w-8 mx-auto mb-2 opacity-50' />
                  <p className='text-sm'>No pending actions</p>
                </div>
              ) : (
                <ScrollArea className='h-[200px]'>
                  <div className='space-y-2'>
                    {actions.map((action) => (
                      <div
                        key={action.action_id}
                        className='rounded-lg border p-2'
                      >
                        <p className='text-sm font-medium'>{action.action_type}</p>
                        <p className='text-xs text-muted-foreground'>
                          {action.scheduled_for
                            ? format(new Date(action.scheduled_for), 'MMM d, yyyy')
                            : '-'}
                        </p>
                        <Badge variant={action.is_due ? 'destructive' : 'secondary'} className='mt-1'>
                          {action.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base'>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {deal.folder_path && (
                <p className='text-sm'>
                  <span className='text-muted-foreground'>Folder: </span>
                  <code className='text-xs bg-muted px-1 py-0.5 rounded'>
                    {deal.folder_path}
                  </code>
                </p>
              )}
              <Link href={`/actions?deal_id=${dealId}`}>
                <Button variant='outline' size='sm' className='w-full justify-start'>
                  <IconCalendarEvent className='mr-2 h-4 w-4' />
                  View All Actions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transition Dialog */}
      <Dialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transition to {selectedTransition}</DialogTitle>
            <DialogDescription>
              Move this deal from {deal.stage} to {selectedTransition}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Reason for transition</Label>
              <Textarea
                placeholder='Describe why this transition is happening...'
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label>Approved by</Label>
              <Input
                placeholder='Your name or ID'
                value={transitionApprovedBy}
                onChange={(e) => setTransitionApprovedBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowTransitionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={!transitionReason || !transitionApprovedBy || transitioning}
            >
              {transitioning ? 'Transitioning...' : 'Confirm Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note to this deal's event history
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Textarea
              placeholder='Enter your note...'
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || addingNote}
            >
              <IconSend className='mr-2 h-4 w-4' />
              {addingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
