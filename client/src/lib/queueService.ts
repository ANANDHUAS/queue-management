import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Business {
  id: string;
  auth_user_id: string | null;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  queues?: Queue[];
}

export interface Queue {
  id: string;
  business_id: string;
  name: string;
  prefix: string;
  current_number: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  average_service_time: number;
  created_at: string;
  updated_at: string;
  business?: Business;
  queue_entries?: QueueEntry[];
}

export interface QueueEntry {
  id: string;
  queue_id: string;
  token_number: string;
  phone_number: string;
  party_size: number;
  status: 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  joined_at: string;
  called_at: string | null;
  completed_at: string | null;
  queue?: Queue;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Fetch all businesses (and their queues) owned by the current logged-in user.
 * Replaces: GET /api/admin/dashboard
 */
export async function fetchDashboard(): Promise<Business[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('businesses')
    .select('*, queues(*)')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─── Business ─────────────────────────────────────────────────────────────────

/**
 * Create a new business for the current user.
 * Replaces: POST /api/admin/businesses
 */
export async function createBusiness(name: string, slug: string): Promise<Business> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('businesses')
    .insert({ name, slug, auth_user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

/**
 * Create a new queue.
 * Replaces: POST /api/admin/queues
 */
export async function createQueue(
  businessId: string,
  name: string,
  prefix: string,
  averageServiceTime: number = 5
): Promise<Queue> {
  const { data, error } = await supabase
    .from('queues')
    .insert({
      business_id: businessId,
      name,
      prefix,
      average_service_time: averageServiceTime,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a queue with all its entries.
 * Replaces: GET /api/admin/queues/:queueId
 */
export async function fetchQueueWithEntries(queueId: string): Promise<Queue | null> {
  const { data, error } = await supabase
    .from('queues')
    .select('*, business:businesses(*), queue_entries(*)')
    .eq('id', queueId)
    .order('joined_at', { referencedTable: 'queue_entries', ascending: true })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

/**
 * Fetch a minimal queue info for the join page.
 * Replaces: GET /api/queues/:queueId
 */
export async function fetchQueueInfo(queueId: string): Promise<{ id: string; name: string; businessName: string } | null> {
  const { data, error } = await supabase
    .from('queues')
    .select('id, name, business:businesses(name)')
    .eq('id', queueId)
    .single();

  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    businessName: (data.business as any)?.name ?? 'Business',
  };
}

// ─── Queue Actions (Admin) ────────────────────────────────────────────────────

/**
 * Call the next person in the queue using the atomic DB function.
 * Replaces: POST /api/admin/queues/:queueId/next
 */
export async function callNext(queueId: string): Promise<QueueEntry | null> {
  const { data, error } = await supabase.rpc('call_next', { p_queue_id: queueId });
  if (error) throw error;
  return data ?? null;
}

/**
 * Skip the currently CALLED/SERVING entry.
 * Replaces: POST /api/admin/queues/:queueId/skip
 */
export async function skipCurrent(queueId: string): Promise<void> {
  const { data: current, error: findError } = await supabase
    .from('queue_entries')
    .select('id')
    .eq('queue_id', queueId)
    .in('status', ['CALLED', 'SERVING'])
    .order('called_at', { ascending: false })
    .limit(1)
    .single();

  if (findError || !current) return;

  const { error } = await supabase
    .from('queue_entries')
    .update({ status: 'SKIPPED', completed_at: new Date().toISOString() })
    .eq('id', current.id);

  if (error) throw error;
}

/**
 * Mark the currently CALLED/SERVING entry as COMPLETED.
 * Replaces: POST /api/admin/queues/:queueId/complete
 */
export async function completeCurrent(queueId: string): Promise<void> {
  const { data: current, error: findError } = await supabase
    .from('queue_entries')
    .select('id')
    .eq('queue_id', queueId)
    .in('status', ['CALLED', 'SERVING'])
    .order('called_at', { ascending: false })
    .limit(1)
    .single();

  if (findError || !current) return;

  const { error } = await supabase
    .from('queue_entries')
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('id', current.id);

  if (error) throw error;
}

// ─── Customer ─────────────────────────────────────────────────────────────────

/**
 * Join a queue by calling the atomic DB function.
 * Replaces: POST /api/customer/:queueId/join
 */
export async function joinQueue(queueId: string, phoneNumber: string, partySize: number = 1): Promise<QueueEntry> {
  const { data, error } = await supabase.rpc('join_queue', {
    p_queue_id: queueId,
    p_phone_number: phoneNumber,
    p_party_size: partySize,
  });

  if (error) throw error;
  return data as QueueEntry;
}

/**
 * Fetch a customer's entry status with position calculation.
 * Replaces: GET /api/customer/entry/:entryId
 */
export async function fetchEntryStatus(entryId: string): Promise<{
  entry: QueueEntry;
  position: number;
  peopleAhead: number;
  estimatedWait: number;
  currentServingToken: string | null;
  businessName: string;
  queueName: string;
} | null> {
  // Get the entry with its queue and business
  const { data: entry, error: entryError } = await supabase
    .from('queue_entries')
    .select('*, queue:queues(*, business:businesses(name))')
    .eq('id', entryId)
    .single();

  if (entryError || !entry) return null;

  const queueId = entry.queue_id;

  // Calculate position (count waiting entries before this one)
  let peopleAhead = 0;
  let position = 0;

  if (entry.status === 'WAITING') {
    const { count } = await supabase
      .from('queue_entries')
      .select('*', { count: 'exact', head: true })
      .eq('queue_id', queueId)
      .eq('status', 'WAITING')
      .lt('joined_at', entry.joined_at);

    peopleAhead = count ?? 0;
    position = peopleAhead + 1;
  }

  // Find currently serving
  const { data: serving } = await supabase
    .from('queue_entries')
    .select('token_number')
    .eq('queue_id', queueId)
    .in('status', ['SERVING', 'CALLED'])
    .order('called_at', { ascending: false })
    .limit(1)
    .single();

  const avgTime = (entry.queue as any)?.average_service_time ?? 5;

  return {
    entry: entry as QueueEntry,
    position,
    peopleAhead,
    estimatedWait: peopleAhead * avgTime,
    currentServingToken: serving?.token_number ?? null,
    businessName: (entry.queue as any)?.business?.name ?? '',
    queueName: (entry.queue as any)?.name ?? '',
  };
}
