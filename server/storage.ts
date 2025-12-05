import { type User, type InsertUser } from "@shared/schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import supabaseClient from "./supabase.js";
import crypto from "crypto";

// modify the interface with any CRUD methods you might need
export interface RegisterUser {
  username?: string; // legacy
  email?: string;
  name?: string;
  password: string;
  role?: string;
  automatic_availability?: boolean;
  availability_from?: string;
  availability_to?: string;
  availability_timezone?: string;
  arrange_meetings?: boolean;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: RegisterUser): Promise<User>;
  createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: string } | null>;
  validateResetToken(token: string): Promise<{ user_id: string; token: string; expires_at: string } | null>;
  updateUserPassword(userId: string, newPassword: string): Promise<User | null>;
  invalidateResetTokens(userId: string): Promise<void>;
  // Email verification
  createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: string } | null>;
  validateEmailVerificationToken(token: string): Promise<{ user_id: string; token: string; expires_at: string } | null>;
  markEmailVerified(userId: string): Promise<void>;
  listUsers(limit?: number): Promise<User[]>;
}

export class SupabaseStorage implements IStorage {
  client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  // Map the different table names/columns to the User shape used by the app
  private mapSupabaseRowToUser(row: any): User | undefined {
    if (!row || !row.id) return undefined;
    const user: any = {
      id: row.id,
      username: row.username ?? row.email ?? row.name,
      email: row.email ?? row.username,
      name: row.name ?? row.username ?? row.email,
      password: row.password ?? row.hashed_password ?? undefined,
      role: row.role ?? undefined,
      email_verified: row.email_verified ?? false,
    };
    return user as User;
  }

  async getUser(id: string): Promise<User | undefined> {
    // Query users_eif table (the only users table we use)
    const { data, error } = await this.client.from("users_eif").select("*").eq("id", id).maybeSingle();
    if (!error && data) return this.mapSupabaseRowToUser(data);
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Try email lookup in users_eif (email is the username in our schema)
    const { data, error } = await this.client.from("users_eif").select("*").eq("email", username).limit(1).maybeSingle();
    if (!error && data) return this.mapSupabaseRowToUser(data);
    return undefined;
  }

  async createUser(registerUser: RegisterUser): Promise<User> {
    // Hash the password
    const saltRounds = 10;
    const hashed = await bcrypt.hash(registerUser.password, saltRounds);

    // Insert into `users_eif` with richer fields
    const userEmail = (registerUser.email ?? registerUser.username ?? "").toLowerCase();
    const userRole = registerUser.role ?? "user";
    const userName = registerUser.name ?? registerUser.username;

    // Check for existing email to provide a friendly conflict error
    if (!userEmail) {
      throw new Error('email_required');
    }

    const { data: existingByEmail } = await this.client.from("users_eif").select('id').eq('email', userEmail).limit(1).maybeSingle();
    if (existingByEmail) {
      throw new Error('email_exists');
    }

    // Normalize availability fields: if client sent a datetime-local (YYYY-MM-DDTHH:MM),
    // convert to time-only string (HH:MM:SS) because some DB schemas use `time` type.
    function toTimeOnly(v?: string | null) {
      if (!v) return null;
      // If value contains a 'T' (datetime-local), take the time part
      if (v.indexOf('T') !== -1) {
        const parts = v.split('T');
        const timePart = parts[1] ?? '';
        // ensure seconds are present
        if (/^\d{2}:\d{2}$/.test(timePart)) return `${timePart}:00`;
        if (/^\d{2}:\d{2}:\d{2}$/.test(timePart)) return timePart;
        // fallback: try to parse and extract hours/minutes
        const m = timePart.match(/(\d{2}:\d{2})/);
        if (m) return `${m[1]}:00`;
        return null;
      }
      // If already a time like HH:MM or HH:MM:SS, normalize
      if (/^\d{2}:\d{2}$/.test(v)) return `${v}:00`;
      if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v;
      return null;
    }

    const normalizedAvailabilityFrom = toTimeOnly(registerUser.availability_from ?? null);
    const normalizedAvailabilityTo = toTimeOnly(registerUser.availability_to ?? null);

    let { data, error } = await this.client
      .from("users_eif")
      .insert({ 
        email: userEmail, 
        hashed_password: hashed, 
        role: userRole, 
        name: userName,
        automatic_availability: registerUser.automatic_availability ?? false,
        availability_from: normalizedAvailabilityFrom ?? registerUser.availability_from ?? null,
        availability_to: normalizedAvailabilityTo ?? registerUser.availability_to ?? null,
        availability_timezone: registerUser.availability_timezone ?? 'UTC',
        arrange_meetings: registerUser.arrange_meetings ?? false,
      })
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) return this.mapSupabaseRowToUser(data)!;

    // Distinguish constraint failures from other DB errors
    if (error && (error.code === '23505' || (error.message && error.message.includes('duplicate key')))) {
      throw new Error('email_exists');
    }

    throw new Error(`failed to insert user: ${error?.message ?? "unknown"}`);
  }

  async createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: string } | null> {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiration
    const { data, error } = await this.client
      .from("password_resets_eif")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("token, expires_at")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to create reset token:', error);
      return null;
    }

    return {
      token: data?.token ?? token,
      expiresAt: data?.expires_at ?? expiresAt.toISOString(),
    };
  }

  async listUsers(limit = 100): Promise<User[]> {
    const { data, error } = await this.client.from('users_eif').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) {
      console.error('Failed to list users:', error);
      return [];
    }
    return (data ?? []).map((r: any) => this.mapSupabaseRowToUser(r)).filter(Boolean) as User[];
  }

  async createEmailVerificationToken(userId: string): Promise<{ token: string; expiresAt: string } | null> {
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    const { data, error } = await this.client
      .from('email_verifications_eif')
      .insert({ user_id: userId, token, expires_at: expiresAt.toISOString(), created_at: new Date().toISOString() })
      .select('token, expires_at')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to create email verification token:', error);
      return null;
    }

    return {
      token: data?.token ?? token,
      expiresAt: data?.expires_at ?? expiresAt.toISOString(),
    };
  }

  async validateEmailVerificationToken(token: string): Promise<{ user_id: string; token: string; expires_at: string } | null> {
    const { data, error } = await this.client
      .from('email_verifications_eif')
      .select('user_id, token, expires_at')
      .eq('token', token)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // delete expired token
      await this.client.from('email_verifications_eif').delete().eq('token', token);
      return null;
    }

    return { user_id: data.user_id, token: data.token, expires_at: data.expires_at };
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.client.from('users_eif').update({ email_verified: true, updated_at: new Date().toISOString() }).eq('id', userId);
    // remove any verification tokens for this user
    await this.client.from('email_verifications_eif').delete().eq('user_id', userId);
  }

  async validateResetToken(token: string): Promise<{ user_id: string; token: string; expires_at: string } | null> {
    const { data, error } = await this.client
      .from("password_resets_eif")
      .select("user_id, token, expires_at")
      .eq("token", token)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Check if token has expired
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Remove expired token
      await this.client
        .from("password_resets_eif")
        .delete()
        .eq("token", token);
      return null;
    }

    return {
      user_id: data.user_id,
      token: data.token,
      expires_at: data.expires_at,
    };
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<User | null> {
    // Hash the new password
    const saltRounds = 10;
    const hashed = await bcrypt.hash(newPassword, saltRounds);

    const { data, error } = await this.client
      .from("users_eif")
      .update({ hashed_password: hashed, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to update password:', error);
      return null;
    }

    return this.mapSupabaseRowToUser(data) ?? null;
  }

  async invalidateResetTokens(userId: string): Promise<void> {
    // Remove any outstanding reset tokens for the user (schema doesn't include `used` flag)
    await this.client
      .from("password_resets_eif")
      .delete()
      .eq("user_id", userId);
  }
}

// Always use Supabase storage in this project. `supabaseClient` is created
// at import time and will throw a clear error if required env vars are missing.
export const storage: IStorage = new SupabaseStorage(supabaseClient as SupabaseClient);
