import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import nodemailer from 'nodemailer';
import crypto from 'crypto';
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
  getMeetingRequestById,
  updateMeetingRequest,
  createNotification,
  getTimeProposalById,
  updateTimeProposalStatus,
  deleteFutureMeetingsForParticipants,
  listMeetingsForUser,
  listNotificationsForUser,
  markNotificationAsRead,
  updateNotificationIsRead,
  deleteNotification,
  searchCompanyProfiles,
  upsertCompanyProfile,
  upsertInvestorProfile,
} from "./lib/db.js";
import { createMeetingFromRequest } from './lib/db.js';
import { createGoogleMeetEvent } from './lib/googleCalendar.js';
import { recordProfileView, recordDeckDownload, getCompanyOverviewMetrics, getInvestorOverviewMetrics, getRecommendedCompanies, getUpcomingMeetings } from "./lib/db.js";
import { type InsertUser } from "@shared/schema";
import { matchEngine } from "./lib/matchEngine.js";
import { log } from "./index.js";
import { registerOAuthRoutes } from "./oauth-routes.js";
import supabase from './supabase.js';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // Register OAuth routes
  registerOAuthRoutes(app);

  // Health check
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Register (create user)
  app.post('/api/users', async (req, res) => {
    try {
      const { name, email, password, role, automatic_availability, availability_from, availability_to, availability_timezone, arrange_meetings } = req.body as { 
        name?: string; 
        email?: string; 
        password?: string; 
        role?: string;
        automatic_availability?: boolean;
        availability_from?: string;
        availability_to?: string;
        availability_timezone?: string;
        arrange_meetings?: boolean;
      };
      if (!email || !password) {
        return res.status(400).json({ message: 'email and password required' });
      }

      // Validate availability fields if automatic_availability is true
      if (automatic_availability) {
        if (!availability_from || !availability_to) {
          return res.status(400).json({ message: 'availability_from and availability_to are required when automatic_availability is enabled' });
        }
        const fromTime = new Date(availability_from);
        const toTime = new Date(availability_to);
        if (toTime <= fromTime) {
          return res.status(400).json({ message: 'availability_to must be after availability_from' });
        }
      }

      const user = await storage.createUser({ 
        email, 
        name, 
        password, 
        role,
        automatic_availability: automatic_availability ?? false,
        availability_from,
        availability_to,
        availability_timezone: availability_timezone ?? 'UTC',
        arrange_meetings: arrange_meetings ?? false,
      });

      // Do not auto-login on registration. Require email verification before allowing login.

      // Create an email verification token and send verification email (if configured)
      try {
        const verification = await storage.createEmailVerificationToken(user.id);
        const origin = (process.env.APP_URL && process.env.APP_URL.trim()) || `${req.protocol}://${req.get('host')}`;
        const verifyLink = `${origin.replace(/\/$/, '')}/auth?verify_token=${verification?.token}`;

        // Send email if SMTP config present
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: (process.env.SMTP_SECURE || 'false') === 'true',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            const from = process.env.SMTP_FROM || 'noreply@localhost';
            await transporter.sendMail({
              from,
              to: user.email,
              subject: 'Verify your email',
              html: `<p>Welcome to EIF. Please verify your email by clicking <a href="${verifyLink}">this link</a>.</p>`
            });
          } catch (e) {
            log(`email send warning: ${(e as any)?.message ?? String(e)}`, 'routes');
            log(`[EMAIL VERIFICATION LINK] ${verifyLink}`, 'routes');
          }
        } else {
          // Fallback: log verification link for development
          log(`[EMAIL VERIFICATION LINK] ${verifyLink}`, 'routes');
        }
      } catch (e) {
        log(`create verification token warning: ${(e as any)?.message ?? String(e)}`, 'routes');
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

      // Require email verification
      if (!(user as any).email_verified) {
        return res.status(403).json({ message: 'email not verified' });
      }

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

  // Verify email token
  app.get('/api/auth/verify', async (req, res) => {
    try {
      const token = req.query.token || req.query.verify_token;
      if (!token || typeof token !== 'string') return res.status(400).json({ message: 'token required' });

      const rec = await storage.validateEmailVerificationToken(token);
      if (!rec) return res.status(400).json({ message: 'invalid or expired token' });

      await storage.markEmailVerified(rec.user_id);
      return res.json({ message: 'email verified' });
    } catch (err: any) {
      log(`email verify error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error verifying email' });
    }
  });

  // Resend verification email (for users who have not yet verified their email)
  app.post('/api/auth/resend-verification', async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) return res.status(400).json({ message: 'email is required' });

      const user = await storage.getUserByUsername(email);
      if (!user) {
        // Do not reveal whether an account exists. Return generic success.
        return res.status(200).json({ message: 'If an account exists and is unverified, a verification link has been sent' });
      }

      const userData = user as any;
      if (userData.email_verified) {
        return res.status(400).json({ message: 'email already verified' });
      }

      // Create a new verification token
      const verification = await storage.createEmailVerificationToken(user.id);
      const origin = (process.env.APP_URL && process.env.APP_URL.trim()) || `${req.protocol}://${req.get('host')}`;
      const verifyLink = `${origin.replace(/\/$/, '')}/auth?verify_token=${verification?.token}`;

      // Send email if SMTP configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.SMTP_FROM || 'noreply@localhost';
          await transporter.sendMail({ from, to: user.email, subject: 'Verify your email', html: `<p>Please verify your email by clicking <a href="${verifyLink}">this link</a>.</p>` });
        } catch (e) {
          log(`email resend warning: ${(e as any)?.message ?? String(e)}`, 'routes');
          log(`[EMAIL VERIFICATION LINK] ${verifyLink}`, 'routes');
        }
      } else {
        // Log link for development
        log(`[EMAIL VERIFICATION LINK] ${verifyLink}`, 'routes');
      }

      return res.status(200).json({ message: 'verification link sent' });
    } catch (err: any) {
      log(`resend verification error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error resending verification' });
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
      // Try sending via SMTP (nodemailer) when configured
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.SMTP_FROM || 'noreply@localhost';
          await transporter.sendMail({ from, to: email, subject: 'Reset your EIF password', html: `<p>Reset your password by clicking <a href="${resetLink}">this link</a>.</p>` });
        } catch (e) {
          log(`email send warning: ${(e as any)?.message ?? String(e)}`, 'routes');
          log(`[PASSWORD RESET] Link for ${email}: ${resetLink}`, 'routes');
        }
      } else {
        log(`[PASSWORD RESET] Link for ${email}: ${resetLink}`, 'routes');
      }

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
      const updated = await upsertInvestorProfile(userId, updates);
      return res.json(updated);
    } catch (err: any) {
      log(`update current investor error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: err?.message ?? 'error updating investor profile' });
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
      return res.status(500).json({ message: err?.message ?? 'error updating company profile' });
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

  // Admin: list users
  app.get('/api/admin/users', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const role = (payload?.role ?? '').toString().toLowerCase();
      if (!role.includes('admin')) return res.status(403).json({ message: 'forbidden' });

      const users = await storage.listUsers(500);
      return res.json(users);
    } catch (err: any) {
      log(`admin list users error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing users' });
    }
  });

  // Admin: invite a user (auto-generated password)
  app.post('/api/admin/invite', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const role = (payload?.role ?? '').toString().toLowerCase();
      if (!role.includes('admin')) return res.status(403).json({ message: 'forbidden' });

      const { email, name, role: inviteRole } = req.body as { email?: string; name?: string; role?: string };
      if (!email) return res.status(400).json({ message: 'email required' });

      // generate password
      const generated = crypto.randomBytes(6).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

      const newUser = await storage.createUser({ email, password: generated, name: name ?? undefined, role: inviteRole ?? 'user' });

      // mark email verified so invitee can immediately login
      await storage.markEmailVerified(newUser.id);

      // send invite email
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.SMTP_FROM || 'noreply@localhost';
          const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          const loginLink = `${origin.replace(/\/$/, '')}/auth`;
          await transporter.sendMail({ from, to: email, subject: 'You are invited to EIF', html: `<p>Your account has been created. Login at <a href="${loginLink}">${loginLink}</a><br/>Email: ${email}<br/>Password: ${generated}</p>` });
        } catch (e) {
          log(`invite email send warning: ${(e as any)?.message ?? String(e)}`, 'routes');
        }
      }

      return res.status(201).json({ id: newUser.id, email: newUser.email });
    } catch (err: any) {
      log(`admin invite error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error inviting user' });
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

  // List notifications for current authenticated user
  app.get('/api/notifications', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
      const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
      const items = await listNotificationsForUser(userId, limit, offset);
      return res.json(items);
    } catch (err: any) {
      log(`list notifications error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing notifications' });
    }
  });

  // Mark a notification as read
  app.patch('/api/notifications/:id/read', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const notificationId = req.params.id;
      const updated = await markNotificationAsRead(notificationId, userId);
      return res.json(updated);
    } catch (err: any) {
      log(`mark notification read error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error marking notification read' });
    }
  });

  // Mark all notifications for current user as read
  app.post('/api/notifications/mark-all-read', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const updated = await markAllNotificationsRead(userId);
      return res.json({ updatedCount: updated.length });
    } catch (err: any) {
      log(`mark all notifications read error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error marking notifications read' });
    }
  });

  // Set a notification read/unread state (body: { is_read: boolean })
  app.patch('/api/notifications/:id', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const notificationId = req.params.id;
      const updates = req.body as Record<string, any>;
      if (typeof updates.is_read === 'undefined') return res.status(400).json({ message: 'is_read is required' });
      const updated = await updateNotificationIsRead(notificationId, userId, !!updates.is_read);
      return res.json(updated);
    } catch (err: any) {
      log(`update notification error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error updating notification' });
    }
  });

  // Delete a notification
  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const notificationId = req.params.id;
      const deleted = await deleteNotification(notificationId, userId);
      return res.json(deleted);
    } catch (err: any) {
      log(`delete notification error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error deleting notification' });
    }
  });

  // Update a meeting request (accept/decline/cancel)
  app.patch('/api/meetings/requests/:id', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetingId = req.params.id;
      const updates = req.body as Record<string, any>;

      const meeting = await getMeetingRequestById(meetingId);
      if (!meeting) return res.status(404).json({ message: 'meeting not found' });

      // Only participants may update meeting details generally
      if (meeting.from_user_id !== userId && meeting.to_user_id !== userId) {
        return res.status(403).json({ message: 'forbidden' });
      }

      // Enforce role-based status updates:
      // - Only the recipient (`to_user_id`) may accept or decline (CONFIRMED / DECLINED)
      // - Only the requester (`from_user_id`) may cancel the request (CANCELLED)
      if (updates && typeof updates.status === 'string') {
        const s = updates.status.toString().toUpperCase();
        if ((s === 'CONFIRMED' || s === 'DECLINED') && userId !== meeting.to_user_id) {
          return res.status(403).json({ message: 'only the recipient may accept or decline this meeting' });
        }
        if (s === 'CANCELLED' && userId !== meeting.from_user_id) {
          return res.status(403).json({ message: 'only the requester may cancel this meeting' });
        }
      }

      // Allowed status transitions are handled by business logic on the client.
      const updated = await updateMeetingRequest(meetingId, updates);

      // If this update confirms the meeting and the client provided start/end times,
      // attempt to create a Google Meet event (if configured) and persist a meeting record.
      try {
        if ((updates.status || '').toString().toUpperCase() === 'CONFIRMED' && updates.start_time && updates.end_time) {
          const start = new Date(updates.start_time).toISOString();
          const end = new Date(updates.end_time).toISOString();

          let meetUrl: string | undefined;
          // If Google service account configured, create a calendar event to get a Meet URL
          if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_CALENDAR_ID) {
            try {
              const reqRow = await getMeetingRequestById(meetingId);
              const attendees: string[] = [];
              if (reqRow?.from_user_id) {
                const u = await storage.getUser(reqRow.from_user_id);
                if (u?.email) attendees.push(u.email);
              }
              if (reqRow?.to_user_id) {
                const u2 = await storage.getUser(reqRow.to_user_id);
                if (u2?.email) attendees.push(u2.email);
              }

              const ev = await createGoogleMeetEvent({ summary: 'EIF Meeting', description: reqRow?.message ?? '', start, end, attendees });
              meetUrl = ev?.meetUrl ?? ev?.htmlLink;
            } catch (e) {
              log(`google calendar create event failed: ${(e as any)?.message ?? String(e)}`, 'routes');
            }
          }

          // Persist meeting in our DB (will throw if required fields missing)
          try {
            const meetingRec = await createMeetingFromRequest(meetingId, start, end, updates.timezone ?? 'UTC', meetUrl ? 'google_meet' : (updates.location_type ?? null), meetUrl ?? updates.location_url ?? null);
            // include meeting record in response
            return res.json({ meetingRequest: updated, meeting: meetingRec });
          } catch (e) {
            log(`persist meeting record failed: ${(e as any)?.message ?? String(e)}`, 'routes');
          }
        }
      } catch (e) {
        log(`post-confirm hooks error: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      return res.json(updated);
    } catch (err: any) {
      log(`update meeting request error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error updating meeting request' });
    }
  });

  // Create a time proposal (reschedule request) for an existing meeting request
  app.post('/api/meetings/requests/:id/proposals', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetingId = req.params.id;
      const { start_time, end_time, timezone } = req.body as { start_time?: string; end_time?: string; timezone?: string };
      if (!start_time || !end_time) return res.status(400).json({ message: 'start_time and end_time required' });

      const meeting = await getMeetingRequestById(meetingId);
      if (!meeting) return res.status(404).json({ message: 'meeting not found' });

      // Only participants may propose new times
      if (meeting.from_user_id !== userId && meeting.to_user_id !== userId) return res.status(403).json({ message: 'forbidden' });

      const start = new Date(start_time).toISOString();
      const end = new Date(end_time).toISOString();

      const proposal = await createTimeProposal(meetingId, userId, start, end, timezone ?? 'UTC');

      // Notify the other participant
      const otherUserId = meeting.from_user_id === userId ? meeting.to_user_id : meeting.from_user_id;
      try {
        await createNotification(otherUserId, 'meeting_reschedule_requested', { meeting_request_id: meetingId, proposal_id: proposal.id, start, end });

        // Try to email the recipient if possible
        const recipient = await storage.getUser(otherUserId);
        if (recipient?.email && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 587),
              secure: (process.env.SMTP_SECURE || 'false') === 'true',
              auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            });
            const from = process.env.SMTP_FROM || 'noreply@localhost';
            const origin = (process.env.APP_URL && process.env.APP_URL.trim()) || `${req.protocol}://${req.get('host')}`;
            const acceptUrl = `${origin.replace(/\/$/, '')}/dashboard/meetings?proposal=${proposal.id}&action=accept`;
            const declineUrl = `${origin.replace(/\/$/, '')}/dashboard/meetings?proposal=${proposal.id}&action=decline`;
            const html = `<p>The meeting has a new reschedule proposal for <strong>${new Date(start).toLocaleString()}</strong> to <strong>${new Date(end).toLocaleString()}</strong>.</p>
              <p><a href="${acceptUrl}">Accept</a> | <a href="${declineUrl}">Decline</a></p>`;
            await transporter.sendMail({ from, to: recipient.email, subject: 'Meeting reschedule requested', html });
          } catch (e) {
            log(`reschedule email send failed: ${(e as any)?.message ?? String(e)}`, 'routes');
          }
        }
      } catch (e) {
        log(`reschedule notification failed: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      return res.status(201).json(proposal);
    } catch (err: any) {
      log(`create time proposal error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error creating time proposal' });
    }
  });

  // List upcoming confirmed meeting records for current user
  app.get('/api/users/me/meetings', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetings = await listMeetingsForUser(userId, 200);
      return res.json(meetings);
    } catch (err: any) {
      log(`list user meetings error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error listing meetings' });
    }
  });

  // Accept a time proposal
  app.post('/api/meetings/requests/:id/proposals/:proposalId/accept', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetingId = req.params.id;
      const proposalId = req.params.proposalId;
      const proposal = await getTimeProposalById(proposalId);
      if (!proposal) return res.status(404).json({ message: 'proposal not found' });

      const meeting = await getMeetingRequestById(meetingId);
      if (!meeting) return res.status(404).json({ message: 'meeting not found' });

      // Only the non-proposer may accept
      if (proposal.proposed_by_user_id === userId) return res.status(403).json({ message: 'proposer cannot accept their own proposal' });

      // Mark proposal accepted
      await updateTimeProposalStatus(proposalId, 'ACCEPTED');

      // Update meeting request status to CONFIRMED
      await updateMeetingRequest(meetingId, { status: 'CONFIRMED' });

      // Remove any future meetings between the participants to avoid duplicates
      try {
        await deleteFutureMeetingsForParticipants(proposal.proposed_by_user_id, (await getMeetingRequestById(meetingId))?.to_user_id ?? '');
      } catch (e) {
        log(`delete future meetings warning: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      // Create new meeting record for the accepted proposal
      const meetingRec = await createMeetingFromRequest(meetingId, proposal.start_time, proposal.end_time, proposal.timezone ?? 'UTC');

      // Notify proposer
      try {
        await createNotification(proposal.proposed_by_user_id, 'meeting_reschedule_accepted', { meeting_request_id: meetingId, proposal_id: proposalId, start: proposal.start_time, end: proposal.end_time, meeting: meetingRec });
        const proposer = await storage.getUser(proposal.proposed_by_user_id);
        if (proposer?.email && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.SMTP_FROM || 'noreply@localhost';
          const html = `<p>Your reschedule proposal was accepted for <strong>${new Date(proposal.start_time).toLocaleString()}</strong> to <strong>${new Date(proposal.end_time).toLocaleString()}</strong>.</p>`;
          await transporter.sendMail({ from, to: proposer.email, subject: 'Reschedule accepted', html });
        }
      } catch (e) {
        log(`reschedule accept notify failed: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      return res.json({ meeting: meetingRec });
    } catch (err: any) {
      log(`accept proposal error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error accepting proposal' });
    }
  });

  // Decline a time proposal
  app.post('/api/meetings/requests/:id/proposals/:proposalId/decline', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, jwtSecret) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const meetingId = req.params.id;
      const proposalId = req.params.proposalId;
      const proposal = await getTimeProposalById(proposalId);
      if (!proposal) return res.status(404).json({ message: 'proposal not found' });

      // Only the non-proposer may decline
      if (proposal.proposed_by_user_id === userId) return res.status(403).json({ message: 'proposer cannot decline their own proposal' });

      await updateTimeProposalStatus(proposalId, 'DECLINED');

      // Notify proposer
      try {
        await createNotification(proposal.proposed_by_user_id, 'meeting_reschedule_declined', { meeting_request_id: meetingId, proposal_id: proposalId });
        const proposer = await storage.getUser(proposal.proposed_by_user_id);
        if (proposer?.email && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: (process.env.SMTP_SECURE || 'false') === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          });
          const from = process.env.SMTP_FROM || 'noreply@localhost';
          const html = `<p>Your reschedule proposal for <strong>${new Date(proposal.start_time).toLocaleString()}</strong> was declined.</p>`;
          await transporter.sendMail({ from, to: proposer.email, subject: 'Reschedule declined', html });
        }
      } catch (e) {
        log(`reschedule decline notify failed: ${(e as any)?.message ?? String(e)}`, 'routes');
      }

      return res.json({ ok: true });
    } catch (err: any) {
      log(`decline proposal error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error declining proposal' });
    }
  });

  // Automatic scheduler endpoints
  // Admin: Run automatic scheduler to match and book meetings
  app.post('/api/admin/scheduler/run', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const role = (payload?.role ?? '').toString().toLowerCase();
      if (!role.includes('admin')) return res.status(403).json({ message: 'forbidden' });

      // Import here to avoid circular dependency
      const { AutomaticScheduler } = await import('./lib/automaticScheduler.js');
      const scheduler = new AutomaticScheduler(supabase);
      const results = await scheduler.runScheduler();

      return res.json({ 
        message: 'Scheduler completed',
        results,
        scheduled: results.filter(r => r.status === 'scheduled').length,
        failed: results.filter(r => r.status === 'failed').length,
      });
    } catch (err: any) {
      log(`scheduler run error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error running scheduler' });
    }
  });

  // User: Update auto-arrangement preferences
  app.post('/api/users/me/arrangement-preferences', async (req, res) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ message: 'not authenticated' });
      if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'authentication not configured' });
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      const userId = payload?.sub;
      if (!userId) return res.status(401).json({ message: 'invalid token' });

      const { arrangeMeetings, autoConfirm } = req.body;

      const { error } = await supabase
        .from('users_eif')
        .update({
          arrange_meetings: arrangeMeetings ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      return res.json({ message: 'Preferences updated' });
    } catch (err: any) {
      log(`update preferences error: ${err?.message ?? String(err)}`, 'routes');
      return res.status(500).json({ message: 'error updating preferences' });
    }
  });

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

  return httpServer;
}
