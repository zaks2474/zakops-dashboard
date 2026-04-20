'use client';

/**
 * DealBoard - Kanban-style deal board with drag and drop
 * Phase 19: Dashboard Foundation
 * Phase 20: Real-time UX Polish (skeleton loading, optimistic indicators, toast)
 */

import { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { Building2, Calendar, AlertCircle, GripVertical, Loader2 } from 'lucide-react';
import { useDeals, useTransitionDeal } from '@/lib/api-client';
import type { Deal, DealStage } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SkeletonDealBoard } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/LoadingWrapper';
import { toast } from '@/components/notifications/Toast';

// Extended Deal type with optimistic flag
type OptimisticDeal = Deal & { _optimistic?: boolean };

// Pipeline stages for the Kanban board
const PIPELINE_STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'inbound', label: 'Inbound', color: 'bg-slate-100 dark:bg-slate-800' },
  { id: 'screening', label: 'Screening', color: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'qualified', label: 'Qualified', color: 'bg-green-50 dark:bg-green-950' },
  { id: 'loi', label: 'LOI', color: 'bg-amber-50 dark:bg-amber-950' },
  { id: 'diligence', label: 'Due Diligence', color: 'bg-purple-50 dark:bg-purple-950' },
  { id: 'closing', label: 'Closing', color: 'bg-emerald-50 dark:bg-emerald-950' },
];

interface DealCardProps {
  deal: OptimisticDeal;
  index: number;
}

function DealCard({ deal, index }: DealCardProps) {
  const isOptimistic = deal._optimistic;

  return (
    <Draggable draggableId={deal.deal_id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'mb-2 rounded-lg border bg-card p-3 shadow-sm transition-all',
            snapshot.isDragging && 'shadow-lg ring-2 ring-primary',
            isOptimistic && 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/30'
          )}
        >
          {/* Optimistic update indicator */}
          {isOptimistic && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <div
              {...provided.dragHandleProps}
              className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">
                {deal.display_name || deal.canonical_name}
              </h4>
              {deal.company_info?.company_name && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate">{deal.company_info.company_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                </span>
              </div>
              {deal.metadata?.priority && (
                <Badge
                  variant={
                    deal.metadata.priority === 'HIGH'
                      ? 'destructive'
                      : deal.metadata.priority === 'MEDIUM'
                      ? 'default'
                      : 'secondary'
                  }
                  className="mt-2 text-xs"
                >
                  {deal.metadata.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

interface StageColumnProps {
  stage: { id: DealStage; label: string; color: string };
  deals: OptimisticDeal[];
}

function StageColumn({ stage, deals }: StageColumnProps) {
  return (
    <div className={cn('flex flex-col min-w-[280px] rounded-lg', stage.color)}>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{stage.label}</h3>
        <Badge variant="outline" className="text-xs">
          {deals.length}
        </Badge>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-1 h-[calc(100vh-250px)]">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'p-2 min-h-[100px] transition-colors',
                snapshot.isDraggingOver && 'bg-accent/50'
              )}
            >
              {deals.map((deal, index) => (
                <DealCard key={deal.deal_id} deal={deal} index={index} />
              ))}
              {provided.placeholder}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
}

export function DealBoard() {
  const { data: deals, isLoading, error, refetch } = useDeals({ status: 'active' });
  const transitionMutation = useTransitionDeal();
  const [optimisticDeals, setOptimisticDeals] = useState<OptimisticDeal[]>([]);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const currentDeals = optimisticDeals.length > 0 ? optimisticDeals : (deals || []) as OptimisticDeal[];
    const grouped: Record<DealStage, OptimisticDeal[]> = {
      inbound: [],
      screening: [],
      qualified: [],
      loi: [],
      diligence: [],
      closing: [],
      portfolio: [],
      junk: [],
      archived: [],
    };

    currentDeals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [deals, optimisticDeals]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside or same position
    if (!destination || destination.droppableId === source.droppableId) {
      return;
    }

    const newStage = destination.droppableId as DealStage;
    const deal = deals?.find((d) => d.deal_id === draggableId);

    if (!deal) return;

    const oldStage = deal.stage;

    // Optimistic update with flag
    const updatedDeals: OptimisticDeal[] = (deals || []).map((d) =>
      d.deal_id === draggableId
        ? { ...d, stage: newStage, _optimistic: true }
        : d
    );
    setOptimisticDeals(updatedDeals);

    // Generate idempotency key
    const idempotencyKey = `transition-${draggableId}-${Date.now()}`;

    try {
      await transitionMutation.mutateAsync({
        dealId: draggableId,
        data: {
          new_stage: newStage,
          reason: `Moved from ${oldStage} to ${newStage} via board`,
        },
        idempotencyKey,
      });

      // Show success toast
      toast.success({
        title: 'Deal moved',
        description: `${deal.display_name || deal.canonical_name} moved to ${newStage}`,
      });
    } catch (err) {
      console.error('Failed to transition deal:', err);
      // Revert optimistic update
      setOptimisticDeals([]);

      // Show error toast
      toast.error({
        title: 'Failed to move deal',
        description: err instanceof Error ? err.message : 'An error occurred',
        action: {
          label: 'Retry',
          onClick: () => handleDragEnd(result),
        },
      });
    } finally {
      // Clear optimistic state after mutation completes
      setOptimisticDeals([]);
    }
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Deal Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonDealBoard />
        </CardContent>
      </Card>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Deal Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState
            error={error}
            onRetry={() => refetch()}
            title="Failed to load deals"
            description="We couldn't load your deal pipeline. Please try again."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Deal Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_STAGES.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id]}
              />
            ))}
          </div>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}

export default DealBoard;
