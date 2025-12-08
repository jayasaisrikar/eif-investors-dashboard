import type { Express, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { GoogleOAuthManager } from './lib/oauthManager.js';
import supabaseClient from './supabase.js';
import { log } from './index.js';

let oauthManager: GoogleOAuthManager | null = null;

function initOAuthManager() {
  if (!oauthManager && process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    oauthManager = new GoogleOAuthManager(
      {
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      },
      supabaseClient
    );
  }
}

function extractToken(req: any) {
  const auth = req.headers?.authorization as string | undefined;
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.split(' ')[1];
  const cookie = req.headers?.cookie as string | undefined;
  if (cookie) {
    const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
    if (match) return match.split('=')[1];
  }
  return null;
}

export function registerOAuthRoutes(app: Express): void {
  initOAuthManager();

  if (!oauthManager) {
    log('OAuth is not configured. Skipping OAuth routes.', 'oauth-routes');
    return;
  }

  /**
   * GET /api/oauth/authorize
   * Generate OAuth authorization URL for user
   */
  app.get('/api/oauth/authorize', (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });

      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      // Generate state parameter to prevent CSRF
      const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');

      const authUrl = oauthManager!.getAuthorizationUrl(state);
      return res.json({ authUrl });
    } catch (err: any) {
      log(`OAuth authorize error: ${err?.message ?? String(err)}`, 'oauth-routes');
      return res.status(500).json({ message: 'error generating authorization URL' });
    }
  });

  /**
   * GET /api/oauth/callback
   * Handle OAuth redirect callback
   */
  app.get('/api/oauth/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;

      if (!code || !state) {
        return res.status(400).json({ message: 'missing code or state' });
      }

      // Verify state (CSRF protection)
      let stateData: any;
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      } catch (e) {
        return res.status(400).json({ message: 'invalid state parameter' });
      }

      const userId = stateData.userId;
      if (!userId) {
        return res.status(400).json({ message: 'invalid state: missing userId' });
      }

      // Exchange code for tokens
      const credentials = await oauthManager!.exchangeCodeForTokens(code);

      // Store credentials
      await oauthManager!.storeCredentials(userId, credentials);

      // Get user info to set calendar settings
      const oauth2Client = new (await import('googleapis')).google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID!,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        process.env.GOOGLE_OAUTH_REDIRECT_URI!
      );

      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      const { google } = await import('googleapis');
      const people = google.people({ version: 'v1', auth: oauth2Client });
      const profile = await people.people.get({ resourceName: 'people/me', personFields: 'emailAddresses' });

      const email = profile.data.emailAddresses?.[0]?.value;

      if (email) {
        await oauthManager!.saveCalendarSettings(userId, {
          calendarEmail: email,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          syncExternalCalendar: true,
        });
      }

      // Redirect to dashboard settings or OAuth success page
      const origin = (process.env.APP_URL && process.env.APP_URL.trim()) || `${req.protocol}://${req.get('host')}`;
      res.redirect(`${origin.replace(/\/$/, '')}/dashboard/settings?oauth=success`);
    } catch (err: any) {
      log(`OAuth callback error: ${err?.message ?? String(err)}`, 'oauth-routes');
      res.redirect(`/dashboard/settings?oauth=error&message=${encodeURIComponent(err?.message || 'Unknown error')}`);
    }
  });

  /**
   * GET /api/oauth/status
   * Check if user has OAuth connected
   */
  app.get('/api/oauth/status', async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });

      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const credentials = await oauthManager!.getCredentials(userId);
      const settings = await oauthManager!.getCalendarSettings(userId);

      return res.json({
        connected: !!credentials,
        calendarEmail: settings?.calendar_email,
        syncExternalCalendar: settings?.sync_external_calendar,
      });
    } catch (err: any) {
      log(`OAuth status error: ${err?.message ?? String(err)}`, 'oauth-routes');
      return res.status(500).json({ message: 'error checking OAuth status' });
    }
  });

  /**
   * POST /api/oauth/disconnect
   * Disconnect user's OAuth
   */
  app.post('/api/oauth/disconnect', async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });

      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      await oauthManager!.deleteCredentials(userId);

      return res.json({ message: 'OAuth credentials deleted' });
    } catch (err: any) {
      log(`OAuth disconnect error: ${err?.message ?? String(err)}`, 'oauth-routes');
      return res.status(500).json({ message: 'error disconnecting OAuth' });
    }
  });

  /**
   * POST /api/oauth/settings
   * Update calendar settings
   */
  app.post('/api/oauth/settings', async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });

      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const { autoAcceptMeetings, syncExternalCalendar } = req.body;

      await oauthManager!.saveCalendarSettings(userId, {
        autoAcceptMeetings: autoAcceptMeetings ?? false,
        syncExternalCalendar: syncExternalCalendar ?? false,
      });

      return res.json({ message: 'Calendar settings updated' });
    } catch (err: any) {
      log(`OAuth settings error: ${err?.message ?? String(err)}`, 'oauth-routes');
      return res.status(500).json({ message: 'error updating calendar settings' });
    }
  });

  log('OAuth routes registered', 'oauth-routes');
}
