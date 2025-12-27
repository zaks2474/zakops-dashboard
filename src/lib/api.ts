/**
 * ZakOps API Client
 *
 * Centralized API client with Zod validation and response normalization.
 * All API calls MUST go through this module - no direct fetch in components.
 *
 * The frontend uses Next.js rewrites to proxy /api/* to the backend,
 * so we always call relative paths.
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas - Define expected response shapes
// ============================================================================

/**
 * Coerce a value to number, handling strings with currency symbols, commas, etc.
 * Returns null/undefined if the value cannot be parsed.
 * Logs warnings (not errors) for type coercions to aid debugging without alarming.
 */
function coerceToNumber(val: unknown): number | null | undefined {
  if (val === null) return null;
  if (val === undefined) return undefined;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    // Remove currency symbols, commas, whitespace
    const cleaned = val.replace(/[$,\s]/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned.toLowerCase() === 'tbd') {
      // Expected non-numeric values - don't log
      return null;
    }
    const num = parseFloat(cleaned);
    if (isNaN(num)) {
      // Unexpected string that couldn't be parsed - log as debug info
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[API] Coerced non-numeric string to null: "${val}"`);
      }
      return null;
    }
    return num;
  }
  return null;
}

// Schema for numeric fields that might arrive as strings
const coercedNumber = z.preprocess(coerceToNumber, z.number().nullable().optional());

// Deal schema
export const DealSchema = z.object({
  deal_id: z.string(),
  canonical_name: z.string().nullable(),
  display_name: z.string().optional().nullable(),
  stage: z.string(),
  status: z.string(),
  broker: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  days_since_update: z.preprocess(coerceToNumber, z.number().optional()),
  folder_path: z.string().optional().nullable(),
});

export type Deal = z.infer<typeof DealSchema>;

// Deal detail schema (expanded)
export const DealDetailSchema = z.object({
  deal_id: z.string(),
  canonical_name: z.string().nullable(),
  display_name: z.string().nullable().optional(),
  folder_path: z.string().nullable().optional(),
  stage: z.string(),
  status: z.string(),
  broker: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    company: z.string().nullable(),
    phone: z.string().nullable(),
  }).nullable().optional(),
  company_info: z.object({
    sector: z.string().nullable().optional(),
    location: z.any().nullable().optional(),
  }).nullable().optional(),
  metadata: z.object({
    priority: z.string().nullable().optional(),
    asking_price: coercedNumber,
    ebitda: coercedNumber,
    revenue: coercedNumber,
    multiple: coercedNumber,
    nda_status: z.string().nullable().optional(),
    cim_received: z.boolean().nullable().optional(),
  }).passthrough().nullable().optional(),
  state_machine: z.object({
    current_stage: z.string(),
    is_terminal: z.boolean(),
    allowed_transitions: z.array(z.string()),
    advisory_context: z.string().nullable().optional(),
  }).nullable().optional(),
  case_file: z.any().nullable().optional(),
  event_count: z.number().optional(),
  pending_actions: z.number().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type DealDetail = z.infer<typeof DealDetailSchema>;

// Deferred action schema
export const ActionSchema = z.object({
  action_id: z.string(),
  deal_id: z.string(),
  action_type: z.string(),
  scheduled_for: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  is_due: z.boolean().optional(),
  data: z.any().optional(),
});

export type Action = z.infer<typeof ActionSchema>;

// Event schema
export const EventSchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  timestamp: z.string(),
  actor: z.string().nullable().optional(),
  data: z.any().optional(),
});

export type DealEvent = z.infer<typeof EventSchema>;

// Quarantine item schema
export const QuarantineItemSchema = z.object({
  id: z.string().optional(),
  quarantine_id: z.string().optional(),
  email_subject: z.string().optional(),
  subject: z.string().optional(),
  sender: z.string().optional(),
  from: z.string().optional(),
  received_at: z.string().optional(),
  timestamp: z.string().optional(),
  quarantine_reason: z.string().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
});

export type QuarantineItem = z.infer<typeof QuarantineItemSchema>;

// Quarantine health schema
export const QuarantineHealthSchema = z.object({
  status: z.string(),
  pending_items: z.number(),
  oldest_pending_days: z.number().optional(),
});

export type QuarantineHealth = z.infer<typeof QuarantineHealthSchema>;

// Alert schema
export const AlertSchema = z.object({
  type: z.string(),
  severity: z.string(),
  message: z.string(),
  deal_id: z.string().optional(),
  count: z.number().optional(),
  actions: z.array(z.string()).optional(),
});

export type Alert = z.infer<typeof AlertSchema>;

// Classification metrics schema
export const ClassificationMetricsSchema = z.object({
  decisions_24h: z.number().nullable().optional(),
  local_24h: z.number().nullable().optional(),
  cloud_24h: z.number().nullable().optional(),
  heuristic_24h: z.number().nullable().optional(),
  quarantine_rate: z.number().optional(),
});

export type ClassificationMetrics = z.infer<typeof ClassificationMetricsSchema>;

// Checkpoint schema
export const CheckpointSchema = z.object({
  id: z.string(),
  operation_type: z.string(),
  status: z.string(),
  progress: z.number().optional(),
});

export type Checkpoint = z.infer<typeof CheckpointSchema>;

// Pipeline stage schema
export const PipelineStageSchema = z.object({
  count: z.number(),
  deals: z.array(z.object({
    deal_id: z.string(),
    canonical_name: z.string().nullable(),
    days_in_stage: z.number(),
  })),
  avg_age: z.number(),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

// ============================================================================
// API Response Wrappers - Handle both wrapped and unwrapped responses
// ============================================================================

// Generic wrapper for paginated/counted responses
const DealsResponseSchema = z.object({
  count: z.number().optional(),
  deals: z.array(DealSchema),
}).or(z.array(DealSchema));

const ActionsResponseSchema = z.object({
  count: z.number().optional(),
  actions: z.array(ActionSchema),
}).or(z.array(ActionSchema));

const EventsResponseSchema = z.object({
  deal_id: z.string().optional(),
  count: z.number().optional(),
  events: z.array(EventSchema),
}).or(z.array(EventSchema));

const QuarantineResponseSchema = z.object({
  count: z.number().optional(),
  items: z.array(QuarantineItemSchema),
}).or(z.array(QuarantineItemSchema));

const AlertsResponseSchema = z.object({
  alert_count: z.number().optional(),
  alerts: z.array(AlertSchema),
}).or(z.array(AlertSchema));

const CheckpointsResponseSchema = z.array(CheckpointSchema);

const PipelineResponseSchema = z.object({
  total_active: z.number(),
  stages: z.record(PipelineStageSchema),
});

// ============================================================================
// API Error Handling
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** User-friendly error message */
  get userMessage(): string {
    if (this.status === 0) {
      return `Network error connecting to API. Check if the backend is running.`;
    }
    if (this.status === 404) {
      return `Resource not found: ${this.endpoint}`;
    }
    if (this.status >= 500) {
      return `Server error (${this.status}). The API is having problems.`;
    }
    if (this.status === 401 || this.status === 403) {
      return `Access denied (${this.status}). You may not have permission.`;
    }
    return `API error ${this.status}: ${this.message}`;
  }
}

// ============================================================================
// Core Fetch Function
// ============================================================================

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(
        `API request failed: ${errorBody}`,
        response.status,
        endpoint
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0,
      endpoint
    );
  }
}

// ============================================================================
// Normalized API Functions - Always return arrays where expected
// ============================================================================

/**
 * Fetch all deals - ALWAYS returns an array
 */
export async function getDeals(params?: {
  stage?: string;
  status?: string;
  broker?: string;
}): Promise<Deal[]> {
  const searchParams = new URLSearchParams();
  if (params?.stage) searchParams.set('stage', params.stage);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.broker) searchParams.set('broker', params.broker);

  const query = searchParams.toString();
  const endpoint = `/api/deals${query ? `?${query}` : ''}`;

  const data = await apiFetch<unknown>(endpoint);
  const parsed = DealsResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid deals response:', parsed.error);
    return [];
  }

  // Normalize: extract array from wrapper or return as-is
  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.deals;
}

/**
 * Fetch single deal detail
 * Returns partial data on validation errors (degrades gracefully)
 */
export async function getDeal(dealId: string): Promise<DealDetail | null> {
  try {
    const data = await apiFetch<unknown>(`/api/deals/${dealId}`);
    const parsed = DealDetailSchema.safeParse(data);

    if (!parsed.success) {
      // Log validation issues as debug info (not errors - this is expected behavior)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[API] Deal schema validation notes:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '));
      }

      // Try to return partial data - the API returned something, just not perfectly shaped
      // Use a more permissive schema as fallback
      const rawData = data as Record<string, unknown>;
      if (rawData && typeof rawData === 'object' && rawData.deal_id) {
        console.debug('[API] Returning partially validated deal data for:', rawData.deal_id);
        return {
          deal_id: String(rawData.deal_id),
          canonical_name: rawData.canonical_name ? String(rawData.canonical_name) : null,
          display_name: rawData.display_name ? String(rawData.display_name) : null,
          folder_path: rawData.folder_path ? String(rawData.folder_path) : null,
          stage: String(rawData.stage || 'unknown'),
          status: String(rawData.status || 'unknown'),
          broker: rawData.broker as DealDetail['broker'] || null,
          company_info: rawData.company_info as DealDetail['company_info'] || null,
          metadata: rawData.metadata as DealDetail['metadata'] || null,
          state_machine: rawData.state_machine as DealDetail['state_machine'] || null,
          case_file: rawData.case_file || null,
          event_count: typeof rawData.event_count === 'number' ? rawData.event_count : undefined,
          pending_actions: typeof rawData.pending_actions === 'number' ? rawData.pending_actions : undefined,
          created_at: rawData.created_at ? String(rawData.created_at) : null,
          updated_at: rawData.updated_at ? String(rawData.updated_at) : null,
        };
      }
      return null;
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch deal events - ALWAYS returns an array
 */
export async function getDealEvents(
  dealId: string,
  limit?: number
): Promise<DealEvent[]> {
  const query = limit ? `?limit=${limit}` : '';
  const data = await apiFetch<unknown>(`/api/deals/${dealId}/events${query}`);
  const parsed = EventsResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid events response:', parsed.error);
    return [];
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.events;
}

/**
 * Fetch deal case file
 */
export async function getDealCaseFile(dealId: string): Promise<unknown | null> {
  try {
    return await apiFetch<unknown>(`/api/deals/${dealId}/case-file`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch all deferred actions - ALWAYS returns an array
 */
export async function getActions(params?: {
  deal_id?: string;
  status?: string;
}): Promise<Action[]> {
  const searchParams = new URLSearchParams();
  if (params?.deal_id) searchParams.set('deal_id', params.deal_id);
  if (params?.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const endpoint = `/api/deferred-actions${query ? `?${query}` : ''}`;

  const data = await apiFetch<unknown>(endpoint);
  const parsed = ActionsResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid actions response:', parsed.error);
    return [];
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.actions;
}

/**
 * Fetch due actions - ALWAYS returns an array
 */
export async function getDueActions(): Promise<Action[]> {
  const data = await apiFetch<unknown>('/api/deferred-actions/due');
  const parsed = ActionsResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid due actions response:', parsed.error);
    return [];
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.actions;
}

/**
 * Fetch quarantine items - ALWAYS returns an array
 */
export async function getQuarantineItems(): Promise<QuarantineItem[]> {
  const data = await apiFetch<unknown>('/api/quarantine');
  const parsed = QuarantineResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid quarantine response:', parsed.error);
    return [];
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.items;
}

/**
 * Fetch quarantine health status
 */
export async function getQuarantineHealth(): Promise<QuarantineHealth | null> {
  try {
    const data = await apiFetch<unknown>('/api/quarantine/health');
    const parsed = QuarantineHealthSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Invalid quarantine health response:', parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Failed to fetch quarantine health:', error);
    return null;
  }
}

/**
 * Resolve quarantine item
 */
export async function resolveQuarantineItem(
  itemId: string,
  resolution: 'link_to_deal' | 'create_new_deal' | 'discard',
  dealId?: string
): Promise<{ success: boolean; deal_id?: string }> {
  return apiFetch('/api/quarantine/' + itemId + '/resolve', {
    method: 'POST',
    body: JSON.stringify({
      resolution,
      deal_id: dealId,
      resolved_by: 'operator',
    }),
  });
}

/**
 * Fetch alerts - ALWAYS returns an array
 */
export async function getAlerts(): Promise<Alert[]> {
  const data = await apiFetch<unknown>('/api/alerts');
  const parsed = AlertsResponseSchema.safeParse(data);

  if (!parsed.success) {
    console.error('Invalid alerts response:', parsed.error);
    return [];
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  return parsed.data.alerts;
}

/**
 * Fetch classification metrics
 */
export async function getClassificationMetrics(): Promise<ClassificationMetrics | null> {
  try {
    const data = await apiFetch<unknown>('/api/metrics/classification');
    const parsed = ClassificationMetricsSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Invalid classification metrics response:', parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Failed to fetch classification metrics:', error);
    return null;
  }
}

/**
 * Fetch checkpoints - ALWAYS returns an array
 */
export async function getCheckpoints(): Promise<Checkpoint[]> {
  try {
    const data = await apiFetch<unknown>('/api/checkpoints');
    const parsed = CheckpointsResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Invalid checkpoints response:', parsed.error);
      return [];
    }

    return parsed.data;
  } catch (error) {
    console.error('Failed to fetch checkpoints:', error);
    return [];
  }
}

/**
 * Fetch pipeline summary
 */
export async function getPipeline(): Promise<{
  total_active: number;
  stages: Record<string, PipelineStage>;
} | null> {
  try {
    const data = await apiFetch<unknown>('/api/pipeline');
    const parsed = PipelineResponseSchema.safeParse(data);

    if (!parsed.success) {
      console.error('Invalid pipeline response:', parsed.error);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Failed to fetch pipeline:', error);
    return null;
  }
}

/**
 * Transition deal to new stage
 */
export async function transitionDeal(
  dealId: string,
  toStage: string,
  reason: string,
  approvedBy: string
): Promise<{ success: boolean; message?: string }> {
  return apiFetch(`/api/deals/${dealId}/transition`, {
    method: 'POST',
    body: JSON.stringify({
      to_stage: toStage,
      reason,
      approved_by: approvedBy,
    }),
  });
}

/**
 * Add note to deal
 */
export async function addDealNote(
  dealId: string,
  content: string,
  category?: string
): Promise<{ success: boolean; event_id?: string }> {
  return apiFetch(`/api/deals/${dealId}/note`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      category: category || 'general',
    }),
  });
}
