import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string;
}

/**
 * Google OAuth manager for user calendar integration
 */
export class GoogleOAuthManager {
  private config: GoogleAuthConfig;
  private supabase: SupabaseClient;

  constructor(config: GoogleAuthConfig, supabase: SupabaseClient) {
    this.config = config;
    this.supabase = supabase;
  }

  /**
   * Generate OAuth authorization URL for user to authorize the app
   */
  getAuthorizationUrl(state: string): string {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async exchangeCodeForTokens(code: string): Promise<OAuthCredentials> {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scope: tokens.scope || '',
    };
  }

  /**
   * Refresh an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthCredentials> {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      scope: credentials.scope || '',
    };
  }

  /**
   * Store OAuth credentials in database
   */
  async storeCredentials(userId: string, credentials: OAuthCredentials): Promise<void> {
    const { error } = await this.supabase
      .from('oauth_credentials_eif')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expires_at: credentials.expiresAt?.toISOString(),
        scope: credentials.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  /**
   * Get stored credentials for a user
   */
  async getCredentials(userId: string): Promise<OAuthCredentials | null> {
    const { data, error } = await this.supabase
      .from('oauth_credentials_eif')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Check if token is expired and refresh if needed
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      if (data.refresh_token) {
        try {
          const refreshed = await this.refreshAccessToken(data.refresh_token);
          await this.storeCredentials(userId, refreshed);
          return refreshed;
        } catch (e) {
          console.error('Failed to refresh token:', e);
          // Return stale token, caller should handle 401
        }
      }
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      scope: data.scope,
    };
  }

  /**
   * Delete stored credentials
   */
  async deleteCredentials(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('oauth_credentials_eif')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (error) throw error;
  }

  /**
   * Get user's calendar ID (primary calendar)
   */
  async getUserCalendarId(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('user_calendar_settings_eif')
      .select('calendar_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.calendar_id || 'primary';
  }

  /**
   * Save calendar settings for user
   */
  async saveCalendarSettings(
    userId: string,
    settings: {
      calendarId?: string;
      calendarEmail?: string;
      timezone?: string;
      autoAcceptMeetings?: boolean;
      syncExternalCalendar?: boolean;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('user_calendar_settings_eif')
      .upsert({
        user_id: userId,
        calendar_id: settings.calendarId || 'primary',
        calendar_email: settings.calendarEmail,
        timezone: settings.timezone,
        auto_accept_meetings: settings.autoAcceptMeetings,
        sync_external_calendar: settings.syncExternalCalendar,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  /**
   * Get calendar settings for user
   */
  async getCalendarSettings(userId: string) {
    const { data, error } = await this.supabase
      .from('user_calendar_settings_eif')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }
}
