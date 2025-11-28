import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  listInvestorProfiles,
  getInvestorProfileByUserId,
  listCompanyProfiles,
  getCompanyProfileByUserId,
  createMeetingRequest,
  createTimeProposal,
  listMeetingRequestsForUser,
  searchCompanyProfiles,
  upsertCompanyProfile,
} from "./lib/db";
import { recordProfileView, recordDeckDownload, getCompanyOverviewMetrics, getInvestorOverviewMetrics, getRecommendedCompanies, getUpcomingMeetings } from "./lib/db";
import { updateInvestorProfile } from "./lib/db";
import { type InsertUser } from "@shared/schema";
import { matchEngine } from "./lib/matchEngine";
import { log } from "./index";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Health check
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Register (create user)
  app.post('/api/users', async (req, res) => {
    try {
      const { name, email, password, role } = req.body as { name?: string; email?: string; password?: string; role?: string };
      if (!email || !password) {
        return res.status(400).json({ message: 'email and password required' });
      }

      const user = await storage.createUser({ email, name, password, role });

      // Optionally issue a JWT on registration
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const token = jwt.sign({ sub: user.id, username: user.username, role: (user as any).role }, jwtSecret, { expiresIn: '7d' });
        res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
      }

      // If the new user is a company, ensure a company_profiles_eif row exists (empty/defaults)
      try {
        const r = (user as any);
        const userRole = (r?.role ?? '').toString().toLowerCase();
        if (userRole.includes('company')) {
          await upsertCompanyProfile(user.id, { company_name: r?.name ?? '', hq_location: null });
        }
      } catch (e) {
        // non-fatal; log and continue
        log(`ensure company profile creation warning: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      return res.status(201).json(user);
    } catch (error: any) {
      log(`create user error: ${error?.message ?? String(error)}`, 'routes');
      if (error?.message === 'email_exists') {
        return res.status(409).json({ message: 'An account with that email already exists' });
      }
      if (error?.message === 'email_required') {
        return res.status(400).json({ message: 'email is required' });
      }
      return res.status(500).json({ message: error?.message ?? 'error creating user' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) return res.status(400).json({ message: 'email and password required' });

      const user = await storage.getUserByUsername(email);
      if (!user || !user.password) return res.status(401).json({ message: 'invalid credentials' });

      const matches = await bcrypt.compare(password, user.password as string);
      if (!matches) return res.status(401).json({ message: 'invalid credentials' });

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        log('JWT_SECRET not configured', 'routes');
        return res.status(500).json({ message: 'authentication not configured' });
      }

      const token = jwt.sign({ sub: user.id, username: user.username, role: (user as any).role }, jwtSecret, { expiresIn: '7d' });

      res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });

      return res.json({ token, user: { id: user.id, username: user.username, role: (user as any).role } });
    } catch (err: any) {
      log(`login error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error logging in' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.json({ message: 'logged out' });
  });

  // Forgot password - request reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ message: 'email is required' });

      const user = await storage.getUserByUsername(email);
      if (!user) {
        // For security, always return success even if user doesn't exist
        // This prevents email enumeration attacks
        return res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent' });
      }

      // Create password reset token
      const resetToken = await storage.createPasswordResetToken(user.id);
      if (!resetToken) {
        return res.status(500).json({ message: 'Failed to generate reset token' });
      }

      // Build an origin from APP_URL (preferred) or from the incoming request host.
      // This ensures the reset link points to the running dev server (e.g. :5000) instead of
      // an arbitrary client port like 5173 which may not be serving the app in this setup.
      const origin = (process.env.APP_URL && process.env.APP_URL.trim()) || `${req.protocol}://${req.get('host')}`;
      const resetLink = `${origin.replace(/\/$/, '')}/auth?token=${resetToken.token}`;

      // TODO: Integrate email service (e.g., Resend, SendGrid, Mailgun).
      // For development we log the link. In production you must send the link by email.
      // Example with Resend (pseudo):
      // await resend.emails.send({ from: 'noreply@yourdomain.com', to: email, subject: 'Reset your EIF password', html: `<a href="${resetLink}">Reset</a>` });

      log(`[PASSWORD RESET] Link for ${email}: ${resetLink}`, 'routes');

      // Return a generic message (prevents email enumeration). Include a dev-only
      // copy of the link when not in production to make testing easier.
      return res.status(200).json({
        message: 'If an account exists with that email, a reset link has been sent',
        _devResetLink: process.env.NODE_ENV === 'production' ? undefined : resetLink,
      });
    } catch (err: any) {
      log(`forgot password error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error processing password reset request' });
    }
  });

  // Reset password - validate token and update
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        return res.status(400).json({ message: 'token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }

      // Validate token
      const resetRecord = await storage.validateResetToken(token);
      if (!resetRecord) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const userId = resetRecord.user_id;

      // Update password
      const updated = await storage.updateUserPassword(userId, password);
      if (!updated) {
        return res.status(500).json({ message: 'Failed to update password' });
      }

      // Invalidate all reset tokens for this user
      await storage.invalidateResetTokens(userId);

      log(`Password reset successful for user: ${userId}`, 'routes');
      return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (err: any) {
      log(`reset password error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error resetting password' });
    }
  });

  // Get current authenticated user
  app.get('/api/users/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });
      
      log(`fetching user with id: ${userId}`, 'routes');
      const user = await storage.getUser(userId);
      if (!user) {
        log(`user not found for id: ${userId}`, 'routes');
        return res.status(404).json({ message: 'user not found' });
      }
      
      const userData = user as any;
      log(`user found: ${user.id}`, 'routes');
      return res.json({ 
        id: user.id, 
        email: userData.email ?? user.username, 
        name: userData.name, 
        role: userData.role 
      });
    } catch (err: any) {
      log(`get current user error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching current user' });
    }
  });

  // Get user by id
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) return res.status(404).json({ message: 'user not found' });
      return res.json(user);
    } catch (error: any) {
      log(`get user error: ${error?.message ?? String(error)}`, 'routes');
      return res.status(500).json({ message: error?.message ?? 'error fetching user' });
    }
  });

  // Helper to extract JWT token from Authorization header or cookie header
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

  // Get current authenticated investor profile
  app.get('/api/investors/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });
      log(`get current investor me invoked (userId: ${userId ?? 'unknown'})`, 'routes');
      const investor = await getInvestorProfileByUserId(userId);
      if (!investor) return res.status(404).json({ message: 'investor profile not found' });
      return res.json(investor);
    } catch (err: any) {
      log(`get current investor error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching current investor' });
    }
  });

  // Update current authenticated investor profile
  app.patch('/api/investors/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });
      const updates = req.body as Record<string, any>;
      const updated = await updateInvestorProfile(userId, updates);
      return res.json(updated);
    } catch (err: any) {
      log(`update current investor error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error updating investor profile' });
    }
  });

  // List all investor profiles
  app.get('/api/investors', async (_req, res) => {
    try {
      const investors = await listInvestorProfiles();
      return res.json(investors ?? []);
    } catch (err: any) {
      log(`list investors error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing investors' });
    }
  });

  // Now the specific investor by ID route
  // Guard against the literal 'me' (which should be handled by the /me route above)
  app.get('/api/investors/:userId', async (req, res, next) => {
    if (req.params.userId === 'me') return next();
    // Validate UUID pattern to avoid passing invalid values to DB
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.userId)) return res.status(400).json({ message: 'invalid user id' });
    try {
      log(`get investor by id invoked (param: ${req.params.userId})`, 'routes');
      const investor = await getInvestorProfileByUserId(req.params.userId);
      if (!investor) return res.status(404).json({ message: 'investor not found' });
      return res.json(investor);
    } catch (err: any) {
      log(`get investor error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching investor' });
    }
  });

  app.get('/api/companies', async (_req, res) => {
    try {
      const { search, sector, stage, page, pageSize } = _req.query as any;
      const p = Number(page || 1);
      const ps = Number(pageSize || 12);
      const result = await searchCompanyProfiles({ search: search ?? null, sector: sector ?? null, stage: stage ?? null, page: p, pageSize: ps });
      
      // If user is authenticated as an investor, add match scores
      let companies: any[] = result.data ?? [];
      const token = extractToken(_req);
      if (token && process.env.JWT_SECRET) {
        try {
          const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
          const userId = payload?.sub;
          const role = payload?.role;
          
          if (userId && role?.toLowerCase().includes('investor')) {
            const investor = await getInvestorProfileByUserId(userId);
            if (investor) {
              companies = companies.map((company: any) => ({
                ...company,
                matchScore: matchEngine.calculateMatch(investor, company),
              }));
              // Sort by match score
              companies.sort((a: any, b: any) => (b.matchScore?.overall ?? 0) - (a.matchScore?.overall ?? 0));
            }
          }
        } catch (e) {
          // If token verification fails, just return companies without match scores
          log(`match score calculation failed: ${(e as any)?.message ?? String(e)}`, 'routes');
        }
      }
      
      return res.json({ items: companies, total: result.count ?? 0 });
    } catch (err: any) {
      log(`list companies error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing companies' });
    }
  });

  // Get current authenticated company profile (declare before `:userId` route)
  app.get('/api/companies/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });
      const company = await getCompanyProfileByUserId(userId);
      log(`get current company me invoked (userId: ${userId ?? 'unknown'})`, 'routes');
      if (!company) return res.status(404).json({ message: 'company profile not found' });
      return res.json(company);
    } catch (err: any) {
      log(`get current company error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching current company' });
    }
  });

  // Update/create current authenticated company profile (upsert)
  app.patch('/api/companies/me', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });
      const updates = req.body as Record<string, any>;
      const updated = await upsertCompanyProfile(userId, updates);
      return res.json(updated);
    } catch (err: any) {
      log(`update current company error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error updating company profile' });
    }
  });

  // Now get company by userId (after /me)
  app.get('/api/companies/:userId', async (req, res, next) => {
    if (req.params.userId === 'me') return next();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.userId)) return res.status(400).json({ message: 'invalid company id' });
    try {
      log(`get company by id invoked (param: ${req.params.userId})`, 'routes');
      const company = await getCompanyProfileByUserId(req.params.userId);
      if (!company) return res.status(404).json({ message: 'company not found' });
      return res.json(company);
    } catch (err: any) {
      log(`get company error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching company' });
    }
  });

  // Meeting requests
  app.post('/api/meetings/requests', async (req, res) => {
    try {
      let { from_user_id, to_user_id, from_role, to_role, message } = req.body as any;
      const { proposed_start, proposed_end } = req.body as any;
      // If from_user_id is not provided, try to infer from JWT token (cookie or Authorization header)
      if (!from_user_id) {
        const auth = req.headers.authorization as string | undefined;
        let token: string | null = null;
        if (auth && auth.toLowerCase().startsWith('bearer ')) token = auth.split(' ')[1];
        const cookie = req.headers.cookie as string | undefined;
        if (!token && cookie) {
          const m = cookie.split(';').map((s: string) => s.trim()).find((s: string) => s.startsWith('token='));
          if (m) token = m.split('=')[1];
        }
        if (token && process.env.JWT_SECRET) {
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
            from_user_id = payload?.sub ?? from_user_id;
            if (!from_role) from_role = payload?.role ?? from_role;
          } catch (e) {
            // ignore
          }
        }
      }

      // Basic validation
      if (!to_user_id) {
        return res.status(400).json({ message: 'to_user_id is required' });
      }
      if (!from_user_id) {
        // If we couldn't infer from a token, ask the client to authenticate before posting
        return res.status(401).json({ message: 'not authenticated - please login to request a meeting' });
      }
      if (!from_role) from_role = from_role ?? 'INVESTOR';
      if (!to_role) to_role = to_role ?? 'COMPANY';

      const meetingRequest = await createMeetingRequest(from_user_id, to_user_id, from_role, to_role, message);
      // Optionally create a time proposal if proposed times were included
      if (meetingRequest && (proposed_start || proposed_end)) {
        try {
          const startTime = proposed_start ? new Date(proposed_start).toISOString() : null;
          const endTime = proposed_end ? new Date(proposed_end).toISOString() : null;
          if (startTime && endTime) {
            try {
              await createTimeProposal(meetingRequest.id, from_user_id, startTime, endTime, 'UTC');
            } catch (e) {
              log(`time proposal creation error: ${(e as any)?.message ?? String(e)}`, 'routes');
            }
          }
        } catch (err) {
          log(`time proposal creation exception: ${(err as any)?.message ?? String(err)}`, 'routes');
        }
      }
      return res.status(201).json(meetingRequest);
    } catch (err: any) {
      log(`create meeting request error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error creating meeting request' });
    }
  });

  // Event endpoints: record profile view and deck download (for analytics)
  app.post('/api/events/profile_view', async (req, res) => {
    try {
      const { viewer_user_id, target_user_id, metadata } = req.body;
      if (!target_user_id) return res.status(400).json({ message: 'target_user_id required' });
      // If viewer_user_id not provided, try to infer from JWT in Authorization header or cookie
      let actor = viewer_user_id ?? null;
      if (!actor) {
        const auth = req.headers.authorization as string | undefined;
        let token: string | null = null;
        if (auth && auth.toLowerCase().startsWith('bearer ')) token = auth.split(' ')[1];
        const cookie = req.headers.cookie as string | undefined;
        if (!token && cookie) {
          const m = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
          if (m) token = m.split('=')[1];
        }
        if (token && process.env.JWT_SECRET) {
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
            actor = payload?.sub ?? actor;
          } catch (e) {
            // ignore token errors, leave actor null
          }
        }
      }
      const rec = await recordProfileView(actor ?? null, target_user_id, metadata ?? null);
      return res.status(201).json(rec);
    } catch (err: any) {
      log(`record profile view error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error recording profile view' });
    }
  });

  app.post('/api/events/deck_download', async (req, res) => {
    try {
      const { downloader_user_id, target_user_id, file_name, metadata } = req.body;
      if (!target_user_id) return res.status(400).json({ message: 'target_user_id required' });
      // Infer downloader from JWT if not provided
      let actor = downloader_user_id ?? null;
      if (!actor) {
        const auth = req.headers.authorization as string | undefined;
        let token: string | null = null;
        if (auth && auth.toLowerCase().startsWith('bearer ')) token = auth.split(' ')[1];
        const cookie = req.headers.cookie as string | undefined;
        if (!token && cookie) {
          const m = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
          if (m) token = m.split('=')[1];
        }
        if (token && process.env.JWT_SECRET) {
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
            actor = payload?.sub ?? actor;
          } catch (e) {
            // ignore
          }
        }
      }
      const rec = await recordDeckDownload(actor ?? null, target_user_id, file_name ?? null, metadata ?? null);
      return res.status(201).json(rec);
    } catch (err: any) {
      log(`record deck download error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error recording deck download' });
    }
  });

  // Overview metrics for current authenticated company
  app.get('/api/metrics/company/overview', async (req, res) => {
    try {
      // try to extract token from header or cookie
      const auth = req.headers.authorization as string | undefined;
      let token: string | null = null;
      if (auth && auth.toLowerCase().startsWith('bearer ')) token = auth.split(' ')[1];
      const cookie = req.headers.cookie as string | undefined;
      if (!token && cookie) {
        const match = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('token='));
        if (match) token = match.split('=')[1];
      }
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const metrics = await getCompanyOverviewMetrics(userId);
      return res.json(metrics);
    } catch (err: any) {
      log(`get company overview error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching overview metrics' });
    }
  });

  // Overview metrics for current authenticated investor
  app.get('/api/metrics/investor/overview', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const metrics = await getInvestorOverviewMetrics(userId);
      return res.json(metrics);
    } catch (err: any) {
      log(`get investor overview error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching investor metrics' });
    }
  });

  // Get recommended companies for the current investor
  app.get('/api/investors/me/recommendations', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const companies = await getRecommendedCompanies(userId);
      return res.json(companies);
    } catch (err: any) {
      log(`get recommendations error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching recommendations' });
    }
  });

  // Get upcoming meetings for the current investor
  app.get('/api/investors/me/meetings', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetings = await getUpcomingMeetings(userId);
      return res.json(meetings);
    } catch (err: any) {
      log(`get investor meetings error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error fetching meetings' });
    }
  });

  app.get('/api/meetings/requests/:userId', async (req, res) => {
    try {
      const requests = await listMeetingRequestsForUser(req.params.userId);
      return res.json(requests ?? []);
    } catch (err: any) {
      log(`list meeting requests error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing meeting requests' });
    }
  });

  return httpServer;
}
