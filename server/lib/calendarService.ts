import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OAuthCredentials } from './oauthManager.js';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string; // ISO string
  end: string; // ISO string
  attendees?: string[]; // emails
  conferenceData?: any;
}

export interface BusyTime {
  start: string; // ISO string
  end: string; // ISO string
}

/**
 * Calendar service for per-user calendar operations
 */
export class CalendarService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create an event on user's calendar using OAuth credentials
   */
  async createEvent(userId: string, credentials: OAuthCredentials, event: CalendarEvent): Promise<{ id?: string; htmlLink?: string; conferenceLink?: string }> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID!,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      process.env.GOOGLE_OAUTH_REDIRECT_URI!
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const calendarSettings = await this.supabase
      .from('user_calendar_settings_eif')
      .select('calendar_id')
      .eq('user_id', userId)
      .maybeSingle();

    const calendarId = calendarSettings.data?.calendar_id || 'primary';

    const eventBody: any = {
      summary: event.summary,
      description: event.description || '',
      start: { dateTime: event.start },
      end: { dateTime: event.end },
      attendees: (event.attendees || []).map(email => ({ email })),
    };

    // Add conference data (Google Meet) if needed
    if (event.conferenceData) {
      eventBody.conferenceData = event.conferenceData;
    }

    try {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      } as any);

      const eventData = res.data as any;
      let conferenceLink: string | undefined;

      // Extract Meet URL from conference data
      if (eventData.conferenceData?.entryPoints) {
        const meetEntry = eventData.conferenceData.entryPoints.find(
          (e: any) => e.entryPointType === 'video' || e.entryPointType === 'hangoutsMeet'
        );
        if (meetEntry?.uri) conferenceLink = meetEntry.uri;
      }

      return {
        id: eventData.id,
        htmlLink: eventData.htmlLink,
        conferenceLink,
      };
    } catch (error: any) {
      console.error('Failed to create calendar event:', error.message);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Get busy times from user's calendar for a date range
   */
  async getBusyTimes(userId: string, credentials: OAuthCredentials, startTime: string, endTime: string): Promise<BusyTime[]> {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID!,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      process.env.GOOGLE_OAUTH_REDIRECT_URI!
    );

    oauth2Client.setCredentials({
      access_token: credentials.accessToken,
      refresh_token: credentials.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const calendarSettings = await this.supabase
      .from('user_calendar_settings_eif')
      .select('calendar_id')
      .eq('user_id', userId)
      .maybeSingle();

    const calendarId = calendarSettings.data?.calendar_id || 'primary';

    try {
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin: startTime,
          timeMax: endTime,
          items: [{ id: calendarId }],
        },
      } as any);

      const busy = res.data?.calendars?.[calendarId]?.busy || [];
      return busy.map((b: any) => ({
        start: b.start,
        end: b.end,
      }));
    } catch (error: any) {
      console.error('Failed to get busy times:', error.message);
      // Return empty array on error (don't block scheduling)
      return [];
    }
  }

  /**
   * Check if a time slot conflicts with user's calendar and availability
   */
  async isTimeAvailable(
    userId: string,
    credentials: OAuthCredentials,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    // 1. Check external calendar busy times
    const busyTimes = await this.getBusyTimes(
      userId,
      credentials,
      startTime.toISOString(),
      endTime.toISOString()
    );

    const proposedStart = startTime.getTime();
    const proposedEnd = endTime.getTime();

    for (const busy of busyTimes) {
      const busyStart = new Date(busy.start).getTime();
      const busyEnd = new Date(busy.end).getTime();

      // Check for overlap
      if (!(proposedEnd <= busyStart || proposedStart >= busyEnd)) {
        return false; // Conflict found
      }
    }

    // 2. Check internal DB meeting conflicts
    const { data: meetings, error } = await this.supabase
      .from('meetings_eif')
      .select('start_time, end_time')
      .or(`participant_a_id.eq.${userId},participant_b_id.eq.${userId}`)
      .gte('start_time', startTime.toISOString())
      .lt('start_time', endTime.toISOString());

    if (error) {
      console.error('Error checking meeting conflicts:', error);
      return true; // Assume available on error (conservative)
    }

    // If any meeting overlaps, return false
    if ((meetings || []).length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Sync external calendar busy times into DB for faster lookups
   */
  async syncExternalCalendarBusyTimes(userId: string, credentials: OAuthCredentials): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const busyTimes = await this.getBusyTimes(
      userId,
      credentials,
      now.toISOString(),
      thirtyDaysFromNow.toISOString()
    );

    // Clear old entries
    await this.supabase
      .from('external_calendar_busy_times_eif')
      .delete()
      .eq('user_id', userId)
      .lt('synced_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

    // Insert new busy times
    if (busyTimes.length > 0) {
      const records = busyTimes.map(bt => ({
        user_id: userId,
        start_time: bt.start,
        end_time: bt.end,
        synced_at: now.toISOString(),
      }));

      const { error } = await this.supabase
        .from('external_calendar_busy_times_eif')
        .insert(records);

      if (error) {
        console.error('Failed to sync busy times:', error);
      }
    }
  }
}
