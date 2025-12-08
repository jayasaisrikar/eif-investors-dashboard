import type { SupabaseClient } from '@supabase/supabase-js';
import { createGoogleMeetEvent } from './googleCalendar.js';
import { CalendarService } from './calendarService.js';
import { GoogleOAuthManager } from './oauthManager.js';

export interface AutoMatchResult {
  investorId: string;
  companyId: string;
  suggestedTime: Date;
  meetingId?: string;
  status: 'scheduled' | 'failed' | 'pending_confirmation';
}

/**
 * Automated scheduler for matching and booking meetings between users with arrange_meetings=true
 */
export class AutomaticScheduler {
  private supabase: SupabaseClient;
  private calendarService: CalendarService;
  private oauthManager: GoogleOAuthManager;

  constructor(supabase: SupabaseClient, oauthManager?: GoogleOAuthManager) {
    this.supabase = supabase;
    this.calendarService = new CalendarService(supabase);
    this.oauthManager = oauthManager || new GoogleOAuthManager(
      {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
      },
      supabase
    );
  }

  /**
   * Find potential matches between users with arrange_meetings enabled
   */
  async findPotentialMatches(): Promise<Array<{ investorId: string; companyId: string; matchScore: number }>> {
    // Get all users with arrange_meetings enabled
    const { data: usersWithArrange, error: userError } = await this.supabase
      .from('users_eif')
      .select('id, role')
      .eq('arrange_meetings', true);

    if (userError) throw userError;
    if (!usersWithArrange || usersWithArrange.length === 0) return [];

    const matches: Array<{ investorId: string; companyId: string; matchScore: number }> = [];

    // Separate investors and companies
    const investors = usersWithArrange.filter(u => u.role?.toLowerCase().includes('investor'));
    const companies = usersWithArrange.filter(u => u.role?.toLowerCase().includes('company'));

    // For each investor-company pair, check if:
    // 1. No existing meeting request between them
    // 2. They have overlapping availability
    for (const investor of investors) {
      for (const company of companies) {
        // Check for existing request
        const { data: existingRequest } = await this.supabase
          .from('meeting_requests_eif')
          .select('id')
          .or(`and(from_user_id.eq.${investor.id},to_user_id.eq.${company.id}),and(from_user_id.eq.${company.id},to_user_id.eq.${investor.id})`)
          .limit(1)
          .maybeSingle();

        if (existingRequest) continue; // Skip if request already exists

        // Check availability overlap
        const overlap = await this.findAvailabilityOverlap(investor.id, company.id);
        if (overlap) {
          matches.push({
            investorId: investor.id,
            companyId: company.id,
            matchScore: overlap.score || 1,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Find overlapping availability between two users
   */
  private async findAvailabilityOverlap(
    userId1: string,
    userId2: string
  ): Promise<{ score: number; slot?: Date } | null> {
    // Get availability for both users
    const [{ data: user1Avail }, { data: user2Avail }] = await Promise.all([
      this.supabase
        .from('user_availability_schedules_eif')
        .select('*')
        .eq('user_id', userId1),
      this.supabase
        .from('user_availability_schedules_eif')
        .select('*')
        .eq('user_id', userId2),
    ]);

    if (!user1Avail?.length || !user2Avail?.length) return null;

    // Find overlapping day and time
    for (const avail1 of user1Avail) {
      for (const avail2 of user2Avail) {
        if (avail1.day_of_week === avail2.day_of_week) {
          // Find overlapping time window
          const start1 = timeStringToMinutes(avail1.start_time);
          const end1 = timeStringToMinutes(avail1.end_time);
          const start2 = timeStringToMinutes(avail2.start_time);
          const end2 = timeStringToMinutes(avail2.end_time);

          const overlapStart = Math.max(start1, start2);
          const overlapEnd = Math.min(end1, end2);

          if (overlapStart < overlapEnd) {
            // Generate a slot for next occurrence of this day
            const slot = getNextDaySlot(avail1.day_of_week, overlapStart, overlapEnd);
            return { score: 1, slot };
          }
        }
      }
    }

    return null;
  }

  /**
   * Attempt to schedule a meeting between two users
   */
  async scheduleAutoMeeting(investorId: string, companyId: string): Promise<AutoMatchResult> {
    try {
      // 1. Find an available time slot
      const overlap = await this.findAvailabilityOverlap(investorId, companyId);
      if (!overlap?.slot) {
        return {
          investorId,
          companyId,
          suggestedTime: new Date(),
          status: 'failed',
        };
      }

      const meetingTime = overlap.slot;
      const meetingEndTime = new Date(meetingTime.getTime() + 30 * 60 * 1000); // 30 min default

      // 2. Check calendar conflicts for both users
      const [investorCredentials, companyCredentials] = await Promise.all([
        this.oauthManager.getCredentials(investorId),
        this.oauthManager.getCredentials(companyId),
      ]);

      // If both have OAuth, check their external calendars
      if (investorCredentials && companyCredentials) {
        const [investorFree, companyFree] = await Promise.all([
          this.calendarService.isTimeAvailable(investorId, investorCredentials, meetingTime, meetingEndTime),
          this.calendarService.isTimeAvailable(companyId, companyCredentials, meetingTime, meetingEndTime),
        ]);

        if (!investorFree || !companyFree) {
          return {
            investorId,
            companyId,
            suggestedTime: meetingTime,
            status: 'failed',
          };
        }
      }

      // 3. Create a meeting request (auto-from investor to company)
      const { data: meetingRequest, error: reqError } = await this.supabase
        .from('meeting_requests_eif')
        .insert({
          from_user_id: investorId,
          to_user_id: companyId,
          from_role: 'INVESTOR',
          to_role: 'COMPANY',
          message: 'Auto-scheduled meeting based on availability and preferences',
          status: 'CONFIRMED', // Auto-confirm since both have arrange_meetings enabled
        })
        .select('*')
        .maybeSingle();

      if (reqError || !meetingRequest) {
        throw new Error(`Failed to create meeting request: ${reqError?.message}`);
      }

      // 4. Create a time proposal and immediately accept it
      const { data: proposal, error: propError } = await this.supabase
        .from('time_proposals_eif')
        .insert({
          meeting_request_id: meetingRequest.id,
          proposed_by_user_id: investorId,
          start_time: meetingTime.toISOString(),
          end_time: meetingEndTime.toISOString(),
          timezone: 'UTC',
          status: 'ACCEPTED',
        })
        .select('*')
        .maybeSingle();

      if (propError) {
        throw new Error(`Failed to create time proposal: ${propError.message}`);
      }

      // 5. Create a meeting record
      let meetUrl: string | undefined;

      // Try to create Google Meet event using service account if configured
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_CALENDAR_ID) {
        try {
          const [investorUser, companyUser] = await Promise.all([
            this.supabase.from('users_eif').select('email').eq('id', investorId).maybeSingle(),
            this.supabase.from('users_eif').select('email').eq('id', companyId).maybeSingle(),
          ]);

          const attendees = [
            investorUser.data?.email,
            companyUser.data?.email,
          ].filter(Boolean) as string[];

          const ev = await createGoogleMeetEvent({
            summary: 'Auto-Scheduled Meeting',
            description: 'Automatically scheduled via EIF Investor Portal',
            start: meetingTime.toISOString(),
            end: meetingEndTime.toISOString(),
            attendees,
          });

          meetUrl = ev?.meetUrl || ev?.htmlLink;
        } catch (e) {
          console.error('Failed to create Google Meet event:', e);
        }
      }

      // If both users have OAuth, create events on their personal calendars
      if (investorCredentials && companyCredentials) {
        try {
          const [investorUser, companyUser] = await Promise.all([
            this.supabase.from('users_eif').select('email').eq('id', investorId).maybeSingle(),
            this.supabase.from('users_eif').select('email').eq('id', companyId).maybeSingle(),
          ]);

          // Create on investor's calendar
          await this.calendarService.createEvent(investorId, investorCredentials, {
            summary: 'Meeting with Company',
            description: 'Auto-scheduled via EIF',
            start: meetingTime.toISOString(),
            end: meetingEndTime.toISOString(),
            attendees: companyUser.data?.email ? [companyUser.data.email] : [],
            conferenceData: {
              createRequest: { requestId: `${meetingRequest.id}-investor` },
            },
          });

          // Create on company's calendar
          await this.calendarService.createEvent(companyId, companyCredentials, {
            summary: 'Meeting with Investor',
            description: 'Auto-scheduled via EIF',
            start: meetingTime.toISOString(),
            end: meetingEndTime.toISOString(),
            attendees: investorUser.data?.email ? [investorUser.data.email] : [],
            conferenceData: {
              createRequest: { requestId: `${meetingRequest.id}-company` },
            },
          });
        } catch (e) {
          console.error('Failed to create personal calendar events:', e);
        }
      }

      // 6. Persist meeting record
      const { data: meeting, error: meetError } = await this.supabase
        .from('meetings_eif')
        .insert({
          participant_a_id: investorId,
          participant_b_id: companyId,
          start_time: meetingTime.toISOString(),
          end_time: meetingEndTime.toISOString(),
          timezone: 'UTC',
          location_type: 'google_meet',
          location_url: meetUrl,
          status: 'CONFIRMED',
        })
        .select('*')
        .maybeSingle();

      if (meetError) {
        throw new Error(`Failed to create meeting record: ${meetError.message}`);
      }

      // 7. Create notifications
      await Promise.all([
        this.supabase.from('notifications_eif').insert({
          user_id: investorId,
          type: 'auto_meeting_scheduled',
          data: {
            title: 'Meeting Scheduled',
            message: 'A meeting has been automatically scheduled',
            meeting_id: meeting?.id,
          },
        }),
        this.supabase.from('notifications_eif').insert({
          user_id: companyId,
          type: 'auto_meeting_scheduled',
          data: {
            title: 'Meeting Scheduled',
            message: 'A meeting has been automatically scheduled',
            meeting_id: meeting?.id,
          },
        }),
      ]);

      return {
        investorId,
        companyId,
        suggestedTime: meetingTime,
        meetingId: meeting?.id,
        status: 'scheduled',
      };
    } catch (error) {
      console.error(`Failed to schedule auto meeting: ${error}`);
      return {
        investorId,
        companyId,
        suggestedTime: new Date(),
        status: 'failed',
      };
    }
  }

  /**
   * Run the full automatic scheduler (find matches and schedule)
   */
  async runScheduler(): Promise<AutoMatchResult[]> {
    const matches = await this.findPotentialMatches();
    const results: AutoMatchResult[] = [];

    for (const match of matches) {
      const result = await this.scheduleAutoMeeting(match.investorId, match.companyId);
      results.push(result);

      // Stagger requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

/**
 * Helper: Convert HH:MM time string to minutes since midnight
 */
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper: Get next occurrence of a day of week with a time slot
 */
function getNextDaySlot(dayOfWeek: number, startMinutes: number, endMinutes: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let daysAhead = dayOfWeek - currentDay;

  if (daysAhead <= 0) {
    daysAhead += 7; // Next week if day has passed
  }

  const slot = new Date(now);
  slot.setDate(slot.getDate() + daysAhead);

  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;
  slot.setHours(hours, minutes, 0, 0);

  return slot;
}
