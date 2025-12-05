import supabase from "../supabase.js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseClient: SupabaseClient = supabase;

function ensureSupabase() {
  if (!supabaseClient) {
    throw new Error(
      "Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) in your environment.",
    );
  }
  return supabaseClient;
}

export async function listInvestorProfiles(limit = 100) {
  const { data, error } = await ensureSupabase()
    .from("investor_profiles_eif")
    .select("*")
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getInvestorProfileByUserId(userId: string) {
  console.log(`[getInvestorProfileByUserId] Fetching profile for userId: ${userId}`);
  const { data, error } = await ensureSupabase()
    .from("investor_profiles_eif")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error) {
    console.error(`[getInvestorProfileByUserId] Error querying profile:`, error);
    throw error;
  }
  
  console.log(`[getInvestorProfileByUserId] Query result:`, data);
  return data;
}

export async function listCompanyProfiles(limit = 100) {
  const { data, error } = await ensureSupabase()
    .from("company_profiles_eif")
    .select("*")
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function searchCompanyProfiles(opts: {
  search?: string | null;
  sector?: string | null;
  stage?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const { search, sector, stage, page = 1, pageSize = 12 } = opts || {};
  const sup = ensureSupabase();

  let query = sup.from('company_profiles_eif').select('*', { count: 'exact' });

  if (search) {
    const like = `%${search.replace(/%/g, '\\%')}%`;
    // search name or description
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  if (sector) query = query.eq('sector', sector);
  if (stage) query = query.eq('stage', stage);

  const from = (Math.max(1, page) - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const res = await query;
  if ((res as any).error) throw (res as any).error;
  return { data: (res as any).data ?? [], count: (res as any).count ?? 0 };
}

export async function getCompanyProfileByUserId(userId: string) {
  const { data, error } = await ensureSupabase()
    .from("company_profiles_eif")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCompanyProfile(userId: string, updates: Record<string, any>) {
  const payload = { user_id: userId, ...updates };
  const { data, error } = await ensureSupabase()
    .from('company_profiles_eif')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertInvestorProfile(userId: string, updates: Record<string, any>) {
  const sup = ensureSupabase();

  // First check if profile exists
  const { data: existingProfile, error: checkError } = await sup
    .from('investor_profiles_eif')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error(`[upsertInvestorProfile] Error checking profile existence:`, checkError);
    throw checkError;
  }

  // If profile doesn't exist, create it with the updates
  if (!existingProfile) {
    console.log(`[upsertInvestorProfile] Profile doesn't exist, creating new one for userId: ${userId}`);
    const insertPayload = { user_id: userId, ...updates };
    console.log(`[upsertInvestorProfile] Insert payload:`, insertPayload);
    
    const { data, error } = await sup
      .from('investor_profiles_eif')
      .insert(insertPayload)
      .select('*')
      .maybeSingle();
    
    if (error) {
      console.error(`[upsertInvestorProfile] Insert error:`, error);
      throw error;
    }
    console.log(`[upsertInvestorProfile] Profile created successfully, returned data:`, data);
    return data;
  }

  console.log(`[upsertInvestorProfile] Profile exists, updating userId: ${userId}`);
  
  // Profile exists, so update it
  // Try updating; if the DB schema is missing columns the client sends (e.g. check_size_unit),
  // Supabase will return an error. In that case, detect the missing column from the error
  // message, remove it from the payload, and retry. Limit retries to avoid infinite loops.
  let payload = { ...updates };
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`[upsertInvestorProfile] Update attempt ${attempt + 1}/${maxRetries}, payload:`, payload);
    
    const res = await sup
      .from('investor_profiles_eif')
      .update(payload)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();

    // If no error, return the data
    if (!(res as any).error) {
      console.log(`[upsertInvestorProfile] Update successful, returned data:`, (res as any).data);
      return (res as any).data;
    }

    const err = (res as any).error;
    const msg = String(err?.message ?? err?.details ?? '');
    console.warn(`[upsertInvestorProfile] Update error on attempt ${attempt + 1}:`, msg);

    // Detect missing column pattern from Postgres/Supabase messages
    // Example: "Could not find the 'check_size_unit' column of 'investor_profiles_eif' in the schema cache"
    const m = msg.match(/Could not find the '([^']+)' column/);
    if (m && m[1]) {
      const col = m[1];
      console.log(`[upsertInvestorProfile] Detected missing column: ${col}, removing and retrying`);
      // If the payload contains the column, remove it and retry
      if (Object.prototype.hasOwnProperty.call(payload, col)) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete payload[col];
        continue; // retry
      }
    }

    // If error is not a missing-column that we can handle, throw it
    console.error(`[upsertInvestorProfile] Unhandled error, throwing:`, err);
    throw err;
  }

  // If we exhausted retries, throw a generic error
  console.error(`[upsertInvestorProfile] Exhausted retries for userId: ${userId}`);
  throw new Error('failed to update investor profile after retries');
}

export async function createMeetingRequest(fromUserId: string, toUserId: string, fromRole: string, toRole: string, message?: string) {
  const { data, error } = await ensureSupabase()
    .from("meeting_requests_eif")
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, from_role: fromRole, to_role: toRole, message })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTimeProposal(meetingRequestId: string, proposedByUserId: string, startTime: string, endTime: string, timezone = 'UTC') {
  const { data, error } = await ensureSupabase()
    .from('time_proposals_eif')
    .insert({ meeting_request_id: meetingRequestId, proposed_by_user_id: proposedByUserId, start_time: startTime, end_time: endTime, timezone })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMeetingRequestsForUser(userId: string) {
  // Include time proposals as a nested relation so the UI can show proposed times
  const { data, error } = await ensureSupabase()
    .from("meeting_requests_eif")
    .select('*, time_proposals_eif(*)')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMeetingRequestById(meetingId: string) {
  const { data, error } = await ensureSupabase()
    .from('meeting_requests_eif')
    .select('*, time_proposals_eif(*)')
    .eq('id', meetingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMeetingRequest(meetingId: string, updates: Record<string, any>) {
  const { data, error } = await ensureSupabase()
    .from('meeting_requests_eif')
    .update(updates)
    .eq('id', meetingId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Delete upcoming meetings between a pair of participants (if any)
export async function deleteFutureMeetingsForParticipants(participantA: string, participantB: string) {
  const sup = ensureSupabase();
  const now = new Date().toISOString();
  // Delete meetings where the pair matches either ordering
  const { data, error } = await sup.from('meetings_eif').delete().or(
    `and(participant_a_id.eq.${participantA},participant_b_id.eq.${participantB}),and(participant_a_id.eq.${participantB},participant_b_id.eq.${participantA})`
  ).gte('start_time', now).select('*');
  if (error) throw error;
  return data ?? [];
}

// Record a profile view event
export async function recordProfileView(viewerUserId: string | null, targetUserId: string, metadata?: any) {
  const { data, error } = await ensureSupabase()
    .from('profile_views_eif')
    .insert({ viewer_user_id: viewerUserId, target_user_id: targetUserId, metadata })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Record a deck download event
export async function recordDeckDownload(downloaderUserId: string | null, targetUserId: string, fileName?: string, metadata?: any) {
  const { data, error } = await ensureSupabase()
    .from('deck_downloads_eif')
    .insert({ downloader_user_id: downloaderUserId, target_user_id: targetUserId, file_name: fileName, metadata })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Compute overview metrics for a company (profile owner)
export async function getCompanyOverviewMetrics(userId: string) {
  const sup = ensureSupabase();

  // Counts for the last 30 days and previous 30 days (for percent change)
  const now = new Date();
  const startCurrent = new Date(now);
  startCurrent.setDate(now.getDate() - 30);
  const startPrevious = new Date(startCurrent);
  startPrevious.setDate(startCurrent.getDate() - 30);

  // profile views
  const [{ count: viewsCurrent }, { count: viewsPrevious }] = await Promise.all([
    sup.from('profile_views_eif').select('id', { count: 'exact' }).eq('target_user_id', userId).gte('created_at', startCurrent.toISOString()),
    sup.from('profile_views_eif').select('id', { count: 'exact' }).eq('target_user_id', userId).gte('created_at', startPrevious.toISOString()).lt('created_at', startCurrent.toISOString()),
  ]).then((res: any[]) => res.map(r => ({ count: r.count ?? 0 })));

  // deck downloads
  const [{ count: downloadsCurrent }, { count: downloadsPrevious }] = await Promise.all([
    sup.from('deck_downloads_eif').select('id', { count: 'exact' }).eq('target_user_id', userId).gte('created_at', startCurrent.toISOString()),
    sup.from('deck_downloads_eif').select('id', { count: 'exact' }).eq('target_user_id', userId).gte('created_at', startPrevious.toISOString()).lt('created_at', startCurrent.toISOString()),
  ]).then((res: any[]) => res.map(r => ({ count: r.count ?? 0 })));

  // saved by (favorites) - total count
  const { data: favoritesData, error: favErr } = await sup.from('favorites_eif').select('id', { count: 'exact' }).eq('favorite_user_id', userId);
  if (favErr) throw favErr;
  const savedByCount = favoritesData?.count ?? 0;

  // meeting requests (total and pending)
  const { data: meetingsData, error: meetErr } = await sup.from('meeting_requests_eif').select('id,status', { count: 'exact' }).or(`to_user_id.eq.${userId}`).gte('created_at', startPrevious.toISOString());
  if (meetErr) throw meetErr;
  // compute pending separately
  const { data: pendingData, error: pendErr } = await sup.from('meeting_requests_eif').select('id', { count: 'exact' }).eq('to_user_id', userId).eq('status', 'PENDING');
  if (pendErr) throw pendErr;
  const meetingRequestsCount = meetingsData?.length ?? 0;
  const meetingRequestsPending = pendingData?.count ?? 0;

  function percentChange(current: number, previous: number) {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / (previous || 1)) * 100;
  }

  return {
    profileViews: { current: Number(viewsCurrent), previous: Number(viewsPrevious), changePercent: percentChange(Number(viewsCurrent), Number(viewsPrevious)) },
    deckDownloads: { current: Number(downloadsCurrent), previous: Number(downloadsPrevious), changePercent: percentChange(Number(downloadsCurrent), Number(downloadsPrevious)) },
    savedBy: { total: Number(savedByCount) },
    meetingRequests: { total: Number(meetingRequestsCount), pending: Number(meetingRequestsPending) },
  };
}

// Compute overview metrics for an investor (investor home dashboard)
export async function getInvestorOverviewMetrics(userId: string) {
  const sup = ensureSupabase();

  // Count active deals / meeting requests made by this investor
  const { count: activeDeals } = await sup.from('meeting_requests_eif')
    .select('id', { count: 'exact' })
    .eq('from_user_id', userId)
    .neq('status', 'CANCELLED');

  // Count meetings this week (confirmed meetings where investor is involved)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { count: meetingsThisWeek } = await sup.from('meeting_requests_eif')
    .select('id', { count: 'exact' })
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq('status', 'CONFIRMED')
    .gte('updated_at', startOfWeek.toISOString());

  // Count new matches - companies that match investor's preferred sectors (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  const { count: newMatches } = await sup.from('company_profiles_eif')
    .select('user_id', { count: 'exact' })
    .gte('created_at', thirtyDaysAgo.toISOString());

  return {
    activeDeals: Number(activeDeals ?? 0),
    meetingsThisWeek: Number(meetingsThisWeek ?? 0),
    newMatches: Number(newMatches ?? 0),
  };
}

// Get top recommended companies for an investor
export async function getRecommendedCompanies(investorUserId: string, limit = 4) {
  const sup = ensureSupabase();
  
  // Get the investor's full profile for matching
  const { data: investor } = await sup.from('investor_profiles_eif')
    .select('*')
    .eq('user_id', investorUserId)
    .maybeSingle();

  if (!investor) return [];

  // Get all companies
  const { data: companies, error } = await sup.from('company_profiles_eif')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!companies || companies.length === 0) return [];

  // Import match engine
  const { matchEngine } = await import('./matchEngine.js');

  // Calculate match scores for each company
  const companiesWithScores = companies.map(company => ({
    ...company,
    matchScore: matchEngine.calculateMatch(investor, company),
  }));

  // Sort by overall match score (descending) then by creation date
  const sorted = companiesWithScores
    .sort((a, b) => {
      const scoreDiff = b.matchScore.overall - a.matchScore.overall;
      if (scoreDiff !== 0) return scoreDiff;
      // Tie-breaker: newer companies first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);

  return sorted;
}

// Get upcoming meetings for an investor
export async function getUpcomingMeetings(userId: string, limit = 5) {
  const sup = ensureSupabase();
  
  const { data, error } = await sup.from('meeting_requests_eif')
    .select('*, time_proposals_eif(*)')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq('status', 'CONFIRMED')
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data ?? [];
}

export default supabaseClient as SupabaseClient;

// Notifications helpers
export async function listNotificationsForUser(userId: string, limit = 20) {
  const { data, error } = await ensureSupabase()
    .from('notifications_eif')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  const { data, error } = await ensureSupabase()
    .from('notifications_eif')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Create a notification for a user
export async function createNotification(userId: string, type: string, data: any) {
  const { data: d, error } = await ensureSupabase()
    .from('notifications_eif')
    .insert({ user_id: userId, type, data })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return d;
}

// Create a confirmed meeting record linked to an existing meeting request
export async function createMeetingFromRequest(meetingRequestId: string, startTime: string, endTime: string, timezone = 'UTC', location_type?: string, location_url?: string) {
  const sup = ensureSupabase();

  // Get meeting request to obtain participants
  const { data: reqData, error: reqErr } = await sup.from('meeting_requests_eif').select('*').eq('id', meetingRequestId).maybeSingle();
  if (reqErr) throw reqErr;
  if (!reqData) throw new Error('meeting_request_not_found');

  const participantA = reqData.from_user_id;
  const participantB = reqData.to_user_id;

  const payload: any = {
    participant_a_id: participantA,
    participant_b_id: participantB,
    start_time: startTime,
    end_time: endTime,
    timezone,
    location_type: location_type ?? null,
    location_url: location_url ?? null,
  };

  const { data, error } = await sup.from('meetings_eif').insert(payload).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// Optional: update an existing meeting record's location/url
export async function updateMeetingLocation(meetingId: string, location_type?: string, location_url?: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup.from('meetings_eif').update({ location_type: location_type ?? null, location_url: location_url ?? null }).eq('id', meetingId).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// Delete meeting by id
export async function deleteMeetingById(meetingId: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup.from('meetings_eif').delete().eq('id', meetingId).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// Find a meeting_request that matches the given participant ids and start_time (optional)
export async function findMeetingRequestByParticipants(participantA: string, participantB: string, startTime?: string | null) {
  const sup = ensureSupabase();
  // Search for meeting_requests where the pair of users match either ordering. Optionally match start_time in proposals or created
  let q = sup.from('meeting_requests_eif').select('*').or(
    `and(from_user_id.eq.${participantA},to_user_id.eq.${participantB}),and(from_user_id.eq.${participantB},to_user_id.eq.${participantA})`
  );
  const { data, error } = await q.order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return (data && data.length > 0) ? data[0] : null;
}

// Delete a time proposal by id
export async function deleteTimeProposalById(proposalId: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup.from('time_proposals_eif').delete().eq('id', proposalId).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// Create a message between two users
export async function createMessage(fromUserId: string, toUserId: string, content: string, isEncrypted = false) {
  const sup = ensureSupabase();
  const { data, error } = await sup.from('messages_eif').insert({ from_user_id: fromUserId, to_user_id: toUserId, content, is_encrypted: isEncrypted }).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// List messages between two users
export async function listMessagesBetweenUsers(userA: string, userB: string, limit = 100) {
  const sup = ensureSupabase();
  const { data, error } = await sup.from('messages_eif').select('*').or(`and(from_user_id.eq.${userA},to_user_id.eq.${userB}),and(from_user_id.eq.${userB},to_user_id.eq.${userA})`).order('created_at', { ascending: true }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Availability and Meeting Arrangement Functions

export async function createUserAvailabilitySchedule(userId: string, dayOfWeek: number, availableFrom: string, availableTo: string, timezone: string = 'UTC') {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('user_availability_schedules_eif')
    .upsert(
      // schema fields are `start_time` / `end_time` (type `time`) — ensure payload matches
      { user_id: userId, day_of_week: dayOfWeek, start_time: availableFrom, end_time: availableTo, timezone },
      { onConflict: 'user_id, day_of_week' }
    )
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserAvailabilitySchedule(userId: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('user_availability_schedules_eif')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function recordIdleHours(userId: string, startTime: string, endTime: string, timezone: string = 'UTC', notes?: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('user_idle_hours_eif')
    .insert({ user_id: userId, start_time: startTime, end_time: endTime, timezone, notes, is_available: true })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserIdleHours(userId: string, startTime?: string, endTime?: string) {
  const sup = ensureSupabase();
  let query = sup.from('user_idle_hours_eif').select('*').eq('user_id', userId).eq('is_available', true);
  
  if (startTime) {
    query = query.gte('start_time', startTime);
  }
  if (endTime) {
    query = query.lte('end_time', endTime);
  }
  
  const { data, error } = await query.order('start_time', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMeetingArrangementPreferences(userId: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('meeting_arrangement_preferences_eif')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMeetingArrangementPreferences(userId: string, updates: Record<string, any>) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('meeting_arrangement_preferences_eif')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createAutomaticMeetingMatch(initiatorUserId: string, matchUserId: string, matchScore: number = 0, suggestedTimeFrom?: string, suggestedTimeTo?: string) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('automatic_meeting_matches_eif')
    .insert({
      initiator_user_id: initiatorUserId,
      match_user_id: matchUserId,
      match_score: matchScore,
      suggested_time_from: suggestedTimeFrom,
      suggested_time_to: suggestedTimeTo,
      status: 'PENDING',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAutomaticMeetingMatches(userId: string, status?: string) {
  const sup = ensureSupabase();
  let query = sup
    .from('automatic_meeting_matches_eif')
    .select('*')
    .or(`initiator_user_id.eq.${userId},match_user_id.eq.${userId}`);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateAutomaticMeetingMatch(matchId: string, updates: Record<string, any>) {
  const sup = ensureSupabase();
  const { data, error } = await sup
    .from('automatic_meeting_matches_eif')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', matchId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

