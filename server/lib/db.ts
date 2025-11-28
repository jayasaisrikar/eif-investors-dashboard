import supabase from "../supabase";
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
  const { data, error } = await ensureSupabase()
    .from("investor_profiles_eif")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
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

export async function updateInvestorProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await ensureSupabase()
    .from('investor_profiles_eif')
    .update(updates)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
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
  const { data, error } = await ensureSupabase()
    .from("meeting_requests_eif")
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
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
  const { matchEngine } = await import('./matchEngine');

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
